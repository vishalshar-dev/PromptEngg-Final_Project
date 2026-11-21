import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

interface GeminiKeyCandidate {
  key: string;
  source: string;
}

function getGeminiKeyCandidates(): GeminiKeyCandidate[] {
  const rawCandidates: Array<[string, string | undefined]> = [
    ['CartAudit_GEMINIAPI_KEY', process.env.CartAudit_GEMINIAPI_KEY],
    ['CARTAUDIT_GEMINIAPI_KEY', process.env.CARTAUDIT_GEMINIAPI_KEY],
    ['CartAudit_GEMINI_API_KEY', process.env.CartAudit_GEMINI_API_KEY],
    ['CARTAUDIT_GEMINI_API_KEY', process.env.CARTAUDIT_GEMINI_API_KEY],
    ['GEMINI_API_KEY', process.env.GEMINI_API_KEY],
    ['GOOGLE_API_KEY', process.env.GOOGLE_API_KEY],
    ['API_KEY', process.env.API_KEY],
  ];
  const seen = new Set<string>();
  const result: GeminiKeyCandidate[] = [];
  for (const [source, raw] of rawCandidates) {
    if (!raw) continue;
    const cleaned = raw.trim().replace(/^['"`]+|['"`]+$/g, '').trim();
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    result.push({ key: cleaned, source });
  }
  return result;
}

function resolveGeminiKeyInfo(): GeminiKeyCandidate | undefined {
  return getGeminiKeyCandidates()[0];
}

function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isAuthKeyError(status: number, message: string, code: string): boolean {
  return (
    status === 401 ||
    code === 'UNAUTHENTICATED' ||
    message.includes('API_KEY_INVALID') ||
    message.includes('API key not valid') ||
    message.includes('PERMISSION_DENIED')
  );
}

async function runWithGeminiFallback<T>(
  operationName: string,
  fn: (ai: GoogleGenAI, source: string) => Promise<T>
): Promise<T> {
  const candidates = getGeminiKeyCandidates();
  if (candidates.length === 0) {
    const err = new Error(
      'No Gemini API key is configured on the server.'
    ) as Error & { code?: string; status?: number };
    err.code = 'MISSING_API_KEY';
    err.status = 503;
    throw err;
  }

  let lastErr: unknown;
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const ai = createGeminiClient(candidate.key);
    try {
      return await fn(ai, candidate.source);
    } catch (err) {
      lastErr = err;
      const parsed = extractReadableError(err);
      if (isAuthKeyError(parsed.status, parsed.message, parsed.code) && i < candidates.length - 1) {
        console.warn(
          `[${operationName}] Key from ${candidate.source} was rejected (${parsed.status}: ${parsed.message}); falling back to ${candidates[i + 1].source}.`
        );
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

function extractReadableError(err: unknown): { status: number; message: string; code: string } {
  const errorObj = err as Error & { code?: string; status?: number };
  let status = typeof errorObj.status === 'number' ? errorObj.status : 500;
  let message = errorObj.message || 'Failed to scan receipt with Gemini Vision.';
  let code = errorObj.code || 'SCAN_FAILED';

  if (message.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(message) as {
        error?: { code?: number; message?: string; status?: string };
      };
      if (parsed?.error) {
        if (typeof parsed.error.code === 'number') status = parsed.error.code;
        if (typeof parsed.error.message === 'string' && parsed.error.message.trim()) {
          message = parsed.error.message.trim();
        }
        if (typeof parsed.error.status === 'string' && parsed.error.status.trim()) {
          code = parsed.error.status.trim();
        }
      }
    } catch {
      // Keep original message if not JSON
    }
  }

  return { status, message, code };
}

function isTransientUpstreamError(status: number, message: string, code: string): boolean {
  if (status === 429 || status === 503 || status === 504) return true;
  const upper = `${code} ${message}`.toUpperCase();
  return (
    upper.includes('UNAVAILABLE') ||
    upper.includes('HIGH DEMAND') ||
    upper.includes('RESOURCE_EXHAUSTED') ||
    upper.includes('UPSTREAM_TIMEOUT') ||
    upper.includes('OVERLOADED')
  );
}

async function runReceiptVisionModel(
  ai: GoogleGenAI,
  model: string,
  normalizedMime: string,
  imageBase64: string,
  useLowThinking: boolean,
  timeoutMs: number
) {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      const err = new Error(
        `Gemini Vision (${model}) timed out after ${Math.round(timeoutMs / 1000)} seconds.`
      ) as Error & { code?: string; status?: number };
      err.code = 'UPSTREAM_TIMEOUT';
      err.status = 504;
      reject(err);
    }, timeoutMs);
  });

  const config: Record<string, unknown> = {
    systemInstruction:
      'You are a precise receipt and grocery-app checkout parser for Indian quick-commerce platforms (Blinkit, Zepto, Swiggy Instamart, BigBasket, Amazon Fresh, JioMart, etc.) and retail/pharmacy/electronics receipts. ONLY extract items, merchant names, prices, taxes, and fees that are visibly readable in the provided image. Never invent, guess, or fabricate items if the image is blank or unreadable; return an empty items array instead. Return valid JSON matching the schema.',
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        merchant: {
          type: Type.STRING,
          description: 'Store or app name such as Blinkit, Zepto, Swiggy Instamart, or merchant name.',
        },
        date: {
          type: Type.STRING,
          description: 'ISO 8601 date string if shown on receipt, otherwise empty string.',
        },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: 'Clean product name' },
              price: { type: Type.NUMBER, description: 'Charged line item price in INR' },
              category: {
                type: Type.STRING,
                description:
                  'Best matching category from: Groceries, Fruits & Vegetables, Dairy & Bakery, Snacks & Beverages, Meat & Eggs, Personal Care, Household Essentials, Cleaning Supplies, Electronics, Clothing & Accessories, Medicines & Healthcare, Stationery, Mobile & Internet Bills, Electricity & Utilities, Fuel & Transportation, Entertainment, Other Expenses',
              },
              unit: {
                type: Type.STRING,
                description: 'Package size or unit if shown (e.g. 500 ml, 1 kg, 1 pc), else empty string.',
              },
              brand: {
                type: Type.STRING,
                description: 'Brand name if identifiable (e.g. Amul, Britannia, Apple), else empty string.',
              },
            },
            required: ['name', 'price'],
          },
        },
        subtotal: { type: Type.NUMBER, description: 'Item subtotal before taxes and extra fees' },
        taxTotal: { type: Type.NUMBER, description: 'Total GST/tax amount' },
        deliveryFee: {
          type: Type.NUMBER,
          description: 'Combined delivery, handling, packaging, surge, and small-cart fees',
        },
        total: { type: Type.NUMBER, description: 'Final payable/paid grand total' },
      },
      required: ['merchant', 'items', 'subtotal', 'taxTotal', 'deliveryFee', 'total'],
    },
  };

  if (useLowThinking) {
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
  }

  return Promise.race([
    ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: normalizedMime === 'image/jpg' ? 'image/jpeg' : normalizedMime,
              data: imageBase64,
            },
          },
          {
            text:
              'Extract all clearly visible purchased items, their categories, units, brands, fees, taxes, and totals from this receipt or checkout screenshot. ' +
              'Do NOT invent items that are not shown. Ignore strikethrough MRP prices and use the actual charged price per line item. ' +
              'Assign each item its most accurate spending category. ' +
              'Sum delivery, handling, packaging, platform, surge, rain, and small-cart fees into deliveryFee. ' +
              'Sum GST, CGST, SGST, and other taxes into taxTotal.',
          },
        ],
      },
      config,
    }),
    timeoutPromise,
  ]);
}

function parseJsonResponse(rawText: string): unknown {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned || '{}');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const info = resolveGeminiKeyInfo();
    res.json({
      ok: true,
      geminiConfigured: Boolean(info),
      keySource: info?.source ?? null,
      model: 'gemini-4-hydrogen',
    });
  });

  app.post('/api/scan-receipt', async (req: Request, res: Response) => {
    try {
      const { imageBase64, mimeType } = req.body as {
        imageBase64?: string;
        mimeType?: string;
      };

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        res.status(400).json({ error: 'Missing imageBase64 payload.' });
        return;
      }

      const normalizedMime = (mimeType || 'image/png').toLowerCase();
      if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
        res.status(400).json({
          error: `Unsupported image type "${normalizedMime}". Please upload a PNG, JPEG, WebP, or GIF image.`,
        });
        return;
      }

      const startedAt = Date.now();
      let modelUsed = 'gemini-4-hydrogen';

      const response = await runWithGeminiFallback('scan-receipt', async (ai) => {
        try {
          modelUsed = 'gemini-4-hydrogen';
          return await runReceiptVisionModel(
            ai,
            'gemini-4-hydrogen',
            normalizedMime,
            imageBase64,
            true,
            10000
          );
        } catch (primaryErr) {
          const parsedPrimary = extractReadableError(primaryErr);
          console.warn(
            `[scan-receipt] Primary model (${modelUsed}) error (${parsedPrimary.status}): ${parsedPrimary.message}`
          );
          if (
            !isTransientUpstreamError(
              parsedPrimary.status,
              parsedPrimary.message,
              parsedPrimary.code
            )
          ) {
            throw primaryErr;
          }
          modelUsed = 'gemini-3.1-flash-lite';
          return await runReceiptVisionModel(
            ai,
            modelUsed,
            normalizedMime,
            imageBase64,
            false,
            20000
          );
        }
      });

      console.info(
        `[scan-receipt] ${modelUsed} succeeded in ${Date.now() - startedAt}ms`
      );
      const parsed = parseJsonResponse(response.text ?? '{}');
      res.json(parsed);
    } catch (err) {
      const { status, message, code } = extractReadableError(err);
      console.error(`[scan-receipt] Error (${status}): ${message}`);
      if (isAuthKeyError(status, message, code)) {
        res.status(403).json({
          error: 'Live AI receipt scanning is temporarily unavailable because the server API key was rejected.',
          code: 'API_KEY_INVALID',
        });
        return;
      }

      if (status === 429 || message.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          error: 'Gemini API rate limit or quota reached. Please wait a moment and try again.',
          code: 'RESOURCE_EXHAUSTED',
        });
        return;
      }

      res.status(status).json({
        error: message,
        code,
      });
    }
  });

  app.post('/api/penny-chat', async (req: Request, res: Response) => {
    try {
      const { question, history, context, personalityProfile } = req.body as {
        question?: unknown;
        history?: unknown;
        context?: unknown;
        personalityProfile?: unknown;
      };

      if (typeof question !== 'string' || !question.trim()) {
        res.status(400).json({ error: 'Please enter a message for Penny.' });
        return;
      }

      const trimmedQuestion = question.trim().slice(0, 1500);
      if (!context || typeof context !== 'object' || Array.isArray(context)) {
        res.status(400).json({ error: 'Missing financial context snapshot.' });
        return;
      }

      const safeHistory = Array.isArray(history)
        ? history
            .slice(-10)
            .filter(
              (m): m is { role: 'user' | 'assistant'; text: string } =>
                Boolean(m) &&
                typeof m === 'object' &&
                ((m as { role?: unknown }).role === 'user' ||
                  (m as { role?: unknown }).role === 'assistant') &&
                typeof (m as { text?: unknown }).text === 'string'
            )
            .map((m) => ({
              role: m.role,
              text: m.text.slice(0, 900),
            }))
        : [];

      const profileObj =
        personalityProfile && typeof personalityProfile === 'object'
          ? (personalityProfile as Record<string, unknown>)
          : {};
      const tonePref =
        typeof profileObj.tonePreference === 'string' ? profileObj.tonePreference : 'auto';
      const conciseBias = Number(profileObj.conciseBias ?? 50);
      const casualBias = Number(profileObj.casualBias ?? 55);
      const topFocus = typeof profileObj.topFocus === 'string' ? profileObj.topFocus : 'general';
      const resolvedSummary =
        typeof profileObj.resolvedSummary === 'string' ? profileObj.resolvedSummary : 'Auto · Balanced';

      const ctxRecord = context as Record<string, unknown>;
      const budgetObj =
        ctxRecord.budgetOverview && typeof ctxRecord.budgetOverview === 'object'
          ? (ctxRecord.budgetOverview as Record<string, unknown>)
          : {};
      const isBrokeMode = Boolean(budgetObj.isBrokeMode);
      const activeScreen =
        typeof ctxRecord.activeScreen === 'string' ? ctxRecord.activeScreen : 'overview';

      const styleDirectives: string[] = [];
      if (tonePref === 'strict_coach') {
        styleDirectives.push(
          'Tone override: STRICT FINANCE COACH. Be direct, protective of cashflow, firm about cutting junk/impulse spending, no fluff.'
        );
      } else if (tonePref === 'friendly') {
        styleDirectives.push(
          'Tone override: WARM & ENCOURAGING COMPANION. Be supportive, approachable, celebratory on wins, gentle on overspending.'
        );
      } else if (tonePref === 'crisp') {
        styleDirectives.push(
          'Tone override: ULTRA-CRISP EXECUTIVE. Lead with numbers first, short punchy lines or 2-3 bullets under 75 words.'
        );
      } else {
        // Auto-adaptive voice matching the user
        if (conciseBias >= 65) {
          styleDirectives.push(
            'Length style: User prefers quick messages — keep answers super crisp (50–90 words) and punchy.'
          );
        } else if (conciseBias <= 35) {
          styleDirectives.push(
            'Length style: User asks thoughtful detailed questions — give clear step-by-step reasoning and helpful context (110–190 words).'
          );
        } else {
          styleDirectives.push('Length style: Balanced & readable (75–130 words).');
        }

        if (casualBias >= 65) {
          styleDirectives.push(
            'Voice: Match user’s casual, conversational, natural tone (conversational phrasing, no stiff corporate jargon).'
          );
        } else if (casualBias <= 35) {
          styleDirectives.push(
            'Voice: Match user’s structured, polite, analytical tone cleanly.'
          );
        } else {
          styleDirectives.push('Voice: Warm, natural, everyday helpful friend who happens to be great with money.');
        }
      }

      if (isBrokeMode) {
        styleDirectives.push(
          'BROKE MODE IS ACTIVE: Protect essential groceries/bills and warn if a purchase or request eats into strict remaining allowance.'
        );
      }

      const contextJson = JSON.stringify(context).slice(0, 32000);
      const historyBlock =
        safeHistory.length > 0
          ? safeHistory
              .map((m) => `${m.role === 'user' ? 'User' : 'Penny'}: ${m.text}`)
              .join('\n')
          : 'None';

      const runPennyChatModel = async (
        ai: GoogleGenAI,
        model: string,
        useLowThinking: boolean,
        timeoutMs: number
      ) => {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            const err = new Error(
              `Penny (${model}) timed out after ${Math.round(timeoutMs / 1000)} seconds.`
            ) as Error & { code?: string; status?: number };
            err.code = 'UPSTREAM_TIMEOUT';
            err.status = 504;
            reject(err);
          }, timeoutMs);
        });

        const systemInstruction =
          'You are Penny, a full-fledged, conversational AI companion inside CartAudit (an Indian INR ₹ spending, Quick Mart grocery & bills cart, split-ledger, receipt scanner, price tracker, and budget guardrail app). ' +
          `Current screen: "${activeScreen}". User personality profile (${resolvedSummary}, primary focus: ${topFocus}). ` +
          `${styleDirectives.join(' ')} ` +
          'CAPABILITIES: Answer ANY question the user asks naturally — personal spending history, upcoming bills/refills, split balances, cart affordability, Indian grocery/meal planning on a budget, savings strategies, or general everyday conversation. ' +
          'GROUNDING RULE: Whenever referencing the user’s CartAudit numbers, past transactions, splits, people, upcoming recurring items, baskets, or Quick Mart catalog items/prices, ONLY cite facts present in the provided JSON context. Never invent fake user transactions, balances, or catalog IDs. General cooking/budgeting/life advice is welcome as long as you distinguish general suggestions from the user’s real CartAudit records. ' +
          'ACTION PROPOSALS: Whenever the user asks you to DO something (or an immediate helpful action fits their question), include 1–2 structured entries in `proposedActions` so the user can confirm & execute in one click! Never claim an action is already done — phrase it as ready to confirm. ' +
          'Supported `proposedActions[].type` values and required nested fields:\n' +
          '- `log_expense`: fill `expense` { name, amount (>0), category (strictly from context.availableCategories), date (YYYY-MM-DD optional) }\n' +
          '- `add_split`: fill `split` { name, totalAmount (>0), category, paidBy ("self" or person name), participantNames (non-empty string array of other people), includeSelf (boolean) }\n' +
          '- `settle_split`: fill `settlement` { personName, direction ("i_pay" | "they_pay"), amount (>0), note }\n' +
          '- `build_cart`: fill `cartItems` [{ itemId (EXACT id from context.catalogItems), itemName, quantity (>=1) }] — ONLY use items that exist in context.catalogItems!\n' +
          '- `load_basket`: set `basketId` to EXACT id from context.savedBaskets\n' +
          '- `add_due_recurring`: queues overdue/due-today recurring items into cart\n' +
          '- `set_budget`: set `totalBudget` (>0 number)\n' +
          '- `set_category_limit`: fill `categoryLimit` { category (from context.availableCategories), limitAmount (>0), period ("daily"|"weekly"|"monthly") }\n' +
          '- `toggle_broke_mode`: set `brokeModeEnabled` (boolean)\n' +
          '- `set_recurrence`: fill `recurrence` { itemId (from context.catalogItems), itemName, frequency ("daily"|"weekly"|"monthly"|"custom"), intervalDays }\n' +
          '- `add_price_alert`: fill `priceAlert` { productId, productName, unitOfMeasurement, targetUnitPrice OR increaseThresholdPct }\n' +
          '- `navigate`: fill `destination` { section ("overview"|"shopping"|"insights"|"expenses"|"scanner"|"wellness"), subTab }\n' +
          'If no in-app action is relevant (pure Q&A/chat), return `proposedActions: []`. Always set `title` and `summary` on every proposedAction.';

        const config: Record<string, unknown> = {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answer: {
                type: Type.STRING,
                description: 'Conversational, grounded response adapted to the user tone and length profile.',
              },
              highlights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    value: { type: Type.STRING },
                  },
                  required: ['label', 'value'],
                },
                description: 'Up to 3 concise metric callouts when numbers are helpful, else empty array.',
              },
              proposedActions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    title: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    expense: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        amount: { type: Type.NUMBER },
                        category: { type: Type.STRING },
                        date: { type: Type.STRING },
                      },
                    },
                    split: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        totalAmount: { type: Type.NUMBER },
                        category: { type: Type.STRING },
                        paidBy: { type: Type.STRING },
                        participantNames: { type: Type.ARRAY, items: { type: Type.STRING } },
                        includeSelf: { type: Type.BOOLEAN },
                      },
                    },
                    settlement: {
                      type: Type.OBJECT,
                      properties: {
                        personName: { type: Type.STRING },
                        direction: { type: Type.STRING },
                        amount: { type: Type.NUMBER },
                        note: { type: Type.STRING },
                      },
                    },
                    cartItems: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          itemId: { type: Type.STRING },
                          itemName: { type: Type.STRING },
                          quantity: { type: Type.NUMBER },
                        },
                      },
                    },
                    basketId: { type: Type.STRING },
                    totalBudget: { type: Type.NUMBER },
                    categoryLimit: {
                      type: Type.OBJECT,
                      properties: {
                        category: { type: Type.STRING },
                        limitAmount: { type: Type.NUMBER },
                        period: { type: Type.STRING },
                      },
                    },
                    brokeModeEnabled: { type: Type.BOOLEAN },
                    recurrence: {
                      type: Type.OBJECT,
                      properties: {
                        itemId: { type: Type.STRING },
                        itemName: { type: Type.STRING },
                        frequency: { type: Type.STRING },
                        intervalDays: { type: Type.NUMBER },
                      },
                    },
                    priceAlert: {
                      type: Type.OBJECT,
                      properties: {
                        productId: { type: Type.STRING },
                        productName: { type: Type.STRING },
                        unitOfMeasurement: { type: Type.STRING },
                        targetUnitPrice: { type: Type.NUMBER },
                        increaseThresholdPct: { type: Type.NUMBER },
                      },
                    },
                    destination: {
                      type: Type.OBJECT,
                      properties: {
                        section: { type: Type.STRING },
                        subTab: { type: Type.STRING },
                      },
                    },
                  },
                  required: ['type', 'title', 'summary'],
                },
              },
              followUpQuestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2 or 3 short natural follow-up prompts.',
              },
            },
            required: ['answer', 'highlights', 'proposedActions', 'followUpQuestions'],
          },
        };

        if (useLowThinking) {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }

        return Promise.race([
          ai.models.generateContent({
            model,
            contents:
              `USER LIVE CONTEXT & CATALOG (JSON):\n${contextJson}\n\n` +
              `RECENT CONVERSATION:\n${historyBlock}\n\n` +
              `CURRENT USER MESSAGE:\n${trimmedQuestion}`,
            config,
          }),
          timeoutPromise,
        ]);
      };

      const response = await runWithGeminiFallback('penny-chat', async (ai) => {
        try {
          return await runPennyChatModel(ai, 'gemini-4-hydrogen', true, 8000);
        } catch (primaryErr) {
          const parsedPrimary = extractReadableError(primaryErr);
          if (
            !isTransientUpstreamError(
              parsedPrimary.status,
              parsedPrimary.message,
              parsedPrimary.code
            )
          ) {
            throw primaryErr;
          }
          return await runPennyChatModel(ai, 'gemini-3.1-flash-lite', false, 15000);
        }
      });

      const parsed = parseJsonResponse(response.text ?? '{}');
      res.json(parsed);
    } catch (err) {
      const { status, message, code } = extractReadableError(err);
      console.error(`[penny-chat] Error (${status}): ${message}`);
      if (isAuthKeyError(status, message, code)) {
        res.status(403).json({
          error: 'Live AI reasoning is temporarily unavailable because the server API key was rejected.',
          code: 'API_KEY_INVALID',
        });
        return;
      }

      if (status === 429 || message.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          error: 'Gemini API rate limit reached. Please wait a moment and try again.',
          code: 'RESOURCE_EXHAUSTED',
        });
        return;
      }

      res.status(status).json({ error: message, code });
    }
  });

  app.post('/api/penny-parse-expense', async (req: Request, res: Response) => {
    try {
      const { text, categories, todayDate } = req.body as {
        text?: unknown;
        categories?: unknown;
        todayDate?: unknown;
      };

      if (typeof text !== 'string' || !text.trim()) {
        res.status(400).json({ error: 'Enter a short expense note like "Paid 180 for coffee".' });
        return;
      }

      const allowedCategories = Array.isArray(categories)
        ? categories.filter((c): c is string => typeof c === 'string' && c.trim().length > 0).slice(0, 40)
        : ['Groceries', 'Snacks & Beverages', 'Fuel & Transportation', 'Other Expenses'];

      const safeToday =
        typeof todayDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(todayDate)
          ? todayDate
          : new Date().toISOString().slice(0, 10);

      const runParseModel = async (
        ai: GoogleGenAI,
        model: string,
        useLowThinking: boolean,
        timeoutMs: number
      ) => {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            const err = new Error(
              `Expense parser (${model}) timed out.`
            ) as Error & { code?: string; status?: number };
            err.code = 'UPSTREAM_TIMEOUT';
            err.status = 504;
            reject(err);
          }, timeoutMs);
        });

        const config: Record<string, unknown> = {
          systemInstruction:
            `Extract a single structured expense entry from the user's natural-language text. Today is ${safeToday}. ` +
            `Choose category strictly from: ${allowedCategories.join(', ')}. ` +
            `If no amount is explicitly stated, return amount 0. If the user mentions splitting with someone, set isSplitHint true and put the person name in splitPersonHint.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: 'Clean expense title, e.g. Cold Coffee & Sandwich' },
              amount: { type: Type.NUMBER, description: 'Amount in INR' },
              category: { type: Type.STRING, description: 'Best matching category from allowed list' },
              date: { type: Type.STRING, description: 'YYYY-MM-DD date string' },
              isSplitHint: { type: Type.BOOLEAN },
              splitPersonHint: { type: Type.STRING },
            },
            required: ['name', 'amount', 'category', 'date', 'isSplitHint', 'splitPersonHint'],
          },
        };

        if (useLowThinking) {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }

        return Promise.race([
          ai.models.generateContent({
            model,
            contents: text.trim().slice(0, 300),
            config,
          }),
          timeoutPromise,
        ]);
      };

      const response = await runWithGeminiFallback('penny-parse-expense', async (ai) => {
        try {
          return await runParseModel(ai, 'gemini-4-hydrogen', true, 8000);
        } catch (primaryErr) {
          const parsedPrimary = extractReadableError(primaryErr);
          if (
            !isTransientUpstreamError(
              parsedPrimary.status,
              parsedPrimary.message,
              parsedPrimary.code
            )
          ) {
            throw primaryErr;
          }
          return await runParseModel(ai, 'gemini-3.1-flash-lite', false, 15000);
        }
      });

      const parsed = parseJsonResponse(response.text ?? '{}');
      res.json(parsed);
    } catch (err) {
      const { status, message, code } = extractReadableError(err);
      console.error(`[penny-parse-expense] Error (${status}): ${message}`);
      if (isAuthKeyError(status, message, code)) {
        res.status(403).json({
          error: 'Live AI expense parsing is temporarily unavailable because the server API key was rejected.',
          code: 'API_KEY_INVALID',
        });
        return;
      }

      if (status === 429 || message.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          error: 'Gemini API rate limit reached. Please wait a moment and try again.',
          code: 'RESOURCE_EXHAUSTED',
        });
        return;
      }

      res.status(status).json({ error: message, code });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CartAudit server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

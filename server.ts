import express from 'express';
import type { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  collectKeyCandidates,
  isAuthKeyError,
  redactSecretValues,
  resolveProviderHealthStatus,
  type ApiKeyCandidate,
  type ProviderHealthStatus,
} from './src/utils/aiKeyResolver.ts';
import {
  chooseGroqModelCandidates,
  normalizePennyChatPayload,
  normalizePennyExpensesPayload,
  normalizeReceiptScanPayload,
  parseJsonObjectFromLlm,
} from './src/utils/aiPayloadNormalizer.ts';
import {
  buildPennyChatSystemInstruction,
  buildQuickLogSystemInstruction,
} from './src/utils/pennyPrompts.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadLocalEnvFiles(): void {
  const loadFn = (process as unknown as { loadEnvFile?: (filePath?: string) => void }).loadEnvFile;
  if (typeof loadFn !== 'function') return;
  for (const filename of ['.env', '.env.local']) {
    const filePath = path.join(__dirname, filename);
    if (fs.existsSync(filePath)) {
      try {
        loadFn(filePath);
      } catch {
        // Ignore malformed local .env; platform secrets remain intact
      }
    }
  }
}
loadLocalEnvFiles();

const PORT = Number(process.env.PORT) || 3000;
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

const PROVIDER_COOLDOWN_MS = 35_000;
const MODEL_COOLDOWN_MS = 60_000;
const GROQ_CHAT_PREFERRED_MODELS = [
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'llama-3.1-8b-instant',
];
const GROQ_QUICK_PREFERRED_MODELS = [
  'llama-3.1-8b-instant',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
];
const GROQ_VISION_PREFERRED_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
];

const providerCooldownUntil: Record<'gemini' | 'groq', number> = {
  gemini: 0,
  groq: 0,
};

const modelCooldownUntil: Record<string, number> = {};
const rejectedKeyFingerprints = new Set<string>();

let groqModelsCache: { fetchedAt: number; ids: string[] } = {
  fetchedAt: 0,
  ids: [],
};

function isProviderInCooldown(provider: 'gemini' | 'groq'): boolean {
  return providerCooldownUntil[provider] > Date.now();
}

function getProviderCooldownSecs(provider: 'gemini' | 'groq'): number {
  const remaining = providerCooldownUntil[provider] - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

function markProviderCooldown(
  provider: 'gemini' | 'groq',
  ms: number = PROVIDER_COOLDOWN_MS
): void {
  providerCooldownUntil[provider] = Date.now() + ms;
}

function clearProviderCooldown(provider: 'gemini' | 'groq'): void {
  providerCooldownUntil[provider] = 0;
}

function isModelInCooldown(model: string): boolean {
  return (modelCooldownUntil[model] ?? 0) > Date.now();
}

function markModelCooldown(model: string, ms: number = MODEL_COOLDOWN_MS): void {
  modelCooldownUntil[model] = Date.now() + ms;
}

function clearModelCooldown(model: string): void {
  delete modelCooldownUntil[model];
}

interface ProviderAttemptDiagnostic {
  ok: boolean;
  source: string;
  model?: string;
  status?: number;
  code?: string;
  message?: string;
  checkedAt: string;
}

const lastProviderDiagnostics: {
  gemini: ProviderAttemptDiagnostic | null;
  groq: ProviderAttemptDiagnostic | null;
} = {
  gemini: null,
  groq: null,
};

function getGeminiKeyCandidates(): ApiKeyCandidate[] {
  return collectKeyCandidates(
    'gemini',
    [
      ['GEMINI_API_KEY', process.env.GEMINI_API_KEY],
      ['CartAudit_GEMINIAPI_KEY', process.env.CartAudit_GEMINIAPI_KEY],
      ['CARTAUDIT_GEMINIAPI_KEY', process.env.CARTAUDIT_GEMINIAPI_KEY],
      ['CartAudit_GEMINI_API_KEY', process.env.CartAudit_GEMINI_API_KEY],
      ['CARTAUDIT_GEMINI_API_KEY', process.env.CARTAUDIT_GEMINI_API_KEY],
      ['GOOGLE_API_KEY', process.env.GOOGLE_API_KEY],
      ['API_KEY', process.env.API_KEY],
    ],
    rejectedKeyFingerprints
  );
}

function getGroqKeyCandidates(): ApiKeyCandidate[] {
  return collectKeyCandidates(
    'groq',
    [
      ['GROQ_API_KEY', process.env.GROQ_API_KEY],
      ['CartAudit_GROQ_API_KEY', process.env.CartAudit_GROQ_API_KEY],
      ['CARTAUDIT_GROQ_API_KEY', process.env.CARTAUDIT_GROQ_API_KEY],
      ['CartAudit_GROQAPI_KEY', process.env.CartAudit_GROQAPI_KEY],
      ['CARTAUDIT_GROQAPI_KEY', process.env.CARTAUDIT_GROQAPI_KEY],
      ['GROQ_KEY', process.env.GROQ_KEY],
    ],
    rejectedKeyFingerprints
  );
}

function resolveGeminiKeyInfo(): ApiKeyCandidate | undefined {
  return getGeminiKeyCandidates()[0];
}

function resolveGroqKeyInfo(): ApiKeyCandidate | undefined {
  return getGroqKeyCandidates()[0];
}

function hasUsableGeminiKey(): boolean {
  return getGeminiKeyCandidates().some((c) => !c.rejected);
}

function hasUsableGroqKey(): boolean {
  return getGroqKeyCandidates().some((c) => !c.rejected);
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
    lastProviderDiagnostics.gemini = {
      ok: false,
      source: 'none',
      status: 503,
      code: 'MISSING_API_KEY',
      message: err.message,
      checkedAt: new Date().toISOString(),
    };
    throw err;
  }

  let lastErr: unknown;
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const ai = createGeminiClient(candidate.key);
    try {
      const result = await fn(ai, candidate.source);
      rejectedKeyFingerprints.delete(candidate.fingerprint);
      lastProviderDiagnostics.gemini = {
        ok: true,
        source: candidate.source,
        checkedAt: new Date().toISOString(),
      };
      return result;
    } catch (err) {
      lastErr = err;
      const parsed = extractReadableError(err);
      if (isAuthKeyError(parsed.status, parsed.message, parsed.code)) {
        rejectedKeyFingerprints.add(candidate.fingerprint);
      }
      lastProviderDiagnostics.gemini = {
        ok: false,
        source: candidate.source,
        status: parsed.status,
        code: parsed.code,
        message: redactSecretValues(parsed.message),
        checkedAt: new Date().toISOString(),
      };
      const canTryAnotherKey =
        i < candidates.length - 1 &&
        (isAuthKeyError(parsed.status, parsed.message, parsed.code) ||
          parsed.status === 400 ||
          parsed.status === 404 ||
          parsed.status === 429 ||
          parsed.message.includes('RESOURCE_EXHAUSTED'));
      if (canTryAnotherKey) {
        console.warn(
          `[${operationName}] Key from ${candidate.source} failed (${parsed.status}: ${redactSecretValues(parsed.message)}); falling back to ${candidates[i + 1].source}.`
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isModelUnavailableError(status: number, message: string, code: string): boolean {
  const lower = `${code} ${message}`.toLowerCase();
  return (
    status === 404 ||
    lower.includes('model_not_found') ||
    lower.includes('model_decommissioned') ||
    lower.includes('does not exist') ||
    lower.includes('decommissioned')
  );
}

async function fetchGroqModelCatalog(apiKey: string, forceRefresh = false): Promise<string[]> {
  if (!forceRefresh && groqModelsCache.ids.length > 0 && Date.now() - groqModelsCache.fetchedAt < 5 * 60_000) {
    return groqModelsCache.ids;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    if (!res.ok) return groqModelsCache.ids;
    const json = (await res.json()) as { data?: Array<{ id?: string }> };
    const ids = Array.isArray(json.data)
      ? json.data.map((m) => m.id).filter((id): id is string => typeof id === 'string' && id.length > 0)
      : [];
    if (ids.length > 0) {
      groqModelsCache = { fetchedAt: Date.now(), ids };
    }
    return ids;
  } catch {
    return groqModelsCache.ids;
  } finally {
    clearTimeout(timer);
  }
}

async function callGroqChatCompletion(params: {
  apiKey: string;
  model: string;
  messages: Array<{ role: 'system' | 'user'; content: unknown }>;
  timeoutMs: number;
  maxCompletionTokens?: number;
}): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs);

  try {
    const payload: Record<string, unknown> = {
      model: params.model,
      messages: params.messages,
      temperature: 0.2,
      max_completion_tokens: params.maxCompletionTokens ?? 4096,
      response_format: { type: 'json_object' },
    };

    if (params.model.includes('gpt-oss')) {
      payload.reasoning_effort = 'low';
    }

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const rawBody = await res.text();
    let parsedBody: {
      error?: { message?: string; code?: string; type?: string };
      choices?: Array<{ message?: { content?: string | null } }>;
    } | null = null;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = null;
    }

    if (!res.ok) {
      const errMsg = parsedBody?.error?.message || `Groq request failed (${res.status}).`;
      const err = new Error(errMsg) as Error & { status?: number; code?: string };
      err.status = res.status;
      err.code = parsedBody?.error?.code || parsedBody?.error?.type || `GROQ_${res.status}`;
      throw err;
    }

    const content = parsedBody?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      const err = new Error(`Groq (${params.model}) returned an empty response.`) as Error & {
        status?: number;
        code?: string;
      };
      err.status = 502;
      err.code = 'EMPTY_RESPONSE';
      throw err;
    }

    return content;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      const timeoutErr = new Error(
        `Groq (${params.model}) timed out after ${Math.round(params.timeoutMs / 1000)}s.`
      ) as Error & { status?: number; code?: string };
      timeoutErr.status = 504;
      timeoutErr.code = 'UPSTREAM_TIMEOUT';
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function runWithGroqFallback(params: {
  operationName: string;
  preferredModels: string[];
  kind: 'chat' | 'vision';
  messages: Array<{ role: 'system' | 'user'; content: unknown }>;
  timeoutMs: number;
  maxCompletionTokens?: number;
}): Promise<{ text: string; model: string }> {
  const candidates = getGroqKeyCandidates();
  if (candidates.length === 0) {
    const err = new Error('No Groq API key is configured on the server.') as Error & {
      code?: string;
      status?: number;
    };
    err.code = 'MISSING_GROQ_KEY';
    err.status = 503;
    throw err;
  }

  let lastErr: unknown;
  for (const keyCandidate of candidates) {
    let modelsToTry = chooseGroqModelCandidates(
      params.preferredModels,
      groqModelsCache.ids,
      params.kind
    );
    let refreshedCatalog = false;

    for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
      const model = modelsToTry[mIdx];
      try {
        const text = await callGroqChatCompletion({
          apiKey: keyCandidate.key,
          model,
          messages: params.messages,
          timeoutMs: params.timeoutMs,
          maxCompletionTokens: params.maxCompletionTokens,
        });
        rejectedKeyFingerprints.delete(keyCandidate.fingerprint);
        clearProviderCooldown('groq');
        lastProviderDiagnostics.groq = {
          ok: true,
          source: keyCandidate.source,
          model,
          checkedAt: new Date().toISOString(),
        };
        return { text, model };
      } catch (err) {
        lastErr = err;
        const parsed = extractReadableError(err);
        lastProviderDiagnostics.groq = {
          ok: false,
          source: keyCandidate.source,
          model,
          status: parsed.status,
          code: parsed.code,
          message: redactSecretValues(parsed.message),
          checkedAt: new Date().toISOString(),
        };
        console.warn(
          `[${params.operationName}] Groq (${model} via ${keyCandidate.source}) failed (${parsed.status}): ${redactSecretValues(parsed.message)}`
        );

        if (isAuthKeyError(parsed.status, parsed.message, parsed.code)) {
          rejectedKeyFingerprints.add(keyCandidate.fingerprint);
          break; // try next Groq key candidate if any
        }

        if (isModelUnavailableError(parsed.status, parsed.message, parsed.code) && !refreshedCatalog) {
          refreshedCatalog = true;
          const liveIds = await fetchGroqModelCatalog(keyCandidate.key, true);
          const refreshed = chooseGroqModelCandidates(params.preferredModels, liveIds, params.kind).filter(
            (id) => id !== model
          );
          if (refreshed.length > 0) {
            modelsToTry = [model, ...refreshed];
            continue;
          }
        }

        if (
          isTransientUpstreamError(parsed.status, parsed.message, parsed.code) ||
          isModelUnavailableError(parsed.status, parsed.message, parsed.code) ||
          parsed.status === 400
        ) {
          if (mIdx < modelsToTry.length - 1) {
            await sleep(250);
            continue;
          }
          if (isTransientUpstreamError(parsed.status, parsed.message, parsed.code)) {
            markProviderCooldown('groq');
          }
        }

        throw err;
      }
    }
  }

  throw lastErr;
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
  return parseJsonObjectFromLlm(rawText);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    let geminiCandidates = getGeminiKeyCandidates();
    let groqCandidates = getGroqKeyCandidates();

    let verification:
      | {
          gemini?: Array<{ source: string; ok: boolean; model?: string; status?: number; code?: string; message?: string }>;
          groq?: Array<{ source: string; ok: boolean; status?: number; code?: string; message?: string; modelsCount?: number }>;
        }
      | undefined;

    if (req.query.verify === '1') {
      rejectedKeyFingerprints.clear();
      geminiCandidates = getGeminiKeyCandidates();
      groqCandidates = getGroqKeyCandidates();

      const [geminiChecks, groqChecks] = await Promise.all([
        Promise.all(
          geminiCandidates.map(async (c) => {
            try {
              const ai = createGeminiClient(c.key);
              await ai.models.generateContent({
                model: 'gemini-3.1-flash-lite',
                contents: 'Reply with OK',
              });
              return { source: c.source, ok: true, model: 'gemini-3.1-flash-lite', status: 200 };
            } catch (err) {
              const p = extractReadableError(err);
              if (isAuthKeyError(p.status, p.message, p.code)) {
                rejectedKeyFingerprints.add(c.fingerprint);
              }
              return {
                source: c.source,
                ok: false,
                model: 'gemini-3.1-flash-lite',
                status: p.status,
                code: p.code,
                message: redactSecretValues(p.message),
              };
            }
          })
        ),
        Promise.all(
          groqCandidates.map(async (c) => {
            try {
              const r = await fetch('https://api.groq.com/openai/v1/models', {
                headers: { Authorization: `Bearer ${c.key}` },
              });
              if (!r.ok) {
                const txt = await r.text();
                if (isAuthKeyError(r.status, txt, '')) {
                  rejectedKeyFingerprints.add(c.fingerprint);
                }
                return {
                  source: c.source,
                  ok: false,
                  status: r.status,
                  message: redactSecretValues(txt.slice(0, 240)),
                };
              }
              const json = (await r.json()) as { data?: Array<{ id?: string }> };
              return {
                source: c.source,
                ok: true,
                status: 200,
                modelsCount: Array.isArray(json.data) ? json.data.length : 0,
              };
            } catch (err) {
              const p = extractReadableError(err);
              return {
                source: c.source,
                ok: false,
                status: p.status,
                code: p.code,
                message: redactSecretValues(p.message),
              };
            }
          })
        ),
      ]);
      verification = { gemini: geminiChecks, groq: groqChecks };
      geminiCandidates = getGeminiKeyCandidates();
      groqCandidates = getGroqKeyCandidates();
    }

    const activeGeminiCount = geminiCandidates.filter((c) => !c.rejected).length;
    const activeGroqCount = groqCandidates.filter((c) => !c.rejected).length;
    const geminiConfigured = activeGeminiCount > 0;
    const groqConfigured = activeGroqCount > 0;
    const aiConfigured = geminiConfigured || groqConfigured;
    const geminiStatus: ProviderHealthStatus = resolveProviderHealthStatus({
      allCandidatesCount: geminiCandidates.length,
      activeCandidatesCount: activeGeminiCount,
      inCooldown: isProviderInCooldown('gemini'),
    });
    const groqStatus: ProviderHealthStatus = resolveProviderHealthStatus({
      allCandidatesCount: groqCandidates.length,
      activeCandidatesCount: activeGroqCount,
      inCooldown: isProviderInCooldown('groq'),
    });
    const geminiInfo = geminiCandidates[0];
    const groqInfo = groqCandidates[0];

    res.json({
      ok: true,
      geminiConfigured,
      groqConfigured,
      aiConfigured,
      visionConfigured: aiConfigured,
      pennyConfigured: aiConfigured,
      geminiStatus,
      groqStatus,
      keySource: geminiInfo?.source ?? null,
      groqKeySource: groqInfo?.source ?? null,
      geminiKeySources: geminiCandidates.map((c) => c.source),
      groqKeySources: groqCandidates.map((c) => c.source),
      model: isModelInCooldown('gemini-4-hydrogen') ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen',
      pennyModel: groqConfigured ? GROQ_CHAT_PREFERRED_MODELS[0] : 'gemini-3.1-flash-lite',
      visionFallbackModel: groqConfigured ? GROQ_VISION_PREFERRED_MODELS[0] : 'tesseract-ocr',
      geminiCooldownSecs: getProviderCooldownSecs('gemini'),
      groqCooldownSecs: getProviderCooldownSecs('groq'),
      diagnostics: lastProviderDiagnostics,
      ...(verification ? { verification } : {}),
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

      const safeMime = normalizedMime === 'image/jpg' ? 'image/jpeg' : normalizedMime;
      const startedAt = Date.now();
      const geminiUsable = hasUsableGeminiKey();
      const groqUsable = hasUsableGroqKey();
      const skipGeminiDueToCooldown =
        isProviderInCooldown('gemini') && groqUsable && !isProviderInCooldown('groq');

      let lastErr: unknown = null;

      // 1. Primary Vision: Gemini (with model-level fallback between gemini-4-hydrogen and gemini-3.1-flash-lite)
      if (geminiUsable && !skipGeminiDueToCooldown) {
        try {
          let modelUsed = isModelInCooldown('gemini-4-hydrogen')
            ? 'gemini-3.1-flash-lite'
            : 'gemini-4-hydrogen';
          const response = await runWithGeminiFallback('scan-receipt', async (ai) => {
            if (isModelInCooldown('gemini-4-hydrogen')) {
              modelUsed = 'gemini-3.1-flash-lite';
              return await runReceiptVisionModel(
                ai,
                modelUsed,
                normalizedMime,
                imageBase64,
                false,
                15000
              );
            }
            try {
              modelUsed = 'gemini-4-hydrogen';
              const resVision = await runReceiptVisionModel(
                ai,
                'gemini-4-hydrogen',
                normalizedMime,
                imageBase64,
                true,
                5500
              );
              clearModelCooldown('gemini-4-hydrogen');
              return resVision;
            } catch (primaryErr) {
              const parsedPrimary = extractReadableError(primaryErr);
              console.warn(
                `[scan-receipt] Gemini primary (${modelUsed}) error (${parsedPrimary.status}): ${redactSecretValues(parsedPrimary.message)}`
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
              markModelCooldown('gemini-4-hydrogen');
              await sleep(250);
              modelUsed = 'gemini-3.1-flash-lite';
              return await runReceiptVisionModel(
                ai,
                modelUsed,
                normalizedMime,
                imageBase64,
                false,
                15000
              );
            }
          });

          clearProviderCooldown('gemini');
          console.info(
            `[scan-receipt] Gemini (${modelUsed}) succeeded in ${Date.now() - startedAt}ms`
          );
          const normalized = normalizeReceiptScanPayload(
            parseJsonResponse(response.text ?? '{}')
          );
          res.json({
            ...normalized,
            provider: 'gemini',
            model: modelUsed,
          });
          return;
        } catch (geminiErr) {
          lastErr = geminiErr;
          const parsed = extractReadableError(geminiErr);
          if (isTransientUpstreamError(parsed.status, parsed.message, parsed.code)) {
            markProviderCooldown('gemini');
          }
          if (!groqUsable) {
            throw geminiErr;
          }
          console.warn(
            `[scan-receipt] Gemini Vision unavailable (${parsed.status}: ${redactSecretValues(parsed.message)}); failing over to Groq Vision.`
          );
        }
      }

      // 2. Secondary Vision Fallback: Groq Vision
      if (groqUsable && !isProviderInCooldown('groq')) {
        try {
          const visionPrompt =
            'You are a precise receipt and grocery-app checkout parser for Indian quick-commerce platforms (Blinkit, Zepto, Swiggy Instamart, BigBasket, Amazon Fresh, JioMart) and retail/pharmacy receipts. ' +
            'ONLY extract visibly readable items, merchant names, prices, taxes, and fees. Never invent or fabricate items if the image is blank or unreadable. ' +
            'Ignore strikethrough MRP prices and use the actual charged price per item in INR. ' +
            'Return a single valid JSON object with keys: ' +
            '{"merchant": string, "date": string (ISO 8601 or ""), "items": [{"name": string, "price": number, "category": string, "unit": string, "brand": string}], "subtotal": number, "taxTotal": number, "deliveryFee": number, "total": number}. ' +
            'Valid categories: Groceries, Fruits & Vegetables, Dairy & Bakery, Snacks & Beverages, Meat & Eggs, Personal Care, Household Essentials, Cleaning Supplies, Electronics, Clothing & Accessories, Medicines & Healthcare, Stationery, Mobile & Internet Bills, Electricity & Utilities, Fuel & Transportation, Entertainment, Other Expenses.';

          const groqResult = await runWithGroqFallback({
            operationName: 'scan-receipt',
            preferredModels: GROQ_VISION_PREFERRED_MODELS,
            kind: 'vision',
            timeoutMs: 14000,
            maxCompletionTokens: 3000,
            messages: [
              { role: 'system', content: visionPrompt },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Extract all visible purchased items, fees, taxes, and totals from this receipt as JSON.',
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${safeMime};base64,${imageBase64}`,
                    },
                  },
                ],
              },
            ],
          });

          console.info(
            `[scan-receipt] Groq (${groqResult.model}) succeeded in ${Date.now() - startedAt}ms`
          );
          const normalized = normalizeReceiptScanPayload(
            parseJsonResponse(groqResult.text)
          );
          res.json({
            ...normalized,
            provider: 'groq',
            model: groqResult.model,
          });
          return;
        } catch (groqErr) {
          if (!lastErr) {
            lastErr = groqErr;
          }
        }
      }

      if (lastErr) {
        throw lastErr;
      }

      const unavailableErr = new Error(
        'Cloud AI Vision providers are currently busy or unconfigured.'
      ) as Error & { status?: number; code?: string };
      unavailableErr.status = 503;
      unavailableErr.code = 'UNAVAILABLE';
      throw unavailableErr;
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
          error: 'AI Vision rate limit reached. Switching to offline browser OCR.',
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

      const availableCategories = Array.isArray(ctxRecord.availableCategories)
        ? ctxRecord.availableCategories.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
        : undefined;
      const asOfDate = typeof ctxRecord.asOfDate === 'string' ? ctxRecord.asOfDate : undefined;

      const systemInstructionText = buildPennyChatSystemInstruction({
        activeScreen,
        resolvedSummary,
        topFocus,
        styleDirectives,
        availableCategories,
        asOfDate,
      });

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

        const config: Record<string, unknown> = {
          systemInstruction: systemInstructionText,
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
                    expenses: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          amount: { type: Type.NUMBER },
                          category: { type: Type.STRING },
                          date: { type: Type.STRING },
                        },
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

      const geminiUsable = hasUsableGeminiKey();
      const groqUsable = hasUsableGroqKey();

      const userPromptPayload =
        `USER LIVE CONTEXT & CATALOG (JSON):\n${contextJson}\n\n` +
        `RECENT CONVERSATION:\n${historyBlock}\n\n` +
        `CURRENT USER MESSAGE:\n${trimmedQuestion}`;

      let pennyLastErr: unknown = null;

      // 1. Primary for Penny Chat: Groq when a usable Groq key is active
      if (groqUsable && !isProviderInCooldown('groq')) {
        try {
          const groqSchemaInstruction =
            `${systemInstructionText}\n\n` +
            'RESPONSE FORMAT: Return ONLY a single valid JSON object with exact keys: ' +
            '{"answer": string, "highlights": [{"label": string, "value": string}] (max 3), "proposedActions": [{"type": string, "title": string, "summary": string, ...optional action payload}], "followUpQuestions": [string] (2-3 short follow-ups)}.';

          const groqResult = await runWithGroqFallback({
            operationName: 'penny-chat',
            preferredModels: GROQ_CHAT_PREFERRED_MODELS,
            kind: 'chat',
            timeoutMs: 9500,
            maxCompletionTokens: 3200,
            messages: [
              { role: 'system', content: groqSchemaInstruction },
              { role: 'user', content: userPromptPayload },
            ],
          });

          const normalized = normalizePennyChatPayload(parseJsonResponse(groqResult.text));
          if (normalized.answer) {
            res.json({
              ...normalized,
              provider: 'groq',
              model: groqResult.model,
            });
            return;
          }
        } catch (groqErr) {
          pennyLastErr = groqErr;
          const parsedGroq = extractReadableError(groqErr);
          console.warn(
            `[penny-chat] Groq primary failed (${parsedGroq.status}): ${redactSecretValues(parsedGroq.message)}`
          );
        }
      }

      // 2. Conditional Backup (or immediate primary if Groq is unconfigured/invalid): Gemini
      if (geminiUsable && !isProviderInCooldown('gemini')) {
        try {
          let geminiModelUsed = 'gemini-3.1-flash-lite';
          const response = await runWithGeminiFallback('penny-chat', async (ai) => {
            try {
              geminiModelUsed = 'gemini-3.1-flash-lite';
              return await runPennyChatModel(ai, geminiModelUsed, false, 8500);
            } catch (primaryErr) {
              const parsedPrimary = extractReadableError(primaryErr);
              if (
                !isTransientUpstreamError(
                  parsedPrimary.status,
                  parsedPrimary.message,
                  parsedPrimary.code
                ) ||
                isModelInCooldown('gemini-4-hydrogen')
              ) {
                throw primaryErr;
              }
              await sleep(250);
              geminiModelUsed = 'gemini-4-hydrogen';
              try {
                const fallbackRes = await runPennyChatModel(ai, geminiModelUsed, true, 8500);
                clearModelCooldown('gemini-4-hydrogen');
                return fallbackRes;
              } catch (fallbackErr) {
                const parsedFb = extractReadableError(fallbackErr);
                if (isTransientUpstreamError(parsedFb.status, parsedFb.message, parsedFb.code)) {
                  markModelCooldown('gemini-4-hydrogen');
                }
                throw fallbackErr;
              }
            }
          });

          clearProviderCooldown('gemini');
          const normalized = normalizePennyChatPayload(
            parseJsonResponse(response.text ?? '{}')
          );
          if (normalized.answer) {
            res.json({
              ...normalized,
              provider: 'gemini',
              model: geminiModelUsed,
            });
            return;
          }
        } catch (geminiErr) {
          pennyLastErr = geminiErr;
          const parsedGemini = extractReadableError(geminiErr);
          if (isTransientUpstreamError(parsedGemini.status, parsedGemini.message, parsedGemini.code)) {
            markProviderCooldown('gemini');
          }
        }
      }

      if (pennyLastErr) {
        throw pennyLastErr;
      }

      const unavailableErr = new Error(
        'Cloud AI providers are temporarily busy or unconfigured.'
      ) as Error & { status?: number; code?: string };
      unavailableErr.status = 503;
      unavailableErr.code = 'UNAVAILABLE';
      throw unavailableErr;
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

      const cleanInputText = text.trim().slice(0, 1500);

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
          systemInstruction: buildQuickLogSystemInstruction({
            safeToday,
            allowedCategories,
            outputFormat: 'gemini_schema',
          }),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              expenses: {
                type: Type.ARRAY,
                items: {
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
              },
            },
            required: ['expenses'],
          },
        };

        if (useLowThinking) {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }

        return Promise.race([
          ai.models.generateContent({
            model,
            contents: cleanInputText,
            config,
          }),
          timeoutPromise,
        ]);
      };

      const geminiUsable = hasUsableGeminiKey();
      const groqUsable = hasUsableGroqKey();
      let parseLastErr: unknown = null;

      // 1. Primary for Quick Log: Groq when a usable Groq key is active
      if (groqUsable && !isProviderInCooldown('groq')) {
        try {
          const groqParsePrompt = buildQuickLogSystemInstruction({
            safeToday,
            allowedCategories,
            outputFormat: 'groq_json',
          });

          const groqResult = await runWithGroqFallback({
            operationName: 'penny-parse-expense',
            preferredModels: GROQ_QUICK_PREFERRED_MODELS,
            kind: 'chat',
            timeoutMs: 8500,
            maxCompletionTokens: 2000,
            messages: [
              { role: 'system', content: groqParsePrompt },
              { role: 'user', content: cleanInputText },
            ],
          });

          const normalized = normalizePennyExpensesPayload(
            parseJsonResponse(groqResult.text),
            allowedCategories,
            safeToday,
            cleanInputText
          );
          res.json({
            ...normalized,
            provider: 'groq',
            model: groqResult.model,
          });
          return;
        } catch (groqErr) {
          parseLastErr = groqErr;
          const parsedGroq = extractReadableError(groqErr);
          console.warn(
            `[penny-parse-expense] Groq primary failed (${parsedGroq.status}): ${redactSecretValues(parsedGroq.message)}`
          );
        }
      }

      // 2. Conditional Backup (or immediate primary if Groq is unconfigured/invalid): Gemini
      if (geminiUsable && !isProviderInCooldown('gemini')) {
        try {
          let geminiModelUsed = 'gemini-3.1-flash-lite';
          const response = await runWithGeminiFallback('penny-parse-expense', async (ai) => {
            try {
              geminiModelUsed = 'gemini-3.1-flash-lite';
              return await runParseModel(ai, geminiModelUsed, false, 8500);
            } catch (primaryErr) {
              const parsedPrimary = extractReadableError(primaryErr);
              if (
                !isTransientUpstreamError(
                  parsedPrimary.status,
                  parsedPrimary.message,
                  parsedPrimary.code
                ) ||
                isModelInCooldown('gemini-4-hydrogen')
              ) {
                throw primaryErr;
              }
              await sleep(250);
              geminiModelUsed = 'gemini-4-hydrogen';
              try {
                const fallbackRes = await runParseModel(ai, geminiModelUsed, true, 8500);
                clearModelCooldown('gemini-4-hydrogen');
                return fallbackRes;
              } catch (fallbackErr) {
                const parsedFb = extractReadableError(fallbackErr);
                if (isTransientUpstreamError(parsedFb.status, parsedFb.message, parsedFb.code)) {
                  markModelCooldown('gemini-4-hydrogen');
                }
                throw fallbackErr;
              }
            }
          });

          clearProviderCooldown('gemini');
          const normalized = normalizePennyExpensesPayload(
            parseJsonResponse(response.text ?? '{}'),
            allowedCategories,
            safeToday,
            cleanInputText
          );
          res.json({
            ...normalized,
            provider: 'gemini',
            model: geminiModelUsed,
          });
          return;
        } catch (geminiErr) {
          parseLastErr = geminiErr;
          const parsedGemini = extractReadableError(geminiErr);
          if (isTransientUpstreamError(parsedGemini.status, parsedGemini.message, parsedGemini.code)) {
            markProviderCooldown('gemini');
          }
        }
      }

      if (parseLastErr) {
        throw parseLastErr;
      }

      const unavailableErr = new Error(
        'Cloud AI expense parser is temporarily busy or unconfigured.'
      ) as Error & { status?: number; code?: string };
      unavailableErr.status = 503;
      unavailableErr.code = 'UNAVAILABLE';
      throw unavailableErr;
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

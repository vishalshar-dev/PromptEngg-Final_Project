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

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error(
      'GEMINI_API_KEY is not set. Add it in Settings > Secrets to enable AI receipt scanning.'
    ) as Error & { code?: string; status?: number };
    err.code = 'MISSING_API_KEY';
    err.status = 503;
    throw err;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
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
    res.json({
      ok: true,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
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

      const ai = getGeminiClient();
      const startedAt = Date.now();
      let response;
      let modelUsed = 'gemini-4-hydrogen';

      try {
        response = await runReceiptVisionModel(
          ai,
          'gemini-4-hydrogen',
          normalizedMime,
          imageBase64,
          true,
          12000
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
        response = await runReceiptVisionModel(
          ai,
          modelUsed,
          normalizedMime,
          imageBase64,
          false,
          16000
        );
      }

      console.info(
        `[scan-receipt] ${modelUsed} succeeded in ${Date.now() - startedAt}ms`
      );
      const parsed = parseJsonResponse(response.text ?? '{}');
      res.json(parsed);
    } catch (err) {
      const { status, message, code } = extractReadableError(err);
      console.error(`[scan-receipt] Error (${status}): ${message}`);

      if (message.includes('API_KEY_INVALID') || message.includes('PERMISSION_DENIED')) {
        res.status(403).json({
          error: 'Gemini API key is invalid or unauthorized. Please check Settings > Secrets.',
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

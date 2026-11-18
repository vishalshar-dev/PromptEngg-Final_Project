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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

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

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
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
                'Extract all purchased items, fees, taxes, and totals from this receipt or quick-commerce checkout screenshot. ' +
                'Ignore strikethrough MRP prices and use the actual charged price per line item. ' +
                'Sum delivery, handling, packaging, platform, surge, rain, and small-cart fees into deliveryFee. ' +
                'Sum GST, CGST, SGST, and other taxes into taxTotal.',
            },
          ],
        },
        config: {
          systemInstruction:
            'You are a precise receipt and grocery-app checkout parser for Indian quick-commerce platforms (Blinkit, Zepto, Swiggy Instamart, BigBasket, Amazon Fresh, JioMart, etc.) and retail receipts. Return valid JSON matching the schema.',
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
        },
      });

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);
      res.json(parsed);
    } catch (err) {
      const errorObj = err as Error & { code?: string; status?: number };
      const status = typeof errorObj.status === 'number' ? errorObj.status : 500;
      const message = errorObj.message || 'Failed to scan receipt with Gemini Vision.';

      if (message.includes('API_KEY_INVALID') || message.includes('PERMISSION_DENIED')) {
        res.status(403).json({
          error: 'Gemini API key is invalid or unauthorized. Please check Settings > Secrets.',
          code: 'API_KEY_INVALID',
        });
        return;
      }

      if (message.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          error: 'Gemini API rate limit or quota reached. Please wait a moment and try again.',
          code: 'RESOURCE_EXHAUSTED',
        });
        return;
      }

      res.status(status).json({
        error: message,
        code: errorObj.code || 'SCAN_FAILED',
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

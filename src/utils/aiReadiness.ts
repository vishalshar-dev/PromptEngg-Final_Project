export interface GeminiHealthStatus {
  ok: boolean;
  geminiConfigured: boolean;
  model?: string;
}

let cachedHealth: GeminiHealthStatus | null = null;
let inflightRequest: Promise<GeminiHealthStatus> | null = null;

export async function fetchGeminiHealth(forceRefresh = false): Promise<GeminiHealthStatus> {
  if (!forceRefresh && cachedHealth) {
    return cachedHealth;
  }
  if (!forceRefresh && inflightRequest) {
    return inflightRequest;
  }

  inflightRequest = (async () => {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (!res.ok) {
        cachedHealth = { ok: false, geminiConfigured: false };
        return cachedHealth;
      }
      const data = (await res.json()) as {
        ok?: boolean;
        geminiConfigured?: boolean;
        model?: string;
      };
      cachedHealth = {
        ok: Boolean(data?.ok ?? true),
        geminiConfigured: Boolean(data?.geminiConfigured),
        model: typeof data?.model === 'string' ? data.model : undefined,
      };
      return cachedHealth;
    } catch {
      cachedHealth = { ok: false, geminiConfigured: false };
      return cachedHealth;
    } finally {
      inflightRequest = null;
    }
  })();

  return inflightRequest;
}

export function getCachedGeminiConfigured(): boolean | null {
  return cachedHealth ? cachedHealth.geminiConfigured : null;
}

export function markGeminiConfigured(value: boolean): void {
  cachedHealth = {
    ok: cachedHealth?.ok ?? true,
    geminiConfigured: value,
    model: cachedHealth?.model,
  };
}

export function resetGeminiHealthCache(): void {
  cachedHealth = null;
  inflightRequest = null;
}

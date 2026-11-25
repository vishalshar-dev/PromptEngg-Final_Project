export interface GeminiHealthStatus {
  ok: boolean;
  geminiConfigured: boolean;
  groqConfigured: boolean;
  aiConfigured: boolean;
  visionConfigured: boolean;
  pennyConfigured: boolean;
  geminiStatus?: 'active' | 'invalid_key' | 'cooldown' | 'unconfigured';
  groqStatus?: 'active' | 'invalid_key' | 'cooldown' | 'unconfigured';
  model?: string;
  pennyModel?: string;
  visionFallbackModel?: string;
}

let cachedHealth: GeminiHealthStatus | null = null;
let inflightRequest: Promise<GeminiHealthStatus> | null = null;

function emptyHealth(ok: boolean): GeminiHealthStatus {
  return {
    ok,
    geminiConfigured: false,
    groqConfigured: false,
    aiConfigured: false,
    visionConfigured: false,
    pennyConfigured: false,
  };
}

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
        cachedHealth = emptyHealth(false);
        return cachedHealth;
      }
      const data = (await res.json()) as {
        ok?: boolean;
        geminiConfigured?: boolean;
        groqConfigured?: boolean;
        aiConfigured?: boolean;
        visionConfigured?: boolean;
        pennyConfigured?: boolean;
        geminiStatus?: 'active' | 'invalid_key' | 'cooldown' | 'unconfigured';
        groqStatus?: 'active' | 'invalid_key' | 'cooldown' | 'unconfigured';
        model?: string;
        pennyModel?: string;
        visionFallbackModel?: string;
      };
      const geminiConfigured = Boolean(data?.geminiConfigured);
      const groqConfigured = Boolean(data?.groqConfigured);
      const aiConfigured =
        typeof data?.aiConfigured === 'boolean'
          ? data.aiConfigured
          : geminiConfigured || groqConfigured;
      cachedHealth = {
        ok: Boolean(data?.ok ?? true),
        geminiConfigured,
        groqConfigured,
        aiConfigured,
        visionConfigured:
          typeof data?.visionConfigured === 'boolean' ? data.visionConfigured : aiConfigured,
        pennyConfigured:
          typeof data?.pennyConfigured === 'boolean' ? data.pennyConfigured : aiConfigured,
        geminiStatus: data?.geminiStatus,
        groqStatus: data?.groqStatus,
        model: typeof data?.model === 'string' ? data.model : undefined,
        pennyModel: typeof data?.pennyModel === 'string' ? data.pennyModel : undefined,
        visionFallbackModel:
          typeof data?.visionFallbackModel === 'string' ? data.visionFallbackModel : undefined,
      };
      return cachedHealth;
    } catch {
      cachedHealth = emptyHealth(false);
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

export function getCachedAiConfigured(): boolean | null {
  return cachedHealth ? cachedHealth.aiConfigured : null;
}

export function markGeminiConfigured(value: boolean): void {
  const groqConfigured = cachedHealth?.groqConfigured ?? false;
  const aiConfigured = value || groqConfigured;
  cachedHealth = {
    ok: cachedHealth?.ok ?? true,
    geminiConfigured: value,
    groqConfigured,
    aiConfigured,
    visionConfigured: aiConfigured,
    pennyConfigured: aiConfigured,
    model: cachedHealth?.model,
    pennyModel: cachedHealth?.pennyModel,
    visionFallbackModel: cachedHealth?.visionFallbackModel,
  };
}

export function markAiConfigured(value: boolean): void {
  cachedHealth = {
    ok: cachedHealth?.ok ?? true,
    geminiConfigured: value ? (cachedHealth?.geminiConfigured ?? false) : false,
    groqConfigured: value ? (cachedHealth?.groqConfigured ?? false) : false,
    aiConfigured: value,
    visionConfigured: value,
    pennyConfigured: value,
    model: cachedHealth?.model,
    pennyModel: cachedHealth?.pennyModel,
    visionFallbackModel: cachedHealth?.visionFallbackModel,
  };
}

export function resetGeminiHealthCache(): void {
  cachedHealth = null;
  inflightRequest = null;
}

import { markAiConfigured } from './aiReadiness';

export const LIVE_AI_COOLDOWN_MS = 60_000;

export type LiveAiCircuitMode = 'live' | 'cooldown' | 'offline';

export interface LiveAiAvailability {
  mode: LiveAiCircuitMode;
  retryAfterMs: number;
  reason: string | null;
}

export type AiPostResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      code?: string;
      error: string;
      transient: boolean;
      skippedByCooldown?: boolean;
    };

let cooldownUntilMs = 0;
let lastFailureMode: 'cooldown' | 'offline' = 'cooldown';
let lastFailureReason: string | null = null;
let queueChain: Promise<void> = Promise.resolve();

export async function parseJsonResponseSafe<T>(res: Response): Promise<T | null> {
  try {
    const raw = await res.text();
    const trimmed = raw.trim();
    if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
      return null;
    }
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}

export function isTransientAiFailure(
  status: number,
  code?: string,
  message?: string
): boolean {
  if (status === 0 || status === 429 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  const combined = `${code ?? ''} ${message ?? ''}`.toUpperCase();
  return (
    combined.includes('UNAVAILABLE') ||
    combined.includes('HIGH DEMAND') ||
    combined.includes('RESOURCE_EXHAUSTED') ||
    combined.includes('UPSTREAM_TIMEOUT') ||
    combined.includes('OVERLOADED') ||
    combined.includes('ABORT') ||
    combined.includes('FAILED TO FETCH') ||
    combined.includes('NETWORK')
  );
}

export function getLiveAiAvailability(nowMs: number = Date.now()): LiveAiAvailability {
  if (cooldownUntilMs <= nowMs) {
    return { mode: 'live', retryAfterMs: 0, reason: null };
  }
  return {
    mode: lastFailureMode,
    retryAfterMs: Math.max(0, cooldownUntilMs - nowMs),
    reason: lastFailureReason,
  };
}

export function markLiveAiSuccess(): void {
  cooldownUntilMs = 0;
  lastFailureReason = null;
  markAiConfigured(true);
}

export function markLiveAiBusy(
  reason: string = 'Live AI servers are temporarily busy.',
  cooldownMs: number = LIVE_AI_COOLDOWN_MS,
  nowMs: number = Date.now()
): void {
  lastFailureMode = 'cooldown';
  lastFailureReason = reason;
  cooldownUntilMs = nowMs + Math.max(1000, cooldownMs);
  markAiConfigured(false);
}

export function markBackendOffline(
  reason: string = 'Live AI backend is currently unreachable.',
  cooldownMs: number = LIVE_AI_COOLDOWN_MS,
  nowMs: number = Date.now()
): void {
  lastFailureMode = 'offline';
  lastFailureReason = reason;
  cooldownUntilMs = nowMs + Math.max(1000, cooldownMs);
  markAiConfigured(false);
}

export function clearLiveAiCooldown(): void {
  cooldownUntilMs = 0;
  lastFailureReason = null;
}

export function resetAiClientForTests(): void {
  cooldownUntilMs = 0;
  lastFailureMode = 'cooldown';
  lastFailureReason = null;
  queueChain = Promise.resolve();
}

/**
 * Enqueues AI POST requests sequentially so overlapping UI actions
 * (chat, quick-log, receipt scan) do not fire concurrently and trigger 429 bursts.
 * When in cooldown after a 503/429/offline event, returns immediately so callers
 * can use local fallbacks with zero delay.
 */
export function enqueueAiPost<T>(
  endpoint: string,
  body: unknown,
  options?: {
    timeoutMs?: number;
    bypassCooldown?: boolean;
    fetchImpl?: typeof fetch;
    nowMs?: () => number;
  }
): Promise<AiPostResult<T>> {
  const fetchFn = options?.fetchImpl ?? fetch;
  const nowFn = options?.nowMs ?? Date.now;
  const timeoutMs = options?.timeoutMs ?? 12_000;

  const task = queueChain.then(async (): Promise<AiPostResult<T>> => {
    const availability = getLiveAiAvailability(nowFn());
    if (!options?.bypassCooldown && availability.mode !== 'live') {
      return {
        ok: false,
        status: availability.mode === 'offline' ? 0 : 503,
        code: availability.mode === 'offline' ? 'BACKEND_OFFLINE' : 'COOLDOWN_ACTIVE',
        error:
          availability.reason ||
          'Servers are temporarily busy, please try again in a moment.',
        transient: true,
        skippedByCooldown: true,
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetchFn(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(body),
      });

      const payload = await parseJsonResponseSafe<
        T & { error?: string; code?: string }
      >(res);

      if (!res.ok || !payload) {
        const errMsg =
          payload?.error ||
          (res.status >= 500
            ? 'Servers are temporarily busy, please try again in a moment.'
            : `Request failed (${res.status}).`);
        const errCode = payload?.code;
        const transient =
          !payload || isTransientAiFailure(res.status, errCode, errMsg);

        if (!payload && res.status >= 500) {
          markBackendOffline(
            'Live AI backend returned a non-JSON proxy response.',
            LIVE_AI_COOLDOWN_MS,
            nowFn()
          );
        } else if (transient || res.status === 403) {
          markLiveAiBusy(
            errMsg,
            res.status === 403 ? 120_000 : LIVE_AI_COOLDOWN_MS,
            nowFn()
          );
        }

        return {
          ok: false,
          status: res.status,
          code: errCode,
          error: errMsg,
          transient,
        };
      }

      markLiveAiSuccess();
      return { ok: true, data: payload as T };
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      const msg = isAbort
        ? 'Servers took too long to respond.'
        : 'Live AI backend is unreachable right now.';
      if (isAbort) {
        markLiveAiBusy(msg, LIVE_AI_COOLDOWN_MS, nowFn());
      } else {
        markBackendOffline(msg, LIVE_AI_COOLDOWN_MS, nowFn());
      }
      return {
        ok: false,
        status: 0,
        code: isAbort ? 'CLIENT_TIMEOUT' : 'NETWORK_ERROR',
        error: msg,
        transient: true,
      };
    } finally {
      clearTimeout(timer);
    }
  });

  // Ensure subsequent tasks still run even if an earlier task rejected unexpectedly
  queueChain = task.then(
    () => undefined,
    () => undefined
  );

  return task;
}

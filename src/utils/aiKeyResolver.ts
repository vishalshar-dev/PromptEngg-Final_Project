import { createHash } from 'node:crypto';

export type AiProviderName = 'gemini' | 'groq';
export type ProviderHealthStatus = 'active' | 'invalid_key' | 'cooldown' | 'unconfigured';

export interface ApiKeyCandidate {
  key: string;
  source: string;
  fingerprint: string;
  rejected: boolean;
}

export function normalizeCandidateKey(raw: string): string {
  let cleaned = raw.trim().replace(/^['"`]+|['"`]+$/g, '').trim();
  // Strip accidental "ENV_NAME=..." paste from .env or secrets UI
  const eqMatch = cleaned.match(/^[A-Za-z0-9_]+(?:API_?KEY|KEY)\s*=\s*(.+)$/i);
  if (eqMatch && eqMatch[1]) {
    cleaned = eqMatch[1].trim().replace(/^['"`]+|['"`]+$/g, '').trim();
  }
  // Strip accidental "Bearer " prefix if copied from HTTP headers
  cleaned = cleaned.replace(/^Bearer\s+/i, '').trim();
  return cleaned;
}

export function isPlaceholderKey(value: string): boolean {
  const lower = value.trim().toLowerCase();
  return (
    !lower ||
    lower === 'undefined' ||
    lower === 'null' ||
    lower === 'none' ||
    lower.startsWith('your_') ||
    lower.startsWith('your-') ||
    lower.startsWith('replace_') ||
    lower.includes('placeholder') ||
    lower.includes('paste_key') ||
    /^[a-z0-9_]+=$/i.test(lower)
  );
}

export function fingerprintApiKey(
  provider: AiProviderName,
  key: string
): string {
  return `${provider}:${createHash('sha256').update(key).digest('hex').slice(0, 16)}`;
}

export function collectKeyCandidates(
  provider: AiProviderName,
  rawCandidates: Array<[string, string | undefined]>,
  rejectedFingerprints: ReadonlySet<string> = new Set()
): ApiKeyCandidate[] {
  const seen = new Set<string>();
  const active: ApiKeyCandidate[] = [];
  const rejected: ApiKeyCandidate[] = [];

  for (const [source, raw] of rawCandidates) {
    if (!raw) continue;
    const cleaned = normalizeCandidateKey(raw);
    if (!cleaned || isPlaceholderKey(cleaned) || seen.has(cleaned)) continue;
    seen.add(cleaned);
    const fingerprint = fingerprintApiKey(provider, cleaned);
    const isRejected = rejectedFingerprints.has(fingerprint);
    const entry: ApiKeyCandidate = {
      key: cleaned,
      source,
      fingerprint,
      rejected: isRejected,
    };
    if (isRejected) {
      rejected.push(entry);
    } else {
      active.push(entry);
    }
  }

  return [...active, ...rejected];
}

export function isAuthKeyError(
  status: number,
  message: string,
  code: string
): boolean {
  const lower = `${code} ${message}`.toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    code === 'UNAUTHENTICATED' ||
    code === 'PERMISSION_DENIED' ||
    code === 'invalid_api_key' ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('api key expired') ||
    lower.includes('invalid api key') ||
    lower.includes('incorrect api key') ||
    lower.includes('permission_denied') ||
    lower.includes('unauthenticated')
  );
}

export function resolveProviderHealthStatus(params: {
  allCandidatesCount: number;
  activeCandidatesCount: number;
  inCooldown: boolean;
}): ProviderHealthStatus {
  if (params.allCandidatesCount === 0) return 'unconfigured';
  if (params.activeCandidatesCount === 0) return 'invalid_key';
  if (params.inCooldown) return 'cooldown';
  return 'active';
}

export function redactSecretValues(text: string): string {
  return text
    .replace(/AIza[0-9A-Za-z_-]{10,}/g, 'AIza***')
    .replace(/gsk_[0-9A-Za-z_-]{10,}/g, 'gsk_***')
    .replace(/Bearer\s+[0-9A-Za-z._-]+/gi, 'Bearer ***');
}

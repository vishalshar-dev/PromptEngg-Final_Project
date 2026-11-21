export interface UpiUriParams {
  pa: string;
  pn?: string;
  am?: number;
  tn?: string;
  cu?: string;
}

export type UpiUriResult =
  | { ok: true; uri: string; normalizedUpiId: string }
  | { ok: false; error: string };

const UPI_VPA_REGEX = /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z0-9.-]{2,32}$/;

export function normalizeUpiId(raw: string | undefined | null): string {
  return (raw ?? '').trim().toLowerCase();
}

export function isValidUpiId(raw: string | undefined | null): boolean {
  const normalized = normalizeUpiId(raw);
  if (!normalized || normalized.includes('..')) return false;
  return UPI_VPA_REGEX.test(normalized);
}

export function buildUpiPaymentUri(params: UpiUriParams): UpiUriResult {
  const pa = normalizeUpiId(params.pa);
  if (!isValidUpiId(pa)) {
    return {
      ok: false,
      error: 'Enter a valid UPI ID (for example: name@okaxis or 9876543210@ybl).',
    };
  }

  const pn = (params.pn ?? '').trim().slice(0, 60) || 'CartAudit User';
  const query = new URLSearchParams();
  query.set('pa', pa);
  query.set('pn', pn);

  if (typeof params.am === 'number' && Number.isFinite(params.am) && params.am > 0) {
    const rounded = Math.round(params.am * 100) / 100;
    query.set('am', rounded.toFixed(2));
  }

  const tn = (params.tn ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
  if (tn) {
    query.set('tn', tn);
  }

  query.set('cu', (params.cu ?? 'INR').trim().toUpperCase() || 'INR');

  return {
    ok: true,
    uri: `upi://pay?${query.toString()}`,
    normalizedUpiId: pa,
  };
}

export function formatRupeeReminder(amount: number): string {
  const safe = Math.max(0, Math.round(amount * 100) / 100);
  return Number.isInteger(safe)
    ? safe.toLocaleString('en-IN')
    : safe.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

export interface SplitReminderInput {
  personName: string;
  amount: number;
  direction: 'they_pay' | 'i_pay';
  payeeUpiId?: string;
  payeeName?: string;
  unsettledItems?: Array<{ name: string; remainingAmount: number }>;
}

export function buildSplitReminderMessage(input: SplitReminderInput): string {
  const formattedAmt = `₹${formatRupeeReminder(input.amount)}`;
  const itemSnippet = (input.unsettledItems ?? [])
    .filter((it) => it.remainingAmount > 0)
    .slice(0, 3)
    .map((it) => `${it.name} (₹${formatRupeeReminder(it.remainingAmount)})`)
    .join(', ');

  const cleanUpi = normalizeUpiId(input.payeeUpiId);
  const hasValidUpi = isValidUpiId(cleanUpi);

  if (input.direction === 'they_pay') {
    const lines = [
      `Hi ${input.personName}, quick CartAudit split reminder: your share is ${formattedAmt}${
        itemSnippet ? ` for ${itemSnippet}` : ''
      }.`,
    ];
    if (hasValidUpi) {
      const uriRes = buildUpiPaymentUri({
        pa: cleanUpi,
        pn: input.payeeName || 'CartAudit User',
        am: input.amount,
        tn: itemSnippet ? `Split: ${itemSnippet}` : 'CartAudit split settlement',
      });
      lines.push(`UPI ID: ${cleanUpi}`);
      if (uriRes.ok) {
        lines.push(`Pay link: ${uriRes.uri}`);
      }
    }
    return lines.join('\n');
  }

  const lines = [
    `Hi ${input.personName}, sending ${formattedAmt} for our CartAudit split${
      itemSnippet ? ` (${itemSnippet})` : ''
    }.`,
  ];
  if (hasValidUpi) {
    lines.push(`To UPI ID: ${cleanUpi}`);
  }
  return lines.join('\n');
}

export function extractPhoneDigitsForWhatsApp(contact: string | undefined | null): string | null {
  const raw = (contact ?? '').trim();
  if (!raw || raw.includes('@')) return null;
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

export function buildWhatsAppShareUrl(message: string, contactHint?: string): string {
  const phone = extractPhoneDigitsForWhatsApp(contactHint);
  const encoded = encodeURIComponent(message);
  return phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

export interface NormalizedPennyChatPayload {
  answer: string;
  highlights: Array<{ label: string; value: string }>;
  proposedActions: unknown[];
  followUpQuestions: string[];
}

export interface NormalizedPennyExpensePayload {
  name: string;
  amount: number;
  category: string;
  date: string;
  isSplitHint: boolean;
  splitPersonHint: string;
}

export interface NormalizedReceiptScanPayload {
  merchant: string;
  date: string;
  items: Array<{
    name: string;
    price: number;
    category: string;
    unit: string;
    brand: string;
  }>;
  subtotal: number;
  taxTotal: number;
  deliveryFee: number;
  total: number;
}

function roundCurrency(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) && num >= 0 ? Math.round(num * 100) / 100 : 0;
}

export function parseJsonObjectFromLlm(rawText: string): Record<string, unknown> {
  const trimmed = rawText.trim();
  if (!trimmed) return {};

  const fenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const direct = JSON.parse(fenced);
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
      return direct as Record<string, unknown>;
    }
  } catch {
    // Fall through to balanced-brace extraction
  }

  const firstBrace = fenced.indexOf('{');
  const lastBrace = fenced.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      const sliced = JSON.parse(fenced.slice(firstBrace, lastBrace + 1));
      if (sliced && typeof sliced === 'object' && !Array.isArray(sliced)) {
        return sliced as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  return {};
}

export function normalizePennyChatPayload(raw: unknown): NormalizedPennyChatPayload {
  const obj = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<
    string,
    unknown
  >;

  const rawAnswer =
    typeof obj.answer === 'string'
      ? obj.answer.trim()
      : typeof obj.response === 'string'
        ? obj.response.trim()
        : typeof obj.message === 'string'
          ? obj.message.trim()
          : '';

  const highlights = Array.isArray(obj.highlights)
    ? obj.highlights
        .filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === 'object' && !Array.isArray(item)
        )
        .map((item) => ({
          label: typeof item.label === 'string' ? item.label.trim() : '',
          value:
            typeof item.value === 'string'
              ? item.value.trim()
              : typeof item.value === 'number'
                ? String(item.value)
                : '',
        }))
        .filter((h) => h.label.length > 0 && h.value.length > 0)
        .slice(0, 3)
    : [];

  const proposedActions = Array.isArray(obj.proposedActions)
    ? obj.proposedActions.filter(
        (act) =>
          Boolean(act) &&
          typeof act === 'object' &&
          !Array.isArray(act) &&
          typeof (act as { type?: unknown }).type === 'string'
      )
    : [];

  const followUpQuestions = Array.isArray(obj.followUpQuestions)
    ? obj.followUpQuestions
        .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
        .map((q) => q.trim())
        .slice(0, 3)
    : [];

  return {
    answer: rawAnswer,
    highlights,
    proposedActions,
    followUpQuestions,
  };
}

export interface NormalizedPennyExpensesPayload {
  expenses: NormalizedPennyExpensePayload[];
  name: string;
  amount: number;
  category: string;
  date: string;
  isSplitHint: boolean;
  splitPersonHint: string;
}

function normalizeSingleExpenseEntry(
  rawEntry: unknown,
  allowedCategories: string[],
  fallbackDate: string,
  originalText: string
): NormalizedPennyExpensePayload {
  const obj = (rawEntry && typeof rawEntry === 'object' && !Array.isArray(rawEntry)
    ? rawEntry
    : {}) as Record<string, unknown>;

  const rawName = typeof obj.name === 'string' ? obj.name.trim() : '';
  const name = (rawName || originalText.trim()).slice(0, 80);
  const amount = roundCurrency(obj.amount);

  const rawCat = typeof obj.category === 'string' ? obj.category.trim() : '';
  const matchedCat =
    allowedCategories.find((c) => c.toLowerCase() === rawCat.toLowerCase()) ||
    allowedCategories.find((c) => c === 'Other Expenses') ||
    allowedCategories[0] ||
    'Other Expenses';

  const rawDate = typeof obj.date === 'string' ? obj.date.trim() : '';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : fallbackDate;

  const isSplitHint = Boolean(obj.isSplitHint);
  const splitPersonHint =
    typeof obj.splitPersonHint === 'string' ? obj.splitPersonHint.trim().slice(0, 60) : '';

  return {
    name,
    amount,
    category: matchedCat,
    date,
    isSplitHint,
    splitPersonHint,
  };
}

export function normalizePennyExpensePayload(
  raw: unknown,
  allowedCategories: string[],
  fallbackDate: string,
  originalText: string
): NormalizedPennyExpensePayload {
  return normalizeSingleExpenseEntry(raw, allowedCategories, fallbackDate, originalText);
}

export function normalizePennyExpensesPayload(
  raw: unknown,
  allowedCategories: string[],
  fallbackDate: string,
  originalText: string
): NormalizedPennyExpensesPayload {
  const obj = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<
    string,
    unknown
  >;

  const candidateList: unknown[] | null = Array.isArray(raw)
    ? raw
    : Array.isArray(obj.expenses)
      ? obj.expenses
      : Array.isArray(obj.items)
        ? obj.items
        : null;

  let expenses: NormalizedPennyExpensePayload[] = [];

  if (candidateList) {
    expenses = candidateList
      .filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
      )
      .map((entry) => normalizeSingleExpenseEntry(entry, allowedCategories, fallbackDate, ''))
      .filter((item) => item.name.length > 0 && item.amount > 0)
      .slice(0, 20);
  } else {
    const single = normalizeSingleExpenseEntry(raw, allowedCategories, fallbackDate, originalText);
    if (single.name.length > 0 && single.amount > 0) {
      expenses = [single];
    }
  }

  const primary = expenses[0] ?? normalizeSingleExpenseEntry({}, allowedCategories, fallbackDate, originalText);

  return {
    expenses,
    ...primary,
  };
}

export function normalizeReceiptScanPayload(raw: unknown): NormalizedReceiptScanPayload {
  const obj = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<
    string,
    unknown
  >;

  const rawItems = Array.isArray(obj.items) ? obj.items : [];
  const items = rawItems
    .filter(
      (entry): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
    )
    .map((entry) => {
      const name = typeof entry.name === 'string' ? entry.name.trim() : '';
      const price = roundCurrency(entry.price);
      if (!name || price <= 0) return null;
      return {
        name,
        price,
        category:
          typeof entry.category === 'string' && entry.category.trim()
            ? entry.category.trim()
            : 'Other Expenses',
        unit: typeof entry.unit === 'string' ? entry.unit.trim() : '',
        brand: typeof entry.brand === 'string' ? entry.brand.trim() : '',
      };
    })
    .filter((item): item is NormalizedReceiptScanPayload['items'][number] => item !== null);

  const computedSubtotal = roundCurrency(items.reduce((sum, item) => sum + item.price, 0));
  const subtotal = roundCurrency(obj.subtotal) || computedSubtotal;
  const taxTotal = roundCurrency(obj.taxTotal);
  const deliveryFee = roundCurrency(obj.deliveryFee);
  const total = roundCurrency(obj.total) || roundCurrency(subtotal + taxTotal + deliveryFee);

  const merchant =
    typeof obj.merchant === 'string' && obj.merchant.trim()
      ? obj.merchant.trim()
      : 'Receipt Scan';
  const date = typeof obj.date === 'string' ? obj.date.trim() : '';

  return {
    merchant,
    date,
    items,
    subtotal,
    taxTotal,
    deliveryFee,
    total,
  };
}

export function chooseGroqModelCandidates(
  preferredModels: string[],
  discoveredModelIds: string[],
  kind: 'chat' | 'vision'
): string[] {
  if (discoveredModelIds.length === 0) {
    return [...preferredModels];
  }

  const availableSet = new Set(discoveredModelIds);
  const matchedPreferred = preferredModels.filter((id) => availableSet.has(id));

  if (kind === 'vision') {
    const extraVision = discoveredModelIds.filter(
      (id) =>
        !matchedPreferred.includes(id) &&
        /(qwen.*3\.8|vision|-vl|llama-4)/i.test(id) &&
        !/guard|whisper|tts/i.test(id)
    );
    const merged = [...matchedPreferred, ...extraVision];
    return merged.length > 0 ? merged : [...preferredModels];
  }

  const extraChat = discoveredModelIds.filter(
    (id) =>
      !matchedPreferred.includes(id) &&
      /(gpt-oss|llama-3\.3|llama-3\.1|qwen)/i.test(id) &&
      !/whisper|tts|guard|safeguard|prompt-guard/i.test(id)
  );
  const merged = [...matchedPreferred, ...extraChat];
  return merged.length > 0 ? merged : [...preferredModels];
}

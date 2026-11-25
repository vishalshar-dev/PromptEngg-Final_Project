import type {
  BackupData,
  BasketTemplate,
  BrokeModeConfig,
  CartItem,
  CategoryCaps,
  CategoryConfig,
  CategorySpendingLimit,
  FeatureSettings,
  FinancialChallenge,
  FinancialTarget,
  PennyChatMessage,
  PennyInteractionProfile,
  Person,
  PriceAlert,
  PriceHistory,
  PriceObservation,
  PurchaseSession,
  SavedAudit,
  Settlement,
  SharedExpense,
  ThemeMode,
  Transaction,
  VisualThemeConfig,
} from '../types/models';
import { sanitizePennyMessages, sanitizePennyProfile } from './pennyEngine';
import {
  DEFAULT_VISUAL_THEME,
  sanitizeFeatureSettings,
  sanitizeThemeMode,
  sanitizeVisualTheme,
} from './settingsEngine';
import { DEFAULT_ITEMS, mergeBackupItems, mergeCategories } from './storeHelpers';
import { DEFAULT_BROKE_MODE_CONFIG } from './warRoomEngine';

export const SYNC_SECTION_IDS = [
  'settings',
  'ledger',
  'catalog',
  'splits',
  'wellness',
  'penny',
] as const;

export type SyncSectionId = (typeof SYNC_SECTION_IDS)[number];

export interface SyncableWorkspaceState {
  items: CartItem[];
  transactions: Transaction[];
  totalBudget: number;
  sessionBudget: number | null;
  isBrokeMode: boolean;
  brokeModeConfig: BrokeModeConfig;
  categoryLimits: CategorySpendingLimit[];
  warRoomChallenges: FinancialChallenge[];
  warRoomTargets: FinancialTarget[];
  dismissedWarRoomAlerts: string[];
  disciplineCheckIns: string[];
  categories: string[];
  categoryConfigs: CategoryConfig[];
  categoryCaps: CategoryCaps;
  priceHistory: PriceHistory;
  purchaseHistory: PurchaseSession[];
  basketTemplates: BasketTemplate[];
  basketTemplatesSeeded: boolean;
  priceObservations: PriceObservation[];
  priceAlerts: PriceAlert[];
  savedAudits: SavedAudit[];
  people: Person[];
  sharedExpenses: SharedExpense[];
  settlements: Settlement[];
  theme: ThemeMode;
  visualTheme?: VisualThemeConfig;
  featureSettings: FeatureSettings;
  pennyMessages: PennyChatMessage[];
  pennyProfile: PennyInteractionProfile;
  myUpiId: string;
  myUpiName: string;
}

export interface DefaultCatalogOverride {
  id: string;
  quantity: number;
  price: number;
  selectedVariantId?: string;
  variantQuantities?: Record<string, number>;
  isFavourite?: boolean;
  recurrence?: CartItem['recurrence'];
  autoRecurrenceDismissed?: boolean;
}

export interface SyncSectionPayloads {
  settings: {
    totalBudget: number;
    sessionBudget: number | null;
    theme: ThemeMode;
    visualTheme?: VisualThemeConfig;
    featureSettings: FeatureSettings;
    categories: string[];
    categoryConfigs: CategoryConfig[];
    categoryCaps: CategoryCaps;
    myUpiId: string;
    myUpiName: string;
  };
  ledger: {
    transactions: Transaction[];
    savedAudits: SavedAudit[];
  };
  catalog: {
    customItems: CartItem[];
    defaultOverrides: DefaultCatalogOverride[];
    priceHistory: PriceHistory;
    purchaseHistory: PurchaseSession[];
    basketTemplates: BasketTemplate[];
    basketTemplatesSeeded: boolean;
    priceObservations: PriceObservation[];
    priceAlerts: PriceAlert[];
  };
  splits: {
    people: Person[];
    sharedExpenses: SharedExpense[];
    settlements: Settlement[];
  };
  wellness: {
    isBrokeMode: boolean;
    brokeModeConfig: BrokeModeConfig;
    categoryLimits: CategorySpendingLimit[];
    warRoomChallenges: FinancialChallenge[];
    warRoomTargets: FinancialTarget[];
    dismissedWarRoomAlerts: string[];
    disciplineCheckIns: string[];
  };
  penny: {
    pennyMessages: PennyChatMessage[];
    pennyProfile: PennyInteractionProfile;
  };
}

export type PartialCloudSections = Partial<SyncSectionPayloads>;

/**
 * Recursively strips `undefined` values and non-finite numbers so native Firestore Maps/Lists
 * never reject payloads with `Unsupported field value: undefined`.
 */
export function sanitizeForFirestore<T>(value: T): T {
  if (value === null || value === undefined) {
    return null as T;
  }
  if (typeof value === 'number') {
    return (Number.isFinite(value) ? value : 0) as T;
  }
  if (Array.isArray(value)) {
    return value
      .filter((entry) => entry !== undefined)
      .map((entry) => sanitizeForFirestore(entry)) as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = sanitizeForFirestore(v);
      }
    }
    return out as T;
  }
  return value;
}

export function buildSectionPayloads(
  state: SyncableWorkspaceState,
  defaultCatalogItems: CartItem[] = DEFAULT_ITEMS
): SyncSectionPayloads {
  const defaultById = new Map(defaultCatalogItems.map((it) => [it.id, it]));
  const customItems: CartItem[] = [];
  const defaultOverrides: DefaultCatalogOverride[] = [];

  for (const item of state.items) {
    const base = defaultById.get(item.id);
    if (!base || item.isCustom) {
      customItems.push(item);
      continue;
    }

    const hasDiff =
      item.quantity !== 0 ||
      Math.abs(item.price - base.price) > 0.001 ||
      Boolean(item.isFavourite) !== Boolean(base.isFavourite) ||
      item.selectedVariantId !== base.selectedVariantId ||
      Boolean(item.variantQuantities && Object.keys(item.variantQuantities).length > 0) ||
      JSON.stringify(item.recurrence ?? null) !== JSON.stringify(base.recurrence ?? null) ||
      Boolean(item.autoRecurrenceDismissed) !== Boolean(base.autoRecurrenceDismissed);

    if (hasDiff) {
      defaultOverrides.push({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        selectedVariantId: item.selectedVariantId,
        variantQuantities: item.variantQuantities,
        isFavourite: item.isFavourite,
        recurrence: item.recurrence,
        autoRecurrenceDismissed: item.autoRecurrenceDismissed,
      });
    }
  }

  const compactHistory: PriceHistory = {};
  for (const [key, pts] of Object.entries(state.priceHistory ?? {})) {
    if (Array.isArray(pts) && pts.length > 0) {
      compactHistory[key] = pts.slice(-30);
    }
  }

  return sanitizeForFirestore({
    settings: {
      totalBudget: state.totalBudget,
      sessionBudget: state.sessionBudget,
      theme: state.theme,
      visualTheme: sanitizeVisualTheme(state.visualTheme ?? DEFAULT_VISUAL_THEME),
      featureSettings: state.featureSettings,
      categories: state.categories,
      categoryConfigs: state.categoryConfigs,
      categoryCaps: state.categoryCaps,
      myUpiId: state.myUpiId,
      myUpiName: state.myUpiName,
    },
    ledger: {
      transactions: state.transactions.slice(0, 1000),
      savedAudits: state.savedAudits.slice(0, 50),
    },
    catalog: {
      customItems: customItems.slice(0, 250),
      defaultOverrides,
      priceHistory: compactHistory,
      purchaseHistory: state.purchaseHistory.slice(0, 150),
      basketTemplates: state.basketTemplates.slice(0, 50),
      basketTemplatesSeeded: state.basketTemplatesSeeded,
      priceObservations: state.priceObservations.slice(0, 500),
      priceAlerts: state.priceAlerts.slice(0, 100),
    },
    splits: {
      people: state.people.slice(0, 100),
      sharedExpenses: state.sharedExpenses.slice(0, 500),
      settlements: state.settlements.slice(0, 500),
    },
    wellness: {
      isBrokeMode: state.isBrokeMode,
      brokeModeConfig: state.brokeModeConfig,
      categoryLimits: state.categoryLimits.slice(0, 60),
      warRoomChallenges: state.warRoomChallenges.slice(0, 40),
      warRoomTargets: state.warRoomTargets.slice(0, 40),
      dismissedWarRoomAlerts: state.dismissedWarRoomAlerts.slice(0, 100),
      disciplineCheckIns: state.disciplineCheckIns.slice(0, 365),
    },
    penny: {
      pennyMessages: state.pennyMessages.slice(-40),
      pennyProfile: state.pennyProfile,
    },
  });
}

export function computeSectionHashes(
  payloads: SyncSectionPayloads
): Record<SyncSectionId, string> {
  return {
    settings: JSON.stringify(payloads.settings),
    ledger: JSON.stringify(payloads.ledger),
    catalog: JSON.stringify(payloads.catalog),
    splits: JSON.stringify(payloads.splits),
    wellness: JSON.stringify(payloads.wellness),
    penny: JSON.stringify(payloads.penny),
  };
}

export function hasMeaningfulWorkspaceData(state: SyncableWorkspaceState): boolean {
  const hasCartOrCustom = state.items.some((it) => it.isCustom || it.quantity > 0);
  return (
    state.transactions.length > 0 ||
    state.people.length > 0 ||
    state.sharedExpenses.length > 0 ||
    state.settlements.length > 0 ||
    state.savedAudits.length > 0 ||
    state.purchaseHistory.length > 0 ||
    state.priceObservations.length > 0 ||
    state.priceAlerts.length > 0 ||
    state.categoryLimits.length > 0 ||
    state.warRoomChallenges.length > 0 ||
    state.warRoomTargets.length > 0 ||
    state.pennyMessages.length > 0 ||
    state.isBrokeMode ||
    Boolean(state.myUpiId?.trim()) ||
    Math.abs(state.totalBudget - 5000) > 0.01 ||
    hasCartOrCustom
  );
}

function hydrateItemsFromCatalogSection(
  catalog: Partial<SyncSectionPayloads['catalog']> | undefined,
  fallbackItems: CartItem[],
  defaultCatalogItems: CartItem[]
): CartItem[] {
  if (!catalog) return fallbackItems;

  const customItems = Array.isArray(catalog.customItems) ? catalog.customItems : [];
  const overrides = Array.isArray(catalog.defaultOverrides) ? catalog.defaultOverrides : [];
  const overrideMap = new Map(overrides.map((o) => [o.id, o]));

  const baseWithOverrides = defaultCatalogItems.map((base) => {
    const ov = overrideMap.get(base.id);
    if (!ov) return { ...base, quantity: 0 };
    return {
      ...base,
      quantity: typeof ov.quantity === 'number' && ov.quantity >= 0 ? ov.quantity : 0,
      price: typeof ov.price === 'number' && ov.price > 0 ? ov.price : base.price,
      selectedVariantId: ov.selectedVariantId ?? base.selectedVariantId,
      variantQuantities: ov.variantQuantities ?? undefined,
      isFavourite: typeof ov.isFavourite === 'boolean' ? ov.isFavourite : base.isFavourite,
      recurrence: ov.recurrence !== undefined ? ov.recurrence : base.recurrence,
      autoRecurrenceDismissed:
        typeof ov.autoRecurrenceDismissed === 'boolean'
          ? ov.autoRecurrenceDismissed
          : base.autoRecurrenceDismissed,
    };
  });

  const byId = new Map<string, CartItem>();
  for (const item of baseWithOverrides) {
    byId.set(item.id, item);
  }
  for (const item of customItems) {
    if (item && typeof item.id === 'string' && typeof item.name === 'string') {
      byId.set(item.id, {
        ...item,
        quantity: typeof item.quantity === 'number' && item.quantity >= 0 ? item.quantity : 0,
      });
    }
  }
  return Array.from(byId.values());
}

export function applyCloudSectionsToBackup(
  sections: PartialCloudSections,
  currentState: SyncableWorkspaceState,
  defaultCatalogItems: CartItem[] = DEFAULT_ITEMS
): BackupData {
  const settingsSec = sections.settings;
  const ledgerSec = sections.ledger;
  const catalogSec = sections.catalog;
  const splitsSec = sections.splits;
  const wellnessSec = sections.wellness;
  const pennySec = sections.penny;

  const transactions = Array.isArray(ledgerSec?.transactions)
    ? ledgerSec.transactions
    : currentState.transactions;
  const savedAudits = Array.isArray(ledgerSec?.savedAudits)
    ? ledgerSec.savedAudits
    : currentState.savedAudits;

  const hydratedItems = hydrateItemsFromCatalogSection(
    catalogSec,
    currentState.items,
    defaultCatalogItems
  );

  const rawCategories = Array.isArray(settingsSec?.categories)
    ? settingsSec.categories
    : currentState.categories;
  const categoryConfigs = Array.isArray(settingsSec?.categoryConfigs)
    ? settingsSec.categoryConfigs
    : currentState.categoryConfigs;

  const mergedCategories = mergeCategories(rawCategories, hydratedItems, transactions);

  const brokeConfig: BrokeModeConfig = {
    ...DEFAULT_BROKE_MODE_CONFIG,
    ...(wellnessSec?.brokeModeConfig ?? currentState.brokeModeConfig),
    enabled:
      typeof wellnessSec?.isBrokeMode === 'boolean'
        ? wellnessSec.isBrokeMode
        : currentState.isBrokeMode,
  };

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions,
    savedAudits,
    customItems: hydratedItems,
    categories: mergedCategories,
    categoryConfigs,
    totalBudget:
      typeof settingsSec?.totalBudget === 'number' && settingsSec.totalBudget > 0
        ? settingsSec.totalBudget
        : currentState.totalBudget,
    sessionBudget:
      settingsSec && 'sessionBudget' in settingsSec
        ? settingsSec.sessionBudget ?? null
        : currentState.sessionBudget,
    categoryCaps: settingsSec?.categoryCaps ?? currentState.categoryCaps,
    theme: settingsSec?.theme
      ? sanitizeThemeMode(settingsSec.theme)
      : sanitizeThemeMode(currentState.theme),
    visualTheme: settingsSec?.visualTheme
      ? sanitizeVisualTheme(settingsSec.visualTheme)
      : sanitizeVisualTheme(currentState.visualTheme ?? DEFAULT_VISUAL_THEME),
    featureSettings: settingsSec?.featureSettings
      ? sanitizeFeatureSettings(settingsSec.featureSettings)
      : sanitizeFeatureSettings(currentState.featureSettings),
    priceHistory: catalogSec?.priceHistory ?? currentState.priceHistory,
    purchaseHistory: Array.isArray(catalogSec?.purchaseHistory)
      ? catalogSec.purchaseHistory
      : currentState.purchaseHistory,
    basketTemplates: Array.isArray(catalogSec?.basketTemplates)
      ? catalogSec.basketTemplates
      : currentState.basketTemplates,
    basketTemplatesSeeded:
      typeof catalogSec?.basketTemplatesSeeded === 'boolean'
        ? catalogSec.basketTemplatesSeeded
        : currentState.basketTemplatesSeeded,
    priceObservations: Array.isArray(catalogSec?.priceObservations)
      ? catalogSec.priceObservations
      : currentState.priceObservations,
    priceAlerts: Array.isArray(catalogSec?.priceAlerts)
      ? catalogSec.priceAlerts
      : currentState.priceAlerts,
    people: Array.isArray(splitsSec?.people) ? splitsSec.people : currentState.people,
    sharedExpenses: Array.isArray(splitsSec?.sharedExpenses)
      ? splitsSec.sharedExpenses
      : currentState.sharedExpenses,
    settlements: Array.isArray(splitsSec?.settlements)
      ? splitsSec.settlements
      : currentState.settlements,
    isBrokeMode: brokeConfig.enabled,
    brokeModeConfig: brokeConfig,
    categoryLimits: Array.isArray(wellnessSec?.categoryLimits)
      ? wellnessSec.categoryLimits
      : currentState.categoryLimits,
    warRoomChallenges: Array.isArray(wellnessSec?.warRoomChallenges)
      ? wellnessSec.warRoomChallenges
      : currentState.warRoomChallenges,
    warRoomTargets: Array.isArray(wellnessSec?.warRoomTargets)
      ? wellnessSec.warRoomTargets
      : currentState.warRoomTargets,
    dismissedWarRoomAlerts: Array.isArray(wellnessSec?.dismissedWarRoomAlerts)
      ? wellnessSec.dismissedWarRoomAlerts
      : currentState.dismissedWarRoomAlerts,
    disciplineCheckIns: Array.isArray(wellnessSec?.disciplineCheckIns)
      ? wellnessSec.disciplineCheckIns
      : currentState.disciplineCheckIns,
    pennyMessages: pennySec?.pennyMessages
      ? sanitizePennyMessages(pennySec.pennyMessages)
      : currentState.pennyMessages,
    pennyProfile: pennySec?.pennyProfile
      ? sanitizePennyProfile(pennySec.pennyProfile)
      : currentState.pennyProfile,
    myUpiId:
      typeof settingsSec?.myUpiId === 'string'
        ? settingsSec.myUpiId.trim().toLowerCase()
        : currentState.myUpiId,
    myUpiName:
      typeof settingsSec?.myUpiName === 'string'
        ? settingsSec.myUpiName.trim()
        : currentState.myUpiName,
  };
}

export function backupToSyncableState(
  backup: BackupData,
  fallback: SyncableWorkspaceState
): SyncableWorkspaceState {
  return {
    items: backup.customItems,
    transactions: backup.transactions,
    totalBudget: backup.totalBudget,
    sessionBudget: backup.sessionBudget,
    isBrokeMode:
      typeof backup.isBrokeMode === 'boolean'
        ? backup.isBrokeMode
        : fallback.isBrokeMode,
    brokeModeConfig: backup.brokeModeConfig ?? fallback.brokeModeConfig,
    categoryLimits: backup.categoryLimits ?? fallback.categoryLimits,
    warRoomChallenges: backup.warRoomChallenges ?? fallback.warRoomChallenges,
    warRoomTargets: backup.warRoomTargets ?? fallback.warRoomTargets,
    dismissedWarRoomAlerts:
      backup.dismissedWarRoomAlerts ?? fallback.dismissedWarRoomAlerts,
    disciplineCheckIns: backup.disciplineCheckIns ?? fallback.disciplineCheckIns,
    categories: backup.categories ?? fallback.categories,
    categoryConfigs: backup.categoryConfigs ?? fallback.categoryConfigs,
    categoryCaps: backup.categoryCaps,
    priceHistory: backup.priceHistory ?? fallback.priceHistory,
    purchaseHistory: backup.purchaseHistory ?? fallback.purchaseHistory,
    basketTemplates: backup.basketTemplates ?? fallback.basketTemplates,
    basketTemplatesSeeded:
      typeof backup.basketTemplatesSeeded === 'boolean'
        ? backup.basketTemplatesSeeded
        : fallback.basketTemplatesSeeded,
    priceObservations: backup.priceObservations ?? fallback.priceObservations,
    priceAlerts: backup.priceAlerts ?? fallback.priceAlerts,
    savedAudits: backup.savedAudits,
    people: backup.people ?? fallback.people,
    sharedExpenses: backup.sharedExpenses ?? fallback.sharedExpenses,
    settlements: backup.settlements ?? fallback.settlements,
    theme: backup.theme ? sanitizeThemeMode(backup.theme) : fallback.theme,
    visualTheme: backup.visualTheme
      ? sanitizeVisualTheme(backup.visualTheme)
      : sanitizeVisualTheme(fallback.visualTheme ?? DEFAULT_VISUAL_THEME),
    featureSettings: backup.featureSettings
      ? sanitizeFeatureSettings(backup.featureSettings)
      : fallback.featureSettings,
    pennyMessages: backup.pennyMessages ?? fallback.pennyMessages,
    pennyProfile: backup.pennyProfile ?? fallback.pennyProfile,
    myUpiId: typeof backup.myUpiId === 'string' ? backup.myUpiId : fallback.myUpiId,
    myUpiName: typeof backup.myUpiName === 'string' ? backup.myUpiName : fallback.myUpiName,
  };
}

function mergeById<T extends { id: string }>(primary: T[], secondary: T[]): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const entry of primary) {
    if (entry && typeof entry.id === 'string' && !seen.has(entry.id)) {
      seen.add(entry.id);
      merged.push(entry);
    }
  }
  for (const entry of secondary) {
    if (entry && typeof entry.id === 'string' && !seen.has(entry.id)) {
      seen.add(entry.id);
      merged.push(entry);
    }
  }
  return merged;
}

export function smartMergeLocalAndCloud(
  localState: SyncableWorkspaceState,
  cloudSections: PartialCloudSections,
  defaultCatalogItems: CartItem[] = DEFAULT_ITEMS
): BackupData {
  const cloudBackup = applyCloudSectionsToBackup(
    cloudSections,
    localState,
    defaultCatalogItems
  );

  const mergedTransactions = mergeById(
    cloudBackup.transactions,
    localState.transactions
  ).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

  const mergedItems = mergeById(
    cloudBackup.customItems,
    localState.items
  ).map((it) => {
    const localMatch = localState.items.find((l) => l.id === it.id);
    const cloudMatch = cloudBackup.customItems.find((c) => c.id === it.id);
    return {
      ...it,
      quantity: Math.max(localMatch?.quantity ?? 0, cloudMatch?.quantity ?? 0),
      isFavourite: Boolean(localMatch?.isFavourite || cloudMatch?.isFavourite),
    };
  });

  const mergedCheckIns = Array.from(
    new Set([
      ...(cloudBackup.disciplineCheckIns ?? []),
      ...localState.disciplineCheckIns,
    ])
  ).sort();

  const mergedDismissedAlerts = Array.from(
    new Set([
      ...(cloudBackup.dismissedWarRoomAlerts ?? []),
      ...localState.dismissedWarRoomAlerts,
    ])
  );

  const mergedPennyMessages = sanitizePennyMessages(
    mergeById(cloudBackup.pennyMessages ?? [], localState.pennyMessages).sort(
      (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
    )
  ).slice(-40);

  return {
    ...cloudBackup,
    transactions: mergedTransactions,
    savedAudits: mergeById(cloudBackup.savedAudits, localState.savedAudits),
    customItems: mergedItems,
    purchaseHistory: mergeById(
      cloudBackup.purchaseHistory ?? [],
      localState.purchaseHistory
    ),
    basketTemplates: mergeById(
      cloudBackup.basketTemplates ?? [],
      localState.basketTemplates
    ),
    priceObservations: mergeById(
      cloudBackup.priceObservations ?? [],
      localState.priceObservations
    ),
    priceAlerts: mergeById(cloudBackup.priceAlerts ?? [], localState.priceAlerts),
    people: mergeById(cloudBackup.people ?? [], localState.people),
    sharedExpenses: mergeById(
      cloudBackup.sharedExpenses ?? [],
      localState.sharedExpenses
    ),
    settlements: mergeById(cloudBackup.settlements ?? [], localState.settlements),
    categoryLimits: mergeById(
      cloudBackup.categoryLimits ?? [],
      localState.categoryLimits
    ),
    warRoomChallenges: mergeById(
      cloudBackup.warRoomChallenges ?? [],
      localState.warRoomChallenges
    ),
    warRoomTargets: mergeById(
      cloudBackup.warRoomTargets ?? [],
      localState.warRoomTargets
    ),
    disciplineCheckIns: mergedCheckIns,
    dismissedWarRoomAlerts: mergedDismissedAlerts,
    pennyMessages: mergedPennyMessages,
  };
}

export function detectDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Web Browser';
  const ua = navigator.userAgent || '';
  const platform = /Android/i.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua)
      ? 'iPhone / iPad'
      : /Mac OS X|Macintosh/i.test(ua)
        ? 'Mac'
        : /Windows/i.test(ua)
          ? 'Windows'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Web';
  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /Chrome\//i.test(ua)
      ? 'Chrome'
      : /Firefox\//i.test(ua)
        ? 'Firefox'
        : /Safari\//i.test(ua)
          ? 'Safari'
          : 'Browser';
  return `${platform} · ${browser}`.slice(0, 80);
}

export interface SyncErrorContext {
  projectId?: string;
  firestoreDatabaseId?: string;
  hostname?: string;
  inIframe?: boolean;
}

export interface SyncErrorInfo {
  message: string;
  code: string | null;
  action: 'open_new_tab' | null;
  quotaUrl: string | null;
}

export function isRunningInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function getQuotaUpgradeLink(
  errMsg: string,
  projectId?: string,
  firestoreDatabaseId?: string
): string | null {
  if (
    errMsg.includes('Free daily read units per project') &&
    projectId &&
    firestoreDatabaseId
  ) {
    return `https://console.firebase.google.com/project/${projectId}/firestore/databases/${firestoreDatabaseId}/data?openUpgradeDialog=true`;
  }
  return null;
}

export function formatReadableSyncError(
  err: unknown,
  context: SyncErrorContext = {}
): SyncErrorInfo {
  const errObj = (err && typeof err === 'object' ? err : {}) as {
    code?: unknown;
    message?: unknown;
  };
  const code = typeof errObj.code === 'string' && errObj.code.trim() ? errObj.code.trim() : null;
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const combined = `${code ?? ''} ${raw}`;
  const inIframe =
    typeof context.inIframe === 'boolean' ? context.inIframe : isRunningInIframe();
  const hostname =
    context.hostname ||
    (typeof window !== 'undefined' ? window.location.hostname : '');

  if (
    code === 'auth/popup-blocked' ||
    combined.includes('auth/popup-blocked')
  ) {
    return {
      code: 'auth/popup-blocked',
      action: 'open_new_tab',
      quotaUrl: null,
      message: inIframe
        ? 'Sign-in popup was blocked because the app is running inside an embedded preview frame. Allow pop-ups for this site in your address bar, or open CartAudit in a dedicated browser tab.'
        : 'Your browser blocked the Google sign-in popup. Allow pop-ups for this site in your address bar (or open in a new tab) and try again.',
    };
  }

  if (
    code === 'auth/unauthorized-domain' ||
    combined.includes('auth/unauthorized-domain')
  ) {
    const domainLabel = hostname || 'this domain';
    return {
      code: 'auth/unauthorized-domain',
      action: null,
      quotaUrl: null,
      message: `Google Sign-In is not authorized for "${domainLabel}" in Firebase Authentication. Open the authorized preview URL or add "${domainLabel}" under Firebase Auth → Settings → Authorized domains.`,
    };
  }

  if (
    code === 'auth/operation-not-allowed' ||
    combined.includes('auth/operation-not-allowed')
  ) {
    return {
      code: 'auth/operation-not-allowed',
      action: null,
      quotaUrl: null,
      message:
        'Google Sign-In is currently disabled in Firebase Authentication. Enable the Google provider in Firebase Console.',
    };
  }

  if (
    code === 'auth/operation-not-supported-in-this-environment' ||
    combined.includes('auth/operation-not-supported-in-this-environment')
  ) {
    return {
      code: 'auth/operation-not-supported-in-this-environment',
      action: 'open_new_tab',
      quotaUrl: null,
      message:
        'This embedded browser context does not support sign-in popups. Open CartAudit in a dedicated browser tab to sign in.',
    };
  }

  if (raw.includes('Quota exceeded')) {
    return {
      code,
      action: null,
      message:
        'Daily Firestore free-tier quota exceeded. Local changes remain saved and sync resumes after quota reset.',
      quotaUrl: getQuotaUpgradeLink(raw, context.projectId, context.firestoreDatabaseId),
    };
  }

  if (
    code === 'auth/network-request-failed' ||
    raw.includes('client is offline') ||
    raw.includes('network-request-failed')
  ) {
    return {
      code: code || 'network-request-failed',
      action: null,
      message: 'You appear offline. Changes are saved locally and will sync once reconnected.',
      quotaUrl: null,
    };
  }

  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as { error?: string };
      if (parsed.error) {
        return {
          code,
          action: null,
          message: parsed.error,
          quotaUrl: getQuotaUpgradeLink(
            parsed.error,
            context.projectId,
            context.firestoreDatabaseId
          ),
        };
      }
    } catch {
      // keep raw
    }
  }

  return {
    code,
    action: null,
    message: raw || 'Cloud sync encountered an unexpected error.',
    quotaUrl: null,
  };
}


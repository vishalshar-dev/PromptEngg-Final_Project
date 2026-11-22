export const SELF_PERSON_ID = 'self';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency;
  intervalDays?: number;
  nextDueDate?: string; // YYYY-MM-DD
  lastAddedAt?: string; // ISO
  source?: 'auto' | 'manual';
  detectedOrderCount?: number;
}

export interface ProductVariant {
  id: string;
  label: string;
  unit: string;
  price: number;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  category: string;
  subcategory?: string;
  brand?: string;
  description?: string;
  tags?: string[];
  icon: string;
  quantity: number;
  unit?: string;
  productType?: string;
  imageUrl?: string;
  isFavourite?: boolean;
  isFrequent?: boolean;
  isPopular?: boolean;
  isCustom?: boolean;
  lastPurchasedAt?: string;
  purchaseCount?: number;
  createdAt?: string;
  allowDecimalQuantity?: boolean;
  quantityStep?: number;
  variants?: ProductVariant[];
  selectedVariantId?: string;
  variantQuantities?: Record<string, number>;
  recurrence?: RecurrenceConfig | null;
  autoRecurrenceDismissed?: boolean;
}

export interface CartLineItem {
  lineKey: string;
  item: CartItem;
  variantId?: string;
  variantLabel?: string;
  unit: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface CategoryConfig {
  id: string;
  name: string;
  iconKey: string;
  accent: string;
  imageUrl?: string;
  subcategories?: string[];
  isCustom?: boolean;
  order: number;
}

export type TransactionStatus = 'active' | 'cancelled' | 'refunded';
export type TransactionSource = 'mart' | 'audit' | 'manual' | 'ledger';
export type SpendingClassification = 'essential' | 'non_essential' | 'impulsive';
export type ClassificationSource = 'predicted' | 'user';

export interface Transaction {
  id: string;
  name: string;
  amount: number;
  category: string;
  timestamp: string;
  splitWith?: string | null;
  linkedSharedExpenseId?: string | null;
  status?: TransactionStatus;
  refundAmount?: number;
  source?: TransactionSource;
  receiptFingerprint?: string;
  classification?: SpendingClassification;
  classificationSource?: ClassificationSource;
}

export type SplitMethod = 'equal' | 'custom' | 'percentage';

export interface Person {
  id: string;
  name: string;
  contact?: string;
  upiId?: string;
  createdAt: string;
}

export interface ExpenseParticipantShare {
  personId: string; // SELF_PERSON_ID ('self') or Person['id']
  amount: number;
  percentage?: number;
}

export interface SharedExpense {
  id: string;
  name: string;
  totalAmount: number;
  category: string;
  date: string; // ISO string
  paidById: string; // SELF_PERSON_ID or Person['id']
  splitMethod: SplitMethod;
  participants: ExpenseParticipantShare[];
  source: 'mart' | 'manual' | 'ledger';
  linkedTransactionId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Settlement {
  id: string;
  fromPersonId: string; // who paid
  toPersonId: string; // who received
  amount: number;
  date: string;
  note?: string;
  expenseId?: string;
  createdAt: string;
}

export type PriceSource = 'user_purchase' | 'market_verified' | 'estimated';

export interface PricePoint {
  date: string;
  price: number;
  unit?: string;
  source?: PriceSource;
  productName?: string;
  variantId?: string;
  variantLabel?: string;
  brand?: string;
}

export interface PriceHistory {
  [itemId: string]: PricePoint[];
}

export interface PurchaseSessionItem {
  itemId: string;
  name: string;
  brand?: string;
  category: string;
  subcategory?: string;
  variantId?: string;
  variantLabel?: string;
  unit?: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface PurchaseSession {
  id: string;
  timestamp: string;
  items: PurchaseSessionItem[];
  totalAmount: number;
  personalShare: number;
  categoryTotals: Record<string, number>;
  isSplit: boolean;
  linkedSharedExpenseId?: string | null;
  splitSummaryText?: string;
  source?: 'mart' | 'receipt';
  merchantLabel?: string;
  linkedTransactionId?: string;
}

export interface BasketTemplateItem {
  itemId: string;
  name: string;
  brand?: string;
  category: string;
  subcategory?: string;
  variantId?: string;
  variantLabel?: string;
  unit?: string;
  quantity: number;
  savedPrice: number;
}

export interface BasketTemplate {
  id: string;
  name: string;
  description?: string;
  items: BasketTemplateItem[];
  savedTotal: number;
  createdAt: string;
  updatedAt: string;
  lastLoadedAt?: string | null;
  isPreset?: boolean;
}

export interface FeeFlag {
  id: string;
  itemId: string;
  itemName: string;
  type: 'hidden_charge' | 'subscription_trap' | 'deceptive_pricing' | 'handling_fee' | 'inflated_tax';
  severity: 'warning' | 'critical';
  message: string;
  estimatedCost: number;
}

export interface ParsedReceiptItem {
  name: string;
  price: number;
  category?: string;
  unit?: string;
  brand?: string;
  matchedProductId?: string;
  isNewCatalogItem?: boolean;
  tax?: number;
  deliveryFee?: number;
}

export interface ParsedReceipt {
  merchant: string;
  date: string;
  items: ParsedReceiptItem[];
  subtotal: number;
  taxTotal: number;
  deliveryFee: number;
  total: number;
  rawText?: string;
}

export type CategoryCaps = Record<string, number | null>;

export interface SavedAuditFlag {
  type: string;
  severity: 'warning' | 'critical';
  message: string;
  estimatedCost: number;
}

export interface SavedAudit {
  id: string;
  timestamp: string;
  source: string;
  subtotal: number;
  extraFees: number;
  total: number;
  flags: SavedAuditFlag[];
}

export type PriceObservationSource = 'mart' | 'audit' | 'manual';
export type PriceEntryKind = 'actual_purchase' | 'manual_estimate';
export type PriceTimeframe = '7d' | '30d' | '3m' | '6m' | '12m' | 'all';

export interface ReceiptReference {
  merchant: string;
  receiptDate: string;
  receiptTotal: number;
  fingerprint: string;
}

export interface PriceObservation {
  id: string;
  productId: string;
  productName: string;
  category: string;
  brand?: string;
  quantity: number;
  packageSize: string;
  unitOfMeasurement: string;
  normalizedQuantity: number;
  totalPrice: number;
  unitPrice: number;
  purchaseDate: string; // ISO string
  purchaseSource: PriceObservationSource;
  entryKind: PriceEntryKind;
  transactionId?: string | null;
  receiptRef?: ReceiptReference | null;
  status: 'active' | 'cancelled' | 'refunded';
}

export interface PriceAlert {
  id: string;
  productId: string;
  productName: string;
  unitOfMeasurement: string;
  targetUnitPrice?: number | null;
  increaseThresholdPct?: number | null;
  enabled: boolean;
  createdAt: string;
  lastTriggeredAt?: string | null;
  lastTriggerMessage?: string | null;
}

export interface TriggeredPriceAlert {
  id: string;
  alertId: string;
  productId: string;
  productName: string;
  reason: 'target_reached' | 'price_spike';
  message: string;
  recordedUnitPrice: number;
  unitOfMeasurement: string;
  triggeredAt: string;
  dismissed?: boolean;
}

export type WarRoomPeriod = 'daily' | 'weekly' | 'monthly';

export interface BrokeModeConfig {
  enabled: boolean;
  period: WarRoomPeriod;
  dailyAllowance: number;
  weeklyAllowance: number;
  monthlyAllowance: number;
  maxNonEssentialSpend: number;
  warningThresholdPct: number; // e.g., 75
  durationDays: number;
  restrictedCategories: string[];
  activatedAt?: string | null;
}

export type LimitStatus = 'normal' | 'approaching' | 'reached' | 'exceeded';

export interface CategorySpendingLimit {
  id: string;
  category: string;
  period: WarRoomPeriod;
  limitAmount: number;
  warningThresholdPct: number;
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type FinancialChallengeTemplateId =
  | 'no_junk_3d'
  | 'weekly_budget_guard'
  | 'cut_impulsive_7d'
  | 'category_control_7d'
  | 'non_essential_cap_14d'
  | 'custom';

export interface FinancialChallenge {
  id: string;
  templateId: FinancialChallengeTemplateId;
  title: string;
  description: string;
  targetDays: number;
  targetCategory?: string | null;
  maxAllowedSpend?: number | null;
  startedAt: string; // ISO timestamp
  status: 'active' | 'completed' | 'failed';
  completedAt?: string | null;
  isCustom?: boolean;
}

export type FinancialTargetType =
  | 'reduce_junk_by_amount'
  | 'reduce_impulsive_pct'
  | 'cap_non_essential_amount';

export interface FinancialTarget {
  id: string;
  title: string;
  type: FinancialTargetType;
  period: 'weekly' | 'monthly';
  targetValue: number; // ₹ amount or % depending on type
  baselineValue?: number | null;
  transferredSavings: number; // Explicit real savings transferred by user (never confused with estimate)
  createdAt: string;
  updatedAt?: string;
}

export interface BackupData {
  version: 1;
  exportedAt: string;
  transactions: Transaction[];
  customItems: CartItem[];
  categories?: string[];
  categoryConfigs?: CategoryConfig[];
  priceHistory?: PriceHistory;
  purchaseHistory?: PurchaseSession[];
  totalBudget: number;
  sessionBudget: number | null;
  budgetResetDay?: number;
  budgetRolloverEnabled?: boolean;
  categoryCaps: CategoryCaps;
  savedAudits: SavedAudit[];
  people?: Person[];
  sharedExpenses?: SharedExpense[];
  settlements?: Settlement[];
  priceObservations?: PriceObservation[];
  priceAlerts?: PriceAlert[];
  isBrokeMode?: boolean;
  brokeModeConfig?: BrokeModeConfig;
  categoryLimits?: CategorySpendingLimit[];
  warRoomChallenges?: FinancialChallenge[];
  warRoomTargets?: FinancialTarget[];
  dismissedWarRoomAlerts?: string[];
  disciplineCheckIns?: string[];
  basketTemplates?: BasketTemplate[];
  basketTemplatesSeeded?: boolean;
  theme?: ThemeMode;
  visualTheme?: VisualThemeConfig;
  featureSettings?: FeatureSettings;
  pennyMessages?: PennyChatMessage[];
  pennyProfile?: PennyInteractionProfile;
  myUpiId?: string;
  myUpiName?: string;
}

export type ThemeMode = 'light' | 'dark';

export type ThemeMood =
  | 'obsidian_indigo'
  | 'stealth_mint'
  | 'frosted_sapphire'
  | 'titanium_amber';

export type SurfaceStyle =
  | 'hairline_bevel'
  | 'frosted_glass'
  | 'tactile_wells';

export type FontPairing =
  | 'manrope_mono'
  | 'jakarta_mono'
  | 'bricolage_dm';

export type MotionProfile =
  | 'crisp_micro'
  | 'calm_minimal'
  | 'rich_tactile';

export interface VisualThemeConfig {
  mood: ThemeMood;
  surface: SurfaceStyle;
  font: FontPairing;
  motion: MotionProfile;
}

export type SettingsPreset = 'simple' | 'standard' | 'full' | 'custom';

export interface FeatureSettings {
  preset: SettingsPreset;
  // Navigation Sections (Overview, Shopping, Expenses remain always enabled as core)
  showInsights: boolean;
  showScanner: boolean;
  showWellness: boolean;
  // Global Companion
  showPennyCompanion: boolean;
  // Feature & Widget Granular Visibility
  showSmartInsightsOnOverview: boolean;
  showShopSummaryMetrics: boolean;
  showShopBaskets: boolean;
  showShopRecurring: boolean;
  showShopHistory: boolean;
  showPriceTracker: boolean;
  showAuditComparator: boolean;
  showAuditGuardrail: boolean;
  showAuditFeeScanner: boolean;
  showAuditHistory: boolean;
  showAuditExportBackup: boolean;
}

export type PennyTonePreference = 'auto' | 'friendly' | 'strict_coach' | 'crisp';

export type PennyFocusTopic =
  | 'general'
  | 'groceries'
  | 'splits'
  | 'budgets'
  | 'discipline'
  | 'prices';

export interface PennyInteractionProfile {
  tonePreference: PennyTonePreference;
  messageCount: number;
  avgUserWords: number;
  conciseBias: number; // 0 (detailed) to 100 (very crisp)
  casualBias: number; // 0 (formal) to 100 (very casual)
  focusWeights: Record<PennyFocusTopic, number>;
  topFocus: PennyFocusTopic;
  resolvedSummary: string;
  lastUpdatedAt?: string;
}

export type PennyProposalType =
  | 'log_expense'
  | 'add_split'
  | 'settle_split'
  | 'build_cart'
  | 'load_basket'
  | 'add_due_recurring'
  | 'set_budget'
  | 'set_category_limit'
  | 'toggle_broke_mode'
  | 'set_recurrence'
  | 'add_price_alert'
  | 'navigate';

export interface PennyProposedAction {
  id: string;
  type: PennyProposalType;
  title: string;
  summary: string;
  status?: 'pending' | 'applied' | 'dismissed';
  appliedMessage?: string;
  expense?: {
    name: string;
    amount: number;
    category: string;
    date?: string;
  };
  split?: {
    name: string;
    totalAmount: number;
    category: string;
    paidBy: string; // 'self' or person name
    participantNames: string[]; // other people involved (not including self unless parsed)
    includeSelf?: boolean;
  };
  settlement?: {
    personName: string;
    direction: 'i_pay' | 'they_pay';
    amount: number;
    note?: string;
  };
  cartItems?: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    variantId?: string;
    unitPrice?: number;
  }>;
  basketId?: string;
  totalBudget?: number;
  categoryLimit?: {
    category: string;
    limitAmount: number;
    period: 'daily' | 'weekly' | 'monthly';
  };
  brokeModeEnabled?: boolean;
  recurrence?: {
    itemId: string;
    itemName: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
    intervalDays?: number;
  };
  priceAlert?: {
    productId: string;
    productName: string;
    unitOfMeasurement: string;
    targetUnitPrice?: number;
    increaseThresholdPct?: number;
  };
  destination?: {
    section: 'overview' | 'shopping' | 'insights' | 'expenses' | 'scanner' | 'wellness';
    subTab?: string;
  };
}

export interface PennyHighlightMetric {
  label: string;
  value: string;
}

export interface PennyChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  highlights?: PennyHighlightMetric[];
  proposedActions?: PennyProposedAction[];
  followUpQuestions?: string[];
  timestamp: string;
  pageContext?: string;
}




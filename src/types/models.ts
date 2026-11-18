export const SELF_PERSON_ID = 'self';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency;
  intervalDays?: number;
  nextDueDate?: string; // YYYY-MM-DD
  lastAddedAt?: string; // ISO
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  category: string;
  icon: string;
  quantity: number;
  unit?: string;
  productType?: string;
  imageUrl?: string;
  isFavourite?: boolean;
  isFrequent?: boolean;
  isCustom?: boolean;
  lastPurchasedAt?: string;
  purchaseCount?: number;
  recurrence?: RecurrenceConfig | null;
}

export interface CategoryConfig {
  id: string;
  name: string;
  iconKey: string;
  accent: string;
  imageUrl?: string;
  isCustom?: boolean;
  order: number;
}

export type TransactionStatus = 'active' | 'cancelled' | 'refunded';
export type TransactionSource = 'mart' | 'audit' | 'manual' | 'ledger';

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
}

export type SplitMethod = 'equal' | 'custom' | 'percentage';

export interface Person {
  id: string;
  name: string;
  contact?: string;
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
}

export interface PriceHistory {
  [itemId: string]: PricePoint[];
}

export interface PurchaseSessionItem {
  itemId: string;
  name: string;
  category: string;
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
  categoryCaps: CategoryCaps;
  savedAudits: SavedAudit[];
  people?: Person[];
  sharedExpenses?: SharedExpense[];
  settlements?: Settlement[];
  priceObservations?: PriceObservation[];
  priceAlerts?: PriceAlert[];
}

import { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Search,
  Plus,
  Bell,
  BellRing,
  Layers,
  ArrowLeft,
  LineChart,
  X,
  Check,
  Package,
  Calendar,
} from 'lucide-react';
import { useAppStore, type PriceEntryKind } from '../../store/useStore';
import {
  buildProductPriceSummaries,
  computeCategoryPriceAnalytics,
  filterAndSortProductSummaries,
  generatePriceInsights,
  normalizeObservationUnit,
  resolveCanonicalProduct,
  type ProductTrendFilter,
  type ProductTrendSort,
} from '../../utils/priceTrackerEngine';
import { formatCurrencyExact, getCategoryStyle } from '../../utils/categoryStyles';
import { ProductVisual } from '../mart/ProductVisual';
import { ProductPriceCard } from './ProductPriceCard';
import { PriceInsightCard } from './PriceInsightCard';
import { PriceHistoryChart } from './PriceHistoryChart';
import { PriceComparison } from './PriceComparison';
import { PriceHistoryTable } from './PriceHistoryTable';
import { PriceAlertManager } from './PriceAlertManager';
import { CategoryPriceAnalytics } from './CategoryPriceAnalytics';

type TrackerSection = 'overview' | 'alerts' | 'categories';

interface PriceTrackerDashboardProps {
  initialSelectedProductId?: string | null;
}

export function PriceTrackerDashboard({
  initialSelectedProductId = null,
}: PriceTrackerDashboardProps) {
  const items = useAppStore((s) => s.items);
  const categoryConfigs = useAppStore((s) => s.categoryConfigs);
  const priceObservations = useAppStore((s) => s.priceObservations);
  const priceAlerts = useAppStore((s) => s.priceAlerts);
  const triggeredPriceAlerts = useAppStore((s) => s.triggeredPriceAlerts);
  const dismissTriggeredAlert = useAppStore((s) => s.dismissTriggeredAlert);
  const recordManualPricePurchase = useAppStore((s) => s.recordManualPricePurchase);

  const [section, setSection] = useState<TrackerSection>('overview');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    initialSelectedProductId
  );

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [trendFilter, setTrendFilter] = useState<ProductTrendFilter>('all');
  const [sortBy, setSortBy] = useState<ProductTrendSort>('latest_purchase');

  const [entryOpen, setEntryOpen] = useState(false);
  const [entryName, setEntryName] = useState('');
  const [entryBrand, setEntryBrand] = useState('');
  const [entryCategory, setEntryCategory] = useState('Groceries');
  const [entryQty, setEntryQty] = useState('1');
  const [entryPackageSize, setEntryPackageSize] = useState('1 L');
  const [entryTotalPrice, setEntryTotalPrice] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [entryKind, setEntryKind] = useState<PriceEntryKind>('actual_purchase');
  const [logExpense, setLogExpense] = useState(true);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entryFlash, setEntryFlash] = useState<string | null>(null);

  const summaries = useMemo(
    () => buildProductPriceSummaries(priceObservations, items),
    [priceObservations, items]
  );

  const categoryRows = useMemo(
    () => computeCategoryPriceAnalytics(summaries),
    [summaries]
  );

  const insights = useMemo(
    () => generatePriceInsights(summaries, categoryRows),
    [summaries, categoryRows]
  );

  const filteredSummaries = useMemo(
    () =>
      filterAndSortProductSummaries(summaries, {
        query,
        category: categoryFilter,
        trendFilter,
        sortBy,
      }),
    [summaries, query, categoryFilter, trendFilter, sortBy]
  );

  const selectedSummary = useMemo(
    () => (selectedProductId ? summaries.find((s) => s.productId === selectedProductId) ?? null : null),
    [summaries, selectedProductId]
  );

  const totalTracked = summaries.length;
  const increasingCount = summaries.filter((s) => s.trendDirection === 'increasing').length;
  const decreasingCount = summaries.filter((s) => s.trendDirection === 'decreasing').length;
  const latestPurchaseSummary = useMemo(() => {
    if (summaries.length === 0) return null;
    return [...summaries].sort(
      (a, b) => new Date(b.mostRecentDate).getTime() - new Date(a.mostRecentDate).getTime()
    )[0];
  }, [summaries]);
  const totalTrackedSpend = useMemo(
    () => summaries.reduce((sum, s) => sum + s.totalSpend, 0),
    [summaries]
  );

  const activeTriggeredAlerts = triggeredPriceAlerts.filter((t) => !t.dismissed);

  const liveMatchPreview = useMemo(() => {
    if (!entryName.trim()) return null;
    const resolved = resolveCanonicalProduct(entryName, items, priceObservations, {
      explicitBrand: entryBrand || undefined,
      explicitPackageSize: entryPackageSize || undefined,
      quantity: Number(entryQty) || 1,
    });
    const norm = normalizeObservationUnit(
      Number(entryQty) || 1,
      entryPackageSize || resolved.packageSize,
      Number(entryTotalPrice) || 0
    );
    return { resolved, norm };
  }, [entryName, entryBrand, entryPackageSize, entryQty, entryTotalPrice, items, priceObservations]);

  const openManualModalForProduct = (productId?: string) => {
    if (productId) {
      const existingSummary = summaries.find((s) => s.productId === productId);
      const catalogItem = items.find((i) => i.id === productId);
      setEntryName(existingSummary?.productName ?? catalogItem?.name ?? '');
      setEntryCategory(existingSummary?.category ?? catalogItem?.category ?? 'Groceries');
      setEntryPackageSize(
        catalogItem?.unit ?? existingSummary?.packageSizes[0] ?? '1 unit'
      );
      setEntryBrand(existingSummary?.brands[0] ?? '');
    } else {
      setEntryName('');
      setEntryBrand('');
      setEntryCategory('Groceries');
      setEntryPackageSize('1 L');
    }
    setEntryQty('1');
    setEntryTotalPrice('');
    setEntryDate(new Date().toISOString().slice(0, 10));
    setEntryKind('actual_purchase');
    setLogExpense(true);
    setEntryError(null);
    setEntryOpen(true);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEntryError(null);
    const trimmedName = entryName.trim();
    const qty = Number(entryQty);
    const total = Number(entryTotalPrice);

    if (!trimmedName) {
      setEntryError('Enter a product name.');
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setEntryError('Quantity must be greater than 0.');
      return;
    }
    if (!Number.isFinite(total) || total <= 0) {
      setEntryError('Total price must be greater than ₹0.');
      return;
    }

    const isoDate = entryDate
      ? new Date(`${entryDate}T12:00:00`).toISOString()
      : new Date().toISOString();

    const result = recordManualPricePurchase({
      productName: trimmedName,
      category: entryCategory,
      brand: entryBrand.trim() || undefined,
      quantity: qty,
      packageSize: entryPackageSize.trim() || '1 unit',
      totalPrice: total,
      purchaseDate: isoDate,
      entryKind,
      logExpense: entryKind === 'actual_purchase' ? logExpense : false,
    });

    setEntryOpen(false);
    setSelectedProductId(result.observation.productId);
    setSection('overview');
    setEntryFlash(
      `Recorded ₹${formatCurrencyExact(result.observation.unitPrice)}/${
        result.observation.unitOfMeasurement
      } for ${result.observation.productName}${
        result.triggeredAlertsCount > 0
          ? ` · ${result.triggeredAlertsCount} alert triggered!`
          : ''
      }`
    );
    setTimeout(() => setEntryFlash(null), 4000);
  };

  return (
    <div className="space-y-5">
      {/* Controls & Section Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Price Intelligence sections"
          className="tactile-well inline-flex items-center bg-[var(--bg-well)] border border-[var(--border-subtle)] p-1 rounded-xl gap-1 w-full sm:w-auto overflow-x-auto no-scrollbar"
        >
          <button
            type="button"
            role="tab"
            aria-selected={section === 'overview' && !selectedProductId}
            onClick={() => {
              setSection('overview');
              setSelectedProductId(null);
            }}
            className={`flex-1 sm:flex-initial min-h-[36px] py-1.5 px-3 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
              section === 'overview' && !selectedProductId
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={section === 'categories'}
            onClick={() => {
              setSection('categories');
              setSelectedProductId(null);
            }}
            className={`flex-1 sm:flex-initial min-h-[36px] py-1.5 px-3 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
              section === 'categories'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Categories</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={section === 'alerts'}
            onClick={() => {
              setSection('alerts');
              setSelectedProductId(null);
            }}
            className={`flex-1 sm:flex-initial min-h-[36px] py-1.5 px-3 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
              section === 'alerts'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts</span>
            {(priceAlerts.length > 0 || activeTriggeredAlerts.length > 0) && (
              <span
                className={`text-[12px] font-mono tabular-nums ${
                  activeTriggeredAlerts.length > 0
                    ? 'text-[var(--accent-warning-ink)] font-bold'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {activeTriggeredAlerts.length > 0
                  ? `${activeTriggeredAlerts.length}!`
                  : priceAlerts.length}
              </span>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => openManualModalForProduct(selectedSummary?.productId)}
          className="btn-primary px-4 py-2 text-[13px] min-h-[40px] flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={2.4} />
          Log Price / Purchase
        </button>
      </div>

      {/* Feedback Banner */}
      {entryFlash && (
        <div
          role="status"
          className="rounded-xl px-4 py-2.5 border border-[var(--accent-success-border)] bg-[var(--accent-success-soft)] flex items-center gap-2 text-[13px] font-semibold text-[var(--accent-success-ink)]"
        >
          <Check className="w-4 h-4 flex-shrink-0" strokeWidth={2.5} />
          <span>{entryFlash}</span>
        </div>
      )}

      {/* Triggered Alert Toast Banner on Overview */}
      {section === 'overview' && activeTriggeredAlerts.length > 0 && (
        <div className="rounded-2xl p-4 border border-[var(--accent-warning-border)] bg-[var(--accent-warning-soft)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <BellRing className="w-4 h-4 text-[var(--accent-warning-ink)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-[var(--accent-warning-ink)]">
                {activeTriggeredAlerts[0].message}
              </p>
              {activeTriggeredAlerts.length > 1 && (
                <p className="text-[12px] text-[var(--text-secondary)]">
                  +{activeTriggeredAlerts.length - 1} more alert notification(s)
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setSection('alerts')}
              className="btn-secondary px-3 py-1.5 text-[12px] whitespace-nowrap"
            >
              Manage Alerts
            </button>
            <button
              type="button"
              onClick={() => dismissTriggeredAlert(activeTriggeredAlerts[0].id)}
              aria-label="Dismiss triggered alert"
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PRODUCT DETAILS VIEW */}
      {selectedSummary && section === 'overview' && (
        <div className="space-y-4">
          <div className="surface-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedProductId(null)}
                  aria-label="Back to price dashboard"
                  className="w-10 h-10 rounded-xl bg-[var(--bg-well)] hover:bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex-shrink-0 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                {(() => {
                  const catItem = items.find((i) => i.id === selectedSummary.productId);
                  const catCfg = categoryConfigs.find((c) => c.name === selectedSummary.category);
                  const catStyle = getCategoryStyle(selectedSummary.category, catCfg?.accent);
                  return (
                    <>
                      <ProductVisual
                        name={selectedSummary.productName}
                        category={selectedSummary.category}
                        imageUrl={catItem?.imageUrl ?? catCfg?.imageUrl}
                        iconKey={catCfg?.iconKey}
                        accent={catCfg?.accent}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <h3 className="font-display text-base sm:text-lg font-bold text-[var(--text-primary)] truncate">
                          {selectedSummary.productName}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap text-[12.5px]">
                          <span className={`font-semibold ${catStyle.text}`}>
                            {selectedSummary.category}
                          </span>
                          <span className="text-[var(--text-muted)]" aria-hidden="true">·</span>
                          <span className="font-mono text-[var(--text-secondary)]">
                            Normalized per {selectedSummary.unitOfMeasurement}
                          </span>
                          {selectedSummary.brands.length > 0 && (
                            <>
                              <span className="text-[var(--text-muted)]" aria-hidden="true">·</span>
                              <span className="text-[var(--text-primary)] font-medium">
                                {selectedSummary.brands.join(', ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openManualModalForProduct(selectedSummary.productId)}
                  className="btn-primary px-3.5 py-2 text-[12.5px] min-h-[38px] flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Purchase
                </button>
                <button
                  type="button"
                  onClick={() => setSection('alerts')}
                  className="btn-secondary px-3.5 py-2 text-[12.5px] min-h-[38px] flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Bell className="w-3.5 h-3.5" />
                  Set Alert
                </button>
              </div>
            </div>

            {/* Key Product Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="surface-well p-3.5">
                <p className="text-[12px] font-medium text-[var(--text-secondary)]">Latest</p>
                <p className="text-base font-bold font-mono text-[var(--text-primary)] mt-1 tabular-nums">
                  ₹{formatCurrencyExact(selectedSummary.latestPrice)}
                  <span className="text-[12px] text-[var(--text-secondary)] font-normal">
                    /{selectedSummary.unitOfMeasurement}
                  </span>
                </p>
              </div>
              <div className="surface-well p-3.5">
                <p className="text-[12px] font-medium text-[var(--text-secondary)]">Average</p>
                <p className="text-base font-bold font-mono text-[var(--text-primary)] mt-1 tabular-nums">
                  ₹{formatCurrencyExact(selectedSummary.averagePrice)}
                </p>
              </div>
              <div className="surface-well p-3.5">
                <p className="text-[12px] font-medium text-[var(--text-secondary)]">Highest</p>
                <p className="text-base font-bold font-mono text-[var(--accent-warning-ink)] mt-1 tabular-nums">
                  ₹{formatCurrencyExact(selectedSummary.highestPrice)}
                </p>
              </div>
              <div className="surface-well p-3.5">
                <p className="text-[12px] font-medium text-[var(--text-secondary)]">Lowest</p>
                <p className="text-base font-bold font-mono text-[var(--accent-success-ink)] mt-1 tabular-nums">
                  ₹{formatCurrencyExact(selectedSummary.lowestPrice)}
                </p>
              </div>
              <div className="surface-well p-3.5 col-span-2 sm:col-span-1">
                <p className="text-[12px] font-medium text-[var(--text-secondary)]">Purchases</p>
                <p className="text-base font-bold font-mono text-[var(--accent-ink)] mt-1 tabular-nums">
                  {selectedSummary.purchaseCount}
                  <span className="text-[12px] text-[var(--text-secondary)] font-normal ml-1">
                    (₹{formatCurrencyExact(selectedSummary.totalSpend)})
                  </span>
                </p>
              </div>
            </div>
          </div>

          <PriceHistoryChart
            observations={selectedSummary.compatibleObservations}
            unitOfMeasurement={selectedSummary.unitOfMeasurement}
            averagePrice={selectedSummary.averagePrice}
          />

          <PriceComparison summary={selectedSummary} />

          <PriceHistoryTable
            observations={selectedSummary.allObservations}
            preferredUnit={selectedSummary.unitOfMeasurement}
          />
        </div>
      )}

      {/* OVERVIEW DASHBOARD */}
      {section === 'overview' && !selectedSummary && (
        <div className="space-y-4">
          {/* Summary KPI Strip */}
          <div className="surface-card grid grid-cols-2 lg:grid-cols-4 [&>*:nth-child(odd)]:border-r [&>*:nth-child(-n+2)]:border-b lg:[&>*]:border-b-0 lg:[&>*:not(:last-child)]:border-r [&>*]:border-[var(--border-subtle)] overflow-hidden">
            <div className="p-4 sm:p-5">
              <p className="text-[12.5px] font-medium text-[var(--text-secondary)]">
                Tracked Products
              </p>
              <p className="font-display text-xl font-bold font-mono text-[var(--text-primary)] mt-1 tabular-nums">
                {totalTracked}
              </p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 tabular-nums">
                ₹{formatCurrencyExact(totalTrackedSpend)} tracked spend
              </p>
            </div>

            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[var(--accent-danger-ink)]" />
                <p className="text-[12.5px] font-medium text-[var(--text-secondary)]">
                  Price Increases
                </p>
              </div>
              <p className="font-display text-xl font-bold font-mono text-[var(--accent-danger-ink)] mt-1 tabular-nums">
                {increasingCount}
              </p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">Products trending higher</p>
            </div>

            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-[var(--accent-success-ink)]" />
                <p className="text-[12.5px] font-medium text-[var(--text-secondary)]">
                  Price Drops
                </p>
              </div>
              <p className="font-display text-xl font-bold font-mono text-[var(--accent-success-ink)] mt-1 tabular-nums">
                {decreasingCount}
              </p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">Products cheaper than start</p>
            </div>

            <div className="p-4 sm:p-5">
              <p className="text-[12.5px] font-medium text-[var(--text-secondary)]">
                Latest Purchase
              </p>
              <p className="text-sm font-bold text-[var(--text-primary)] mt-1.5 truncate">
                {latestPurchaseSummary ? latestPurchaseSummary.productName : '—'}
              </p>
              <p className="text-[12px] font-mono text-[var(--text-secondary)] mt-0.5 tabular-nums">
                {latestPurchaseSummary
                  ? `₹${formatCurrencyExact(latestPurchaseSummary.latestPrice)}/${
                      latestPurchaseSummary.unitOfMeasurement
                    }`
                  : 'No purchases yet'}
              </p>
            </div>
          </div>

          <PriceInsightCard
            insights={insights}
            onSelectProduct={(pid) => setSelectedProductId(pid)}
          />

          {/* Search, Filter & Sort Toolbar */}
          <div className="surface-card p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  aria-label="Search tracked products or brands"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search product or brand (e.g. Milk, Amul)..."
                  className="input-field w-full pl-9 pr-3 py-2 text-[13px] min-h-[38px]"
                />
              </div>

              <div className="md:col-span-4">
                <select
                  aria-label="Filter by category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="input-field w-full px-3 py-2 text-[13px] font-medium min-h-[38px]"
                >
                  <option value="All">All Categories</option>
                  {categoryConfigs.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  aria-label="Sort products"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as ProductTrendSort)}
                  className="input-field w-full px-3 py-2 text-[13px] font-medium min-h-[38px]"
                >
                  <option value="latest_purchase">Sort: Latest Purchase</option>
                  <option value="highest_increase">Sort: Highest Increase</option>
                  <option value="highest_decrease">Sort: Highest Decrease</option>
                  <option value="most_frequent">Sort: Most Frequent</option>
                  <option value="alpha">Sort: Name (A–Z)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All Tracked' },
                  { id: 'increasing', label: 'Increasing' },
                  { id: 'decreasing', label: 'Decreasing' },
                  { id: 'recent', label: 'Last 30 Days' },
                  { id: 'frequent', label: 'Frequent (2+)' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTrendFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold border transition-colors whitespace-nowrap ${
                    trendFilter === f.id
                      ? 'bg-[var(--accent-primary-soft)] text-[var(--accent-ink)] border-[var(--accent-border)]'
                      : 'bg-[var(--bg-well)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tracked Product Grid or Empty State */}
          {summaries.length === 0 ? (
            <div className="surface-card p-8 sm:p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary-soft)] border border-[var(--accent-border)] flex items-center justify-center mx-auto text-[var(--accent-ink)]">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
                  No purchase price records yet
                </h3>
                <p className="text-[13px] text-[var(--text-secondary)] mt-1 max-w-md mx-auto leading-relaxed">
                  Check out products in Shopping, record a scanned receipt in Receipt Scanner, or log a manual purchase above. Only real purchases appear here.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openManualModalForProduct()}
                className="btn-primary inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px]"
              >
                <Plus className="w-4 h-4" strokeWidth={2.4} />
                Log First Purchase
              </button>
            </div>
          ) : filteredSummaries.length === 0 ? (
            <div className="surface-card p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                No tracked products match your current search/filters
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setCategoryFilter('All');
                  setTrendFilter('all');
                }}
                className="text-[13px] font-semibold text-[var(--accent-ink)] hover:underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredSummaries.map((summary) => {
                const catItem = items.find((i) => i.id === summary.productId);
                const catCfg = categoryConfigs.find((c) => c.name === summary.category);
                return (
                  <ProductPriceCard
                    key={summary.productId}
                    summary={summary}
                    catalogItem={catItem}
                    categoryConfig={catCfg}
                    onSelect={(pid) => setSelectedProductId(pid)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CATEGORY ANALYTICS VIEW */}
      {section === 'categories' && (
        <CategoryPriceAnalytics
          rows={categoryRows}
          categoryConfigs={categoryConfigs}
          onSelectCategory={(cat) => {
            setCategoryFilter(cat);
            setSection('overview');
          }}
          onSelectProduct={(pid) => {
            setSelectedProductId(pid);
            setSection('overview');
          }}
        />
      )}

      {/* PRICE ALERTS VIEW */}
      {section === 'alerts' && (
        <PriceAlertManager
          summaries={summaries}
          initialProductId={selectedProductId}
        />
      )}

      {/* MANUAL PURCHASE / PRICE ENTRY MODAL */}
      {entryOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="fixed inset-0 z-40 bg-[var(--backdrop-scrim)] backdrop-blur-sm"
            onClick={() => setEntryOpen(false)}
          />
          <form
            onSubmit={handleManualSubmit}
            className="modal-panel relative z-50 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 space-y-4 animate-slide-up"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
                Log Purchase / Price Entry
              </h3>
              <button
                type="button"
                onClick={() => setEntryOpen(false)}
                aria-label="Close modal"
                className="p-1.5 rounded-lg bg-[var(--bg-well)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                Product Name
              </label>
              <input
                type="text"
                required
                list="price-tracker-product-suggestions"
                placeholder="e.g. Amul Taaza Milk 500ml or Basmati Rice"
                value={entryName}
                onChange={(e) => setEntryName(e.target.value)}
                className="input-field w-full px-3 py-2 text-[13px]"
              />
              <datalist id="price-tracker-product-suggestions">
                {items.map((i) => (
                  <option key={i.id} value={i.name} />
                ))}
              </datalist>
              {liveMatchPreview && (
                <p className="text-[12px] text-[var(--accent-ink)] mt-1 font-medium">
                  {liveMatchPreview.resolved.matchedExisting
                    ? `Links to "${liveMatchPreview.resolved.productName}"`
                    : `Tracks as "${liveMatchPreview.resolved.productName}"`}{' '}
                  · Normalized to{' '}
                  <strong className="font-mono">
                    {liveMatchPreview.norm.unitOfMeasurement}
                  </strong>
                  {Number(entryTotalPrice) > 0 && (
                    <>
                      {' '}
                      (₹{formatCurrencyExact(liveMatchPreview.norm.unitPrice)}/
                      {liveMatchPreview.norm.unitOfMeasurement})
                    </>
                  )}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                  Brand (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Amul, Fortune"
                  value={entryBrand}
                  onChange={(e) => setEntryBrand(e.target.value)}
                  className="input-field w-full px-3 py-2 text-[13px]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                  Category
                </label>
                <select
                  value={entryCategory}
                  onChange={(e) => setEntryCategory(e.target.value)}
                  className="input-field w-full px-3 py-2 text-[13px]"
                >
                  {categoryConfigs.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                  Qty Bought
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  value={entryQty}
                  onChange={(e) => setEntryQty(e.target.value)}
                  className="input-field w-full px-3 py-2 text-[13px] font-mono"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                  Package Size
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 500 ml, 1 kg"
                  value={entryPackageSize}
                  onChange={(e) => setEntryPackageSize(e.target.value)}
                  className="input-field w-full px-3 py-2 text-[13px] font-mono"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                  Total Paid (₹)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="e.g. 60"
                  value={entryTotalPrice}
                  onChange={(e) => setEntryTotalPrice(e.target.value)}
                  className="input-field w-full px-3 py-2 text-[13px] font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="input-field w-full px-3 py-2 text-[13px] font-mono"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                  Entry Type
                </label>
                <select
                  value={entryKind}
                  onChange={(e) => setEntryKind(e.target.value as PriceEntryKind)}
                  className="input-field w-full px-3 py-2 text-[13px]"
                >
                  <option value="actual_purchase">Actual Purchase</option>
                  <option value="manual_estimate">Manual Estimate Only</option>
                </select>
              </div>
            </div>

            {entryKind === 'actual_purchase' && (
              <label className="surface-well flex items-center gap-2.5 text-[12.5px] text-[var(--text-primary)] px-3.5 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={logExpense}
                  onChange={(e) => setLogExpense(e.target.checked)}
                  className="rounded accent-[var(--accent-primary)]"
                />
                <span>Also record as expense transaction in Expenses &amp; Budget</span>
              </label>
            )}

            {entryError && (
              <p className="text-[12.5px] font-semibold text-[var(--accent-danger-ink)]">{entryError}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEntryOpen(false)}
                className="btn-secondary px-4 py-2 text-[13px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-4 py-2 text-[13px]"
              >
                Save Price Record
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

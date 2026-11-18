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

  // Search, Filter, Sort state
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [trendFilter, setTrendFilter] = useState<ProductTrendFilter>('all');
  const [sortBy, setSortBy] = useState<ProductTrendSort>('latest_purchase');

  // Manual Price Entry modal state
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

  // Overview KPIs
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

  // Live canonical match preview inside Manual Entry Modal
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
    <div className="space-y-4">
      {/* Header Card */}
      <div className="glass-strong rounded-2xl p-4 sm:p-5 border border-white/[0.08] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-300 flex-shrink-0">
              <LineChart className="w-5 h-5" strokeWidth={2.3} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                Price Trend Tracker
              </h2>
              <p className="text-[11px] text-zinc-400 font-medium">
                Personal purchase price analytics synced with Mart, Audit & Ledger
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openManualModalForProduct(selectedSummary?.productId)}
            className="px-3.5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-ink-950 text-xs font-extrabold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={3} />
            Log Price / Purchase
          </button>
        </div>

        {/* Section Tabs */}
        <div className="grid grid-cols-3 gap-1.5 bg-ink-900/70 p-1 rounded-xl border border-white/[0.05]">
          <button
            type="button"
            onClick={() => {
              setSection('overview');
              setSelectedProductId(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              section === 'overview' && !selectedProductId
                ? 'bg-white/[0.1] text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSection('categories');
              setSelectedProductId(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              section === 'categories'
                ? 'bg-white/[0.1] text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Categories</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSection('alerts');
              setSelectedProductId(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              section === 'alerts'
                ? 'bg-white/[0.1] text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts</span>
            {(priceAlerts.length > 0 || activeTriggeredAlerts.length > 0) && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  activeTriggeredAlerts.length > 0
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-white/[0.08] text-zinc-300'
                }`}
              >
                {activeTriggeredAlerts.length > 0
                  ? `${activeTriggeredAlerts.length}!`
                  : priceAlerts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {entryFlash && (
        <div
          role="status"
          className="glass rounded-xl px-4 py-2.5 border border-brand-500/30 bg-brand-500/10 flex items-center gap-2 text-xs font-bold text-brand-300 animate-fade-in"
        >
          <Check className="w-4 h-4 flex-shrink-0" strokeWidth={2.5} />
          <span>{entryFlash}</span>
        </div>
      )}

      {/* Triggered Alert Toast Banner on Overview */}
      {section === 'overview' && activeTriggeredAlerts.length > 0 && (
        <div className="glass rounded-2xl p-3.5 border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <BellRing className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-extrabold text-amber-300">
                {activeTriggeredAlerts[0].message}
              </p>
              {activeTriggeredAlerts.length > 1 && (
                <p className="text-[11px] text-zinc-400">
                  +{activeTriggeredAlerts.length - 1} more alert notification(s)
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setSection('alerts')}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-200 text-[11px] font-bold hover:bg-amber-500/30"
            >
              Manage Alerts
            </button>
            <button
              type="button"
              onClick={() => dismissTriggeredAlert(activeTriggeredAlerts[0].id)}
              aria-label="Dismiss triggered alert"
              className="p-1 text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* PRODUCT DETAILS VIEW */}
      {selectedSummary && section === 'overview' && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass rounded-2xl p-4 sm:p-5 border border-white/[0.08] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedProductId(null)}
                  aria-label="Back to price dashboard"
                  className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-zinc-300 hover:text-white flex-shrink-0"
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
                        <h3 className="text-base sm:text-lg font-extrabold text-white truncate">
                          {selectedSummary.productName}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          <span className={`font-bold ${catStyle.text}`}>
                            {selectedSummary.category}
                          </span>
                          <span className="text-zinc-600">·</span>
                          <span className="font-mono text-zinc-400">
                            Normalized per {selectedSummary.unitOfMeasurement}
                          </span>
                          {selectedSummary.brands.length > 0 && (
                            <>
                              <span className="text-zinc-600">·</span>
                              <span className="text-zinc-300">
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openManualModalForProduct(selectedSummary.productId)}
                  className="px-3 py-2 rounded-xl bg-brand-500/15 hover:bg-brand-500/25 border border-brand-500/30 text-brand-300 text-xs font-extrabold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Purchase
                </button>
                <button
                  type="button"
                  onClick={() => setSection('alerts')}
                  className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-200 text-xs font-bold flex items-center gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5" />
                  Set Alert
                </button>
              </div>
            </div>

            {/* Key Product Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="bg-ink-900/70 rounded-xl p-3 border border-white/[0.05]">
                <p className="text-[9px] font-bold uppercase text-zinc-500">Latest</p>
                <p className="text-base font-extrabold font-mono text-white mt-0.5">
                  ₹{formatCurrencyExact(selectedSummary.latestPrice)}
                  <span className="text-[10px] text-zinc-500">
                    /{selectedSummary.unitOfMeasurement}
                  </span>
                </p>
              </div>
              <div className="bg-ink-900/70 rounded-xl p-3 border border-white/[0.05]">
                <p className="text-[9px] font-bold uppercase text-zinc-500">Average</p>
                <p className="text-base font-extrabold font-mono text-zinc-200 mt-0.5">
                  ₹{formatCurrencyExact(selectedSummary.averagePrice)}
                </p>
              </div>
              <div className="bg-ink-900/70 rounded-xl p-3 border border-white/[0.05]">
                <p className="text-[9px] font-bold uppercase text-zinc-500">Highest</p>
                <p className="text-base font-extrabold font-mono text-orange-400 mt-0.5">
                  ₹{formatCurrencyExact(selectedSummary.highestPrice)}
                </p>
              </div>
              <div className="bg-ink-900/70 rounded-xl p-3 border border-white/[0.05]">
                <p className="text-[9px] font-bold uppercase text-zinc-500">Lowest</p>
                <p className="text-base font-extrabold font-mono text-brand-400 mt-0.5">
                  ₹{formatCurrencyExact(selectedSummary.lowestPrice)}
                </p>
              </div>
              <div className="bg-ink-900/70 rounded-xl p-3 border border-white/[0.05] col-span-2 sm:col-span-1">
                <p className="text-[9px] font-bold uppercase text-zinc-500">Purchases</p>
                <p className="text-base font-extrabold font-mono text-sky-300 mt-0.5">
                  {selectedSummary.purchaseCount}
                  <span className="text-[10px] text-zinc-500 ml-1">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="glass rounded-xl p-3.5 border border-white/[0.06]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Tracked Products
              </p>
              <p className="text-xl font-extrabold font-mono text-white mt-1 tabular-nums">
                {totalTracked}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                ₹{formatCurrencyExact(totalTrackedSpend)} tracked spend
              </p>
            </div>

            <div className="glass rounded-xl p-3.5 border border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-red-400" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Price Increases
                </p>
              </div>
              <p className="text-xl font-extrabold font-mono text-red-400 mt-1 tabular-nums">
                {increasingCount}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Products trending higher</p>
            </div>

            <div className="glass rounded-xl p-3.5 border border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-brand-400" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Price Drops
                </p>
              </div>
              <p className="text-xl font-extrabold font-mono text-brand-400 mt-1 tabular-nums">
                {decreasingCount}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Products cheaper than start</p>
            </div>

            <div className="glass rounded-xl p-3.5 border border-white/[0.06]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Latest Purchase
              </p>
              <p className="text-sm font-extrabold text-white mt-1 truncate">
                {latestPurchaseSummary ? latestPurchaseSummary.productName : '—'}
              </p>
              <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                {latestPurchaseSummary
                  ? `₹${formatCurrencyExact(latestPurchaseSummary.latestPrice)}/${
                      latestPurchaseSummary.unitOfMeasurement
                    }`
                  : 'No purchases yet'}
              </p>
            </div>
          </div>

          {/* Your Price Insights (strictly gated on real multi-purchase data) */}
          <PriceInsightCard
            insights={insights}
            onSelectProduct={(pid) => setSelectedProductId(pid)}
          />

          {/* Search, Filter & Sort Toolbar */}
          <div className="glass rounded-2xl p-3.5 border border-white/[0.06] space-y-2.5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  aria-label="Search tracked products or brands"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search product or brand (e.g. Milk, Amul)..."
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-brand-500/40"
                />
              </div>

              <div className="md:col-span-4">
                <select
                  aria-label="Filter by category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none focus:border-brand-500/40"
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
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none focus:border-brand-500/40"
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
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                    trendFilter === f.id
                      ? 'bg-brand-500/15 text-brand-300 border-brand-500/30'
                      : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tracked Product Grid or Real Empty State */}
          {summaries.length === 0 ? (
            <div className="glass rounded-2xl p-8 sm:p-10 text-center border border-dashed border-white/[0.1] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto text-sky-400">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  No purchase price records yet
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed">
                  Check out products in Quick Mart, record a scanned receipt in Audit, or log a manual purchase above. Only real purchases appear here — never simulated prices.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openManualModalForProduct()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-ink-950 text-xs font-extrabold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                Log First Purchase
              </button>
            </div>
          ) : filteredSummaries.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center space-y-2">
              <p className="text-sm font-bold text-zinc-300">
                No tracked products match your current search/filters
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setCategoryFilter('All');
                  setTrendFilter('all');
                }}
                className="text-xs font-bold text-brand-400 hover:text-brand-300"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm animate-fade-in"
            onClick={() => setEntryOpen(false)}
          />
          <form
            onSubmit={handleManualSubmit}
            className="relative z-50 w-full max-w-md max-h-[90vh] overflow-y-auto glass-strong border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-3.5 animate-slide-up"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">Log Purchase / Price Entry</h3>
              <button
                type="button"
                onClick={() => setEntryOpen(false)}
                aria-label="Close modal"
                className="p-1.5 rounded-lg bg-white/[0.06] text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                Product Name
              </label>
              <input
                type="text"
                required
                list="price-tracker-product-suggestions"
                placeholder="e.g. Amul Taaza Milk 500ml or Basmati Rice"
                value={entryName}
                onChange={(e) => setEntryName(e.target.value)}
                className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500/40"
              />
              <datalist id="price-tracker-product-suggestions">
                {items.map((i) => (
                  <option key={i.id} value={i.name} />
                ))}
              </datalist>
              {liveMatchPreview && (
                <p className="text-[11px] text-sky-300 mt-1">
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  Brand (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Amul, Fortune"
                  value={entryBrand}
                  onChange={(e) => setEntryBrand(e.target.value)}
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500/40"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  Category
                </label>
                <select
                  value={entryCategory}
                  onChange={(e) => setEntryCategory(e.target.value)}
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500/40"
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  Qty Bought
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  value={entryQty}
                  onChange={(e) => setEntryQty(e.target.value)}
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-brand-500/40"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  Package Size
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 500 ml, 1 kg"
                  value={entryPackageSize}
                  onChange={(e) => setEntryPackageSize(e.target.value)}
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-brand-500/40"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
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
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-brand-500/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-brand-500/40"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  Entry Type
                </label>
                <select
                  value={entryKind}
                  onChange={(e) => setEntryKind(e.target.value as PriceEntryKind)}
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500/40"
                >
                  <option value="actual_purchase">Actual Purchase</option>
                  <option value="manual_estimate">Manual Estimate Only</option>
                </select>
              </div>
            </div>

            {entryKind === 'actual_purchase' && (
              <label className="flex items-center gap-2 text-xs text-zinc-300 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={logExpense}
                  onChange={(e) => setLogExpense(e.target.checked)}
                  className="rounded accent-brand-500"
                />
                <span>Also record as expense transaction in Ledger & Budget</span>
              </label>
            )}

            {entryError && (
              <p className="text-xs font-semibold text-red-400">{entryError}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEntryOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/[0.06] text-xs font-bold text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-ink-950 text-xs font-extrabold"
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

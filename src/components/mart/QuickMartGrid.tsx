import { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  SlidersHorizontal,
  ArrowLeft,
  Repeat,
  History,
  LayoutGrid,
  Package,
  Store,
  Check,
  ShieldAlert,
  RotateCcw,
  Heart,
  Sparkles,
  Receipt,
  ChevronRight,
  Clock,
  Bookmark,
  ShoppingBag,
} from 'lucide-react';
import { useAppStore, type CartItem } from '../../store/useStore';
import {
  formatCurrencyExact,
  formatQuantity,
  getCategoryStyle,
} from '../../utils/categoryStyles';
import {
  calculateCartTotals,
  calculateMonthlyShoppingSpend,
  computeFrequentlyPurchasedInsights,
  computeRecentlyPurchasedItems,
  evaluateBasketTemplate,
  filterAndSortProducts,
  getDueRecurringItems,
  isRecurringBillItem,
  type FrequentlyPurchasedInsight,
  type ProductFilterOptions,
} from '../../utils/martEngine';
import { computeBrokeModeStatus } from '../../utils/warRoomEngine';
import { CategoryCard } from './CategoryCard';
import { CategoryManagerModal } from './CategoryManagerModal';
import { ProductSearch } from './ProductSearch';
import { ProductGrid } from './ProductGrid';
import { ProductDetails } from './ProductDetails';
import { CustomProductForm } from './CustomProductForm';
import { RecurringItemManager } from './RecurringItemManager';
import { PurchaseHistory } from './PurchaseHistory';
import { CategoryIcon } from './CategoryIcon';
import { ProductVisual } from './ProductVisual';
import { BasketTemplatesPanel } from './BasketTemplatesPanel';

type MartSection = 'home' | 'catalog' | 'baskets' | 'recurring' | 'history';

const DEFAULT_FILTERS: ProductFilterOptions = {
  query: '',
  category: 'All',
  subcategory: 'All',
  brand: 'All',
  productType: 'All',
  minPrice: null,
  maxPrice: null,
  onlyFavourites: false,
  onlyFrequent: false,
  onlyRecent: false,
  onlyRecurring: false,
  sortBy: 'default',
};

export function QuickMartGrid({ onOpenCart }: { onOpenCart?: () => void }) {
  const items = useAppStore((s) => s.items);
  const categoryConfigs = useAppStore((s) => s.categoryConfigs);
  const transactions = useAppStore((s) => s.transactions);
  const totalBudget = useAppStore((s) => s.totalBudget);
  const purchaseHistory = useAppStore((s) => s.purchaseHistory);
  const isBrokeMode = useAppStore((s) => s.isBrokeMode);
  const brokeModeConfig = useAppStore((s) => s.brokeModeConfig);
  const basketTemplates = useAppStore((s) => s.basketTemplates);

  const addToCart = useAppStore((s) => s.addToCart);
  const updateQuantity = useAppStore((s) => s.updateQuantity);
  const setItemQuantity = useAppStore((s) => s.setItemQuantity);
  const selectProductVariant = useAppStore((s) => s.selectProductVariant);
  const toggleFavourite = useAppStore((s) => s.toggleFavourite);
  const updateItemPrice = useAppStore((s) => s.updateItemPrice);
  const addDueRecurringToCart = useAppStore((s) => s.addDueRecurringToCart);
  const quickReorderItem = useAppStore((s) => s.quickReorderItem);
  const loadBasketTemplateToCart = useAppStore((s) => s.loadBasketTemplateToCart);

  const [section, setSection] = useState<MartSection>('home');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductFilterOptions>(DEFAULT_FILTERS);

  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CartItem | null>(null);
  const [detailProduct, setDetailProduct] = useState<CartItem | null>(null);
  const [dueAddedFlash, setDueAddedFlash] = useState<number | null>(null);
  const [reorderedFlashKey, setReorderedFlashKey] = useState<string | null>(null);
  const [basketLoadedFlashId, setBasketLoadedFlashId] = useState<string | null>(null);

  // Live variant-aware cart totals
  const cartSummary = useMemo(() => calculateCartTotals(items), [items]);
  const monthlySpend = useMemo(
    () => calculateMonthlyShoppingSpend(transactions),
    [transactions]
  );
  const remainingMonthlyBudget = totalBudget - monthlySpend;
  const dueRecurring = useMemo(() => getDueRecurringItems(items), [items]);
  const brokeStatus = useMemo(
    () => computeBrokeModeStatus(transactions, brokeModeConfig),
    [transactions, brokeModeConfig]
  );

  const effectiveFilters: ProductFilterOptions = useMemo(
    () => ({
      ...filters,
      category: selectedCategory ?? filters.category ?? 'All',
    }),
    [filters, selectedCategory]
  );

  const isSearchingOrFiltering = useMemo(() => {
    return (
      Boolean(filters.query?.trim()) ||
      filters.minPrice != null ||
      filters.maxPrice != null ||
      Boolean(filters.onlyFavourites) ||
      Boolean(filters.onlyFrequent) ||
      Boolean(filters.onlyRecent) ||
      Boolean(filters.onlyRecurring) ||
      (filters.sortBy && filters.sortBy !== 'default') ||
      (filters.category && filters.category !== 'All') ||
      (filters.subcategory && filters.subcategory !== 'All') ||
      (filters.brand && filters.brand !== 'All') ||
      (filters.productType && filters.productType !== 'All')
    );
  }, [filters]);

  const filteredItems = useMemo(
    () => filterAndSortProducts(items, effectiveFilters),
    [items, effectiveFilters]
  );

  const categoryItemCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) {
      map[item.category] = (map[item.category] ?? 0) + 1;
    }
    return map;
  }, [items]);

  const activeCategoryConfig = useMemo(
    () =>
      selectedCategory
        ? categoryConfigs.find((c) => c.name === selectedCategory)
        : undefined,
    [categoryConfigs, selectedCategory]
  );

  const activeCategorySubcategories = useMemo(() => {
    if (!selectedCategory) return [];
    const set = new Set<string>(activeCategoryConfig?.subcategories ?? []);
    for (const item of items) {
      if (item.category === selectedCategory && item.subcategory?.trim()) {
        set.add(item.subcategory.trim());
      }
    }
    return Array.from(set);
  }, [selectedCategory, activeCategoryConfig, items]);

  // Real personalization datasets (NEVER fabricated)
  const frequentInsights = useMemo(
    () => computeFrequentlyPurchasedInsights(items, purchaseHistory, 6),
    [items, purchaseHistory]
  );
  const recentInsights = useMemo(
    () => computeRecentlyPurchasedItems(items, purchaseHistory, 6),
    [items, purchaseHistory]
  );
  const favoriteItems = useMemo(
    () => items.filter((i) => Boolean(i.isFavourite)),
    [items]
  );
  const popularEssentials = useMemo(
    () => items.filter((i) => i.isPopular && !isRecurringBillItem(i)).slice(0, 6),
    [items]
  );
  const customItems = useMemo(
    () => items.filter((i) => Boolean(i.isCustom)),
    [items]
  );
  const billItems = useMemo(
    () => items.filter((i) => isRecurringBillItem(i)).slice(0, 6),
    [items]
  );
  const evaluatedHomeBaskets = useMemo(
    () => basketTemplates.slice(0, 3).map((b) => evaluateBasketTemplate(b, items)),
    [basketTemplates, items]
  );

  const handleSelectCategory = (catName: string) => {
    setSelectedCategory(catName);
    setSection('home');
    setFilters((prev) => ({ ...prev, category: catName, subcategory: 'All' }));
  };

  const handleBackToHome = () => {
    setSelectedCategory(null);
    setFilters((prev) => ({ ...prev, category: 'All', subcategory: 'All' }));
  };

  const handleResetFilters = () => {
    setFilters({
      ...DEFAULT_FILTERS,
      category: selectedCategory ?? 'All',
      subcategory: 'All',
    });
  };

  const handleAddDueQuick = () => {
    const count = addDueRecurringToCart();
    if (count > 0) {
      setDueAddedFlash(count);
      setTimeout(() => setDueAddedFlash(null), 2200);
    }
  };

  const handleQuickReorder = (insight: FrequentlyPurchasedInsight) => {
    const ok = quickReorderItem(insight.item.id, insight.lastVariantId, 1);
    if (ok) {
      const flashKey = `${insight.item.id}::${insight.lastVariantId ?? ''}`;
      setReorderedFlashKey(flashKey);
      setTimeout(() => setReorderedFlashKey(null), 1600);
    }
  };

  const handleQuickLoadBasket = (basketId: string) => {
    const count = loadBasketTemplateToCart(basketId, 'merge');
    if (count > 0) {
      setBasketLoadedFlashId(basketId);
      setTimeout(() => setBasketLoadedFlashId(null), 1800);
    }
  };

  const renderReorderCard = (insight: FrequentlyPurchasedInsight, mode: 'frequent' | 'recent') => {
    const cfg = categoryConfigs.find((c) => c.name === insight.item.category);
    const flashKey = `${insight.item.id}::${insight.lastVariantId ?? ''}`;
    const isFlashed = reorderedFlashKey === flashKey;
    const dateLabel = new Date(insight.lastPurchasedAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });

    return (
      <div
        key={`${mode}-${flashKey}`}
        className="glass rounded-xl p-2.5 border border-white/[0.07] flex items-center justify-between gap-2.5"
      >
        <button
          type="button"
          onClick={() => setDetailProduct(insight.item)}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
        >
          <ProductVisual
            name={insight.item.name}
            category={insight.item.category}
            imageUrl={insight.item.imageUrl}
            iconKey={cfg?.iconKey}
            accent={cfg?.accent}
            size="sm"
          />
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-white truncate">
              {insight.item.name}
              {insight.lastVariantLabel ? ` · ${insight.lastVariantLabel}` : ''}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 mt-0.5 flex-wrap">
              <span className="font-bold text-zinc-200">
                ₹{formatCurrencyExact(insight.currentPrice)}
              </span>
              <span>·</span>
              {mode === 'frequent' ? (
                <span>
                  {insight.orderCount} {insight.orderCount === 1 ? 'order' : 'orders'}
                </span>
              ) : (
                <span>Last: {dateLabel}</span>
              )}
              {Math.abs(insight.priceDiff) >= 0.5 && (
                <span
                  title={`Previously paid ₹${formatCurrencyExact(insight.lastPaidPrice)}`}
                  className={`px-1 py-0.2 rounded font-bold ${
                    insight.priceDiff > 0
                      ? 'bg-amber-500/15 text-amber-300'
                      : 'bg-brand-500/15 text-brand-300'
                  }`}
                >
                  {insight.priceDiff > 0 ? `+₹${formatCurrencyExact(insight.priceDiff)}` : `-₹${formatCurrencyExact(Math.abs(insight.priceDiff))}`}
                </span>
              )}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleQuickReorder(insight)}
          aria-label={`Reorder ${insight.item.name}`}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold flex items-center gap-1 whitespace-nowrap flex-shrink-0 transition-all ${
            isFlashed
              ? 'bg-brand-500 text-ink-950'
              : 'bg-brand-500/15 hover:bg-brand-500 text-brand-300 hover:text-ink-950 border border-brand-500/35'
          }`}
        >
          {isFlashed ? (
            <>
              <Check className="w-3 h-3" strokeWidth={3} />
              In Cart
            </>
          ) : (
            <>
              <RotateCcw className="w-3 h-3" strokeWidth={2.5} />
              Reorder
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Quick Mart Header */}
      <div className="glass-strong rounded-2xl p-4 border border-white/[0.08] space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 flex-shrink-0">
              <Store className="w-5 h-5" strokeWidth={2.3} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-none">
                Quick Mart
              </h2>
              <p className="text-[11px] text-zinc-400 font-medium mt-1 truncate">
                Personal Shopping & Smart Expense Catalog
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setProductFormOpen(true);
              }}
              aria-label="Add custom product"
              className="px-3 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-ink-950 text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap transition-all"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={3} />
              <span className="hidden sm:inline">Custom Item</span>
              <span className="sm:hidden">Custom</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoryManagerOpen(true)}
              aria-label="Manage categories"
              title="Manage categories & subcategories"
              className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onOpenCart?.()}
              aria-label={`Open shopping cart with ${cartSummary.totalUnits} items`}
              className="relative w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-brand-500/20 border border-white/[0.08] hover:border-brand-500/35 flex items-center justify-center text-zinc-200 hover:text-brand-400 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" strokeWidth={2.3} />
              {cartSummary.lineCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-ink-950 text-[10px] font-extrabold flex items-center justify-center">
                  {cartSummary.lineCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Shopping Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-ink-900/70 border border-white/[0.05] rounded-xl px-3 py-2 flex flex-col justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">
              Cart Value
            </p>
            <p className="text-sm font-extrabold font-mono text-white tabular-nums mt-0.5">
              ₹{formatCurrencyExact(cartSummary.totalAmount)}
            </p>
          </div>
          <div className="bg-ink-900/70 border border-white/[0.05] rounded-xl px-3 py-2 flex flex-col justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">
              Cart Items
            </p>
            <p className="text-sm font-extrabold font-mono text-brand-400 tabular-nums mt-0.5">
              {cartSummary.lineCount} {cartSummary.lineCount === 1 ? 'line' : 'lines'} ·{' '}
              {formatQuantity(cartSummary.totalUnits)}
            </p>
          </div>
          <div className="bg-ink-900/70 border border-white/[0.05] rounded-xl px-3 py-2 flex flex-col justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">
              Month Spend
            </p>
            <p className="text-sm font-extrabold font-mono text-zinc-200 tabular-nums mt-0.5">
              ₹{formatCurrencyExact(monthlySpend)}
            </p>
          </div>
          <div className="bg-ink-900/70 border border-white/[0.05] rounded-xl px-3 py-2 flex flex-col justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap truncate">
              Budget Left
            </p>
            <p
              className={`text-sm font-extrabold font-mono tabular-nums mt-0.5 ${
                remainingMonthlyBudget >= 0 ? 'text-brand-400' : 'text-red-400'
              }`}
            >
              ₹{formatCurrencyExact(remainingMonthlyBudget)}
            </p>
          </div>
        </div>

        {/* Active Broke Mode Accountability Watch */}
        {isBrokeMode && (
          <div className="rounded-xl px-3.5 py-2.5 bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-xs font-bold text-amber-200">
                Broke Mode Active ({brokeStatus.periodLabel}) · Essential items stay unrestricted; watched categories are highlighted.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono font-bold tabular-nums">
              <span className="text-amber-300">
                Allowance Left: ₹{formatCurrencyExact(brokeStatus.remaining)}
              </span>
              <span className="text-zinc-300">
                Non-Essential Left: ₹{formatCurrencyExact(brokeStatus.nonEssentialRemaining)}
              </span>
            </div>
          </div>
        )}

        {/* Section Navigation */}
        <div className="flex sm:grid sm:grid-cols-5 items-center gap-1 bg-ink-900/70 p-1 rounded-xl border border-white/[0.05] overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setSection('home');
              setSelectedCategory(null);
            }}
            className={`shrink-0 sm:shrink py-2 px-3 sm:px-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 sm:gap-1 whitespace-nowrap transition-all ${
              section === 'home' && !selectedCategory
                ? 'bg-white/[0.1] text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSection('catalog');
              setSelectedCategory(null);
              setFilters((p) => ({ ...p, category: 'All', subcategory: 'All' }));
            }}
            className={`shrink-0 sm:shrink py-2 px-3 sm:px-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 sm:gap-1 whitespace-nowrap transition-all ${
              section === 'catalog' || Boolean(selectedCategory)
                ? 'bg-white/[0.1] text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Package className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Catalog</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSection('baskets');
              setSelectedCategory(null);
            }}
            className={`shrink-0 sm:shrink py-2 px-3 sm:px-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 sm:gap-1 whitespace-nowrap transition-all ${
              section === 'baskets'
                ? 'bg-white/[0.1] text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Baskets</span>
            {basketTemplates.length > 0 && (
              <span className="font-mono text-[10px] text-brand-400">
                {basketTemplates.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setSection('recurring');
              setSelectedCategory(null);
            }}
            className={`shrink-0 sm:shrink py-2 px-3 sm:px-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 sm:gap-1 whitespace-nowrap transition-all ${
              section === 'recurring'
                ? 'bg-white/[0.1] text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Repeat className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Recurring</span>
            {dueRecurring.length > 0 && (
              <span className="font-mono text-[10px] text-sky-300">
                {dueRecurring.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setSection('history');
              setSelectedCategory(null);
            }}
            className={`shrink-0 sm:shrink py-2 px-3 sm:px-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 sm:gap-1 whitespace-nowrap transition-all ${
              section === 'history'
                ? 'bg-white/[0.1] text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History className="w-3.5 h-3.5 flex-shrink-0" />
            <span>History</span>
            {purchaseHistory.length > 0 && (
              <span className="font-mono text-[10px] text-brand-300">
                {purchaseHistory.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Persistent Global Search Bar across Home & Catalog */}
      {(section === 'home' || section === 'catalog') && (
        <ProductSearch
          filters={effectiveFilters}
          categories={categoryConfigs}
          items={items}
          onChange={(next) => {
            setFilters(next);
            if (
              next.category &&
              next.category !== 'All' &&
              selectedCategory &&
              next.category !== selectedCategory
            ) {
              setSelectedCategory(next.category);
            } else if (next.category === 'All' && selectedCategory) {
              setSelectedCategory(null);
            }
          }}
          onSelectCategory={handleSelectCategory}
          onOpenProduct={(item) => setDetailProduct(item)}
          onReset={handleResetFilters}
        />
      )}

      {/* VIEW 1: Dedicated Category + Subcategory Browsing Page */}
      {section === 'home' && selectedCategory && (
        <div className="space-y-3 animate-fade-in">
          {/* Quick Category Switcher Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
            <button
              type="button"
              onClick={handleBackToHome}
              className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-[11px] font-bold text-zinc-300 whitespace-nowrap flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Home
            </button>
            {categoryConfigs.map((cat) => {
              const active = cat.name === selectedCategory;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.name)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border whitespace-nowrap transition-all ${
                    active
                      ? 'bg-brand-500/20 border-brand-500/50 text-brand-300'
                      : 'bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          <div className="glass rounded-2xl p-3.5 flex items-center justify-between gap-3 border border-white/[0.08]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl ${
                  getCategoryStyle(selectedCategory, activeCategoryConfig?.accent).bg
                } ${
                  getCategoryStyle(selectedCategory, activeCategoryConfig?.accent).text
                } flex items-center justify-center flex-shrink-0`}
              >
                <CategoryIcon
                  iconKey={activeCategoryConfig?.iconKey}
                  className="w-4 h-4"
                />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                  {selectedCategory}
                </h3>
                <p className="text-[11px] text-zinc-400">
                  {filteredItems.length} product{filteredItems.length === 1 ? '' : 's'}
                  {filters.subcategory && filters.subcategory !== 'All'
                    ? ` in ${filters.subcategory}`
                    : ''}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setProductFormOpen(true);
              }}
              className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-brand-500 text-xs font-bold text-zinc-200 hover:text-ink-950 flex items-center gap-1.5 whitespace-nowrap transition-all"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={3} />
              Add Here
            </button>
          </div>

          {/* Subcategory Navigation Pills */}
          {activeCategorySubcategories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
              <button
                type="button"
                onClick={() => setFilters((p) => ({ ...p, subcategory: 'All' }))}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border whitespace-nowrap transition-all ${
                  !filters.subcategory || filters.subcategory === 'All'
                    ? 'bg-white/[0.12] border-white/20 text-white'
                    : 'bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All ({categoryItemCounts[selectedCategory] ?? 0})
              </button>
              {activeCategorySubcategories.map((sub) => {
                const subCount = items.filter(
                  (i) =>
                    i.category === selectedCategory &&
                    (i.subcategory ?? '').toLowerCase() === sub.toLowerCase()
                ).length;
                const active =
                  (filters.subcategory ?? '').toLowerCase() === sub.toLowerCase();
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() =>
                      setFilters((p) => ({
                        ...p,
                        subcategory: active ? 'All' : sub,
                      }))
                    }
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border whitespace-nowrap transition-all ${
                      active
                        ? 'bg-brand-500/20 border-brand-500/45 text-brand-300'
                        : 'bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {sub} ({subCount})
                  </button>
                );
              })}
            </div>
          )}

          <ProductGrid
            items={filteredItems}
            categoryConfigs={categoryConfigs}
            isBrokeMode={isBrokeMode}
            restrictedCategories={brokeModeConfig.restrictedCategories}
            onAddToCart={(item, amt, variantId) => addToCart(item, amt, variantId)}
            onUpdateQuantity={updateQuantity}
            onSetQuantity={setItemQuantity}
            onSelectVariant={selectProductVariant}
            onToggleFavourite={toggleFavourite}
            onUpdatePrice={updateItemPrice}
            onOpenDetails={(item) => setDetailProduct(item)}
            onAddCustomProduct={() => {
              setEditingProduct(null);
              setProductFormOpen(true);
            }}
            onResetFilters={handleResetFilters}
          />
        </div>
      )}

      {/* VIEW 2: Shopping Home Page */}
      {section === 'home' && !selectedCategory && (
        <div className="space-y-5">
          {/* Quick Category Strip */}
          {!isSearchingOrFiltering && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
              {categoryConfigs.map((cat) => {
                const style = getCategoryStyle(cat.name, cat.accent);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.name)}
                    className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.07] text-[11px] font-bold text-zinc-200 whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 transition-all"
                  >
                    <span className={`${style.text}`}>
                      <CategoryIcon iconKey={cat.iconKey} className="w-3.5 h-3.5" />
                    </span>
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Due Recurring Quick Action */}
          {dueRecurring.length > 0 && !isSearchingOrFiltering && (
            <div className="glass rounded-2xl p-3.5 border border-sky-500/25 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-300 flex items-center justify-center flex-shrink-0">
                  <Repeat className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-white truncate">
                    {dueRecurring.length} Recurring Item{dueRecurring.length > 1 ? 's' : ''} Due
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {dueRecurring
                      .slice(0, 3)
                      .map((i) => i.name)
                      .join(', ')}
                    {dueRecurring.length > 3 ? ` +${dueRecurring.length - 3}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddDueQuick}
                className="px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/35 text-sky-200 text-xs font-extrabold whitespace-nowrap flex items-center gap-1.5"
              >
                {dueAddedFlash !== null ? (
                  <>
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    Added {dueAddedFlash}
                  </>
                ) : (
                  'Add Due to Cart'
                )}
              </button>
            </div>
          )}

          {isSearchingOrFiltering ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                  Matching Products ({filteredItems.length})
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-brand-400 hover:text-brand-300"
                >
                  Back to Home
                </button>
              </div>
              <ProductGrid
                items={filteredItems}
                categoryConfigs={categoryConfigs}
                isBrokeMode={isBrokeMode}
                restrictedCategories={brokeModeConfig.restrictedCategories}
                onAddToCart={(item, amt, variantId) => addToCart(item, amt, variantId)}
                onUpdateQuantity={updateQuantity}
                onSetQuantity={setItemQuantity}
                onSelectVariant={selectProductVariant}
                onToggleFavourite={toggleFavourite}
                onUpdatePrice={updateItemPrice}
                onOpenDetails={(item) => setDetailProduct(item)}
                onAddCustomProduct={() => {
                  setEditingProduct(null);
                  setProductFormOpen(true);
                }}
                onResetFilters={handleResetFilters}
              />
            </div>
          ) : (
            <>
              {/* Personalized Real Purchase History Sections */}
              {(frequentInsights.length > 0 || recentInsights.length > 0) ? (
                <div className="space-y-4">
                  {recentInsights.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-brand-400" />
                          Buy Again · Recently Purchased
                        </h3>
                        <button
                          type="button"
                          onClick={() => setSection('history')}
                          className="text-[11px] font-bold text-brand-400 hover:text-brand-300 flex items-center gap-0.5"
                        >
                          Orders <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {recentInsights.map((ins) => renderReorderCard(ins, 'recent'))}
                      </div>
                    </div>
                  )}

                  {frequentInsights.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Frequently Purchased
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {frequentInsights.map((ins) => renderReorderCard(ins, 'frequent'))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="glass rounded-2xl p-3.5 border border-white/[0.06] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-zinc-400 flex-shrink-0">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-200">
                        Buy Again & Frequently Purchased
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        Complete your first checkout to unlock one-tap reorder with live price checks.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Saved Baskets Shelf */}
              {evaluatedHomeBaskets.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-brand-400" />
                      Saved Baskets ({basketTemplates.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setSection('baskets')}
                      className="text-[11px] font-bold text-brand-400 hover:text-brand-300 flex items-center gap-0.5 whitespace-nowrap"
                    >
                      Manage Baskets <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {evaluatedHomeBaskets.map((ev) => {
                      const flashed = basketLoadedFlashId === ev.basket.id;
                      const hasDiff = Math.abs(ev.priceDiff) >= 0.5;
                      return (
                        <div
                          key={ev.basket.id}
                          className="glass rounded-xl p-3 border border-white/[0.07] flex flex-col justify-between gap-2.5"
                        >
                          <div>
                            <button
                              type="button"
                              onClick={() => setSection('baskets')}
                              className="text-left w-full"
                            >
                              <p className="text-xs font-extrabold text-white truncate">
                                {ev.basket.name}
                              </p>
                              <p className="text-[10px] font-mono text-zinc-400 mt-0.5 tabular-nums">
                                {ev.lineCount} items · ₹{formatCurrencyExact(ev.currentTotal)}
                                {hasDiff && (
                                  <span
                                    className={
                                      ev.priceDiff > 0 ? ' text-amber-300' : ' text-brand-400'
                                    }
                                  >
                                    {' '}
                                    ({ev.priceDiff > 0 ? '+' : '-'}₹
                                    {formatCurrencyExact(Math.abs(ev.priceDiff))})
                                  </span>
                                )}
                              </p>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleQuickLoadBasket(ev.basket.id)}
                            aria-label={`Load basket ${ev.basket.name}`}
                            className={`w-full py-1.5 px-2.5 rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1 whitespace-nowrap transition-all ${
                              flashed
                                ? 'bg-brand-500 text-ink-950'
                                : 'bg-brand-500/15 hover:bg-brand-500 text-brand-300 hover:text-ink-950 border border-brand-500/30'
                            }`}
                          >
                            {flashed ? (
                              <>
                                <Check className="w-3 h-3" strokeWidth={3} />
                                Loaded to Cart
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="w-3 h-3" strokeWidth={2.5} />
                                Load Basket
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Favorites Section */}
              {favoriteItems.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-400" fill="currentColor" />
                      Your Favorites ({favoriteItems.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setFilters((p) => ({ ...p, onlyFavourites: true }))}
                      className="text-[11px] font-bold text-brand-400 hover:text-brand-300"
                    >
                      View All
                    </button>
                  </div>
                  <ProductGrid
                    items={favoriteItems.slice(0, 6)}
                    categoryConfigs={categoryConfigs}
                    isBrokeMode={isBrokeMode}
                    restrictedCategories={brokeModeConfig.restrictedCategories}
                    onAddToCart={(item, amt, variantId) => addToCart(item, amt, variantId)}
                    onUpdateQuantity={updateQuantity}
                    onSetQuantity={setItemQuantity}
                    onSelectVariant={selectProductVariant}
                    onToggleFavourite={toggleFavourite}
                    onUpdatePrice={updateItemPrice}
                    onOpenDetails={(item) => setDetailProduct(item)}
                  />
                </div>
              )}

              {/* Popular Everyday Essentials */}
              {popularEssentials.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-brand-400" />
                        Popular Everyday Essentials
                      </h3>
                      <p className="text-[11px] text-zinc-500">
                        Quick-add staples with pack sizes & weight options
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSection('catalog');
                        setFilters((p) => ({ ...p, category: 'All', subcategory: 'All' }));
                      }}
                      className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-0.5"
                    >
                      All Products <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <ProductGrid
                    items={popularEssentials}
                    categoryConfigs={categoryConfigs}
                    isBrokeMode={isBrokeMode}
                    restrictedCategories={brokeModeConfig.restrictedCategories}
                    onAddToCart={(item, amt, variantId) => addToCart(item, amt, variantId)}
                    onUpdateQuantity={updateQuantity}
                    onSetQuantity={setItemQuantity}
                    onSelectVariant={selectProductVariant}
                    onToggleFavourite={toggleFavourite}
                    onUpdatePrice={updateItemPrice}
                    onOpenDetails={(item) => setDetailProduct(item)}
                  />
                </div>
              )}

              {/* Custom Products Section */}
              {customItems.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                      Your Custom Products ({customItems.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProduct(null);
                        setProductFormOpen(true);
                      }}
                      className="text-[11px] font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Custom
                    </button>
                  </div>
                  <ProductGrid
                    items={customItems.slice(0, 6)}
                    categoryConfigs={categoryConfigs}
                    isBrokeMode={isBrokeMode}
                    restrictedCategories={brokeModeConfig.restrictedCategories}
                    onAddToCart={(item, amt, variantId) => addToCart(item, amt, variantId)}
                    onUpdateQuantity={updateQuantity}
                    onSetQuantity={setItemQuantity}
                    onSelectVariant={selectProductVariant}
                    onToggleFavourite={toggleFavourite}
                    onUpdatePrice={updateItemPrice}
                    onOpenDetails={(item) => setDetailProduct(item)}
                  />
                </div>
              )}

              {/* Browse All Categories */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      Browse All Categories
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      {categoryConfigs.length} categories · {items.length} products
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCategoryManagerOpen(true)}
                    className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    Customize
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {categoryConfigs.map((cat) => (
                    <CategoryCard
                      key={cat.id}
                      category={cat}
                      itemCount={categoryItemCounts[cat.name] ?? 0}
                      onSelect={handleSelectCategory}
                    />
                  ))}
                </div>
              </div>

              {/* Clearly Separated Recurring Bills & Subscriptions */}
              {billItems.length > 0 && (
                <div className="glass rounded-2xl p-4 border border-sky-500/20 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-300">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-sky-200">
                          Recurring Bills & Subscriptions
                        </h3>
                        <p className="text-[10px] text-zinc-400">
                          Separate from pantry items · Logged only after checkout confirmation
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSection('recurring')}
                      className="text-[11px] font-bold text-sky-300 hover:text-sky-200 whitespace-nowrap"
                    >
                      Manage
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {billItems.map((bill) => (
                      <div
                        key={bill.id}
                        className="bg-ink-900/70 border border-white/[0.06] rounded-xl px-3 py-2 flex items-center justify-between gap-2"
                      >
                        <button
                          type="button"
                          onClick={() => setDetailProduct(bill)}
                          className="min-w-0 text-left flex-1"
                        >
                          <p className="text-xs font-bold text-white truncate">{bill.name}</p>
                          <p className="text-[10px] font-mono text-zinc-400">
                            ₹{formatCurrencyExact(bill.price)} ·{' '}
                            {bill.recurrence?.frequency ?? 'one-off'}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => addToCart(bill, 1)}
                          aria-label={`Add bill ${bill.name} to cart`}
                          className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/30 border border-sky-400/30 text-sky-200 text-[11px] font-extrabold whitespace-nowrap"
                        >
                          {bill.quantity > 0 ? `${formatQuantity(bill.quantity)} in Cart` : '+ Add Bill'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* VIEW 3: Full Catalog Grid */}
      {section === 'catalog' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
              All Products ({filteredItems.length})
            </p>
            <span className="text-[11px] text-zinc-500">
              Tap product image/name for details & variants
            </span>
          </div>
          <ProductGrid
            items={filteredItems}
            categoryConfigs={categoryConfigs}
            isBrokeMode={isBrokeMode}
            restrictedCategories={brokeModeConfig.restrictedCategories}
            onAddToCart={(item, amt, variantId) => addToCart(item, amt, variantId)}
            onUpdateQuantity={updateQuantity}
            onSetQuantity={setItemQuantity}
            onSelectVariant={selectProductVariant}
            onToggleFavourite={toggleFavourite}
            onUpdatePrice={updateItemPrice}
            onOpenDetails={(item) => setDetailProduct(item)}
            onAddCustomProduct={() => {
              setEditingProduct(null);
              setProductFormOpen(true);
            }}
            onResetFilters={handleResetFilters}
          />
        </div>
      )}

      {/* VIEW 4: Saved Baskets */}
      {section === 'baskets' && <BasketTemplatesPanel />}

      {/* VIEW 5: Recurring Items */}
      {section === 'recurring' && (
        <RecurringItemManager onOpenDetails={(item) => setDetailProduct(item)} />
      )}

      {/* VIEW 6: Purchase History */}
      {section === 'history' && (
        <PurchaseHistory onSavedBasket={() => setSection('baskets')} />
      )}

      {/* Modals */}
      <CategoryManagerModal
        isOpen={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
      />

      <CustomProductForm
        isOpen={productFormOpen}
        initialProduct={editingProduct}
        defaultCategory={selectedCategory ?? undefined}
        defaultSubcategory={
          filters.subcategory && filters.subcategory !== 'All'
            ? filters.subcategory
            : undefined
        }
        onClose={() => {
          setProductFormOpen(false);
          setEditingProduct(null);
        }}
      />

      <ProductDetails
        item={detailProduct}
        onClose={() => setDetailProduct(null)}
        onEditProduct={(prod) => {
          setEditingProduct(prod);
          setProductFormOpen(true);
        }}
      />
    </div>
  );
}

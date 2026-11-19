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
import { PageHeader } from '../ui/PageHeader';
import { SectionHeader } from '../ui/SectionHeader';
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
    () => items.filter((i) => i.isPopular && !isRecurringBillItem(i)).slice(0, 8),
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
        className="bg-white rounded-2xl p-3 border border-[#E7EAF0] shadow-card flex items-center justify-between gap-2.5"
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
            <p className="text-xs font-bold text-[#151922] truncate">
              {insight.item.name}
              {insight.lastVariantLabel ? ` · ${insight.lastVariantLabel}` : ''}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#697386] mt-0.5 flex-wrap tabular-nums">
              <span className="font-semibold text-[#151922]">
                ₹{formatCurrencyExact(insight.currentPrice)}
              </span>
              <span aria-hidden="true">·</span>
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
                  className={`font-semibold ${
                    insight.priceDiff > 0 ? 'text-[#C7851F]' : 'text-[#15966B]'
                  }`}
                >
                  · {insight.priceDiff > 0
                    ? `+₹${formatCurrencyExact(insight.priceDiff)}`
                    : `-₹${formatCurrencyExact(Math.abs(insight.priceDiff))}`}
                </span>
              )}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleQuickReorder(insight)}
          aria-label={`Reorder ${insight.item.name}`}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors ${
            isFlashed
              ? 'bg-[#15966B] text-white'
              : 'bg-[#EDF2FF] hover:bg-[#365FE8] text-[#365FE8] hover:text-white border border-[#365FE8]/25'
          }`}
        >
          {isFlashed ? (
            <>
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              In Cart
            </>
          ) : (
            <>
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.2} />
              Reorder
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className={`space-y-4 sm:space-y-6 ${cartSummary.lineCount > 0 ? 'pb-20 lg:pb-16' : ''}`}>
      {/* Header & Top Actions */}
      <PageHeader
        title="Shopping"
        description="Build your cart, manage pack sizes, load saved baskets, and track recurring items."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setProductFormOpen(true);
              }}
              aria-label="Add custom product"
              className="btn-primary px-3 sm:px-3.5 py-2 text-xs whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
              <span>Custom Item</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoryManagerOpen(true)}
              aria-label="Manage categories"
              title="Manage categories & subcategories"
              className="btn-secondary px-3 py-2 text-xs whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span>Categories</span>
            </button>

            {cartSummary.lineCount > 0 && (
              <button
                type="button"
                onClick={() => onOpenCart?.()}
                aria-label={`Open shopping cart with ${cartSummary.totalUnits} items`}
                className="btn-secondary px-3 py-2 text-xs whitespace-nowrap"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-[#365FE8] shrink-0" strokeWidth={2.2} />
                <span className="hidden sm:inline">Cart</span>
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#365FE8] text-white text-[10px] font-bold inline-flex items-center justify-center tabular-nums">
                  {cartSummary.lineCount}
                </span>
              </button>
            )}
          </div>
        }
      />

      {/* Compact Shopping Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
        <div className="surface-card px-3 py-2.5 sm:p-4">
          <p className="text-[11px] font-medium text-[#697386]">Cart Value</p>
          <p className="text-base sm:text-xl font-bold font-mono tabular-nums text-[#365FE8] mt-0.5">
            ₹{formatCurrencyExact(cartSummary.totalAmount)}
          </p>
          <p className="hidden sm:block text-[11.5px] text-[#697386] mt-0.5 truncate">
            {cartSummary.lineCount} {cartSummary.lineCount === 1 ? 'line' : 'lines'} active
          </p>
        </div>

        <div className="surface-card px-3 py-2.5 sm:p-4">
          <p className="text-[11px] font-medium text-[#697386]">Cart Quantity</p>
          <p className="text-base sm:text-xl font-bold font-mono tabular-nums text-[#151922] mt-0.5">
            {formatQuantity(cartSummary.totalUnits)}
          </p>
          <p className="hidden sm:block text-[11.5px] text-[#697386] mt-0.5 truncate">
            Total units selected
          </p>
        </div>

        <div className="surface-card px-3 py-2.5 sm:p-4">
          <p className="text-[11px] font-medium text-[#697386]">Month Spend</p>
          <p className="text-base sm:text-xl font-bold font-mono tabular-nums text-[#151922] mt-0.5">
            ₹{formatCurrencyExact(monthlySpend)}
          </p>
          <p className="hidden sm:block text-[11.5px] text-[#697386] mt-0.5 truncate">
            Logged this month
          </p>
        </div>

        <div className="surface-card px-3 py-2.5 sm:p-4">
          <p className="text-[11px] font-medium text-[#697386]">Budget Left</p>
          <p
            className={`text-base sm:text-xl font-bold font-mono tabular-nums mt-0.5 ${
              remainingMonthlyBudget >= 0 ? 'text-[#15966B]' : 'text-[#DE5252]'
            }`}
          >
            ₹{formatCurrencyExact(remainingMonthlyBudget)}
          </p>
          <p className="hidden sm:block text-[11.5px] text-[#697386] mt-0.5 truncate">
            {remainingMonthlyBudget >= 0 ? 'Remaining allowance' : 'Over monthly budget'}
          </p>
        </div>
      </div>

      {/* Active Broke Mode Accountability Notice */}
      {isBrokeMode && (
        <div className="rounded-2xl px-4 py-3 bg-[#FEF6E7] border border-[#F3D8A8] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldAlert className="w-4 h-4 text-[#C7851F] flex-shrink-0" />
            <p className="text-xs font-semibold text-[#9E6614]">
              Broke Mode Active ({brokeStatus.periodLabel}) · Essential items stay unrestricted; watched categories are highlighted.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono font-semibold tabular-nums text-[#9E6614]">
            <span>Allowance Left: ₹{formatCurrencyExact(brokeStatus.remaining)}</span>
            <span className="hidden sm:inline">·</span>
            <span>Non-Essential Left: ₹{formatCurrencyExact(brokeStatus.nonEssentialRemaining)}</span>
          </div>
        </div>
      )}

      {/* Sub-Section Segmented Bar (all 5 fit cleanly on mobile with zero horizontal clipping) */}
      <div className="grid grid-cols-5 sm:inline-flex items-center gap-1 bg-[#F1F3F6] p-1 rounded-xl border border-[#E7EAF0] w-full sm:w-fit">
        <button
          type="button"
          onClick={() => {
            setSection('home');
            setSelectedCategory(null);
          }}
          className={`py-1.5 sm:py-2 px-1 sm:px-3.5 rounded-lg text-[10.5px] sm:text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 whitespace-nowrap transition-all ${
            section === 'home' && !selectedCategory
              ? 'bg-white text-[#151922] shadow-xs'
              : 'text-[#697386] hover:text-[#151922]'
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
          className={`py-1.5 sm:py-2 px-1 sm:px-3.5 rounded-lg text-[10.5px] sm:text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 whitespace-nowrap transition-all ${
            section === 'catalog' || Boolean(selectedCategory)
              ? 'bg-white text-[#151922] shadow-xs'
              : 'text-[#697386] hover:text-[#151922]'
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
          className={`py-1.5 sm:py-2 px-1 sm:px-3.5 rounded-lg text-[10.5px] sm:text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 whitespace-nowrap transition-all ${
            section === 'baskets'
              ? 'bg-white text-[#151922] shadow-xs'
              : 'text-[#697386] hover:text-[#151922]'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            Baskets
            {basketTemplates.length > 0 && (
              <span className="hidden sm:inline font-mono text-[11px] text-[#365FE8] ml-1 tabular-nums">
                ({basketTemplates.length})
              </span>
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSection('recurring');
            setSelectedCategory(null);
          }}
          className={`py-1.5 sm:py-2 px-1 sm:px-3.5 rounded-lg text-[10.5px] sm:text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 whitespace-nowrap transition-all ${
            section === 'recurring'
              ? 'bg-white text-[#151922] shadow-xs'
              : 'text-[#697386] hover:text-[#151922]'
          }`}
        >
          <Repeat className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            Recurring
            {dueRecurring.length > 0 && (
              <span className="hidden sm:inline font-mono text-[11px] text-[#365FE8] ml-1 tabular-nums">
                ({dueRecurring.length})
              </span>
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSection('history');
            setSelectedCategory(null);
          }}
          className={`py-1.5 sm:py-2 px-1 sm:px-3.5 rounded-lg text-[10.5px] sm:text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 whitespace-nowrap transition-all ${
            section === 'history'
              ? 'bg-white text-[#151922] shadow-xs'
              : 'text-[#697386] hover:text-[#151922]'
          }`}
        >
          <History className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            History
            {purchaseHistory.length > 0 && (
              <span className="hidden sm:inline font-mono text-[11px] text-[#697386] ml-1 tabular-nums">
                ({purchaseHistory.length})
              </span>
            )}
          </span>
        </button>
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

      {/* VIEW 1: Dedicated Category + Subcategory Browsing */}
      {section === 'home' && selectedCategory && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide scroll-fade-x pr-8 pb-0.5">
            <button
              type="button"
              onClick={handleBackToHome}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F7F8FA] border border-[#E7EAF0] text-xs font-semibold text-[#4B5565] whitespace-nowrap shrink-0 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Home
            </button>
            {categoryConfigs.map((cat) => {
              const active = cat.name === selectedCategory;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-[#EDF2FF] border-[#365FE8]/40 text-[#365FE8]'
                      : 'bg-white border-[#E7EAF0] text-[#697386] hover:text-[#151922]'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl p-4 flex items-center justify-between gap-3 border border-[#E7EAF0] shadow-card">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl ${
                  getCategoryStyle(selectedCategory, activeCategoryConfig?.accent).bg
                } border ${
                  getCategoryStyle(selectedCategory, activeCategoryConfig?.accent).border
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
                <h3 className="text-base font-bold text-[#151922] truncate">
                  {selectedCategory}
                </h3>
                <p className="text-xs text-[#697386]">
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
              className="btn-secondary text-xs"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              Add Here
            </button>
          </div>

          {activeCategorySubcategories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
              <button
                type="button"
                onClick={() => setFilters((p) => ({ ...p, subcategory: 'All' }))}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors ${
                  !filters.subcategory || filters.subcategory === 'All'
                    ? 'bg-[#151922] border-[#151922] text-white'
                    : 'bg-white border-[#E7EAF0] text-[#697386] hover:text-[#151922]'
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors ${
                      active
                        ? 'bg-[#EDF2FF] border-[#365FE8]/40 text-[#365FE8]'
                        : 'bg-white border-[#E7EAF0] text-[#697386] hover:text-[#151922]'
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
        <div className="space-y-6">
          {/* Quick Category Strip with smooth fade edge */}
          {!isSearchingOrFiltering && (
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto scrollbar-hide scroll-fade-x pr-6 pb-0.5">
                {categoryConfigs.map((cat) => {
                  const style = getCategoryStyle(cat.name, cat.accent);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategory(cat.name)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F7F8FA] border border-[#E7EAF0] text-xs font-semibold text-[#151922] whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <span className={style.text}>
                        <CategoryIcon iconKey={cat.iconKey} className="w-3.5 h-3.5" />
                      </span>
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('mart-all-categories');
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#365FE8] hover:bg-[#EDF2FF] whitespace-nowrap shrink-0 transition-colors"
              >
                All ({categoryConfigs.length})
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Due Recurring Quick Action */}
          {dueRecurring.length > 0 && !isSearchingOrFiltering && (
            <div className="bg-white rounded-2xl p-4 border border-[#365FE8]/25 shadow-card flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#EDF2FF] text-[#365FE8] flex items-center justify-center flex-shrink-0">
                  <Repeat className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#151922] truncate">
                    {dueRecurring.length} Recurring Item{dueRecurring.length > 1 ? 's' : ''} Due
                  </p>
                  <p className="text-xs text-[#697386] truncate">
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
                className="px-3.5 py-2 rounded-xl bg-[#EDF2FF] hover:bg-[#365FE8] border border-[#365FE8]/25 text-[#365FE8] hover:text-white text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors"
              >
                {dueAddedFlash !== null ? (
                  <>
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Added {dueAddedFlash}
                  </>
                ) : (
                  'Add Due to Cart'
                )}
              </button>
            </div>
          )}

          {isSearchingOrFiltering ? (
            <div className="space-y-3">
              <SectionHeader
                title={`Matching Products (${filteredItems.length})`}
                action={
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs font-semibold text-[#365FE8] hover:underline"
                  >
                    Back to Home
                  </button>
                }
              />
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
              {(frequentInsights.length > 0 || recentInsights.length > 0) && (
                <div className="space-y-5">
                  {recentInsights.length > 0 && (
                    <section className="space-y-3">
                      <SectionHeader
                        title="Buy Again"
                        subtitle="Based on your recently completed checkouts"
                        action={
                          <button
                            type="button"
                            onClick={() => setSection('history')}
                            className="text-xs font-semibold text-[#365FE8] hover:underline flex items-center gap-0.5"
                          >
                            Orders <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        }
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {recentInsights.map((ins) => renderReorderCard(ins, 'recent'))}
                      </div>
                    </section>
                  )}

                  {frequentInsights.length > 0 && (
                    <section className="space-y-3">
                      <SectionHeader
                        title="Frequently Purchased"
                        subtitle="One-tap reorder with live price comparison"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {frequentInsights.map((ins) => renderReorderCard(ins, 'frequent'))}
                      </div>
                    </section>
                  )}
                </div>
              )}

              {/* Saved Baskets Shelf */}
              {evaluatedHomeBaskets.length > 0 && (
                <section className="space-y-3">
                  <SectionHeader
                    title={`Saved Baskets (${basketTemplates.length})`}
                    subtitle="Reusable shopping templates with live price totals"
                    action={
                      <button
                        type="button"
                        onClick={() => setSection('baskets')}
                        className="text-xs font-semibold text-[#365FE8] hover:underline flex items-center gap-0.5 whitespace-nowrap"
                      >
                        Manage Baskets <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    }
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {evaluatedHomeBaskets.map((ev) => {
                      const flashed = basketLoadedFlashId === ev.basket.id;
                      const hasDiff = Math.abs(ev.priceDiff) >= 0.5;
                      return (
                        <div
                          key={ev.basket.id}
                          className="bg-white rounded-2xl p-3.5 border border-[#E7EAF0] shadow-card flex flex-col justify-between gap-3"
                        >
                          <button
                            type="button"
                            onClick={() => setSection('baskets')}
                            className="text-left w-full"
                          >
                            <div className="flex items-center gap-2">
                              <ShoppingBag className="w-3.5 h-3.5 text-[#365FE8] shrink-0" />
                              <p className="text-sm font-bold text-[#151922] truncate">
                                {ev.basket.name}
                              </p>
                            </div>
                            <p className="text-xs font-mono text-[#697386] mt-1 tabular-nums">
                              {ev.lineCount} items · ₹{formatCurrencyExact(ev.currentTotal)}
                              {hasDiff && (
                                <span
                                  className={
                                    ev.priceDiff > 0 ? ' text-[#C7851F]' : ' text-[#15966B]'
                                  }
                                >
                                  {' '}
                                  ({ev.priceDiff > 0 ? '+' : '-'}₹
                                  {formatCurrencyExact(Math.abs(ev.priceDiff))})
                                </span>
                              )}
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickLoadBasket(ev.basket.id)}
                            aria-label={`Load basket ${ev.basket.name}`}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
                              flashed
                                ? 'bg-[#15966B] text-white'
                                : 'bg-[#EDF2FF] hover:bg-[#365FE8] text-[#365FE8] hover:text-white border border-[#365FE8]/25'
                            }`}
                          >
                            {flashed ? (
                              <>
                                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                                Loaded to Cart
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="w-3.5 h-3.5" strokeWidth={2.2} />
                                Load Basket
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Favorites Section */}
              {favoriteItems.length > 0 && (
                <section className="space-y-3">
                  <SectionHeader
                    title={`Your Favorites (${favoriteItems.length})`}
                    action={
                      <button
                        type="button"
                        onClick={() => setFilters((p) => ({ ...p, onlyFavourites: true }))}
                        className="text-xs font-semibold text-[#365FE8] hover:underline flex items-center gap-1"
                      >
                        <Heart className="w-3.5 h-3.5 text-[#DE5252]" fill="currentColor" />
                        View All
                      </button>
                    }
                  />
                  <ProductGrid
                    items={favoriteItems.slice(0, 8)}
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
                </section>
              )}

              {/* Popular Everyday Essentials */}
              {popularEssentials.length > 0 && (
                <section className="space-y-3">
                  <SectionHeader
                    title="Popular Everyday Essentials"
                    subtitle="Quick-add staples with pack sizes & weight options"
                    action={
                      <button
                        type="button"
                        onClick={() => {
                          setSection('catalog');
                          setFilters((p) => ({ ...p, category: 'All', subcategory: 'All' }));
                        }}
                        className="text-xs font-semibold text-[#365FE8] hover:underline flex items-center gap-0.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-0.5" />
                        All Products <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    }
                  />
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
                </section>
              )}

              {/* Custom Products Section */}
              {customItems.length > 0 && (
                <section className="space-y-3">
                  <SectionHeader
                    title={`Your Custom Products (${customItems.length})`}
                    action={
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(null);
                          setProductFormOpen(true);
                        }}
                        className="text-xs font-semibold text-[#365FE8] hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Custom
                      </button>
                    }
                  />
                  <ProductGrid
                    items={customItems.slice(0, 8)}
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
                </section>
              )}

              {/* Browse All Categories */}
              <section id="mart-all-categories" className="space-y-3">
                <SectionHeader
                  title="Browse All Categories"
                  subtitle={`${categoryConfigs.length} categories · ${items.length} products`}
                  action={
                    <button
                      type="button"
                      onClick={() => setCategoryManagerOpen(true)}
                      className="text-xs font-semibold text-[#365FE8] hover:underline flex items-center gap-1"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Customize
                    </button>
                  }
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {categoryConfigs.map((cat) => (
                    <CategoryCard
                      key={cat.id}
                      category={cat}
                      itemCount={categoryItemCounts[cat.name] ?? 0}
                      onSelect={handleSelectCategory}
                    />
                  ))}
                </div>
              </section>

              {/* Recurring Bills & Subscriptions */}
              {billItems.length > 0 && (
                <section className="bg-white rounded-2xl p-5 border border-[#E7EAF0] shadow-card space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#EDF2FF] text-[#365FE8] flex items-center justify-center">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#151922]">
                          Recurring Bills &amp; Subscriptions
                        </h3>
                        <p className="text-xs text-[#697386]">
                          Separate from pantry items · Logged only after checkout confirmation
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSection('recurring')}
                      className="text-xs font-semibold text-[#365FE8] hover:underline whitespace-nowrap"
                    >
                      Manage
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {billItems.map((bill) => (
                      <div
                        key={bill.id}
                        className="bg-[#F7F8FA] border border-[#E7EAF0] rounded-xl px-3 py-2.5 flex items-center justify-between gap-2"
                      >
                        <button
                          type="button"
                          onClick={() => setDetailProduct(bill)}
                          className="min-w-0 text-left flex-1"
                        >
                          <p className="text-xs font-bold text-[#151922] truncate">{bill.name}</p>
                          <p className="text-[11px] font-mono text-[#697386] tabular-nums">
                            ₹{formatCurrencyExact(bill.price)} ·{' '}
                            {bill.recurrence?.frequency ?? 'one-off'}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => addToCart(bill, 1)}
                          aria-label={`Add bill ${bill.name} to cart`}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#365FE8] border border-[#E7EAF0] hover:border-[#365FE8] text-[#365FE8] hover:text-white text-xs font-semibold whitespace-nowrap transition-colors"
                        >
                          {bill.quantity > 0 ? `${formatQuantity(bill.quantity)} in Cart` : '+ Add Bill'}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* VIEW 3: Full Catalog Grid */}
      {section === 'catalog' && (
        <div className="space-y-3.5">
          <SectionHeader
            title={`All Products (${filteredItems.length})`}
            subtitle="Tap a product card for pack variants, recurring schedule, and unit price history"
          />
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

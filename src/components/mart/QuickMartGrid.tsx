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
} from 'lucide-react';
import { useAppStore, type CartItem } from '../../store/useStore';
import { formatCurrencyExact, getCategoryStyle } from '../../utils/categoryStyles';
import {
  calculateMonthlyShoppingSpend,
  filterAndSortProducts,
  getDueRecurringItems,
  type ProductFilterOptions,
} from '../../utils/martEngine';
import { CategoryCard } from './CategoryCard';
import { CategoryManagerModal } from './CategoryManagerModal';
import { ProductSearch } from './ProductSearch';
import { ProductGrid } from './ProductGrid';
import { ProductDetails } from './ProductDetails';
import { CustomProductForm } from './CustomProductForm';
import { RecurringItemManager } from './RecurringItemManager';
import { PurchaseHistory } from './PurchaseHistory';
import { CategoryIcon } from './CategoryIcon';

type MartSection = 'home' | 'catalog' | 'recurring' | 'history';

const DEFAULT_FILTERS: ProductFilterOptions = {
  query: '',
  category: 'All',
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

  const addToCart = useAppStore((s) => s.addToCart);
  const updateQuantity = useAppStore((s) => s.updateQuantity);
  const toggleFavourite = useAppStore((s) => s.toggleFavourite);
  const updateItemPrice = useAppStore((s) => s.updateItemPrice);
  const addDueRecurringToCart = useAppStore((s) => s.addDueRecurringToCart);

  const [section, setSection] = useState<MartSection>('home');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductFilterOptions>(DEFAULT_FILTERS);

  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CartItem | null>(null);
  const [detailProduct, setDetailProduct] = useState<CartItem | null>(null);
  const [dueAddedFlash, setDueAddedFlash] = useState<number | null>(null);

  // Live metrics
  const cartItems = useMemo(() => items.filter((i) => i.quantity > 0), [items]);
  const cartValue = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [cartItems]
  );
  const cartUnits = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.quantity, 0),
    [cartItems]
  );
  const monthlySpend = useMemo(
    () => calculateMonthlyShoppingSpend(transactions),
    [transactions]
  );
  const remainingMonthlyBudget = totalBudget - monthlySpend;
  const dueRecurring = useMemo(() => getDueRecurringItems(items), [items]);

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
      (filters.category && filters.category !== 'All')
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

  const handleSelectCategory = (catName: string) => {
    setSelectedCategory(catName);
    setSection('home');
    setFilters((prev) => ({ ...prev, category: catName }));
  };

  const handleBackToHome = () => {
    setSelectedCategory(null);
    setFilters((prev) => ({ ...prev, category: 'All' }));
  };

  const handleResetFilters = () => {
    setFilters({
      ...DEFAULT_FILTERS,
      category: selectedCategory ?? 'All',
    });
  };

  const handleAddDueQuick = () => {
    const count = addDueRecurringToCart();
    if (count > 0) {
      setDueAddedFlash(count);
      setTimeout(() => setDueAddedFlash(null), 2200);
    }
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
                Personal Shopping & Expense Catalog
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
              title="Manage categories"
              className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onOpenCart?.()}
              aria-label={`Open shopping cart with ${cartUnits} items`}
              className="relative w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-brand-500/20 border border-white/[0.08] hover:border-brand-500/35 flex items-center justify-center text-zinc-200 hover:text-brand-400 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" strokeWidth={2.3} />
              {cartUnits > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-ink-950 text-[10px] font-extrabold flex items-center justify-center">
                  {cartUnits}
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
              ₹{formatCurrencyExact(cartValue)}
            </p>
          </div>
          <div className="bg-ink-900/70 border border-white/[0.05] rounded-xl px-3 py-2 flex flex-col justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">
              Cart Items
            </p>
            <p className="text-sm font-extrabold font-mono text-brand-400 tabular-nums mt-0.5">
              {cartUnits} {cartUnits === 1 ? 'unit' : 'units'}
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

        {/* Section Navigation */}
        <div className="grid grid-cols-4 gap-1.5 bg-ink-900/70 p-1 rounded-xl border border-white/[0.05]">
          <button
            type="button"
            onClick={() => {
              setSection('home');
              setSelectedCategory(null);
            }}
            className={`py-2 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
              section === 'home' && !selectedCategory
                ? 'bg-white/[0.1] text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Categories</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSection('catalog');
              setSelectedCategory(null);
              setFilters((p) => ({ ...p, category: 'All' }));
            }}
            className={`py-2 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
              section === 'catalog' || Boolean(selectedCategory)
                ? 'bg-white/[0.1] text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Catalog</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSection('recurring');
              setSelectedCategory(null);
            }}
            className={`py-2 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
              section === 'recurring'
                ? 'bg-white/[0.1] text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Recurring</span>
            {dueRecurring.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[9px] font-mono">
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
            className={`py-2 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
              section === 'history'
                ? 'bg-white/[0.1] text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
            {purchaseHistory.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 text-[9px] font-mono">
                {purchaseHistory.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Persistent Search Bar across Home & Catalog */}
      {(section === 'home' || section === 'catalog') && (
        <ProductSearch
          filters={effectiveFilters}
          categories={categoryConfigs}
          onChange={(next) => {
            setFilters(next);
            if (next.category && next.category !== 'All' && selectedCategory && next.category !== selectedCategory) {
              setSelectedCategory(next.category);
            } else if (next.category === 'All' && selectedCategory) {
              setSelectedCategory(null);
            }
          }}
          onReset={handleResetFilters}
        />
      )}

      {/* VIEW 1: Dedicated Category Browsing Page */}
      {section === 'home' && selectedCategory && (
        <div className="space-y-3 animate-fade-in">
          <div className="glass rounded-2xl p-3.5 flex items-center justify-between gap-3 border border-white/[0.08]">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={handleBackToHome}
                aria-label="Back to all categories"
                className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-zinc-300 hover:text-white flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
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

          <ProductGrid
            items={filteredItems}
            categoryConfigs={categoryConfigs}
            isBrokeMode={isBrokeMode}
            onAddToCart={(item) => addToCart(item)}
            onUpdateQuantity={updateQuantity}
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

      {/* VIEW 2: Shopping Home Page (Categories + Due Recurring Banner + Search Results when active) */}
      {section === 'home' && !selectedCategory && (
        <div className="space-y-4">
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
                  Back to Categories
                </button>
              </div>
              <ProductGrid
                items={filteredItems}
                categoryConfigs={categoryConfigs}
                isBrokeMode={isBrokeMode}
                onAddToCart={(item) => addToCart(item)}
                onUpdateQuantity={updateQuantity}
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Shop by Category
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
              Tap product image/name for details & recurring
            </span>
          </div>
          <ProductGrid
            items={filteredItems}
            categoryConfigs={categoryConfigs}
            isBrokeMode={isBrokeMode}
            onAddToCart={(item) => addToCart(item)}
            onUpdateQuantity={updateQuantity}
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

      {/* VIEW 4: Recurring Items */}
      {section === 'recurring' && (
        <RecurringItemManager onOpenDetails={(item) => setDetailProduct(item)} />
      )}

      {/* VIEW 5: Purchase History */}
      {section === 'history' && <PurchaseHistory />}

      {/* Modals */}
      <CategoryManagerModal
        isOpen={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
      />

      <CustomProductForm
        isOpen={productFormOpen}
        initialProduct={editingProduct}
        defaultCategory={selectedCategory ?? undefined}
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

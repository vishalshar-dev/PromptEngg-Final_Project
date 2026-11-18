import { PackageSearch, Plus } from 'lucide-react';
import type { CartItem, CategoryConfig } from '../../types/models';
import { ProductCard } from './ProductCard';

export interface ProductGridProps {
  items: CartItem[];
  categoryConfigs: CategoryConfig[];
  isBrokeMode?: boolean;
  restrictedCategories?: string[];
  onAddToCart: (item: CartItem, amount?: number, variantId?: string) => void;
  onUpdateQuantity: (id: string, delta: number, variantId?: string) => void;
  onSetQuantity?: (id: string, quantity: number, variantId?: string) => void;
  onSelectVariant?: (id: string, variantId: string) => void;
  onToggleFavourite: (id: string) => void;
  onUpdatePrice: (id: string, newPrice: number, variantId?: string) => void;
  onOpenDetails: (item: CartItem) => void;
  onAddCustomProduct?: () => void;
  onResetFilters?: () => void;
}

export function ProductGrid({
  items,
  categoryConfigs,
  isBrokeMode = false,
  restrictedCategories = ['Junk', 'Snacks & Beverages'],
  onAddToCart,
  onUpdateQuantity,
  onSetQuantity,
  onSelectVariant,
  onToggleFavourite,
  onUpdatePrice,
  onOpenDetails,
  onAddCustomProduct,
  onResetFilters,
}: ProductGridProps) {
  const catMap = new Map(categoryConfigs.map((c) => [c.name, c]));
  const watchedSet = new Set(restrictedCategories.map((c) => c.trim().toLowerCase()));

  if (items.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-500">
          <PackageSearch className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-bold text-zinc-200">No matching products found</p>
          <p className="text-xs text-zinc-500 mt-1">
            Try clearing search filters or add a new custom product for this category.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-1">
          {onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-zinc-300"
            >
              Reset Filters
            </button>
          )}
          {onAddCustomProduct && (
            <button
              type="button"
              onClick={onAddCustomProduct}
              className="px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-xs font-extrabold text-ink-950 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={3} />
              Create Custom Product
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((item) => {
        const cfg = catMap.get(item.category);
        const isWatched =
          isBrokeMode && watchedSet.has((item.category ?? '').trim().toLowerCase());
        return (
          <ProductCard
            key={item.id}
            item={item}
            categoryAccent={cfg?.accent}
            categoryIconKey={cfg?.iconKey}
            isBrokeWatched={isWatched}
            onAddToCart={onAddToCart}
            onUpdateQuantity={onUpdateQuantity}
            onSetQuantity={onSetQuantity}
            onSelectVariant={onSelectVariant}
            onToggleFavourite={onToggleFavourite}
            onUpdatePrice={onUpdatePrice}
            onOpenDetails={onOpenDetails}
          />
        );
      })}
    </div>
  );
}


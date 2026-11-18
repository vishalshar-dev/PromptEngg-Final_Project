import { PackageSearch, Plus } from 'lucide-react';
import type { CartItem, CategoryConfig } from '../../types/models';
import { EmptyState } from '../ui/EmptyState';
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
      <EmptyState
        icon={PackageSearch}
        title="No matching products found"
        description="Try clearing search filters or add a new custom product for this category."
        action={
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {onResetFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="btn-secondary px-4 py-2 text-xs"
              >
                Reset Filters
              </button>
            )}
            {onAddCustomProduct && (
              <button
                type="button"
                onClick={onAddCustomProduct}
                className="btn-primary px-4 py-2 text-xs"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                Create Custom Product
              </button>
            )}
          </div>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
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

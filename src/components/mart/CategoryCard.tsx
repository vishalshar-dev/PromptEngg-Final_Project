import type { CategoryConfig } from '../../types/models';
import { CATEGORY_IMAGES } from '../../data/martCatalog';
import { getCategoryStyle } from '../../utils/categoryStyles';
import { CategoryIcon } from './CategoryIcon';
import { ProductVisual } from './ProductVisual';

export interface CategoryCardProps {
  category: CategoryConfig;
  itemCount: number;
  selected?: boolean;
  onSelect: (categoryName: string) => void;
}

export function CategoryCard({
  category,
  itemCount,
  selected = false,
  onSelect,
}: CategoryCardProps) {
  const style = getCategoryStyle(category.name, category.accent);
  const subCount = category.subcategories?.length ?? 0;
  const resolvedImageUrl = category.imageUrl || CATEGORY_IMAGES[category.name];

  return (
    <button
      type="button"
      onClick={() => onSelect(category.name)}
      aria-pressed={selected}
      className={`group relative text-left rounded-2xl border p-3 transition-all flex flex-col gap-2.5 ${
        selected
          ? 'bg-[var(--accent-primary-soft)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-ring)] shadow-card'
          : 'surface-card-interactive'
      }`}
    >
      <div className="relative w-full h-22 sm:h-24 rounded-xl overflow-hidden">
        {resolvedImageUrl ? (
          <ProductVisual
            name={category.name}
            category={category.name}
            imageUrl={resolvedImageUrl}
            iconKey={category.iconKey}
            accent={category.accent}
            size="md"
            preferCategoryPhoto
            className="!h-22 sm:!h-24"
          />
        ) : (
          <div
            className={`w-full h-full rounded-xl bg-gradient-to-br ${style.gradient} border ${style.border} flex items-center justify-center`}
          >
            <div className={`w-10 h-10 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs flex items-center justify-center ${style.text}`}>
              <CategoryIcon iconKey={category.iconKey} className="w-5 h-5" strokeWidth={2} />
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0 px-0.5">
        <p className="text-[13px] font-bold text-[var(--text-primary)] leading-snug line-clamp-2 min-h-[2.25rem]">
          {category.name}
        </p>
        <p className="text-[12px] font-mono text-[var(--text-secondary)] mt-0.5 truncate tabular-nums">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
          {subCount > 0 ? ` · ${subCount} sub` : ''}
        </p>
      </div>
    </button>
  );
}

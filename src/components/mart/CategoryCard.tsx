import type { CategoryConfig } from '../../types/models';
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

  return (
    <button
      type="button"
      onClick={() => onSelect(category.name)}
      aria-pressed={selected}
      className={`group relative text-left rounded-2xl border p-2.5 transition-all duration-200 flex flex-col gap-2 ${
        selected
          ? 'bg-brand-500/15 border-brand-500/40 ring-1 ring-brand-500/30 shadow-lg'
          : 'glass hover:bg-white/[0.06] hover:border-white/15 hover:-translate-y-0.5'
      }`}
    >
      <div className="relative w-full h-16 rounded-xl overflow-hidden">
        {category.imageUrl ? (
          <ProductVisual
            name={category.name}
            category={category.name}
            imageUrl={category.imageUrl}
            iconKey={category.iconKey}
            accent={category.accent}
            size="md"
            className="!h-16"
          />
        ) : (
          <div
            className={`w-full h-full rounded-xl bg-gradient-to-br ${style.gradient} border ${style.border} flex items-center justify-center`}
          >
            <div className={`w-9 h-9 rounded-xl bg-ink-950/50 border border-white/[0.08] flex items-center justify-center ${style.text}`}>
              <CategoryIcon iconKey={category.iconKey} className="w-5 h-5" strokeWidth={2} />
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0 px-0.5">
        <p className="text-xs font-extrabold text-zinc-100 leading-tight line-clamp-2 min-h-[2rem]">
          {category.name}
        </p>
        <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </p>
      </div>
    </button>
  );
}

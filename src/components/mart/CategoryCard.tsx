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
  const subCount = category.subcategories?.length ?? 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(category.name)}
      aria-pressed={selected}
      className={`group relative text-left rounded-2xl border p-3 transition-all duration-150 flex flex-col gap-2.5 ${
        selected
          ? 'bg-[#EDF2FF] border-[#365FE8] ring-1 ring-[#365FE8]/20 shadow-card'
          : 'bg-white border-[#E7EAF0] shadow-card hover:border-[#D5DBE5] hover:-translate-y-0.5'
      }`}
    >
      <div className="relative w-full h-20 rounded-xl overflow-hidden">
        {category.imageUrl ? (
          <ProductVisual
            name={category.name}
            category={category.name}
            imageUrl={category.imageUrl}
            iconKey={category.iconKey}
            accent={category.accent}
            size="md"
            preferCategoryPhoto
            className="!h-20"
          />
        ) : (
          <div
            className={`w-full h-full rounded-xl bg-gradient-to-br ${style.gradient} border ${style.border} flex items-center justify-center`}
          >
            <div className={`w-10 h-10 rounded-xl bg-white border border-[#E7EAF0] shadow-xs flex items-center justify-center ${style.text}`}>
              <CategoryIcon iconKey={category.iconKey} className="w-5 h-5" strokeWidth={2} />
            </div>
          </div>
        )}
      </div>

      <div className="min-w-0 px-0.5">
        <p className="text-xs font-bold text-[#151922] leading-snug line-clamp-2 min-h-[2rem]">
          {category.name}
        </p>
        <p className="text-[11px] font-mono text-[#697386] mt-0.5 truncate tabular-nums">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
          {subCount > 0 ? ` · ${subCount} sub` : ''}
        </p>
      </div>
    </button>
  );
}

import { useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  Heart,
  Repeat,
  Clock,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import type { CategoryConfig } from '../../store/useStore';
import type { ProductFilterOptions, ProductSortOption } from '../../utils/martEngine';

interface ProductSearchProps {
  filters: ProductFilterOptions;
  categories: CategoryConfig[];
  onChange: (next: ProductFilterOptions) => void;
  onReset: () => void;
}

export function ProductSearch({
  filters,
  categories,
  onChange,
  onReset,
}: ProductSearchProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasActiveFilters =
    Boolean(filters.query?.trim()) ||
    (filters.category && filters.category !== 'All') ||
    filters.minPrice != null ||
    filters.maxPrice != null ||
    Boolean(filters.onlyFavourites) ||
    Boolean(filters.onlyFrequent) ||
    Boolean(filters.onlyRecent) ||
    Boolean(filters.onlyRecurring) ||
    (filters.sortBy && filters.sortBy !== 'default');

  return (
    <div className="space-y-2.5">
      {/* Main Search + Filter Toggle + Sort */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search
            className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            strokeWidth={2.2}
          />
          <input
            type="search"
            value={filters.query ?? ''}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            aria-label="Search products"
            placeholder="Search groceries, dairy, bills, unit (1 kg, 1 L)..."
            className="w-full bg-ink-900/90 border border-white/[0.08] focus:border-brand-500/40 rounded-xl pl-10 pr-9 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 transition-colors"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, query: '' })}
              aria-label="Clear search query"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              aria-label="Sort products"
              value={filters.sortBy ?? 'default'}
              onChange={(e) =>
                onChange({ ...filters, sortBy: e.target.value as ProductSortOption })
              }
              className="w-full sm:w-auto bg-ink-900/90 border border-white/[0.08] rounded-xl pl-8 pr-3 py-2.5 text-xs font-bold text-zinc-200 outline-none focus:border-brand-500/40"
            >
              <option value="default">Sort: Featured</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="alpha_asc">Name: A to Z</option>
              <option value="recent">Recently Purchased</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 whitespace-nowrap ${
              showAdvanced || filters.minPrice != null || filters.maxPrice != null
                ? 'bg-brand-500/15 border-brand-500/35 text-brand-400'
                : 'bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:bg-white/[0.08]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={2.4} />
            Filters
          </button>
        </div>
      </div>

      {/* Quick Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
        <button
          type="button"
          onClick={() =>
            onChange({ ...filters, onlyFavourites: !filters.onlyFavourites })
          }
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border whitespace-nowrap transition-all flex items-center gap-1.5 ${
            filters.onlyFavourites
              ? 'bg-rose-500/15 border-rose-500/35 text-rose-300'
              : 'bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Heart className="w-3 h-3" strokeWidth={2.4} />
          Favourites
        </button>

        <button
          type="button"
          onClick={() => onChange({ ...filters, onlyFrequent: !filters.onlyFrequent })}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border whitespace-nowrap transition-all flex items-center gap-1.5 ${
            filters.onlyFrequent
              ? 'bg-brand-500/15 border-brand-500/35 text-brand-300'
              : 'bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-3 h-3" strokeWidth={2.4} />
          Frequent
        </button>

        <button
          type="button"
          onClick={() =>
            onChange({ ...filters, onlyRecurring: !filters.onlyRecurring })
          }
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border whitespace-nowrap transition-all flex items-center gap-1.5 ${
            filters.onlyRecurring
              ? 'bg-sky-500/15 border-sky-500/35 text-sky-300'
              : 'bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Repeat className="w-3 h-3" strokeWidth={2.4} />
          Recurring
        </button>

        <button
          type="button"
          onClick={() => onChange({ ...filters, onlyRecent: !filters.onlyRecent })}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border whitespace-nowrap transition-all flex items-center gap-1.5 ${
            filters.onlyRecent
              ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
              : 'bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Clock className="w-3 h-3" strokeWidth={2.4} />
          Recent
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="ml-auto px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] whitespace-nowrap"
          >
            Reset
          </button>
        )}
      </div>

      {/* Expandable Category + Price Range Row */}
      {showAdvanced && (
        <div className="glass rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 animate-fade-in">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
              Category
            </label>
            <select
              aria-label="Filter by category"
              value={filters.category ?? 'All'}
              onChange={(e) => onChange({ ...filters, category: e.target.value })}
              className="w-full bg-ink-900 border border-white/[0.08] rounded-lg px-2.5 py-2 text-xs text-white outline-none"
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
              Min Price (₹)
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              aria-label="Minimum price"
              value={filters.minPrice ?? ''}
              onChange={(e) =>
                onChange({
                  ...filters,
                  minPrice: e.target.value === '' ? null : Math.max(0, Number(e.target.value)),
                })
              }
              className="w-full bg-ink-900 border border-white/[0.08] rounded-lg px-2.5 py-2 text-xs text-white font-mono outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
              Max Price (₹)
            </label>
            <input
              type="number"
              min="0"
              placeholder="Any"
              aria-label="Maximum price"
              value={filters.maxPrice ?? ''}
              onChange={(e) =>
                onChange({
                  ...filters,
                  maxPrice: e.target.value === '' ? null : Math.max(0, Number(e.target.value)),
                })
              }
              className="w-full bg-ink-900 border border-white/[0.08] rounded-lg px-2.5 py-2 text-xs text-white font-mono outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

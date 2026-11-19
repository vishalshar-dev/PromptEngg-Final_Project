import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  Heart,
  Repeat,
  Clock,
  Sparkles,
  ArrowUpDown,
  Tag,
  Store,
} from 'lucide-react';
import type { CartItem, CategoryConfig } from '../../types/models';
import {
  getSearchSuggestions,
  type ProductFilterOptions,
  type ProductSortOption,
  type SearchSuggestion,
} from '../../utils/martEngine';

interface ProductSearchProps {
  filters: ProductFilterOptions;
  categories: CategoryConfig[];
  items?: CartItem[];
  onChange: (next: ProductFilterOptions) => void;
  onReset: () => void;
  onSelectCategory?: (categoryName: string) => void;
  onOpenProduct?: (item: CartItem) => void;
}

const POPULAR_SEARCH_TERMS = ['Milk', 'Basmati Rice', 'Eggs', 'Cooking Oil', 'Shampoo', 'Potatoes', 'Detergent'];

export function ProductSearch({
  filters,
  categories,
  items = [],
  onChange,
  onReset,
  onSelectCategory,
  onOpenProduct,
}: ProductSearchProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const hasActiveFilters =
    Boolean(filters.query?.trim()) ||
    (filters.category && filters.category !== 'All') ||
    (filters.subcategory && filters.subcategory !== 'All') ||
    (filters.brand && filters.brand !== 'All') ||
    (filters.productType && filters.productType !== 'All') ||
    filters.minPrice != null ||
    filters.maxPrice != null ||
    Boolean(filters.onlyFavourites) ||
    Boolean(filters.onlyFrequent) ||
    Boolean(filters.onlyRecent) ||
    Boolean(filters.onlyRecurring) ||
    (filters.sortBy && filters.sortBy !== 'default');

  const availableSubcategories = useMemo(() => {
    const activeCat = filters.category && filters.category !== 'All' ? filters.category : null;
    const set = new Set<string>();
    for (const cat of categories) {
      if (!activeCat || cat.name === activeCat) {
        for (const sub of cat.subcategories ?? []) set.add(sub);
      }
    }
    for (const item of items) {
      if ((!activeCat || item.category === activeCat) && item.subcategory?.trim()) {
        set.add(item.subcategory.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [categories, items, filters.category]);

  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.brand?.trim()) set.add(item.brand.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const availableProductTypes = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.productType?.trim()) set.add(item.productType.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const suggestions = useMemo(
    () => getSearchSuggestions(items, filters.query ?? '', 7),
    [items, filters.query]
  );

  const showSuggestions = isFocused && (Boolean(filters.query?.trim()) ? suggestions.length > 0 : true);

  const handleSuggestionClick = (s: SearchSuggestion) => {
    setIsFocused(false);
    if (s.type === 'category' && onSelectCategory) {
      onSelectCategory(s.label);
      return;
    }
    if (s.type === 'brand') {
      onChange({ ...filters, query: '', brand: s.label });
      return;
    }
    if (s.type === 'product' && s.item && onOpenProduct) {
      onChange({ ...filters, query: s.label });
      return;
    }
    onChange({ ...filters, query: s.query });
  };

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Main Search + Filter Toggle + Sort */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search
            className="w-4 h-4 text-[#929BAB] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            strokeWidth={2}
          />
          <input
            type="search"
            value={filters.query ?? ''}
            onFocus={() => setIsFocused(true)}
            onChange={(e) => {
              onChange({ ...filters, query: e.target.value });
              setIsFocused(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsFocused(false);
            }}
            aria-label="Search products"
            placeholder="Search milk, rice, brand (Amul, Fortune), category..."
            className="w-full bg-white border border-[#E7EAF0] focus:border-[#365FE8] rounded-xl pl-10 pr-9 py-2 sm:py-2.5 text-sm text-[#151922] outline-none placeholder:text-[#929BAB] transition-colors shadow-xs"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, query: '' })}
              aria-label="Clear search query"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-[#F1F3F6] hover:bg-[#E7EAF0] flex items-center justify-center text-[#697386] hover:text-[#151922]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Live Suggestions Dropdown */}
          {showSuggestions && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white border border-[#E7EAF0] rounded-xl p-2 shadow-modal space-y-1">
              {filters.query?.trim() ? (
                suggestions.map((s, idx) => (
                  <button
                    key={`${s.type}-${s.label}-${idx}`}
                    type="button"
                    onClick={() => handleSuggestionClick(s)}
                    className="w-full px-2.5 py-2 rounded-lg hover:bg-[#F7F8FA] flex items-center justify-between gap-2 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {s.type === 'brand' ? (
                        <Store className="w-3.5 h-3.5 text-[#C7851F] flex-shrink-0" />
                      ) : s.type === 'category' ? (
                        <Tag className="w-3.5 h-3.5 text-[#365FE8] flex-shrink-0" />
                      ) : (
                        <Search className="w-3.5 h-3.5 text-[#15966B] flex-shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-[#151922] truncate">{s.label}</span>
                    </div>
                    {s.sublabel && (
                      <span className="text-[11px] font-medium text-[#697386] whitespace-nowrap">
                        {s.sublabel}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="p-1.5">
                  <p className="text-[11px] font-semibold text-[#697386] px-1.5 mb-2">
                    Popular searches
                  </p>
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {POPULAR_SEARCH_TERMS.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => {
                          onChange({ ...filters, query: term });
                          setIsFocused(false);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#F7F8FA] hover:bg-[#EDF2FF] border border-[#E7EAF0] hover:border-[#365FE8]/35 text-xs font-medium text-[#4B5565] hover:text-[#365FE8] transition-colors whitespace-nowrap"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#929BAB] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              aria-label="Sort products"
              value={filters.sortBy ?? 'default'}
              onChange={(e) =>
                onChange({ ...filters, sortBy: e.target.value as ProductSortOption })
              }
              className="w-full sm:w-auto bg-white border border-[#E7EAF0] rounded-xl pl-8 pr-3 py-2 sm:py-2.5 text-xs font-semibold text-[#151922] outline-none focus:border-[#365FE8] shadow-xs"
            >
              <option value="default">Sort: Featured</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="frequent">Frequently Purchased</option>
              <option value="recent">Most Recently Purchased</option>
              <option value="newest">Recently Added</option>
              <option value="alpha_asc">Name: A to Z</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
            className={`px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs ${
              showAdvanced ||
              filters.minPrice != null ||
              filters.maxPrice != null ||
              (filters.brand && filters.brand !== 'All') ||
              (filters.subcategory && filters.subcategory !== 'All') ||
              (filters.productType && filters.productType !== 'All')
                ? 'bg-[#EDF2FF] border-[#365FE8]/35 text-[#365FE8]'
                : 'bg-white border-[#E7EAF0] text-[#4B5565] hover:bg-[#F7F8FA]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={2.2} />
            Filters
          </button>
        </div>
      </div>

      {/* Quick Filter Controls (wraps cleanly on narrow screens — zero horizontal clipping) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() =>
            onChange({ ...filters, onlyFavourites: !filters.onlyFavourites })
          }
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 ${
            filters.onlyFavourites
              ? 'bg-[#FDECEC] border-[#F6B8B8] text-[#DE5252]'
              : 'bg-white border-[#E7EAF0] text-[#697386] hover:text-[#151922]'
          }`}
        >
          <Heart className="w-3 h-3" strokeWidth={2.2} />
          Favorites
        </button>

        <button
          type="button"
          onClick={() => onChange({ ...filters, onlyFrequent: !filters.onlyFrequent })}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 ${
            filters.onlyFrequent
              ? 'bg-[#EDF2FF] border-[#365FE8]/35 text-[#365FE8]'
              : 'bg-white border-[#E7EAF0] text-[#697386] hover:text-[#151922]'
          }`}
        >
          <Sparkles className="w-3 h-3" strokeWidth={2.2} />
          Frequent
        </button>

        <button
          type="button"
          onClick={() =>
            onChange({ ...filters, onlyRecurring: !filters.onlyRecurring })
          }
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 ${
            filters.onlyRecurring
              ? 'bg-[#EDF2FF] border-[#365FE8]/35 text-[#365FE8]'
              : 'bg-white border-[#E7EAF0] text-[#697386] hover:text-[#151922]'
          }`}
        >
          <Repeat className="w-3 h-3" strokeWidth={2.2} />
          Recurring
        </button>

        <button
          type="button"
          onClick={() => onChange({ ...filters, onlyRecent: !filters.onlyRecent })}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 ${
            filters.onlyRecent
              ? 'bg-[#FEF6E7] border-[#F3D8A8] text-[#9E6614]'
              : 'bg-white border-[#E7EAF0] text-[#697386] hover:text-[#151922]'
          }`}
        >
          <Clock className="w-3 h-3" strokeWidth={2.2} />
          Recent
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold text-[#4B5565] hover:text-[#151922] bg-[#F1F3F6] hover:bg-[#E7EAF0] whitespace-nowrap shrink-0"
          >
            Reset
          </button>
        )}
      </div>

      {/* Expandable Multi-Facet Filters Row */}
      {showAdvanced && (
        <div className="bg-white border border-[#E7EAF0] rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 shadow-card animate-fade-in">
          <div>
            <label className="text-[11px] font-semibold text-[#697386] block mb-1">
              Category
            </label>
            <select
              aria-label="Filter by category"
              value={filters.category ?? 'All'}
              onChange={(e) =>
                onChange({ ...filters, category: e.target.value, subcategory: 'All' })
              }
              className="input-field py-2 text-xs"
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {availableSubcategories.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold text-[#697386] block mb-1">
                Subcategory
              </label>
              <select
                aria-label="Filter by subcategory"
                value={filters.subcategory ?? 'All'}
                onChange={(e) => onChange({ ...filters, subcategory: e.target.value })}
                className="input-field py-2 text-xs"
              >
                <option value="All">All Subcategories</option>
                {availableSubcategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          )}

          {availableBrands.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold text-[#697386] block mb-1">
                Brand
              </label>
              <select
                aria-label="Filter by brand"
                value={filters.brand ?? 'All'}
                onChange={(e) => onChange({ ...filters, brand: e.target.value })}
                className="input-field py-2 text-xs"
              >
                <option value="All">All Brands</option>
                {availableBrands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>
          )}

          {availableProductTypes.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold text-[#697386] block mb-1">
                Product Type
              </label>
              <select
                aria-label="Filter by product type"
                value={filters.productType ?? 'All'}
                onChange={(e) => onChange({ ...filters, productType: e.target.value })}
                className="input-field py-2 text-xs"
              >
                <option value="All">All Types</option>
                {availableProductTypes.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-[#697386] block mb-1">
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
              className="input-field py-2 text-xs font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#697386] block mb-1">
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
              className="input-field py-2 text-xs font-mono"
            />
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Plus, Check, Pencil, X, Sparkles, Tag } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { getCategoryStyle, formatCurrency } from '../../utils/categoryStyles';

const ICON_OPTIONS = ['✨', '🛒', '🍔', '☕', '📡', '⚡', '🎬', '🎮', '💊', '🚗', '📱', '👕'];

export function QuickMartGrid() {
  const items = useAppStore((s) => s.items);
  const categories = useAppStore((s) => s.categories);
  const addToCart = useAppStore((s) => s.addToCart);
  const addCustomItem = useAppStore((s) => s.addCustomItem);
  const addCategory = useAppStore((s) => s.addCategory);
  const updateItemPrice = useAppStore((s) => s.updateItemPrice);
  const isBrokeMode = useAppStore((s) => s.isBrokeMode);

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [icon, setIcon] = useState('✨');
  const [selectedCategory, setSelectedCategory] = useState(categories[0] ?? 'Groceries');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [poppedItemId, setPoppedItemId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState('');

  const handleAddToCart = (item: { id: string; name: string; price: number; category: string; icon: string }) => {
    addToCart(item);
    setPoppedItemId(item.id);
    setTimeout(() => setPoppedItemId(null), 400);
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    let finalCategory = selectedCategory;
    if (isCreatingCategory && newCategoryInput.trim()) {
      finalCategory = newCategoryInput.trim();
      addCategory(finalCategory);
    }

    addCustomItem({
      id: crypto.randomUUID(),
      name,
      price: Number(price),
      category: finalCategory,
      icon,
    });

    setName('');
    setPrice('');
    setIcon('✨');
    setIsAdding(false);
    setIsCreatingCategory(false);
    setNewCategoryInput('');
  };

  const handlePriceUpdate = (id: string) => {
    if (tempPrice && Number(tempPrice) > 0) {
      updateItemPrice(id, Number(tempPrice));
    }
    setEditingId(null);
    setTempPrice('');
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">Quick Mart</h2>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">
            Tap to add · Long-press price to edit
          </p>
        </div>
        <span className="text-[11px] font-bold text-zinc-500 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
          {items.length} items
        </span>
      </div>

      {/* Add Item Toggle */}
      <button
        onClick={() => setIsAdding(!isAdding)}
        className="w-full glass hover:border-brand-500/30 text-zinc-300 hover:text-white py-3 rounded-2xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 group"
      >
        {isAdding ? (
          <>
            <X className="w-4 h-4" strokeWidth={2.5} />
            Cancel
          </>
        ) : (
          <>
            <Plus
              className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300"
              strokeWidth={2.5}
            />
            Add Custom Item
          </>
        )}
      </button>

      {/* Add Item Form */}
      {isAdding && (
        <form
          onSubmit={handleCreateItem}
          className="glass-strong rounded-2xl p-4 space-y-3.5 animate-scale-in shadow-2xl"
        >
          <div className="flex items-center gap-2 pb-1">
            <Sparkles className="w-4 h-4 text-brand-400" strokeWidth={2.5} />
            <h3 className="text-sm font-extrabold text-white">Create Custom Item</h3>
          </div>

          {/* Icon Picker */}
          <div>
            <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">
              Icon
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {ICON_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                    icon === emoji
                      ? 'bg-brand-500/20 border border-brand-500/40 scale-110'
                      : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name + Price */}
          <div className="grid grid-cols-2 gap-2.5">
            <input
              type="text"
              placeholder="Item name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-2 bg-ink-900 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-500/40 transition-colors placeholder:text-zinc-600"
            />
            <div className="relative col-span-2">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500">
                ₹
              </span>
              <input
                type="number"
                placeholder="Price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-ink-900 border border-white/[0.08] rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-500/40 transition-colors placeholder:text-zinc-600 font-mono"
              />
            </div>
          </div>

          {/* Category Selector */}
          <div className="space-y-2">
            <label className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3 h-3" strokeWidth={2.5} />
              Category
            </label>
            {!isCreatingCategory ? (
              <div className="flex gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="flex-1 bg-ink-900 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-500/40 transition-colors"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(true)}
                  className="bg-white/[0.06] hover:bg-white/[0.1] text-xs px-3.5 rounded-xl text-white font-bold transition-colors whitespace-nowrap"
                >
                  + New
                </button>
              </div>
            ) : (
              <div className="flex gap-2 animate-scale-in">
                <input
                  type="text"
                  placeholder="Category name..."
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  className="flex-1 bg-ink-900 border border-brand-500/40 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(false)}
                  className="bg-white/[0.06] text-xs px-3.5 rounded-xl text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!name || !price}
            className="w-full bg-brand-500 hover:bg-brand-400 disabled:bg-white/[0.04] disabled:text-zinc-600 text-ink-950 py-3 rounded-xl text-sm font-extrabold transition-all duration-300 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" strokeWidth={2.5} />
            Save to Grid
          </button>
        </form>
      )}

      {/* Item Grid */}
      <div className="grid grid-cols-2 gap-3">
        {items.map((item, index) => {
          const catStyle = getCategoryStyle(item.category);
          const isDisabled = isBrokeMode && item.category === 'Junk';
          const isPopped = poppedItemId === item.id;
          const inCart = item.quantity > 0;

          return (
            <div
              key={item.id}
              style={{ animationDelay: `${index * 40}ms` }}
              className={`group relative rounded-2xl border p-3.5 flex flex-col transition-all duration-300 animate-fade-in-up ${
                isDisabled
                  ? 'bg-ink-900/50 border-white/[0.03] opacity-40'
                  : 'glass hover:border-white/15 hover:bg-white/[0.05] hover:-translate-y-0.5'
              } ${isPopped ? 'animate-pop' : ''}`}
            >
              {/* In-cart badge */}
              {inCart && !isDisabled && (
                <div className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-brand-500 text-ink-950 text-xs font-extrabold flex items-center justify-center shadow-lg animate-bounce-in">
                  {item.quantity}
                </div>
              )}

              {/* Icon Container */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${catStyle.gradient} border ${catStyle.border} flex items-center justify-center text-2xl`}
                >
                  {item.icon}
                </div>
                {/* Category Badge */}
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}
                >
                  {item.category}
                </span>
              </div>

              {/* Name */}
              <h3 className="font-bold text-[13px] text-zinc-100 leading-tight mb-1 line-clamp-2">
                {item.name}
              </h3>

              {/* Price */}
              {editingId === item.id ? (
                <div className="flex items-center gap-1 mb-3">
                  <span className="text-brand-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    value={tempPrice}
                    onChange={(e) => setTempPrice(e.target.value)}
                    placeholder={String(item.price)}
                    className="w-16 bg-ink-900 border border-brand-500/40 rounded-lg px-2 py-1 text-sm text-white text-center outline-none font-mono"
                    autoFocus
                  />
                  <button
                    onClick={() => handlePriceUpdate(item.id)}
                    className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center text-ink-950"
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mb-3">
                  <p className="text-brand-400 text-base font-extrabold font-mono tabular-nums">
                    ₹{formatCurrency(item.price)}
                  </p>
                  <button
                    onClick={() => {
                      setEditingId(item.id);
                      setTempPrice(String(item.price));
                    }}
                    className="text-zinc-600 hover:text-brand-400 transition-colors"
                  >
                    <Pencil className="w-3 h-3" strokeWidth={2.5} />
                  </button>
                </div>
              )}

              {/* Add Button */}
              <button
                disabled={isDisabled}
                onClick={() => handleAddToCart(item)}
                className={`mt-auto w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                  isDisabled
                    ? 'bg-white/[0.02] text-zinc-700 cursor-not-allowed'
                    : inCart
                    ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30 hover:bg-brand-500/25'
                    : 'bg-white/[0.06] text-zinc-200 hover:bg-brand-500 hover:text-ink-950 border border-white/[0.06] hover:border-brand-500'
                }`}
              >
                {isDisabled ? (
                  'Locked'
                ) : inCart ? (
                  <>
                    <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                    Add More
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                    Add
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {items.length === 0 && !isAdding && (
        <div className="text-center py-12 animate-fade-in">
          <div className="text-4xl mb-3 opacity-50">🛒</div>
          <p className="text-zinc-500 text-sm font-medium">
            No items yet. Create your first one!
          </p>
        </div>
      )}
    </div>
  );
}

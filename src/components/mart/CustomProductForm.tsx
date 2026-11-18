import { useState, useEffect, useRef } from 'react';
import { X, Check, Upload, Sparkles, Tag, Repeat } from 'lucide-react';
import {
  useAppStore,
  type CartItem,
  type RecurrenceFrequency,
} from '../../store/useStore';
import { toLocalDateKey } from '../../utils/martEngine';

interface CustomProductFormProps {
  isOpen: boolean;
  initialProduct?: CartItem | null;
  defaultCategory?: string;
  onClose: () => void;
}

const UNIT_PRESETS = ['1 kg', '500 g', '1 L', '500 ml', '6 pcs', '1 pack', '1 mo', '1 unit'];

export function CustomProductForm({
  isOpen,
  initialProduct,
  defaultCategory,
  onClose,
}: CustomProductFormProps) {
  const categories = useAppStore((s) => s.categories);
  const addCustomItem = useAppStore((s) => s.addCustomItem);
  const updateProduct = useAppStore((s) => s.updateProduct);
  const addCategoryConfig = useAppStore((s) => s.addCategoryConfig);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('1 unit');
  const [category, setCategory] = useState(defaultCategory || categories[0] || 'Groceries');
  const [productType, setProductType] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isFavourite, setIsFavourite] = useState(false);
  const [isFrequent, setIsFrequent] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<'none' | RecurrenceFrequency>('none');
  const [intervalDays, setIntervalDays] = useState('14');

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setIsCreatingCategory(false);
    setNewCategoryName('');

    if (initialProduct) {
      setName(initialProduct.name);
      setPrice(String(initialProduct.price));
      setUnit(initialProduct.unit || '1 unit');
      setCategory(initialProduct.category);
      setProductType(initialProduct.productType || '');
      setImageUrl(initialProduct.imageUrl || '');
      setIsFavourite(Boolean(initialProduct.isFavourite));
      setIsFrequent(Boolean(initialProduct.isFrequent));
      setRecurrenceFreq(initialProduct.recurrence?.frequency ?? 'none');
      setIntervalDays(String(initialProduct.recurrence?.intervalDays ?? 14));
    } else {
      setName('');
      setPrice('');
      setUnit('1 unit');
      setCategory(defaultCategory && defaultCategory !== 'All' ? defaultCategory : categories[0] || 'Groceries');
      setProductType('');
      setImageUrl('');
      setIsFavourite(false);
      setIsFrequent(false);
      setRecurrenceFreq('none');
      setIntervalDays('14');
    }
  }, [isOpen, initialProduct, defaultCategory, categories]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const numPrice = Number(price);
    if (!trimmedName || !Number.isFinite(numPrice) || numPrice <= 0) return;

    let finalCategory = category;
    if (isCreatingCategory && newCategoryName.trim()) {
      finalCategory = newCategoryName.trim();
      addCategoryConfig({ name: finalCategory });
    }

    const recurrence =
      recurrenceFreq === 'none'
        ? null
        : {
            frequency: recurrenceFreq,
            intervalDays:
              recurrenceFreq === 'custom'
                ? Math.max(1, Number(intervalDays) || 7)
                : undefined,
            nextDueDate:
              initialProduct?.recurrence?.nextDueDate ?? toLocalDateKey(new Date()),
          };

    if (initialProduct) {
      updateProduct(initialProduct.id, {
        name: trimmedName,
        price: numPrice,
        unit: unit.trim() || '1 unit',
        category: finalCategory,
        productType: productType.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        isFavourite,
        isFrequent,
        recurrence,
      });
    } else {
      addCustomItem({
        id: `custom-${crypto.randomUUID().slice(0, 10)}`,
        name: trimmedName,
        price: numPrice,
        category: finalCategory,
        icon: '📦',
        unit: unit.trim() || '1 unit',
        productType: productType.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        isFavourite,
        isFrequent,
        isCustom: true,
        recurrence,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col glass-strong border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-up overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" strokeWidth={2.5} />
            <h3 className="text-base font-extrabold text-white">
              {initialProduct ? 'Edit Product' : 'Create Custom Product'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product form"
            className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto scrollbar-thin">
          {/* Name & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                Product Name *
              </label>
              <input
                type="text"
                required
                aria-label="Product name"
                placeholder="e.g. Organic Olive Oil"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-500/40"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                Price (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                aria-label="Product price"
                placeholder="120"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm font-mono text-white outline-none focus:border-brand-500/40"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                Unit / Package Size
              </label>
              <input
                type="text"
                aria-label="Unit or package size"
                placeholder="1 kg / 500 ml / 6 pcs"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm font-mono text-white outline-none focus:border-brand-500/40"
              />
            </div>
          </div>

          {/* Quick Unit Chips */}
          <div className="flex flex-wrap gap-1.5">
            {UNIT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setUnit(preset)}
                className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold border ${
                  unit === preset
                    ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                    : 'bg-white/[0.04] border-white/[0.06] text-zinc-400 hover:text-white'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Tag className="w-3 h-3" /> Category
            </label>
            {!isCreatingCategory ? (
              <div className="flex gap-2">
                <select
                  aria-label="Product category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1 bg-ink-900 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
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
                  className="px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-white whitespace-nowrap"
                >
                  + New
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 bg-ink-900 border border-brand-500/40 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(false)}
                  className="px-3 rounded-xl bg-white/[0.06] text-xs font-bold text-zinc-400"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Product Type & Image */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                Product Type / Tag
              </label>
              <input
                type="text"
                placeholder="e.g. Pantry Staple, Beverage"
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                Product Image
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Image URL or upload"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="flex-1 min-w-0 bg-ink-900 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload image file"
                  className="px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 flex items-center justify-center"
                >
                  <Upload className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Flags + Recurrence */}
          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isFavourite}
                onChange={(e) => setIsFavourite(e.target.checked)}
                className="accent-emerald-500"
              />
              Mark as Favourite
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isFrequent}
                onChange={(e) => setIsFrequent(e.target.checked)}
                className="accent-emerald-500"
              />
              Frequently Purchased
            </label>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 text-sky-400" /> Recurring Schedule
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {(['none', 'daily', 'weekly', 'monthly', 'custom'] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setRecurrenceFreq(freq)}
                  className={`py-1.5 rounded-lg text-[11px] font-bold capitalize border ${
                    recurrenceFreq === freq
                      ? 'bg-sky-500/20 border-sky-400/40 text-sky-300'
                      : 'bg-ink-900 border-white/[0.06] text-zinc-400'
                  }`}
                >
                  {freq === 'none' ? 'Off' : freq}
                </button>
              ))}
            </div>
            {recurrenceFreq === 'custom' && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-zinc-400">Every</span>
                <input
                  type="number"
                  min="1"
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(e.target.value)}
                  className="w-16 bg-ink-900 border border-white/[0.08] rounded-lg px-2 py-1 text-xs font-mono text-white text-center"
                />
                <span className="text-xs text-zinc-400">days</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-white/[0.08]">
          <button
            type="submit"
            disabled={!name.trim() || !price || Number(price) <= 0}
            className="w-full bg-brand-500 hover:bg-brand-400 disabled:bg-white/[0.04] disabled:text-zinc-600 text-ink-950 py-3 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" strokeWidth={3} />
            {initialProduct ? 'Save Changes' : 'Save Product to Catalog'}
          </button>
        </div>
      </form>
    </div>
  );
}

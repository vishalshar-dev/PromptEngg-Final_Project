import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Check, Upload, Sparkles, Tag, Repeat, Plus, Trash2, Layers } from 'lucide-react';
import {
  useAppStore,
  type CartItem,
  type RecurrenceFrequency,
} from '../../store/useStore';
import type { ProductVariant } from '../../types/models';
import { toLocalDateKey } from '../../utils/martEngine';

interface CustomProductFormProps {
  isOpen: boolean;
  initialProduct?: CartItem | null;
  defaultCategory?: string;
  defaultSubcategory?: string;
  onClose: () => void;
}

const UNIT_PRESETS = ['1 kg', '500 g', '1 L', '500 ml', '6 pcs', '1 pack', '1 mo', '1 unit'];

interface VariantDraft {
  id: string;
  label: string;
  unit: string;
  price: string;
}

export function CustomProductForm({
  isOpen,
  initialProduct,
  defaultCategory,
  defaultSubcategory,
  onClose,
}: CustomProductFormProps) {
  const categories = useAppStore((s) => s.categories);
  const categoryConfigs = useAppStore((s) => s.categoryConfigs);
  const addCustomItem = useAppStore((s) => s.addCustomItem);
  const updateProduct = useAppStore((s) => s.updateProduct);
  const addCategoryConfig = useAppStore((s) => s.addCategoryConfig);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('1 unit');
  const [category, setCategory] = useState(defaultCategory || categories[0] || 'Groceries');
  const [subcategory, setSubcategory] = useState(defaultSubcategory || '');
  const [description, setDescription] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [productType, setProductType] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isFavourite, setIsFavourite] = useState(false);
  const [isFrequent, setIsFrequent] = useState(false);
  const [allowDecimalQuantity, setAllowDecimalQuantity] = useState(false);
  const [quantityStep, setQuantityStep] = useState('0.5');
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [recurrenceFreq, setRecurrenceFreq] = useState<'none' | RecurrenceFrequency>('none');
  const [intervalDays, setIntervalDays] = useState('14');

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const suggestedSubcategories = useMemo(() => {
    const cfg = categoryConfigs.find((c) => c.name === category);
    return cfg?.subcategories ?? [];
  }, [categoryConfigs, category]);

  useEffect(() => {
    if (!isOpen) return;
    setIsCreatingCategory(false);
    setNewCategoryName('');

    if (initialProduct) {
      setName(initialProduct.name);
      setBrand(initialProduct.brand || '');
      setPrice(String(initialProduct.price));
      setUnit(initialProduct.unit || '1 unit');
      setCategory(initialProduct.category);
      setSubcategory(initialProduct.subcategory || '');
      setDescription(initialProduct.description || '');
      setTagsText((initialProduct.tags ?? []).join(', '));
      setProductType(initialProduct.productType || '');
      setImageUrl(initialProduct.imageUrl || '');
      setIsFavourite(Boolean(initialProduct.isFavourite));
      setIsFrequent(Boolean(initialProduct.isFrequent));
      setAllowDecimalQuantity(Boolean(initialProduct.allowDecimalQuantity));
      setQuantityStep(String(initialProduct.quantityStep ?? 0.5));
      setVariants(
        (initialProduct.variants ?? []).map((v) => ({
          id: v.id,
          label: v.label,
          unit: v.unit,
          price: String(v.price),
        }))
      );
      setRecurrenceFreq(initialProduct.recurrence?.frequency ?? 'none');
      setIntervalDays(String(initialProduct.recurrence?.intervalDays ?? 14));
    } else {
      setName('');
      setBrand('');
      setPrice('');
      setUnit('1 unit');
      setCategory(
        defaultCategory && defaultCategory !== 'All'
          ? defaultCategory
          : categories[0] || 'Groceries'
      );
      setSubcategory(defaultSubcategory && defaultSubcategory !== 'All' ? defaultSubcategory : '');
      setDescription('');
      setTagsText('');
      setProductType('');
      setImageUrl('');
      setIsFavourite(false);
      setIsFrequent(false);
      setAllowDecimalQuantity(false);
      setQuantityStep('0.5');
      setVariants([]);
      setRecurrenceFreq('none');
      setIntervalDays('14');
    }
  }, [isOpen, initialProduct, defaultCategory, defaultSubcategory, categories]);

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

  const addVariantRow = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: `var-${crypto.randomUUID().slice(0, 6)}`,
        label: prev.length === 0 ? unit || '500 g' : '',
        unit: prev.length === 0 ? unit || '500 g' : '',
        price: prev.length === 0 ? price || '' : '',
      },
    ]);
  };

  const updateVariantRow = (idx: number, patch: Partial<VariantDraft>) => {
    setVariants((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row))
    );
  };

  const removeVariantRow = (idx: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const cleanVariants: ProductVariant[] = variants
    .map((v) => ({
      id: v.id || `var-${crypto.randomUUID().slice(0, 6)}`,
      label: v.label.trim() || v.unit.trim(),
      unit: v.unit.trim() || v.label.trim(),
      price: Number(v.price),
    }))
    .filter((v) => v.label && v.unit && Number.isFinite(v.price) && v.price > 0);

  const effectivePrice = cleanVariants[0]?.price ?? Number(price);
  const canSave = Boolean(name.trim()) && Number.isFinite(effectivePrice) && effectivePrice > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || !Number.isFinite(effectivePrice) || effectivePrice <= 0) return;

    let finalCategory = category;
    const cleanSub = subcategory.trim() || undefined;

    if (isCreatingCategory && newCategoryName.trim()) {
      finalCategory = newCategoryName.trim();
      addCategoryConfig({
        name: finalCategory,
        subcategories: cleanSub ? [cleanSub] : undefined,
      });
    }

    const parsedTags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

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
            source:
              initialProduct?.recurrence?.source === 'auto' &&
              initialProduct.recurrence.frequency === recurrenceFreq &&
              (recurrenceFreq !== 'custom' ||
                initialProduct.recurrence.intervalDays === (Number(intervalDays) || 7))
                ? ('auto' as const)
                : ('manual' as const),
            detectedOrderCount: initialProduct?.recurrence?.detectedOrderCount,
          };

    const parsedStep = Math.max(0.1, Math.min(10, Number(quantityStep) || 0.5));

    if (initialProduct) {
      updateProduct(initialProduct.id, {
        name: trimmedName,
        brand: brand.trim() || undefined,
        price: effectivePrice,
        unit: cleanVariants[0]?.unit || unit.trim() || '1 unit',
        category: finalCategory,
        subcategory: cleanSub,
        description: description.trim() || undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        productType: productType.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        isFavourite,
        isFrequent,
        allowDecimalQuantity,
        quantityStep: allowDecimalQuantity ? parsedStep : undefined,
        variants: cleanVariants.length > 0 ? cleanVariants : undefined,
        selectedVariantId: cleanVariants[0]?.id,
        recurrence,
        autoRecurrenceDismissed:
          recurrenceFreq === 'none'
            ? Boolean(initialProduct.recurrence || initialProduct.autoRecurrenceDismissed)
            : false,
      });
    } else {
      addCustomItem({
        id: `custom-${crypto.randomUUID().slice(0, 10)}`,
        name: trimmedName,
        brand: brand.trim() || undefined,
        price: effectivePrice,
        category: finalCategory,
        subcategory: cleanSub,
        description: description.trim() || undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        icon: 'package',
        unit: cleanVariants[0]?.unit || unit.trim() || '1 unit',
        productType: productType.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        isFavourite,
        isFrequent,
        isCustom: true,
        allowDecimalQuantity,
        quantityStep: allowDecimalQuantity ? parsedStep : undefined,
        variants: cleanVariants.length > 0 ? cleanVariants : undefined,
        selectedVariantId: cleanVariants[0]?.id,
        recurrence,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="fixed inset-0 bg-[var(--backdrop-scrim)] backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-t-3xl sm:rounded-2xl shadow-modal animate-slide-up overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary-soft)] text-[var(--accent-ink)] flex items-center justify-center">
              <Sparkles className="w-4 h-4" strokeWidth={2.2} />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {initialProduct ? 'Edit Product' : 'Create Custom Product'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product form"
            className="w-9 h-9 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto scrollbar-thin">
          {/* Name & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text-tertiary)] block mb-1.5">
                Product Name *
              </label>
              <input
                type="text"
                required
                aria-label="Product name"
                placeholder="e.g. Organic Olive Oil"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field w-full"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-tertiary)] block mb-1.5">
                Brand (Optional)
              </label>
              <input
                type="text"
                aria-label="Brand"
                placeholder="e.g. Amul, Tata, Borges"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="input-field w-full"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-tertiary)] block mb-1.5">
                Price (₹) {cleanVariants.length === 0 ? '*' : '(Base)'}
              </label>
              <input
                type="number"
                required={cleanVariants.length === 0}
                min="1"
                step="any"
                aria-label="Product price"
                placeholder="120"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="input-field w-full font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-tertiary)] block mb-1.5">
                Unit / Pack Size
              </label>
              <input
                type="text"
                aria-label="Unit or package size"
                placeholder="1 kg / 500 ml / 6 pcs"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="input-field w-full font-mono"
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
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold border transition-colors ${
                  unit === preset
                    ? 'bg-[var(--accent-primary-soft)] border-[var(--accent-border)] text-[var(--accent-ink)]'
                    : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Category + Subcategory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-tertiary)] flex items-center gap-1.5">
                <Tag className="w-3 h-3" /> Category
              </label>
              {!isCreatingCategory ? (
                <div className="flex gap-2">
                  <select
                    aria-label="Product category"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setSubcategory('');
                    }}
                    className="input-field flex-1 min-w-0"
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
                    className="btn-secondary px-3 text-xs whitespace-nowrap"
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
                    className="input-field flex-1"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory(false)}
                    className="btn-secondary px-2.5 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-tertiary)] block mb-1.5">
                Subcategory
              </label>
              <input
                type="text"
                list="subcategory-options"
                aria-label="Product subcategory"
                placeholder="e.g. Cooking Oil, Milk"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="input-field w-full"
              />
              <datalist id="subcategory-options">
                {suggestedSubcategories.map((sub) => (
                  <option key={sub} value={sub} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Description & Tags */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text-tertiary)] block mb-1.5">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                aria-label="Product description"
                placeholder="Short notes about pack size, brand quality, or usage..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field w-full resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-tertiary)] block mb-1.5">
                  Product Type &amp; Tags
                </label>
                <input
                  type="text"
                  placeholder="Type (e.g. Essential, Bill)"
                  aria-label="Product type"
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="input-field w-full mb-2"
                />
                <input
                  type="text"
                  placeholder="Tags (e.g. tea, staple)"
                  aria-label="Product tags"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  className="input-field w-full text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-tertiary)] block mb-1.5">
                  Product Image
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Image URL or upload"
                    aria-label="Product image URL"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="input-field flex-1 min-w-0"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Upload product image"
                    title="Upload image file"
                    className="btn-secondary px-3"
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
          </div>

          {/* Variants Builder */}
          <div className="surface-well rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[var(--accent-ink)]" /> Pack Sizes / Variants
              </label>
              <button
                type="button"
                onClick={addVariantRow}
                className="px-2.5 py-1 rounded-lg bg-[var(--accent-primary-soft)] hover:bg-[var(--accent-primary-soft-hover)] border border-[var(--accent-border)] text-[var(--accent-ink)] text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Variant
              </button>
            </div>
            {variants.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">
                Optional: Add multiple pack sizes (e.g. 500 ml ₹30, 1 L ₹58) with separate prices.
              </p>
            ) : (
              <div className="space-y-2">
                {variants.map((v, idx) => (
                  <div key={v.id} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Label (500 ml)"
                      value={v.label}
                      onChange={(e) => updateVariantRow(idx, { label: e.target.value })}
                      className="flex-1 min-w-0 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                    />
                    <input
                      type="text"
                      placeholder="Unit (500 ml)"
                      value={v.unit}
                      onChange={(e) => updateVariantRow(idx, { unit: e.target.value })}
                      className="w-20 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                    />
                    <input
                      type="number"
                      min="1"
                      step="any"
                      placeholder="₹ Price"
                      value={v.price}
                      onChange={(e) => updateVariantRow(idx, { price: e.target.value })}
                      className="w-20 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                    />
                    <button
                      type="button"
                      onClick={() => removeVariantRow(idx)}
                      aria-label={`Remove variant ${idx + 1}`}
                      className="w-7 h-7 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--accent-danger-soft)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--accent-danger)] flex items-center justify-center flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Decimal weight / Flags */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-tertiary)] cursor-pointer">
              <input
                type="checkbox"
                checked={isFavourite}
                onChange={(e) => setIsFavourite(e.target.checked)}
                className="accent-[var(--accent-primary)]"
              />
              Mark as Favourite
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-tertiary)] cursor-pointer">
              <input
                type="checkbox"
                checked={isFrequent}
                onChange={(e) => setIsFrequent(e.target.checked)}
                className="accent-[var(--accent-primary)]"
              />
              Essential Staple
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-tertiary)] cursor-pointer">
              <input
                type="checkbox"
                checked={allowDecimalQuantity}
                onChange={(e) => setAllowDecimalQuantity(e.target.checked)}
                className="accent-[var(--accent-primary)]"
              />
              Weight / Decimal Qty
            </label>
            {allowDecimalQuantity && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[var(--text-secondary)]">Step:</span>
                <input
                  type="number"
                  step="0.25"
                  min="0.1"
                  max="10"
                  aria-label="Quantity step"
                  value={quantityStep}
                  onChange={(e) => setQuantityStep(e.target.value)}
                  className="w-16 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs font-mono text-[var(--text-primary)] text-center"
                />
              </div>
            )}
          </div>

          {/* Recurring Schedule */}
          <div className="surface-well rounded-xl p-3.5 space-y-2.5">
            <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 text-[var(--accent-ink)]" /> Recurring Schedule
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {(['none', 'daily', 'weekly', 'monthly', 'custom'] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setRecurrenceFreq(freq)}
                  className={`py-1.5 rounded-lg text-xs font-semibold capitalize border transition-colors ${
                    recurrenceFreq === freq
                      ? 'bg-[var(--accent-primary-soft)] border-[var(--accent-border)] text-[var(--accent-ink)]'
                      : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  {freq === 'none' ? 'Off' : freq}
                </button>
              ))}
            </div>
            {recurrenceFreq === 'custom' && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-[var(--text-secondary)]">Every</span>
                <input
                  type="number"
                  min="1"
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(e.target.value)}
                  className="w-16 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs font-mono text-[var(--text-primary)] text-center"
                />
                <span className="text-xs text-[var(--text-secondary)]">days</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
          <button
            type="submit"
            disabled={!canSave}
            className="w-full btn-primary py-3 text-sm disabled:bg-[var(--bg-well)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" strokeWidth={2.5} />
            {initialProduct ? 'Save Changes' : 'Save Product to Catalog'}
          </button>
        </div>
      </form>
    </div>
  );
}

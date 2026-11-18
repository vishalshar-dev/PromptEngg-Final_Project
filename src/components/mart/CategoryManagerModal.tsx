import { useState } from 'react';
import {
  X,
  Plus,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import { useAppStore, type CategoryConfig } from '../../store/useStore';
import { ACCENT_OPTIONS, getCategoryStyle } from '../../utils/categoryStyles';
import { AVAILABLE_ICON_KEYS, CategoryIcon } from './CategoryIcon';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CategoryManagerModal({ isOpen, onClose }: CategoryManagerModalProps) {
  const categoryConfigs = useAppStore((s) => s.categoryConfigs);
  const items = useAppStore((s) => s.items);
  const addCategoryConfig = useAppStore((s) => s.addCategoryConfig);
  const renameCategoryConfig = useAppStore((s) => s.renameCategoryConfig);
  const updateCategoryAppearance = useAppStore((s) => s.updateCategoryAppearance);
  const deleteCategoryConfig = useAppStore((s) => s.deleteCategoryConfig);
  const reorderCategories = useAppStore((s) => s.reorderCategories);

  const [newName, setNewName] = useState('');
  const [newIconKey, setNewIconKey] = useState<string>('package');
  const [newAccent, setNewAccent] = useState<string>('emerald');
  const [newImageUrl, setNewImageUrl] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIconKey, setEditIconKey] = useState('package');
  const [editAccent, setEditAccent] = useState('emerald');
  const [editImageUrl, setEditImageUrl] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addCategoryConfig({
      name: newName.trim(),
      iconKey: newIconKey,
      accent: newAccent,
      imageUrl: newImageUrl.trim() || undefined,
    });
    setNewName('');
    setNewImageUrl('');
  };

  const startEdit = (cat: CategoryConfig) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIconKey(cat.iconKey);
    setEditAccent(cat.accent);
    setEditImageUrl(cat.imageUrl ?? '');
  };

  const saveEdit = (cat: CategoryConfig) => {
    if (editName.trim() && editName.trim() !== cat.name) {
      renameCategoryConfig(cat.id, editName.trim());
    }
    updateCategoryAppearance(cat.id, {
      iconKey: editIconKey,
      accent: editAccent,
      imageUrl: editImageUrl.trim(),
    });
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-xl max-h-[90vh] flex flex-col glass-strong border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <SlidersHorizontal className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Manage Categories</h3>
              <p className="text-[11px] text-zinc-500">
                Add, rename, customize icons, reorder, or delete custom categories
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close category manager"
            className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-5 overflow-y-auto scrollbar-thin">
          {/* Create Category Form */}
          <form
            onSubmit={handleAdd}
            className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3"
          >
            <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
              Add New Category
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                placeholder="Category name (e.g. Pet Supplies)"
                aria-label="New category name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-ink-900 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-500/40 placeholder:text-zinc-600"
              />
              <input
                type="url"
                placeholder="Optional image URL"
                aria-label="Category image URL"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className="bg-ink-900 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-500/40 placeholder:text-zinc-600"
              />
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold text-zinc-500">Select Icon</p>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_ICON_KEYS.slice(0, 14).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-label={`Icon ${key}`}
                    onClick={() => setNewIconKey(key)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      newIconKey === key
                        ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                        : 'bg-white/[0.04] text-zinc-400 border border-white/[0.06] hover:text-white'
                    }`}
                  >
                    <CategoryIcon iconKey={key} className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-zinc-500 mr-1">Accent:</span>
                {ACCENT_OPTIONS.slice(0, 8).map((acc) => {
                  const st = getCategoryStyle('', acc);
                  return (
                    <button
                      key={acc}
                      type="button"
                      aria-label={`Accent ${acc}`}
                      onClick={() => setNewAccent(acc)}
                      className={`w-5 h-5 rounded-full ${st.dot} transition-transform ${
                        newAccent === acc ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                      }`}
                    />
                  );
                })}
              </div>
              <button
                type="submit"
                disabled={!newName.trim()}
                className="bg-brand-500 hover:bg-brand-400 disabled:bg-white/[0.05] disabled:text-zinc-600 text-ink-950 px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                Add Category
              </button>
            </div>
          </form>

          {/* Existing Categories List */}
          <div className="space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
              Configured Categories ({categoryConfigs.length})
            </p>
            {categoryConfigs.map((cat, idx) => {
              const style = getCategoryStyle(cat.name, cat.accent);
              const count = items.filter((i) => i.category === cat.name).length;
              const isEditing = editingId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 space-y-2.5"
                >
                  {isEditing ? (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          aria-label={`Rename ${cat.name}`}
                          className="bg-ink-900 border border-brand-500/40 rounded-lg px-3 py-2 text-sm text-white outline-none"
                        />
                        <input
                          type="url"
                          placeholder="Image URL (optional)"
                          value={editImageUrl}
                          onChange={(e) => setEditImageUrl(e.target.value)}
                          className="bg-ink-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {AVAILABLE_ICON_KEYS.slice(0, 14).map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setEditIconKey(key)}
                            className={`w-7 h-7 rounded-md flex items-center justify-center ${
                              editIconKey === key
                                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                                : 'bg-white/[0.04] text-zinc-400'
                            }`}
                          >
                            <CategoryIcon iconKey={key} className="w-3.5 h-3.5" />
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex gap-1.5 flex-wrap">
                          {ACCENT_OPTIONS.slice(0, 8).map((acc) => {
                            const st = getCategoryStyle('', acc);
                            return (
                              <button
                                key={acc}
                                type="button"
                                onClick={() => setEditAccent(acc)}
                                className={`w-4 h-4 rounded-full ${st.dot} ${
                                  editAccent === acc ? 'ring-2 ring-white' : 'opacity-60'
                                }`}
                              />
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-xs font-bold text-zinc-400 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEdit(cat)}
                            className="px-3 py-1.5 rounded-lg bg-brand-500 text-xs font-extrabold text-ink-950 flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" strokeWidth={3} />
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg ${style.bg} border ${style.border} ${style.text} flex items-center justify-center flex-shrink-0`}
                        >
                          <CategoryIcon iconKey={cat.iconKey} className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-white truncate">{cat.name}</p>
                            {cat.isCustom && (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-400">
                                Custom
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 font-mono">
                            {count} {count === 1 ? 'product' : 'products'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => reorderCategories(idx, idx - 1)}
                          aria-label={`Move ${cat.name} up`}
                          className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 flex items-center justify-center text-zinc-400 hover:text-white"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === categoryConfigs.length - 1}
                          onClick={() => reorderCategories(idx, idx + 1)}
                          aria-label={`Move ${cat.name} down`}
                          className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 flex items-center justify-center text-zinc-400 hover:text-white"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(cat)}
                          aria-label={`Edit ${cat.name}`}
                          className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-brand-400"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {cat.isCustom && (
                          <button
                            type="button"
                            onClick={() => deleteCategoryConfig(cat.id)}
                            aria-label={`Delete ${cat.name}`}
                            className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-red-500/15 flex items-center justify-center text-zinc-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

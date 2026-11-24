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
  AlertTriangle,
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
  const [newSubcategoriesText, setNewSubcategoriesText] = useState('');
  const [newIconKey, setNewIconKey] = useState<string>('package');
  const [newAccent, setNewAccent] = useState<string>('emerald');
  const [newImageUrl, setNewImageUrl] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSubcategoriesText, setEditSubcategoriesText] = useState('');
  const [editIconKey, setEditIconKey] = useState('package');
  const [editAccent, setEditAccent] = useState('emerald');
  const [editImageUrl, setEditImageUrl] = useState('');

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState('Other Expenses');

  if (!isOpen) return null;

  const parseSubcategories = (raw: string): string[] =>
    Array.from(
      new Set(
        raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addCategoryConfig({
      name: newName.trim(),
      iconKey: newIconKey,
      accent: newAccent,
      imageUrl: newImageUrl.trim() || undefined,
      subcategories: parseSubcategories(newSubcategoriesText),
    });
    setNewName('');
    setNewSubcategoriesText('');
    setNewImageUrl('');
  };

  const startEdit = (cat: CategoryConfig) => {
    setDeletingId(null);
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditSubcategoriesText((cat.subcategories ?? []).join(', '));
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
      subcategories: parseSubcategories(editSubcategoriesText),
    });
    setEditingId(null);
  };

  const startDelete = (cat: CategoryConfig) => {
    setEditingId(null);
    setDeletingId(cat.id);
    const defaultFallback =
      categoryConfigs.find((c) => c.id !== cat.id && c.name === 'Other Expenses')?.name ??
      categoryConfigs.find((c) => c.id !== cat.id)?.name ??
      'Other Expenses';
    setReassignTarget(defaultFallback);
  };

  const confirmDelete = (cat: CategoryConfig) => {
    deleteCategoryConfig(cat.id, reassignTarget);
    setDeletingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="fixed inset-0 bg-[var(--backdrop-scrim)] backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-xl max-h-[90vh] flex flex-col bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-t-3xl sm:rounded-2xl shadow-modal animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary-soft)] text-[var(--accent-ink)] flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Manage Categories &amp; Subcategories
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Add categories, edit subcategories, customize icons, reorder, or safely reassign
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close category manager"
            className="w-9 h-9 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-5 overflow-y-auto scrollbar-thin">
          {/* Create Category Form */}
          <form
            onSubmit={handleAdd}
            className="surface-well rounded-2xl p-4 space-y-3"
          >
            <p className="text-xs font-bold text-[var(--text-primary)]">
              Add New Category
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                placeholder="Category name (e.g. Pet Supplies)"
                aria-label="New category name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input-field w-full"
              />
              <input
                type="url"
                placeholder="Optional image URL"
                aria-label="Category image URL"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className="input-field w-full"
              />
            </div>

            <div>
              <input
                type="text"
                placeholder="Subcategories (comma-separated: Dog Food, Litter, Toys)"
                aria-label="New category subcategories"
                value={newSubcategoriesText}
                onChange={(e) => setNewSubcategoriesText(e.target.value)}
                className="input-field w-full text-xs"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--text-secondary)]">Select Icon</p>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_ICON_KEYS.slice(0, 14).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-label={`Icon ${key}`}
                    onClick={() => setNewIconKey(key)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border ${
                      newIconKey === key
                        ? 'bg-[var(--accent-primary-soft)] text-[var(--accent-ink)] border-[var(--accent-primary)]'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <CategoryIcon iconKey={key} className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium text-[var(--text-secondary)] mr-1">Accent:</span>
                {ACCENT_OPTIONS.slice(0, 8).map((acc) => {
                  const st = getCategoryStyle('', acc);
                  return (
                    <button
                      key={acc}
                      type="button"
                      aria-label={`Accent ${acc}`}
                      onClick={() => setNewAccent(acc)}
                      className={`w-5 h-5 rounded-full ${st.dot} transition-transform ${
                        newAccent === acc ? 'ring-2 ring-offset-2 ring-[var(--accent-primary)] scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                    />
                  );
                })}
              </div>
              <button
                type="submit"
                disabled={!newName.trim()}
                className="btn-primary py-2 px-4 text-xs disabled:bg-[var(--bg-well)] disabled:text-[var(--text-muted)]"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                Add Category
              </button>
            </div>
          </form>

          {/* Existing Categories List */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">
              Configured Categories ({categoryConfigs.length})
            </p>
            {categoryConfigs.map((cat, idx) => {
              const style = getCategoryStyle(cat.name, cat.accent);
              const count = items.filter((i) => i.category === cat.name).length;
              const isEditing = editingId === cat.id;
              const isDeleting = deletingId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3.5 space-y-2.5 shadow-xs"
                >
                  {isEditing ? (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          aria-label={`Rename ${cat.name}`}
                          className="input-field py-2"
                        />
                        <input
                          type="url"
                          placeholder="Image URL (optional)"
                          value={editImageUrl}
                          onChange={(e) => setEditImageUrl(e.target.value)}
                          className="input-field py-2"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Subcategories (comma-separated)"
                        aria-label={`Subcategories for ${cat.name}`}
                        value={editSubcategoriesText}
                        onChange={(e) => setEditSubcategoriesText(e.target.value)}
                        className="input-field py-2 text-xs"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {AVAILABLE_ICON_KEYS.slice(0, 14).map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setEditIconKey(key)}
                            className={`w-7 h-7 rounded-md flex items-center justify-center border ${
                              editIconKey === key
                                ? 'bg-[var(--accent-primary-soft)] text-[var(--accent-ink)] border-[var(--accent-primary)]'
                                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
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
                                  editAccent === acc ? 'ring-2 ring-offset-1 ring-[var(--accent-primary)]' : 'opacity-65'
                                }`}
                              />
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="btn-secondary py-1.5 px-3 text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEdit(cat)}
                            className="btn-primary py-1.5 px-3 text-xs"
                          >
                            <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-lg ${style.bg} border ${style.border} ${style.text} flex items-center justify-center flex-shrink-0`}
                          >
                            <CategoryIcon iconKey={cat.iconKey} className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-bold text-[var(--text-primary)] truncate">{cat.name}</p>
                              {cat.isCustom && (
                                <span className="text-xs font-medium text-[var(--accent-ink)]">
                                  · Custom
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] font-mono truncate tabular-nums">
                              {count} {count === 1 ? 'product' : 'products'}
                              {cat.subcategories && cat.subcategories.length > 0
                                ? ` · ${cat.subcategories.length} subcategories`
                                : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => reorderCategories(idx, idx - 1)}
                            aria-label={`Move ${cat.name} up`}
                            className="w-7 h-7 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] disabled:opacity-30 border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === categoryConfigs.length - 1}
                            onClick={() => reorderCategories(idx, idx + 1)}
                            aria-label={`Move ${cat.name} down`}
                            className="w-7 h-7 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] disabled:opacity-30 border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => startEdit(cat)}
                            aria-label={`Edit ${cat.name}`}
                            className="w-7 h-7 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--accent-primary-soft)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent-ink)]"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {cat.isCustom && (
                            <button
                              type="button"
                              onClick={() => startDelete(cat)}
                              aria-label={`Delete ${cat.name}`}
                              className="w-7 h-7 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--accent-danger-soft)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent-danger)]"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {isDeleting && (
                        <div className="bg-[var(--accent-danger-soft)] border border-[var(--accent-danger-border)] rounded-lg p-3 space-y-2.5 animate-fade-in">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-[var(--accent-danger)] flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                              Delete <strong>{cat.name}</strong>? Historical transactions stay intact.
                              {count > 0 && ` Reassign its ${count} product${count === 1 ? '' : 's'} to:`}
                            </p>
                          </div>
                          {count > 0 && (
                            <select
                              aria-label={`Reassign products from ${cat.name}`}
                              value={reassignTarget}
                              onChange={(e) => setReassignTarget(e.target.value)}
                              className="input-field py-1.5 text-xs"
                            >
                              {categoryConfigs
                                .filter((c) => c.id !== cat.id)
                                .map((c) => (
                                  <option key={c.id} value={c.name}>
                                    {c.name}
                                  </option>
                                ))}
                            </select>
                          )}
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setDeletingId(null)}
                              className="btn-secondary py-1 px-3 text-xs"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => confirmDelete(cat)}
                              className="px-3 py-1 rounded-lg bg-[var(--accent-danger)] text-xs font-semibold text-white"
                            >
                              Confirm Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </>
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

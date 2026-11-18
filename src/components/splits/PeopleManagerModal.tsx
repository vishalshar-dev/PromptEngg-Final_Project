import { useState } from 'react';
import { X, UserPlus, Pencil, Trash2, Check, Users, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import type { Person } from '../../types/models';

export function PeopleManagerModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const people = useAppStore((s) => s.people);
  const addPerson = useAppStore((s) => s.addPerson);
  const updatePerson = useAppStore((s) => s.updatePerson);
  const removePerson = useAppStore((s) => s.removePerson);

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError('Name is required.');
      return;
    }
    addPerson(trimmed, contact);
    setName('');
    setContact('');
    setFormError(null);
  };

  const handleStartEdit = (person: Person) => {
    setEditingId(person.id);
    setEditName(person.name);
    setEditContact(person.contact ?? '');
    setDeleteError(null);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    updatePerson(id, editName, editContact);
    setEditingId(null);
  };

  const handleDelete = (person: Person) => {
    const ok = removePerson(person.id);
    if (!ok) {
      setDeleteError(
        `Cannot delete ${person.name} while they appear in shared expenses or repayments.`
      );
    } else {
      setDeleteError(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="people-modal-title"
    >
      <div className="w-full sm:max-w-md max-h-[88vh] overflow-y-auto scrollbar-thin glass-strong border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/25 flex items-center justify-center">
              <Users className="w-4 h-4 text-brand-400" strokeWidth={2.5} />
            </div>
            <div>
              <h3 id="people-modal-title" className="text-base font-extrabold text-white">
                Manage People
              </h3>
              <p className="text-[11px] text-zinc-500">
                Add friends, roommates, or family you share bills with
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close people manager"
            className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Add Person Form */}
        <form onSubmit={handleAdd} className="bg-ink-900/80 border border-white/[0.06] rounded-xl p-3.5 space-y-2.5 mb-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5 text-brand-400" />
            Add New Person
          </p>
          <input
            type="text"
            aria-label="Person name"
            placeholder="Full name (required)"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setFormError(null);
            }}
            className="w-full bg-ink-950 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-500/50 placeholder:text-zinc-600"
          />
          <input
            type="text"
            aria-label="Phone or email"
            placeholder="Phone number or email (optional)"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="w-full bg-ink-950 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-500/50 placeholder:text-zinc-600"
          />
          {formError && <p className="text-xs text-red-400 font-medium">{formError}</p>}
          <button
            type="submit"
            className="w-full bg-brand-500 hover:bg-brand-400 text-ink-950 py-2.5 rounded-xl text-xs font-extrabold transition-colors"
          >
            Add Person
          </button>
        </form>

        {deleteError && (
          <div
            role="alert"
            className="flex items-start gap-2 text-xs text-orange-300 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 mb-3"
          >
            <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <span>{deleteError}</span>
          </div>
        )}

        {/* People List */}
        <div className="space-y-2">
          {people.length === 0 ? (
            <p className="text-center text-xs text-zinc-500 py-6">
              No people saved yet. Add someone above to start splitting expenses.
            </p>
          ) : (
            people.map((person) => (
              <div
                key={person.id}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3"
              >
                {editingId === person.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      aria-label={`Edit name for ${person.name}`}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-ink-950 border border-brand-500/40 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none"
                    />
                    <input
                      type="text"
                      aria-label={`Edit contact for ${person.name}`}
                      value={editContact}
                      onChange={(e) => setEditContact(e.target.value)}
                      placeholder="Phone or email"
                      className="w-full bg-ink-950 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(person.id)}
                        className="flex-1 bg-brand-500 text-ink-950 py-1.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="flex-1 bg-white/[0.06] text-zinc-300 py-1.5 rounded-lg text-xs font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{person.name}</p>
                      <p className="text-[11px] text-zinc-500 truncate">
                        {person.contact || 'No contact info'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(person)}
                        aria-label={`Edit ${person.name}`}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(person)}
                        aria-label={`Delete ${person.name}`}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

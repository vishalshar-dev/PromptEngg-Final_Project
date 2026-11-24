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
  const [upiId, setUpiId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editUpiId, setEditUpiId] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError('Name is required.');
      return;
    }
    addPerson(trimmed, contact, upiId);
    setName('');
    setContact('');
    setUpiId('');
    setFormError(null);
  };

  const handleStartEdit = (person: Person) => {
    setEditingId(person.id);
    setEditName(person.name);
    setEditContact(person.contact ?? '');
    setEditUpiId(person.upiId ?? '');
    setDeleteError(null);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    updatePerson(id, editName, editContact, editUpiId);
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[var(--backdrop-scrim)] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="people-modal-title"
    >
      <div className="modal-panel w-full sm:max-w-md max-h-[88vh] overflow-y-auto scrollbar-thin rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary-soft)] border border-[var(--accent-border)] flex items-center justify-center">
              <Users className="w-4 h-4 text-[var(--accent-ink)]" strokeWidth={2.2} />
            </div>
            <div>
              <h3 id="people-modal-title" className="font-display text-base font-bold text-[var(--text-primary)]">
                Manage People
              </h3>
              <p className="text-[12px] text-[var(--text-secondary)]">
                Add friends, roommates, or family you share bills with
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close people manager"
            className="w-8 h-8 rounded-xl bg-[var(--bg-well)] hover:bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={2.2} />
          </button>
        </div>

        {/* Add Person Form */}
        <form onSubmit={handleAdd} className="surface-well p-3.5 space-y-2.5 mb-4">
          <p className="text-[12px] font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5 text-[var(--accent-ink)]" />
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
            className="input-field w-full px-3 py-2 text-sm"
          />
          <input
            type="text"
            aria-label="Phone or email"
            placeholder="Phone number or email (optional)"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="input-field w-full px-3 py-2 text-sm"
          />
          <input
            type="text"
            aria-label="UPI ID"
            placeholder="UPI ID e.g. rahul@okaxis (optional)"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            className="input-field w-full px-3 py-2 text-sm font-mono"
          />
          {formError && <p className="text-[12px] text-[var(--accent-danger-ink)] font-medium">{formError}</p>}
          <button
            type="submit"
            className="btn-primary w-full py-2.5 text-[13px]"
          >
            Add Person
          </button>
        </form>

        {deleteError && (
          <div
            role="alert"
            className="flex items-start gap-2 text-[12.5px] text-[var(--accent-warning-ink)] bg-[var(--accent-warning-soft)] border border-[var(--accent-warning-border)] rounded-xl p-3 mb-3"
          >
            <AlertCircle className="w-4 h-4 text-[var(--accent-warning-ink)] shrink-0 mt-0.5" />
            <span>{deleteError}</span>
          </div>
        )}

        {/* People List */}
        <div className="space-y-2">
          {people.length === 0 ? (
            <p className="text-center text-[12.5px] text-[var(--text-secondary)] py-6">
              No people saved yet. Add someone above to start splitting expenses.
            </p>
          ) : (
            people.map((person) => (
              <div
                key={person.id}
                className="surface-well p-3"
              >
                {editingId === person.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      aria-label={`Edit name for ${person.name}`}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="input-field w-full px-2.5 py-1.5 text-sm"
                    />
                    <input
                      type="text"
                      aria-label={`Edit contact for ${person.name}`}
                      value={editContact}
                      onChange={(e) => setEditContact(e.target.value)}
                      placeholder="Phone or email"
                      className="input-field w-full px-2.5 py-1.5 text-[12.5px]"
                    />
                    <input
                      type="text"
                      aria-label={`Edit UPI ID for ${person.name}`}
                      value={editUpiId}
                      onChange={(e) => setEditUpiId(e.target.value)}
                      placeholder="UPI ID (optional)"
                      className="input-field w-full px-2.5 py-1.5 text-[12.5px] font-mono"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(person.id)}
                        className="btn-primary flex-1 py-1.5 text-[12.5px] flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="btn-secondary flex-1 py-1.5 text-[12.5px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--text-primary)] truncate">{person.name}</p>
                      <p className="text-[12px] text-[var(--text-secondary)] truncate">
                        {person.contact || 'No contact info'}
                        {person.upiId ? ` · ${person.upiId}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(person)}
                        aria-label={`Edit ${person.name}`}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(person)}
                        aria-label={`Delete ${person.name}`}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent-danger-ink)] hover:bg-[var(--accent-danger-soft)] transition-colors"
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

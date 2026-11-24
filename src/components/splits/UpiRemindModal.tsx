import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Copy,
  Check,
  Share2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  MessageCircle,
  Save,
} from 'lucide-react';
import type { Person } from '../../types/models';
import { useAppStore } from '../../store/useStore';
import { useCloudSync } from '../../contexts/CloudSyncContext';
import { formatCurrencyExact } from '../../utils/categoryStyles';
import type { PersonLedgerSummary } from '../../utils/splitLedgerEngine';
import { roundCurrency } from '../../utils/splitLedgerEngine';
import {
  buildSplitReminderMessage,
  buildUpiPaymentUri,
  buildWhatsAppShareUrl,
  isValidUpiId,
  normalizeUpiId,
} from '../../utils/upiEngine';

export interface UpiRemindModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person | null;
  summary?: PersonLedgerSummary;
  initialDirection?: 'they_pay' | 'i_pay';
  onProceedToSettle: (opts: {
    personId: string;
    direction: 'i_pay' | 'they_pay';
    amount: number;
  }) => void;
}

export function UpiRemindModal({
  isOpen,
  onClose,
  person,
  summary,
  initialDirection = 'they_pay',
  onProceedToSettle,
}: UpiRemindModalProps) {
  const myUpiId = useAppStore((s) => s.myUpiId);
  const myUpiName = useAppStore((s) => s.myUpiName);
  const setMyUpiProfile = useAppStore((s) => s.setMyUpiProfile);
  const updatePerson = useAppStore((s) => s.updatePerson);
  const { user } = useCloudSync();

  const [direction, setDirection] = useState<'they_pay' | 'i_pay'>(initialDirection);
  const [amountInput, setAmountInput] = useState('');
  const [upiInput, setUpiInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [upiSaveMsg, setUpiSaveMsg] = useState<string | null>(null);
  const [upiError, setUpiError] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'upi' | 'reminder' | null>(null);

  const lastInitKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || !person || !summary) {
      lastInitKeyRef.current = null;
      return;
    }
    const initKey = `${person.id}:${initialDirection}`;
    if (lastInitKeyRef.current === initKey) {
      return;
    }
    lastInitKeyRef.current = initKey;

    const defaultDir =
      initialDirection ??
      (summary.owedToMe >= summary.iOwe ? 'they_pay' : 'i_pay');
    setDirection(defaultDir);

    const amt = defaultDir === 'they_pay' ? summary.owedToMe : summary.iOwe;
    setAmountInput(amt > 0 ? String(roundCurrency(amt)) : '');
    setUpiInput(defaultDir === 'they_pay' ? useAppStore.getState().myUpiId : person.upiId ?? '');
    let savedNote = 'CartAudit split settlement';
    try {
      const stored = window.localStorage.getItem(`cartaudit_upi_note_${person.id}`);
      if (stored !== null) {
        savedNote = stored;
      }
    } catch {
      // Ignore storage access errors
    }
    setNoteInput(savedNote);
    setUpiSaveMsg(null);
    setUpiError(null);
    setCopiedType(null);
  }, [isOpen, person, summary, initialDirection]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const parsedAmount = roundCurrency(Number(amountInput) || 0);
  const payeeName =
    direction === 'they_pay'
      ? myUpiName || user?.displayName || 'CartAudit User'
      : person?.name || 'Friend';

  const upiResult = useMemo(
    () =>
      buildUpiPaymentUri({
        pa: upiInput,
        pn: payeeName,
        am: parsedAmount > 0 ? parsedAmount : undefined,
        tn: noteInput,
      }),
    [upiInput, payeeName, parsedAmount, noteInput]
  );

  useEffect(() => {
    let active = true;
    if (!isOpen || !upiResult.ok) {
      setQrDataUrl('');
      return;
    }

    QRCode.toDataURL(upiResult.uri, {
      width: 220,
      margin: 2,
      color: {
        dark: '#151922',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [isOpen, upiResult]);

  if (!isOpen || !person || !summary) return null;

  const unsettledItems = summary.transactions
    .filter((tx) => {
      if (tx.remainingOwed <= 0) return false;
      return direction === 'they_pay'
        ? tx.direction === 'owed_to_me'
        : tx.direction === 'i_owe';
    })
    .map((tx) => ({
      name: tx.name,
      remainingAmount: tx.remainingOwed,
    }));

  const reminderMessage = buildSplitReminderMessage({
    personName: person.name,
    amount: parsedAmount,
    direction,
    payeeUpiId: upiInput,
    payeeName,
    unsettledItems,
  });

  const whatsAppUrl = buildWhatsAppShareUrl(reminderMessage, person.contact);

  const handleDirectionSwitch = (nextDir: 'they_pay' | 'i_pay') => {
    setDirection(nextDir);
    const amt = nextDir === 'they_pay' ? summary.owedToMe : summary.iOwe;
    setAmountInput(amt > 0 ? String(roundCurrency(amt)) : '');
    setUpiInput(nextDir === 'they_pay' ? myUpiId : person.upiId ?? '');
    setUpiSaveMsg(null);
    setUpiError(null);
    setCopiedType(null);
  };

  const handleSaveUpiId = () => {
    const clean = normalizeUpiId(upiInput);
    if (!isValidUpiId(clean)) {
      setUpiError('Enter a valid UPI ID (e.g. name@okaxis or mobile@ybl).');
      setUpiSaveMsg(null);
      return;
    }
    setUpiError(null);
    if (direction === 'they_pay') {
      setMyUpiProfile(clean, myUpiName || user?.displayName || '');
      setUpiSaveMsg('Saved as your default UPI ID for split collections.');
    } else {
      updatePerson(person.id, person.name, person.contact, clean);
      setUpiSaveMsg(`Saved UPI ID for ${person.name}.`);
    }
    setUpiInput(clean);
  };

  const handleCopy = async (text: string, kind: 'upi' | 'reminder') => {
    let copied = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied && typeof document !== 'undefined') {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        copied = false;
      }
    }

    if (copied) {
      setUpiError(null);
      setCopiedType(kind);
      setTimeout(() => {
        setCopiedType((curr) => (curr === kind ? null : curr));
      }, 2200);
    } else {
      setUpiError('Clipboard access was blocked by the browser. You can copy from the text box below.');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `CartAudit Split · ${person.name}`,
          text: reminderMessage,
        });
        return;
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
      }
    }
    await handleCopy(reminderMessage, 'reminder');
  };

  const savedUpiForCurrentDir =
    direction === 'they_pay' ? myUpiId : normalizeUpiId(person.upiId);
  const hasUnsavedUpiChanges =
    normalizeUpiId(upiInput) !== savedUpiForCurrentDir && upiInput.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[var(--backdrop-scrim)] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upi-remind-modal-title"
    >
      <div className="modal-panel w-full sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 space-y-4 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary-soft)] border border-[var(--accent-border)] flex items-center justify-center shrink-0">
              <QrCode className="w-4 h-4 text-[var(--accent-ink)]" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h3
                id="upi-remind-modal-title"
                className="font-display text-base font-bold text-[var(--text-primary)] truncate"
              >
                UPI QR &amp; Split Reminder
              </h3>
              <p className="text-[12px] text-[var(--text-secondary)] truncate">
                {person.name}
                {person.contact ? ` · ${person.contact}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close UPI reminder modal"
            className="w-8 h-8 rounded-xl bg-[var(--bg-well)] hover:bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0"
          >
            <X className="w-4 h-4" strokeWidth={2.2} />
          </button>
        </div>

        {/* Direction Tabs */}
        <div
          role="group"
          aria-label="Settlement direction"
          className="grid grid-cols-2 gap-2"
        >
          <button
            type="button"
            onClick={() => handleDirectionSwitch('they_pay')}
            aria-pressed={direction === 'they_pay'}
            className={`py-2 px-3 rounded-xl text-[12.5px] font-semibold border transition-colors ${
              direction === 'they_pay'
                ? 'bg-[var(--accent-success-soft)] text-[var(--accent-success-ink)] border-[var(--accent-success-border)]'
                : 'bg-[var(--bg-well)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
            }`}
          >
            {person.name} Pays You (₹{formatCurrencyExact(summary.owedToMe)})
          </button>
          <button
            type="button"
            onClick={() => handleDirectionSwitch('i_pay')}
            aria-pressed={direction === 'i_pay'}
            className={`py-2 px-3 rounded-xl text-[12.5px] font-semibold border transition-colors ${
              direction === 'i_pay'
                ? 'bg-[var(--accent-primary-soft)] text-[var(--accent-ink)] border-[var(--accent-border)]'
                : 'bg-[var(--bg-well)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
            }`}
          >
            You Pay {person.name} (₹{formatCurrencyExact(summary.iOwe)})
          </button>
        </div>

        {/* UPI ID + Amount Inputs */}
        <div className="surface-well p-3.5 space-y-3">
          <div className="space-y-1">
            <label
              htmlFor="upi-vpa-input"
              className="block text-[12px] font-medium text-[var(--text-secondary)]"
            >
              {direction === 'they_pay'
                ? 'Your UPI ID (to receive payment)'
                : `${person.name}'s UPI ID`}
            </label>
            <div className="flex items-center gap-2">
              <input
                id="upi-vpa-input"
                type="text"
                value={upiInput}
                onChange={(e) => {
                  setUpiInput(e.target.value);
                  setUpiError(null);
                  setUpiSaveMsg(null);
                }}
                placeholder="e.g. name@okaxis or 9876543210@ybl"
                className="input-field flex-1 min-w-0 px-3 py-2 text-[12.5px] font-mono"
              />
              {hasUnsavedUpiChanges && (
                <button
                  type="button"
                  onClick={handleSaveUpiId}
                  className="btn-secondary px-3 py-2 text-[12.5px] whitespace-nowrap shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save ID</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-[var(--text-secondary)]">Amount (₹)</span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.00"
                className="input-field w-full px-3 py-2 text-[12.5px] font-mono font-bold tabular-nums"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-[var(--text-secondary)]">Payment Note</span>
              <input
                type="text"
                maxLength={60}
                value={noteInput}
                onChange={(e) => {
                  const nextNote = e.target.value;
                  setNoteInput(nextNote);
                  if (person) {
                    try {
                      window.localStorage.setItem(`cartaudit_upi_note_${person.id}`, nextNote);
                    } catch {
                      // Ignore storage access errors
                    }
                  }
                }}
                placeholder="CartAudit split settlement"
                className="input-field w-full px-3 py-2 text-[12.5px]"
              />
            </label>
          </div>

          {upiError && (
            <div
              role="alert"
              className="rounded-lg px-2.5 py-1.5 bg-[var(--accent-danger-soft)] border border-[var(--accent-danger-border)] text-[var(--accent-danger-ink)] text-[12px] flex items-center gap-1.5"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{upiError}</span>
            </div>
          )}

          {upiSaveMsg && (
            <p className="text-[12px] font-semibold text-[var(--accent-success-ink)]">{upiSaveMsg}</p>
          )}
        </div>

        {/* Scannable QR Preview */}
        <div className="flex flex-col items-center justify-center text-center surface-well p-4 space-y-2.5">
          {upiResult.ok && qrDataUrl ? (
            <>
              <div className="p-2.5 rounded-2xl qr-quiet-frame border border-[var(--border-subtle)] shadow-xs">
                <img
                  src={qrDataUrl}
                  alt={`UPI payment QR code for ${upiResult.normalizedUpiId}`}
                  width={184}
                  height={184}
                  className="w-[156px] h-[156px] sm:w-[184px] sm:h-[184px] block rounded-lg"
                />
              </div>
              <div className="space-y-0.5">
                <p className="text-[12.5px] font-bold text-[var(--text-primary)] font-mono">
                  {upiResult.normalizedUpiId}
                </p>
                <p className="text-[12px] text-[var(--text-secondary)]">
                  Scan with any UPI app (GPay, PhonePe, Paytm, BHIM)
                  {parsedAmount > 0 ? ` · ₹${formatCurrencyExact(parsedAmount)}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void handleCopy(upiResult.normalizedUpiId, 'upi')}
                  className="btn-secondary px-3 py-1.5 text-[12.5px] whitespace-nowrap"
                >
                  {copiedType === 'upi' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[var(--accent-success-ink)]" />
                      <span>Copied UPI ID</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy UPI ID</span>
                    </>
                  )}
                </button>

                {direction === 'i_pay' && (
                  <a
                    href={upiResult.uri}
                    className="btn-primary px-3 py-1.5 text-[12.5px] whitespace-nowrap"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open UPI App</span>
                  </a>
                )}
              </div>
            </>
          ) : (
            <div className="py-4 px-2 space-y-1">
              <QrCode className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                Enter a valid UPI ID above to generate a scannable QR code
              </p>
              <p className="text-[12px] text-[var(--text-secondary)]">
                {direction === 'they_pay'
                  ? 'Save your UPI ID once so every friend can scan & pay instantly.'
                  : `Add ${person.name}'s UPI ID to scan or launch your UPI app in one tap.`}
              </p>
            </div>
          )}
        </div>

        {/* Shareable Reminder Message */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">
              Shareable Reminder Message
            </span>
            <button
              type="button"
              onClick={() => void handleCopy(reminderMessage, 'reminder')}
              className="text-[12.5px] font-semibold text-[var(--accent-ink)] hover:underline inline-flex items-center gap-1"
            >
              {copiedType === 'reminder' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[var(--accent-success-ink)]" />
                  <span className="text-[var(--accent-success-ink)]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Message</span>
                </>
              )}
            </button>
          </div>
          <pre className="surface-well whitespace-pre-wrap break-words font-sans text-[12.5px] text-[var(--text-primary)] p-3 leading-relaxed">
            {reminderMessage}
          </pre>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => void handleNativeShare()}
              className="btn-secondary px-3 py-2 text-[12.5px] whitespace-nowrap"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary px-3 py-2 text-[12.5px] whitespace-nowrap"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[var(--accent-success-ink)]" />
              <span>WhatsApp</span>
            </a>
            <button
              type="button"
              disabled={parsedAmount <= 0}
              onClick={() => {
                onClose();
                onProceedToSettle({
                  personId: person.id,
                  direction,
                  amount: parsedAmount,
                });
              }}
              className="btn-primary px-3 py-2 text-[12.5px] whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{direction === 'they_pay' ? 'Mark Received' : 'Mark Paid'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

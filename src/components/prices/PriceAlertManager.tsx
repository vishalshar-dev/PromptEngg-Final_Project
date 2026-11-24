import { useState } from 'react';
import { Bell, Plus, Trash2, Check, X, Power, Pencil, BellRing } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { normalizeObservationUnit, type ProductPriceSummary } from '../../utils/priceTrackerEngine';
import { formatCurrencyExact } from '../../utils/categoryStyles';

interface PriceAlertManagerProps {
  summaries: ProductPriceSummary[];
  initialProductId?: string | null;
}

export function PriceAlertManager({ summaries, initialProductId }: PriceAlertManagerProps) {
  const items = useAppStore((s) => s.items);
  const priceAlerts = useAppStore((s) => s.priceAlerts);
  const triggeredPriceAlerts = useAppStore((s) => s.triggeredPriceAlerts);
  const addPriceAlert = useAppStore((s) => s.addPriceAlert);
  const updatePriceAlert = useAppStore((s) => s.updatePriceAlert);
  const togglePriceAlert = useAppStore((s) => s.togglePriceAlert);
  const deletePriceAlert = useAppStore((s) => s.deletePriceAlert);
  const dismissTriggeredAlert = useAppStore((s) => s.dismissTriggeredAlert);

  const productOptions = (() => {
    const map = new Map<string, { productId: string; productName: string; unit: string }>();
    for (const s of summaries) {
      map.set(s.productId, {
        productId: s.productId,
        productName: s.productName,
        unit: s.unitOfMeasurement,
      });
    }
    for (const item of items) {
      if (!map.has(item.id)) {
        const norm = normalizeObservationUnit(1, item.unit || '1 unit', item.price);
        map.set(item.id, {
          productId: item.id,
          productName: item.name,
          unit: norm.unitOfMeasurement,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.productName.localeCompare(b.productName));
  })();

  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProductId || productOptions[0]?.productId || ''
  );
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [increasePct, setIncreasePct] = useState<string>('15');
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<string>('');
  const [editIncreasePct, setEditIncreasePct] = useState<string>('');

  const selectedProduct = productOptions.find((p) => p.productId === selectedProductId) ?? productOptions[0];
  const activeTriggered = triggeredPriceAlerts.filter((t) => !t.dismissed);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!selectedProduct) {
      setFormError('Select a product to create an alert.');
      return;
    }
    const targetVal = targetPrice.trim() ? Number(targetPrice) : null;
    const pctVal = increasePct.trim() ? Number(increasePct) : null;

    if ((!targetVal || targetVal <= 0) && (!pctVal || pctVal <= 0)) {
      setFormError('Set at least a Target Unit Price or a % Increase Threshold.');
      return;
    }

    addPriceAlert({
      productId: selectedProduct.productId,
      productName: selectedProduct.productName,
      unitOfMeasurement: selectedProduct.unit,
      targetUnitPrice: targetVal && targetVal > 0 ? targetVal : null,
      increaseThresholdPct: pctVal && pctVal > 0 ? pctVal : null,
    });
    setTargetPrice('');
    setIncreasePct('15');
  };

  const handleSaveEdit = (id: string) => {
    const targetVal = editTarget.trim() ? Number(editTarget) : null;
    const pctVal = editIncreasePct.trim() ? Number(editIncreasePct) : null;
    if ((!targetVal || targetVal <= 0) && (!pctVal || pctVal <= 0)) return;
    updatePriceAlert(id, {
      targetUnitPrice: targetVal && targetVal > 0 ? targetVal : null,
      increaseThresholdPct: pctVal && pctVal > 0 ? pctVal : null,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Triggered Notifications */}
      {activeTriggered.length > 0 && (
        <div className="rounded-2xl p-4 border border-[var(--accent-warning-border)] bg-[var(--accent-warning-soft)] space-y-2.5">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-[var(--accent-warning-ink)]" strokeWidth={2.2} />
            <h4 className="text-[13px] font-bold text-[var(--accent-warning-ink)]">
              Triggered on Latest Purchases ({activeTriggered.length})
            </h4>
          </div>
          <div className="space-y-2">
            {activeTriggered.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 bg-[var(--bg-surface)] border border-[var(--accent-warning-border)] rounded-xl px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">{t.message}</p>
                  <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                    Recorded {new Date(t.triggeredAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissTriggeredAlert(t.id)}
                  aria-label="Dismiss alert notification"
                  className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-hover)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Price Alert Form */}
      <form onSubmit={handleCreate} className="surface-card p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[var(--accent-ink)]" strokeWidth={2.2} />
            <h4 className="font-display text-sm font-bold text-[var(--text-primary)]">
              Create Price Alert Rule
            </h4>
          </div>
          <span className="text-[12px] text-[var(--text-secondary)]">
            Checked on every new purchase or receipt scan
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
          <div className="sm:col-span-2">
            <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
              Product
            </label>
            <select
              value={selectedProduct?.productId ?? ''}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="input-field w-full px-3 py-2 text-[13px] font-medium min-h-[38px]"
            >
              {productOptions.map((opt) => (
                <option key={opt.productId} value={opt.productId}>
                  {opt.productName} (₹/{opt.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
              Target ≤ (₹/{selectedProduct?.unit || 'unit'})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 55"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="input-field w-full px-3 py-2 text-[13px] font-mono min-h-[38px]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
              Spike Alert (≥ %)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              placeholder="e.g. 15"
              value={increasePct}
              onChange={(e) => setIncreasePct(e.target.value)}
              className="input-field w-full px-3 py-2 text-[13px] font-mono min-h-[38px]"
            />
          </div>
        </div>

        {formError && (
          <p className="text-[12.5px] font-semibold text-[var(--accent-danger-ink)]">{formError}</p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-primary px-4 py-2 text-[13px] flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" strokeWidth={2.4} />
            Save Price Alert
          </button>
        </div>
      </form>

      {/* Configured Alerts List */}
      <div className="surface-card p-5 space-y-3">
        <h4 className="font-display text-sm font-bold text-[var(--text-primary)]">
          Configured Alerts ({priceAlerts.length})
        </h4>

        {priceAlerts.length === 0 ? (
          <p className="text-[12.5px] text-[var(--text-secondary)] py-4 text-center">
            No price alerts configured yet. Add one above to get notified when a purchase hits a target price or jumps above your threshold.
          </p>
        ) : (
          <div className="space-y-2.5">
            {priceAlerts.map((alert) => {
              const isEditing = editingId === alert.id;
              return (
                <div
                  key={alert.id}
                  className={`surface-well p-3.5 transition-opacity ${
                    alert.enabled ? '' : 'opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {alert.productName}
                        </p>
                        <span className="text-[12px] font-mono text-[var(--text-secondary)]">
                          · per {alert.unitOfMeasurement}
                        </span>
                      </div>

                      {!isEditing ? (
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-[12.5px] text-[var(--text-secondary)]">
                          {alert.targetUnitPrice != null && (
                            <span>
                              Target ≤{' '}
                              <strong className="font-mono text-[var(--accent-success-ink)]">
                                ₹{formatCurrencyExact(alert.targetUnitPrice)}/{alert.unitOfMeasurement}
                              </strong>
                            </span>
                          )}
                          {alert.increaseThresholdPct != null && (
                            <span>
                              Spike ≥{' '}
                              <strong className="font-mono text-[var(--accent-danger-ink)]">
                                +{alert.increaseThresholdPct}%
                              </strong>
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Target ₹"
                            value={editTarget}
                            onChange={(e) => setEditTarget(e.target.value)}
                            className="input-field w-24 px-2 py-1.5 text-[12.5px] font-mono"
                          />
                          <input
                            type="number"
                            step="1"
                            placeholder="Spike %"
                            value={editIncreasePct}
                            onChange={(e) => setEditIncreasePct(e.target.value)}
                            className="input-field w-24 px-2 py-1.5 text-[12.5px] font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(alert.id)}
                            className="btn-primary px-3 py-1.5 text-[12px] flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="btn-secondary px-2.5 py-1.5 text-[12px]"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {alert.lastTriggerMessage && (
                        <p className="text-[12px] text-[var(--accent-warning-ink)] mt-1 font-medium">
                          Last triggered: {alert.lastTriggerMessage}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => togglePriceAlert(alert.id)}
                        aria-label={alert.enabled ? 'Disable alert' : 'Enable alert'}
                        className={`px-2.5 py-1.5 rounded-lg text-[12px] font-semibold flex items-center gap-1 border whitespace-nowrap ${
                          alert.enabled
                            ? 'bg-[var(--accent-success-soft)] text-[var(--accent-success-ink)] border-[var(--accent-success-border)]'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        {alert.enabled ? 'Enabled' : 'Paused'}
                      </button>

                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(alert.id);
                            setEditTarget(
                              alert.targetUnitPrice != null ? String(alert.targetUnitPrice) : ''
                            );
                            setEditIncreasePct(
                              alert.increaseThresholdPct != null
                                ? String(alert.increaseThresholdPct)
                                : ''
                            );
                          }}
                          aria-label="Edit alert"
                          className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => deletePriceAlert(alert.id)}
                        aria-label="Delete alert"
                        className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:bg-[var(--accent-danger-soft)] text-[var(--text-secondary)] hover:text-[var(--accent-danger-ink)]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

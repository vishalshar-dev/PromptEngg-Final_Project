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
        <div className="rounded-2xl p-4 border border-[#F3D8A8] bg-[#FEF6E7] space-y-2.5">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-[#C7851F]" strokeWidth={2.2} />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E6614]">
              Triggered on Latest Purchases ({activeTriggered.length})
            </h4>
          </div>
          <div className="space-y-2">
            {activeTriggered.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 bg-white border border-[#F3D8A8] rounded-xl px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#151922]">{t.message}</p>
                  <p className="text-[11px] text-[#697386] mt-0.5">
                    Recorded {new Date(t.triggeredAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissTriggeredAlert(t.id)}
                  aria-label="Dismiss alert notification"
                  className="p-1 text-[#697386] hover:text-[#151922] rounded-lg hover:bg-[#F1F3F6]"
                >
                  <X className="w-3.5 h-3.5" />
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
            <Bell className="w-4 h-4 text-[#365FE8]" strokeWidth={2.2} />
            <h4 className="text-sm font-bold text-[#151922]">Create Price Alert Rule</h4>
          </div>
          <span className="text-xs text-[#697386]">
            Checked on every new purchase or receipt scan
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#697386] mb-1">
              Product
            </label>
            <select
              value={selectedProduct?.productId ?? ''}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="input-field w-full px-3 py-2 text-xs font-medium"
            >
              {productOptions.map((opt) => (
                <option key={opt.productId} value={opt.productId}>
                  {opt.productName} (₹/{opt.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#697386] mb-1">
              Target ≤ (₹/{selectedProduct?.unit || 'unit'})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 55"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="input-field w-full px-3 py-2 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#697386] mb-1">
              Spike Alert (≥ %)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              placeholder="e.g. 15"
              value={increasePct}
              onChange={(e) => setIncreasePct(e.target.value)}
              className="input-field w-full px-3 py-2 text-xs font-mono"
            />
          </div>
        </div>

        {formError && <p className="text-xs font-semibold text-[#DE5252]">{formError}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            Save Price Alert
          </button>
        </div>
      </form>

      {/* Configured Alerts List */}
      <div className="surface-card p-5 space-y-3">
        <h4 className="text-sm font-bold text-[#151922]">
          Configured Alerts ({priceAlerts.length})
        </h4>

        {priceAlerts.length === 0 ? (
          <p className="text-xs text-[#697386] py-4 text-center">
            No price alerts configured yet. Add one above to get notified when a purchase hits a target price or jumps above your threshold.
          </p>
        ) : (
          <div className="space-y-2.5">
            {priceAlerts.map((alert) => {
              const isEditing = editingId === alert.id;
              return (
                <div
                  key={alert.id}
                  className={`rounded-xl p-3.5 border transition-all ${
                    alert.enabled
                      ? 'bg-[#F7F8FA] border-[#E7EAF0]'
                      : 'bg-[#F7F8FA] border-[#E7EAF0] opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[#151922] truncate">
                          {alert.productName}
                        </p>
                        <span className="text-[11px] font-mono text-[#697386] bg-white border border-[#E7EAF0] px-1.5 py-0.5 rounded">
                          per {alert.unitOfMeasurement}
                        </span>
                      </div>

                      {!isEditing ? (
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[#697386]">
                          {alert.targetUnitPrice != null && (
                            <span>
                              Target ≤{' '}
                              <strong className="font-mono text-[#15966B]">
                                ₹{formatCurrencyExact(alert.targetUnitPrice)}/{alert.unitOfMeasurement}
                              </strong>
                            </span>
                          )}
                          {alert.increaseThresholdPct != null && (
                            <span>
                              Spike ≥{' '}
                              <strong className="font-mono text-[#DE5252]">
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
                            className="input-field w-24 px-2 py-1 text-xs font-mono"
                          />
                          <input
                            type="number"
                            step="1"
                            placeholder="Spike %"
                            value={editIncreasePct}
                            onChange={(e) => setEditIncreasePct(e.target.value)}
                            className="input-field w-24 px-2 py-1 text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(alert.id)}
                            className="btn-primary px-2.5 py-1 text-xs flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="btn-secondary px-2 py-1 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {alert.lastTriggerMessage && (
                        <p className="text-xs text-[#9E6614] mt-1 font-medium">
                          Last triggered: {alert.lastTriggerMessage}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => togglePriceAlert(alert.id)}
                        aria-label={alert.enabled ? 'Disable alert' : 'Enable alert'}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border ${
                          alert.enabled
                            ? 'bg-[#E8F7F1] text-[#15966B] border-[#B7E4D3]'
                            : 'bg-white text-[#697386] border-[#E7EAF0]'
                        }`}
                      >
                        <Power className="w-3 h-3" />
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
                          className="p-1.5 rounded-lg bg-white border border-[#E7EAF0] hover:bg-[#F1F3F6] text-[#697386] hover:text-[#151922]"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => deletePriceAlert(alert.id)}
                        aria-label="Delete alert"
                        className="p-1.5 rounded-lg bg-white border border-[#E7EAF0] hover:bg-[#FDECEC] text-[#697386] hover:text-[#DE5252]"
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

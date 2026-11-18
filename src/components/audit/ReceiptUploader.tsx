import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  ScanLine,
  Loader2,
  Check,
  Trash2,
  ShoppingBag,
  Receipt,
  Save,
  ClipboardPaste,
  AlertCircle,
  Sparkles,
  Cpu,
  TrendingUp,
} from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import {
  normalizeScannedReceipt,
  parseReceiptText,
  SAMPLE_RECEIPT_TEXT,
} from '../../utils/auditEngine';
import { buildReceiptFingerprint } from '../../utils/priceTrackerEngine';
import { formatCurrency } from '../../utils/categoryStyles';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Could not read file'));
        return;
      }
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export function ReceiptUploader() {
  const parsedReceipts = useAppStore((s) => s.parsedReceipts);
  const addParsedReceipt = useAppStore((s) => s.addParsedReceipt);
  const clearParsedReceipts = useAppStore((s) => s.clearParsedReceipts);
  const addToCart = useAppStore((s) => s.addToCart);
  const items = useAppStore((s) => s.items);
  const transactions = useAppStore((s) => s.transactions);
  const addSavedAudit = useAppStore((s) => s.addSavedAudit);
  const recordReceiptAsTransaction = useAppStore((s) => s.recordReceiptAsTransaction);

  const [savedIdx, setSavedIdx] = useState<number | null>(null);
  const [recordFeedback, setRecordFeedback] = useState<{
    idx: number;
    message: string;
    ok: boolean;
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [receiptText, setReceiptText] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lastImageFile, setLastImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseAndStoreText = useCallback(
    (rawText: string, sourceLabel?: string) => {
      const parsed = parseReceiptText(rawText, sourceLabel);
      if (parsed.items.length === 0 && parsed.total === 0) {
        setScanError(
          'Could not find priced line items in the text. Edit the receipt text below and try again.'
        );
        setReceiptText(rawText);
        setShowPasteBox(true);
        return false;
      }
      setScanError(null);
      addParsedReceipt(parsed);
      return true;
    },
    [addParsedReceipt]
  );

  const handleFile = useCallback(
    async (file: File) => {
      setScanError(null);

      if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
        const text = await file.text();
        parseAndStoreText(text, file.name.replace(/\.txt$/i, ''));
        return;
      }

      if (!file.type.startsWith('image/')) {
        setScanError('Please upload an image (PNG, JPG, WebP) or a .txt receipt.');
        return;
      }

      setLastImageFile(file);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });

      setIsScanning(true);
      setScanStatus('Analyzing receipt with Gemini Vision...');
      try {
        const imageBase64 = await fileToBase64(file);
        const res = await fetch('/api/scan-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64,
            mimeType: file.type || 'image/png',
          }),
        });

        const data = (await res.json()) as { error?: string } & Record<string, unknown>;
        if (!res.ok) {
          throw new Error(data.error || 'Failed to scan receipt.');
        }

        const normalized = normalizeScannedReceipt(data);
        if (normalized.items.length === 0 && normalized.total === 0) {
          setScanError(
            'No receipt items could be extracted from this image. Try a clearer screenshot or paste the receipt text.'
          );
          return;
        }

        addParsedReceipt(normalized);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to scan receipt image.';
        setScanError(message);
      } finally {
        setIsScanning(false);
        setScanStatus('');
      }
    },
    [addParsedReceipt, parseAndStoreText]
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const pastedItems = e.clipboardData?.items;
      if (!pastedItems) return;
      for (const item of Array.from(pastedItems)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void handleFile(file);
            return;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [handleFile]);

  const handleOfflineOcr = async () => {
    if (!lastImageFile) return;
    setScanError(null);
    setIsScanning(true);
    setScanStatus('Loading offline browser OCR...');
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setScanStatus(`Reading receipt (${Math.round(m.progress * 100)}%)...`);
          }
        },
      });
      const {
        data: { text },
      } = await worker.recognize(lastImageFile);
      await worker.terminate();

      if (!text || !text.trim()) {
        setScanError(
          'Offline OCR could not read text from this image. Paste the receipt text manually below.'
        );
        setShowPasteBox(true);
      } else {
        parseAndStoreText(text);
      }
    } catch {
      setScanError(
        'Offline browser OCR failed to load. You can still paste receipt text below.'
      );
      setShowPasteBox(true);
    } finally {
      setIsScanning(false);
      setScanStatus('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  };

  const handleParsePasted = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptText.trim()) return;
    if (parseAndStoreText(receiptText)) {
      setReceiptText('');
      setShowPasteBox(false);
    }
  };

  const handleTrySample = () => {
    setScanError(null);
    parseAndStoreText(SAMPLE_RECEIPT_TEXT);
  };

  const handleSaveAudit = (receiptIndex: number) => {
    const receipt = parsedReceipts[receiptIndex];
    const extraFees = receipt.taxTotal + receipt.deliveryFee;
    const flags = [
      ...(receipt.taxTotal > 0
        ? [
            {
              type: 'Tax',
              severity: 'warning' as const,
              message: `Tax charges of ₹${formatCurrency(receipt.taxTotal)} detected`,
              estimatedCost: receipt.taxTotal,
            },
          ]
        : []),
      ...(receipt.deliveryFee > 0
        ? [
            {
              type: 'Delivery & Handling Fee',
              severity: 'warning' as const,
              message: `Delivery & handling fees of ₹${formatCurrency(receipt.deliveryFee)} detected`,
              estimatedCost: receipt.deliveryFee,
            },
          ]
        : []),
    ];
    addSavedAudit({
      source: receipt.merchant,
      subtotal: receipt.subtotal,
      extraFees,
      total: receipt.total,
      flags,
    });
    setSavedIdx(receiptIndex);
    setTimeout(() => setSavedIdx(null), 2000);
  };

  const handleImportItem = (name: string, price: number) => {
    const existing = items.find((i) => i.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      addToCart(existing);
    } else {
      addToCart({
        id: crypto.randomUUID(),
        name: name.substring(0, 30),
        price: Math.round(price),
        category: 'Groceries',
        icon: 'shopping-bag',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#EDF2FF] border border-[#D4E0FF] text-[#365FE8] flex items-center justify-center">
            <ScanLine className="w-4 h-4" strokeWidth={2.25} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-[#151922] tracking-tight">
              Receipt Vision Scanner
            </h3>
            <p className="text-xs text-[#697386]">
              Upload screenshot or paste text to extract items and hidden fees
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleTrySample}
            className="text-xs font-semibold text-[#365FE8] hover:text-[#294FCC] bg-[#EDF2FF] hover:bg-[#DFE8FF] px-2.5 py-1.5 rounded-lg border border-[#D4E0FF] transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" strokeWidth={2.25} />
            Sample
          </button>
          <button
            type="button"
            onClick={() => setShowPasteBox(!showPasteBox)}
            className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${
              showPasteBox
                ? 'bg-[#365FE8] text-white border-[#365FE8]'
                : 'bg-[#FFFFFF] text-[#697386] hover:text-[#151922] border-[#E7EAF0] hover:bg-[#F7F8FA]'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" strokeWidth={2.25} />
            Paste Text
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <button
        type="button"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
          dragOver
            ? 'border-[#365FE8] bg-[#EDF2FF]'
            : 'border-[#D5DBE6] hover:border-[#365FE8] bg-[#F7F8FA] hover:bg-[#F1F5FF]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          aria-label="Upload receipt image or text file"
          accept="image/*,.txt,text/plain"
          onChange={handleSelect}
          className="hidden"
        />
        {isScanning ? (
          <div className="flex flex-col items-center gap-2.5">
            <div className="relative">
              <Loader2 className="w-10 h-10 text-[#365FE8] animate-spin" strokeWidth={2} />
              <ScanLine
                className="w-4 h-4 text-[#365FE8] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                strokeWidth={2.5}
              />
            </div>
            <p className="text-sm font-bold text-[#365FE8]">Scanning receipt...</p>
            <p className="text-xs text-[#697386]">
              {scanStatus || 'Extracting items, taxes & fees'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Uploaded receipt preview"
                className="w-16 h-16 object-cover rounded-xl border border-[#E7EAF0]"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-[#EDF2FF] border border-[#D4E0FF] flex items-center justify-center">
                <Upload className="w-5 h-5 text-[#365FE8]" strokeWidth={2.25} />
              </div>
            )}
            <p className="text-sm font-bold text-[#151922]">
              Upload or paste (Ctrl+V) receipt screenshot
            </p>
            <p className="text-xs text-[#697386]">
              AI Vision extraction · PNG, JPG, WebP, or TXT
            </p>
          </div>
        )}
      </button>

      {/* Paste / Edit Receipt Text */}
      {showPasteBox && (
        <form onSubmit={handleParsePasted} className="space-y-2.5">
          <textarea
            aria-label="Paste receipt text"
            rows={5}
            value={receiptText}
            onChange={(e) => setReceiptText(e.target.value)}
            placeholder={`Paste receipt text here, e.g.\nBlinkit\nAmul Milk 500ml   ₹27\nHandling Charge   ₹15\nGST               ₹5`}
            className="input-field w-full p-3 text-xs font-mono"
          />
          <button
            type="submit"
            disabled={!receiptText.trim()}
            className="btn-primary w-full py-2.5 text-xs"
          >
            Parse Receipt Text
          </button>
        </form>
      )}

      {/* Error Banner */}
      {scanError && (
        <div
          role="alert"
          className="rounded-xl p-3.5 bg-[#FEF6E7] border border-[#F3D8A8] space-y-2.5"
        >
          <div className="flex items-start gap-2">
            <AlertCircle
              className="w-4 h-4 text-[#9E6614] shrink-0 mt-0.5"
              strokeWidth={2.25}
            />
            <p className="text-xs text-[#7D4F0C] leading-relaxed">{scanError}</p>
          </div>
          {lastImageFile && !isScanning && (
            <button
              type="button"
              onClick={handleOfflineOcr}
              className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5"
            >
              <Cpu className="w-3.5 h-3.5" strokeWidth={2.25} />
              Try Offline Browser OCR Instead
            </button>
          )}
        </div>
      )}

      {/* Parsed Receipts */}
      {parsedReceipts.length > 0 && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#697386] uppercase tracking-wider">
              {parsedReceipts.length} parsed receipt{parsedReceipts.length > 1 ? 's' : ''}
            </p>
            <button
              type="button"
              onClick={clearParsedReceipts}
              className="text-xs font-semibold text-[#697386] hover:text-[#DE5252] transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={2.25} />
              Clear
            </button>
          </div>

          {parsedReceipts.map((receipt, idx) => (
            <div key={idx} className="surface-subtle p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#FFFFFF] border border-[#E7EAF0] text-[#365FE8] flex items-center justify-center shrink-0">
                    <Receipt className="w-4 h-4" strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#151922] truncate">
                      {receipt.merchant}
                    </p>
                    <p className="text-[11px] text-[#697386] font-medium">
                      {new Date(receipt.date).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#697386]">
                    Total
                  </p>
                  <p className="text-base font-bold font-mono tabular-nums text-[#151922]">
                    ₹{formatCurrency(receipt.total)}
                  </p>
                </div>
              </div>

              {/* Parsed Items */}
              <div className="bg-[#FFFFFF] rounded-xl border border-[#E7EAF0] p-3 space-y-1.5">
                {receipt.items.map((item, iIdx) => (
                  <div key={iIdx} className="flex items-center justify-between text-xs gap-2">
                    <span className="text-[#151922] truncate font-medium">{item.name}</span>
                    <span className="text-[#697386] font-mono tabular-nums shrink-0">
                      ₹{formatCurrency(item.price)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Summary Bar */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#FFFFFF] rounded-lg border border-[#E7EAF0] p-2 text-center">
                  <p className="text-[10px] font-semibold uppercase text-[#697386]">
                    Subtotal
                  </p>
                  <p className="text-xs font-bold text-[#151922] font-mono tabular-nums mt-0.5">
                    ₹{formatCurrency(receipt.subtotal)}
                  </p>
                </div>
                <div className="bg-[#FFFFFF] rounded-lg border border-[#E7EAF0] p-2 text-center">
                  <p className="text-[10px] font-semibold uppercase text-[#697386]">Tax</p>
                  <p className="text-xs font-bold text-[#9E6614] font-mono tabular-nums mt-0.5">
                    ₹{formatCurrency(receipt.taxTotal)}
                  </p>
                </div>
                <div className="bg-[#FFFFFF] rounded-lg border border-[#E7EAF0] p-2 text-center">
                  <p className="text-[10px] font-semibold uppercase text-[#697386]">Fees</p>
                  <p className="text-xs font-bold text-[#DE5252] font-mono tabular-nums mt-0.5">
                    ₹{formatCurrency(receipt.deliveryFee)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              {(() => {
                const fp = buildReceiptFingerprint(receipt);
                const alreadyRecorded = transactions.some(
                  (tx) => tx.receiptFingerprint === fp && tx.status !== 'cancelled'
                );
                return (
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={alreadyRecorded || receipt.items.length === 0}
                      onClick={() => {
                        const res = recordReceiptAsTransaction(receipt);
                        setRecordFeedback({
                          idx,
                          ok: res.ok,
                          message: res.ok
                            ? `Recorded ₹${formatCurrency(receipt.total)} transaction & ${
                                res.observationsCount ?? 0
                              } price points${
                                res.triggeredAlertsCount
                                  ? ` (${res.triggeredAlertsCount} alert${
                                      res.triggeredAlertsCount > 1 ? 's' : ''
                                    } triggered!)`
                                  : ''
                              }`
                            : res.error || 'Already recorded',
                        });
                      }}
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border ${
                        alreadyRecorded
                          ? 'bg-[#E8F7F1] text-[#15966B] border-[#B7E4D3] cursor-default'
                          : 'bg-[#365FE8] hover:bg-[#294FCC] text-white border-[#365FE8]'
                      }`}
                    >
                      {alreadyRecorded ? (
                        <>
                          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                          Recorded to Ledger &amp; Price History
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-3.5 h-3.5" strokeWidth={2.25} />
                          Record Expense &amp; Track Prices
                        </>
                      )}
                    </button>

                    {recordFeedback?.idx === idx && (
                      <p
                        className={`text-xs font-semibold px-1 ${
                          recordFeedback.ok ? 'text-[#15966B]' : 'text-[#9E6614]'
                        }`}
                      >
                        {recordFeedback.message}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={receipt.items.length === 0}
                        onClick={() =>
                          receipt.items.forEach((item) =>
                            handleImportItem(item.name, item.price)
                          )
                        }
                        className="btn-secondary flex-1 py-2 px-3 text-xs flex items-center justify-center gap-1.5"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" strokeWidth={2.25} />
                        Import to cart
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveAudit(idx)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border ${
                          savedIdx === idx
                            ? 'bg-[#E8F7F1] text-[#15966B] border-[#B7E4D3]'
                            : 'bg-[#FFFFFF] hover:bg-[#F7F8FA] text-[#151922] border-[#E7EAF0]'
                        }`}
                      >
                        {savedIdx === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Saved
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" strokeWidth={2.25} /> Save
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

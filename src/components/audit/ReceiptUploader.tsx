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
} from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import {
  normalizeScannedReceipt,
  parseReceiptText,
  SAMPLE_RECEIPT_TEXT,
} from '../../utils/auditEngine';
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
  const addSavedAudit = useAppStore((s) => s.addSavedAudit);

  const [savedIdx, setSavedIdx] = useState<number | null>(null);
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

  // Support Ctrl+V / Cmd+V screenshot paste anywhere while ReceiptUploader is mounted
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
        icon: '🛒',
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ScanLine className="w-4 h-4 text-brand-400" strokeWidth={2.5} />
          <h3 className="text-sm font-extrabold tracking-tight">Receipt Vision Scanner</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleTrySample}
            className="text-[10px] font-bold text-brand-400/80 hover:text-brand-400 bg-brand-500/10 hover:bg-brand-500/15 px-2 py-1 rounded-md border border-brand-500/20 transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" strokeWidth={2.5} />
            Sample
          </button>
          <button
            type="button"
            onClick={() => setShowPasteBox(!showPasteBox)}
            className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-colors flex items-center gap-1 ${
              showPasteBox
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-white/[0.04] text-zinc-400 hover:text-white border-white/[0.06]'
            }`}
          >
            <ClipboardPaste className="w-3 h-3" strokeWidth={2.5} />
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
        className={`w-full cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-300 ${
          dragOver
            ? 'border-brand-500/50 bg-brand-500/5 scale-[1.01]'
            : 'border-white/[0.08] hover:border-brand-500/30 bg-white/[0.02]'
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
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Loader2 className="w-10 h-10 text-brand-400 animate-spin" strokeWidth={2} />
              <ScanLine
                className="w-5 h-5 text-brand-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                strokeWidth={2.5}
              />
            </div>
            <p className="text-sm font-bold text-brand-400">Scanning receipt...</p>
            <p className="text-[11px] text-zinc-500">
              {scanStatus || 'Extracting items, taxes & fees'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Uploaded receipt preview"
                className="w-16 h-16 object-cover rounded-xl border border-white/10"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                <Upload className="w-6 h-6 text-brand-400" strokeWidth={2} />
              </div>
            )}
            <p className="text-sm font-bold text-zinc-200">
              Upload or paste (Ctrl+V) receipt screenshot
            </p>
            <p className="text-[11px] text-zinc-500">
              AI Vision extraction · PNG, JPG, WebP, or TXT
            </p>
          </div>
        )}
      </button>

      {/* Paste / Edit Receipt Text */}
      {showPasteBox && (
        <form onSubmit={handleParsePasted} className="space-y-2 animate-scale-in">
          <textarea
            aria-label="Paste receipt text"
            rows={5}
            value={receiptText}
            onChange={(e) => setReceiptText(e.target.value)}
            placeholder={`Paste receipt text here, e.g.\nBlinkit\nAmul Milk 500ml   ₹27\nHandling Charge   ₹15\nGST               ₹5`}
            className="w-full bg-ink-900 border border-white/[0.08] rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-brand-500/40 transition-colors placeholder:text-zinc-600"
          />
          <button
            type="submit"
            disabled={!receiptText.trim()}
            className="w-full bg-brand-500 hover:bg-brand-400 disabled:bg-white/[0.04] disabled:text-zinc-600 text-ink-950 py-2.5 rounded-xl text-xs font-extrabold transition-all"
          >
            Parse Receipt Text
          </button>
        </form>
      )}

      {/* Error Banner */}
      {scanError && (
        <div
          role="alert"
          className="rounded-xl p-3 bg-orange-500/10 border border-orange-500/20 space-y-2 animate-fade-in"
        >
          <div className="flex items-start gap-2">
            <AlertCircle
              className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5"
              strokeWidth={2.5}
            />
            <p className="text-[11px] text-orange-200 leading-relaxed">{scanError}</p>
          </div>
          {lastImageFile && !isScanning && (
            <button
              type="button"
              onClick={handleOfflineOcr}
              className="w-full bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 py-2 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5 border border-white/[0.08]"
            >
              <Cpu className="w-3.5 h-3.5" strokeWidth={2.5} />
              Try Offline Browser OCR Instead
            </button>
          )}
        </div>
      )}

      {/* Parsed Receipts */}
      {parsedReceipts.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              {parsedReceipts.length} parsed receipt{parsedReceipts.length > 1 ? 's' : ''}
            </p>
            <button
              type="button"
              onClick={clearParsedReceipts}
              className="text-[11px] font-bold text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" strokeWidth={2.5} />
              Clear
            </button>
          </div>

          {parsedReceipts.map((receipt, idx) => (
            <div key={idx} className="glass rounded-xl p-3.5 animate-fade-in-up">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-brand-400" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{receipt.merchant}</p>
                    <p className="text-[10px] text-zinc-500 font-medium">
                      {new Date(receipt.date).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                    Total
                  </p>
                  <p className="text-sm font-extrabold font-mono tabular-nums text-white">
                    ₹{formatCurrency(receipt.total)}
                  </p>
                </div>
              </div>

              {/* Parsed Items */}
              <div className="space-y-1.5 mb-3">
                {receipt.items.map((item, iIdx) => (
                  <div key={iIdx} className="flex items-center justify-between text-xs gap-2">
                    <span className="text-zinc-300 truncate font-medium">{item.name}</span>
                    <span className="text-zinc-400 font-mono flex-shrink-0">
                      ₹{formatCurrency(item.price)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Summary Bar */}
              <div className="grid grid-cols-3 gap-1.5 mb-3 pt-2 border-t border-white/[0.06]">
                <div className="text-center">
                  <p className="text-[8px] font-bold uppercase text-zinc-600">Subtotal</p>
                  <p className="text-xs font-bold text-zinc-300 font-mono">
                    ₹{formatCurrency(receipt.subtotal)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-bold uppercase text-zinc-600">Tax</p>
                  <p className="text-xs font-bold text-orange-400 font-mono">
                    ₹{formatCurrency(receipt.taxTotal)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-bold uppercase text-zinc-600">Fees</p>
                  <p className="text-xs font-bold text-red-400 font-mono">
                    ₹{formatCurrency(receipt.deliveryFee)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={receipt.items.length === 0}
                  onClick={() =>
                    receipt.items.forEach((item) => handleImportItem(item.name, item.price))
                  }
                  className="flex-1 bg-white/[0.04] hover:bg-brand-500/15 disabled:opacity-40 text-zinc-300 hover:text-brand-400 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-white/[0.06] hover:border-brand-500/30"
                >
                  <ShoppingBag className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Import to cart
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAudit(idx)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                    savedIdx === idx
                      ? 'bg-brand-500/20 text-brand-400 border-brand-500/30'
                      : 'bg-white/[0.04] hover:bg-brand-500/15 text-zinc-300 hover:text-brand-400 border-white/[0.06] hover:border-brand-500/30'
                  }`}
                >
                  {savedIdx === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Saved
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" strokeWidth={2.5} /> Save
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

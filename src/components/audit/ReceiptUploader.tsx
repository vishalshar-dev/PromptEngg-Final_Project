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
  Plus,
  X,
} from 'lucide-react';
import { useAppStore, type ParsedReceiptItem } from '../../store/useStore';
import {
  enrichReceiptWithCatalog,
  normalizeScannedReceipt,
  parseReceiptText,
  SAMPLE_RECEIPT_TEXT,
} from '../../utils/auditEngine';
import {
  buildReceiptFingerprint,
  extractProductInfo,
  inferCategoryFromName,
  resolveCanonicalProduct,
} from '../../utils/priceTrackerEngine';
import { formatCurrency } from '../../utils/categoryStyles';
import {
  fetchGeminiHealth,
  getCachedAiConfigured,
} from '../../utils/aiReadiness';
import {
  enqueueAiPost,
  getLiveAiAvailability,
} from '../../utils/aiClient';

function fileToBase64(file: Blob): Promise<string> {
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

async function prepareReceiptImage(
  file: File
): Promise<{ blob: Blob; mimeType: string }> {
  // Fast path: already lightweight standard image
  if (file.size <= 300 * 1024 && /image\/(jpeg|jpg|webp|png)/.test(file.type)) {
    return { blob: file, mimeType: file.type === 'image/jpg' ? 'image/jpeg' : file.type };
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const maxDim = 1600;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve({ blob: file, mimeType: file.type || 'image/png' });
          return;
        }

        // Fill white background in case PNG has transparent pixels
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (compressed) => {
            URL.revokeObjectURL(objectUrl);
            if (compressed && compressed.size > 0) {
              resolve({ blob: compressed, mimeType: 'image/jpeg' });
            } else {
              resolve({ blob: file, mimeType: file.type || 'image/png' });
            }
          },
          'image/jpeg',
          0.88
        );
      } catch {
        URL.revokeObjectURL(objectUrl);
        resolve({ blob: file, mimeType: file.type || 'image/png' });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ blob: file, mimeType: file.type || 'image/png' });
    };
    img.src = objectUrl;
  });
}

export function ReceiptUploader() {
  const parsedReceipts = useAppStore((s) => s.parsedReceipts);
  const addParsedReceipt = useAppStore((s) => s.addParsedReceipt);
  const updateParsedReceipt = useAppStore((s) => s.updateParsedReceipt);
  const clearParsedReceipts = useAppStore((s) => s.clearParsedReceipts);
  const addToCart = useAppStore((s) => s.addToCart);
  const items = useAppStore((s) => s.items);
  const transactions = useAppStore((s) => s.transactions);
  const priceObservations = useAppStore((s) => s.priceObservations);
  const categories = useAppStore((s) => s.categories);
  const addCategoryConfig = useAppStore((s) => s.addCategoryConfig);
  const addSavedAudit = useAppStore((s) => s.addSavedAudit);
  const recordReceiptAsTransaction = useAppStore((s) => s.recordReceiptAsTransaction);

  const [savedIdx, setSavedIdx] = useState<number | null>(null);
  const [importedIdx, setImportedIdx] = useState<number | null>(null);
  const [recordFeedback, setRecordFeedback] = useState<{
    idx: number;
    message: string;
    ok: boolean;
  } | null>(null);
  const [saveNewToCatalog, setSaveNewToCatalog] = useState<Record<number, boolean>>({});
  const [creatingCatForKey, setCreatingCatForKey] = useState<string | null>(null);
  const [newCategoryDraft, setNewCategoryDraft] = useState('');
  const [addingItemForReceipt, setAddingItemForReceipt] = useState<number | null>(null);
  const [draftItemName, setDraftItemName] = useState('');
  const [draftItemPrice, setDraftItemPrice] = useState('');
  const [draftItemCategory, setDraftItemCategory] = useState('Other Expenses');
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [receiptText, setReceiptText] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lastImageFile, setLastImageFile] = useState<File | null>(null);
  const [aiVisionConfigured, setAiVisionConfigured] = useState<boolean | null>(() =>
    getCachedAiConfigured()
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void fetchGeminiHealth(true).then((status) => {
      if (active) setAiVisionConfigured(status.visionConfigured);
    });
    return () => {
      active = false;
    };
  }, []);

  const ensureVisionConfigured = useCallback(async (): Promise<boolean> => {
    if (aiVisionConfigured === true) return true;
    const status = await fetchGeminiHealth(true);
    setAiVisionConfigured(status.visionConfigured);
    return status.visionConfigured;
  }, [aiVisionConfigured]);

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
      const state = useAppStore.getState();
      const enriched = enrichReceiptWithCatalog(
        parsed,
        state.items,
        state.priceObservations,
        state.categories
      );
      addParsedReceipt(enriched);
      return true;
    },
    [addParsedReceipt]
  );

  const runOfflineOcrOnFile = useCallback(
    async (file: File, fallbackReason?: string): Promise<boolean> => {
      setScanStatus(
        fallbackReason
          ? `${fallbackReason} Reading offline with browser OCR...`
          : 'Loading offline browser OCR...'
      );
      try {
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('eng', 1, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setScanStatus(`Reading receipt offline (${Math.round(m.progress * 100)}%)...`);
            }
          },
        });
        const {
          data: { text },
        } = await worker.recognize(file);
        await worker.terminate();

        if (!text || !text.trim()) {
          setScanError(
            'Could not read text from this image. Try a clearer receipt screenshot or paste the receipt text below.'
          );
          setShowPasteBox(true);
          return false;
        }

        const ok = parseAndStoreText(text);
        if (ok && fallbackReason) {
          setScanNotice('AI Vision is temporarily busy — parsed offline with browser OCR.');
        }
        return ok;
      } catch {
        setScanError(
          fallbackReason
            ? `${fallbackReason} Offline OCR also failed — please paste receipt text below.`
            : 'Offline browser OCR failed to load. You can paste receipt text below.'
        );
        setShowPasteBox(true);
        return false;
      }
    },
    [parseAndStoreText]
  );

  const handleFile = useCallback(
    async (file: File) => {
      setScanError(null);
      setScanNotice(null);

      if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
        const text = await file.text();
        parseAndStoreText(text, file.name.replace(/\.txt$/i, ''));
        return;
      }

      if (!file.type.startsWith('image/')) {
        setScanError('Please upload an image (PNG, JPG, WebP) or a .txt receipt.');
        return;
      }

      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });

      setIsScanning(true);
      setScanStatus('Checking scanner mode & preparing image...');
      let scanFile: File = file;
      try {
        const prepared = await prepareReceiptImage(file);
        scanFile =
          prepared.blob instanceof File
            ? prepared.blob
            : new File([prepared.blob], 'receipt.jpg', { type: prepared.mimeType });
        setLastImageFile(scanFile);

        const aiReady = await ensureVisionConfigured();
        const avail = getLiveAiAvailability();
        if (!aiReady || avail.mode !== 'live') {
          await runOfflineOcrOnFile(
            scanFile,
            avail.mode !== 'live'
              ? 'Servers are temporarily busy — switched to offline browser OCR.'
              : 'Live AI Vision is temporarily unavailable — using offline browser OCR.'
          );
          return;
        }

        setScanStatus('Scanning receipt with AI Vision...');
        const imageBase64 = await fileToBase64(prepared.blob);
        const result = await enqueueAiPost<Record<string, unknown>>(
          '/api/scan-receipt',
          {
            imageBase64,
            mimeType: prepared.mimeType,
          },
          { timeoutMs: 28_000 }
        );

        if (!result.ok) {
          if (result.transient || result.status === 403) {
            setAiVisionConfigured(false);
            await runOfflineOcrOnFile(
              scanFile,
              'Servers are temporarily busy — switched to offline browser OCR.'
            );
            return;
          }
          throw new Error(result.error || 'AI Vision is temporarily unavailable.');
        }

        const normalized = normalizeScannedReceipt(result.data);
        if (normalized.items.length === 0 && normalized.total === 0) {
          await runOfflineOcrOnFile(
            scanFile,
            'AI Vision found no legible line items.'
          );
          return;
        }

        const state = useAppStore.getState();
        const enriched = enrichReceiptWithCatalog(
          normalized,
          state.items,
          state.priceObservations,
          state.categories
        );
        addParsedReceipt(enriched);
      } catch (err) {
        setLastImageFile(scanFile);
        const isAbort = err instanceof DOMException && err.name === 'AbortError';
        const rawMsg = isAbort
          ? 'AI Vision timed out.'
          : err instanceof Error
            ? err.message
            : 'AI Vision is unavailable.';
        const shouldAutoFallback =
          isAbort ||
          /high demand|unavailable|503|504|429|timeout|not set|failed to fetch/i.test(rawMsg);

        if (shouldAutoFallback) {
          await runOfflineOcrOnFile(scanFile, 'Servers are temporarily busy — using offline OCR.');
        } else {
          setScanError(rawMsg);
        }
      } finally {
        setIsScanning(false);
        setScanStatus('');
      }
    },
    [addParsedReceipt, ensureVisionConfigured, parseAndStoreText, runOfflineOcrOnFile]
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
    setScanNotice(null);
    setIsScanning(true);
    try {
      await runOfflineOcrOnFile(lastImageFile);
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

  const handleItemCategoryChange = (
    receiptIndex: number,
    itemIndex: number,
    newCategory: string
  ) => {
    const receipt = parsedReceipts[receiptIndex];
    if (!receipt) return;
    const base = receipt.items.some((i) => !i.category || i.isNewCatalogItem === undefined)
      ? enrichReceiptWithCatalog(receipt, items, priceObservations, categories)
      : receipt;
    const nextItems = base.items.map((it, i) =>
      i === itemIndex ? { ...it, category: newCategory } : it
    );
    updateParsedReceipt(receiptIndex, { ...base, items: nextItems });
  };

  const handleConfirmNewCategory = (receiptIndex: number, itemIndex: number) => {
    const trimmed = newCategoryDraft.trim();
    if (!trimmed) return;
    const created = addCategoryConfig({ name: trimmed });
    const resolvedName = created?.name ?? trimmed;
    handleItemCategoryChange(receiptIndex, itemIndex, resolvedName);
    setCreatingCatForKey(null);
    setNewCategoryDraft('');
  };

  const handleRemoveParsedItem = (receiptIndex: number, itemIndex: number) => {
    const receipt = parsedReceipts[receiptIndex];
    if (!receipt) return;
    const nextItems = receipt.items.filter((_, i) => i !== itemIndex);
    const nextSubtotal = Math.round(nextItems.reduce((s, it) => s + it.price, 0) * 100) / 100;
    const nextTotal =
      Math.round((nextSubtotal + receipt.taxTotal + receipt.deliveryFee) * 100) / 100;
    updateParsedReceipt(receiptIndex, {
      ...receipt,
      items: nextItems,
      subtotal: nextSubtotal,
      total: nextTotal,
    });
  };

  const handleReceiptMetaChange = (
    receiptIndex: number,
    patch: { merchant?: string; taxTotal?: number; deliveryFee?: number }
  ) => {
    const receipt = parsedReceipts[receiptIndex];
    if (!receipt) return;
    const nextMerchant =
      patch.merchant !== undefined ? patch.merchant : receipt.merchant;
    const nextTax =
      patch.taxTotal !== undefined
        ? Math.max(0, Math.round(patch.taxTotal * 100) / 100)
        : receipt.taxTotal;
    const nextFee =
      patch.deliveryFee !== undefined
        ? Math.max(0, Math.round(patch.deliveryFee * 100) / 100)
        : receipt.deliveryFee;
    const nextTotal =
      Math.round((receipt.subtotal + nextTax + nextFee) * 100) / 100;
    updateParsedReceipt(receiptIndex, {
      ...receipt,
      merchant: nextMerchant,
      taxTotal: nextTax,
      deliveryFee: nextFee,
      total: nextTotal,
    });
  };

  const handleAddMissingItem = (receiptIndex: number) => {
    const receipt = parsedReceipts[receiptIndex];
    const cleanName = draftItemName.trim();
    const parsedPrice = Number(draftItemPrice);
    if (!receipt || !cleanName || !Number.isFinite(parsedPrice) || parsedPrice <= 0) return;

    const info = extractProductInfo(cleanName);
    const newItem: ParsedReceiptItem = {
      name: cleanName,
      price: Math.round(parsedPrice * 100) / 100,
      category: draftItemCategory || inferCategoryFromName(cleanName, 'Other Expenses'),
      unit: info.packageSize !== '1 unit' ? info.packageSize : undefined,
      brand: info.brand,
    };

    const nextItems = [...receipt.items, newItem];
    const nextSubtotal = Math.round(nextItems.reduce((s, it) => s + it.price, 0) * 100) / 100;
    const nextTotal =
      Math.round((nextSubtotal + receipt.taxTotal + receipt.deliveryFee) * 100) / 100;

    const enriched = enrichReceiptWithCatalog(
      { ...receipt, items: nextItems, subtotal: nextSubtotal, total: nextTotal },
      items,
      priceObservations,
      categories
    );
    updateParsedReceipt(receiptIndex, enriched);
    setAddingItemForReceipt(null);
    setDraftItemName('');
    setDraftItemPrice('');
  };

  const handleImportItem = (item: ParsedReceiptItem) => {
    const resolved = resolveCanonicalProduct(item.name, items, priceObservations, {
      explicitProductId: item.matchedProductId,
      explicitCategory: item.category,
      explicitBrand: item.brand,
      explicitPackageSize: item.unit,
    });
    const existing =
      (item.matchedProductId
        ? items.find((i) => i.id === item.matchedProductId)
        : undefined) ??
      (resolved.matchedExisting ? items.find((i) => i.id === resolved.productId) : undefined);

    if (existing) {
      addToCart(existing, 1, existing.selectedVariantId ?? existing.variants?.[0]?.id);
      return;
    }

    const info = extractProductInfo(item.name, item.brand, item.unit);
    const chosenCat =
      item.category?.trim() || inferCategoryFromName(item.name, 'Other Expenses');
    addCategoryConfig({ name: chosenCat });
    addToCart({
      id: crypto.randomUUID(),
      name: (info.cleanName || item.name.trim()).slice(0, 60),
      price: Math.round(item.price * 100) / 100,
      category: chosenCat,
      unit: item.unit || (info.packageSize !== '1 unit' ? info.packageSize : '1 unit'),
      brand: item.brand || info.brand,
      icon: 'shopping-bag',
      isCustom: true,
    });
  };

  const handleImportReceiptToCart = (receiptIndex: number) => {
    const receipt = parsedReceipts[receiptIndex];
    if (!receipt || receipt.items.length === 0) return;
    const base = receipt.items.some((i) => !i.category || i.isNewCatalogItem === undefined)
      ? enrichReceiptWithCatalog(receipt, items, priceObservations, categories)
      : receipt;
    base.items.forEach((item) => handleImportItem(item));
    setImportedIdx(receiptIndex);
    setTimeout(() => setImportedIdx(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary-soft)] border border-[var(--accent-border)] text-[var(--accent-ink)] flex items-center justify-center">
            <ScanLine className="w-4 h-4" strokeWidth={2.25} />
          </div>
          <div>
            <h3 className="font-display text-[15px] font-bold text-[var(--text-primary)] tracking-tight">
              Receipt Vision Scanner
            </h3>
            <p className="text-[12px] text-[var(--text-secondary)]">
              Upload screenshot or paste text to extract items and hidden fees
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleTrySample}
            className="text-[12px] font-semibold text-[var(--accent-ink)] bg-[var(--accent-primary-soft)] hover:bg-[var(--accent-primary-soft-hover)] px-2.5 py-1.5 rounded-lg border border-[var(--accent-border)] transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" strokeWidth={2.25} />
            Sample
          </button>
          <button
            type="button"
            onClick={() => setShowPasteBox(!showPasteBox)}
            className={`text-[12px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${
              showPasteBox
                ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" strokeWidth={2.25} />
            Paste Text
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <input
        ref={fileInputRef}
        type="file"
        aria-label="Upload receipt image or text file"
        accept="image/*,.txt,text/plain"
        onChange={handleSelect}
        className="hidden"
      />
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
            ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-soft)]'
            : 'border-[var(--border-strong)] hover:border-[var(--accent-primary)] bg-[var(--bg-well)] hover:bg-[var(--bg-subtle)]'
        }`}
      >
        {isScanning ? (
          <div className="flex flex-col items-center gap-2.5">
            <div className="relative">
              <Loader2 className="w-10 h-10 text-[var(--accent-ink)] animate-spin" strokeWidth={2} />
              <ScanLine
                className="w-4 h-4 text-[var(--accent-ink)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                strokeWidth={2.5}
              />
            </div>
            <p className="text-sm font-bold text-[var(--accent-ink)]">Scanning receipt...</p>
            <p className="text-[12px] text-[var(--text-secondary)]">
              {scanStatus || 'Extracting items, taxes & fees'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Uploaded receipt preview"
                className="w-16 h-16 object-cover rounded-xl border border-[var(--border-subtle)]"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary-soft)] border border-[var(--accent-border)] flex items-center justify-center">
                <Upload className="w-5 h-5 text-[var(--accent-ink)]" strokeWidth={2.25} />
              </div>
            )}
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Upload or paste (Ctrl+V) receipt screenshot
            </p>
            <p className="text-[12px] text-[var(--text-secondary)]" data-testid="scanner-ai-mode">
              {aiVisionConfigured === false
                ? 'Offline Browser OCR + Text Parse ready'
                : 'AI Vision extraction · PNG, JPG, WebP, or TXT'}
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
            className="input-field w-full p-3 text-[12.5px] font-mono"
          />
          <button
            type="submit"
            disabled={!receiptText.trim()}
            className="btn-primary w-full py-2.5 text-[12.5px]"
          >
            Parse Receipt Text
          </button>
        </form>
      )}

      {/* Notice Banner (e.g. offline OCR fallback info) */}
      {scanNotice && !scanError && (
        <div className="rounded-xl px-3.5 py-2.5 bg-[var(--accent-primary-soft)] border border-[var(--accent-border)] text-[12px] font-medium text-[var(--accent-ink)]">
          {scanNotice}
        </div>
      )}

      {/* Error Banner */}
      {scanError && (
        <div
          role="alert"
          className="rounded-xl p-3.5 bg-[var(--accent-warning-soft)] border border-[var(--accent-warning-border)] space-y-2.5"
        >
          <div className="flex items-start gap-2">
            <AlertCircle
              className="w-4 h-4 text-[var(--accent-warning-ink)] shrink-0 mt-0.5"
              strokeWidth={2.25}
            />
            <p className="text-[12px] text-[var(--accent-warning-ink)] leading-relaxed">{scanError}</p>
          </div>
          {lastImageFile && !isScanning && (
            <button
              type="button"
              onClick={handleOfflineOcr}
              className="btn-secondary w-full py-2 text-[12.5px] flex items-center justify-center gap-1.5"
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
            <p className="text-[12px] font-semibold text-[var(--text-secondary)]">
              {parsedReceipts.length} parsed receipt{parsedReceipts.length > 1 ? 's' : ''}
            </p>
            <button
              type="button"
              onClick={clearParsedReceipts}
              className="text-[12px] font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-danger-ink)] transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={2.25} />
              Clear
            </button>
          </div>

          {parsedReceipts.map((rawReceipt, idx) => {
            const receipt = rawReceipt.items.some(
              (i) => !i.category || i.isNewCatalogItem === undefined
            )
              ? enrichReceiptWithCatalog(rawReceipt, items, priceObservations, categories)
              : rawReceipt;

            const itemMatchStatus = receipt.items.map((item) => {
              if (item.matchedProductId && items.some((c) => c.id === item.matchedProductId)) {
                return true;
              }
              const live = resolveCanonicalProduct(item.name, items, [], {
                explicitCategory: item.category,
                explicitBrand: item.brand,
                explicitPackageSize: item.unit,
              });
              return live.matchedExisting && items.some((c) => c.id === live.productId);
            });
            const newItemsCount = itemMatchStatus.filter((matched) => !matched).length;
            const fp = buildReceiptFingerprint(receipt);
            const alreadyRecorded = transactions.some(
              (tx) => tx.receiptFingerprint === fp && tx.status !== 'cancelled'
            );
            const shouldSaveNew = saveNewToCatalog[idx] ?? true;

            return (
              <div key={idx} className="surface-well border border-[var(--border-subtle)] p-4 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--accent-ink)] flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4" strokeWidth={2.25} />
                    </div>
                    <div className="min-w-0 flex-1">
                      {!alreadyRecorded ? (
                        <input
                          type="text"
                          value={receipt.merchant}
                          onChange={(e) =>
                            handleReceiptMetaChange(idx, { merchant: e.target.value })
                          }
                          aria-label="Receipt merchant name"
                          className="input-field w-full max-w-[260px] px-2 py-0.5 text-sm font-bold text-[var(--text-primary)]"
                        />
                      ) : (
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {receipt.merchant}
                        </p>
                      )}
                      <p className="text-[12px] text-[var(--text-secondary)] font-medium mt-0.5">
                        {new Date(receipt.date).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                        {' · '}
                        {receipt.items.length} item{receipt.items.length !== 1 ? 's' : ''}
                        {newItemsCount > 0 ? ` (${newItemsCount} new)` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                      Total
                    </p>
                    <p className="text-base font-bold font-mono tabular-nums text-[var(--text-primary)]">
                      ₹{formatCurrency(receipt.total)}
                    </p>
                  </div>
                </div>

                {/* Parsed Items with Detected Category, Unit & Catalog Match */}
                <div className="border-t border-[var(--border-subtle)] pt-2.5 space-y-2.5">
                  {receipt.items.map((item, iIdx) => {
                    const rowKey = `${idx}-${iIdx}`;
                    const inCatalog = itemMatchStatus[iIdx];
                    const itemCategory = item.category || 'Other Expenses';
                    const categoryChoices = categories.some(
                      (c) => c.toLowerCase() === itemCategory.toLowerCase()
                    )
                      ? categories
                      : [...categories, itemCategory];

                    return (
                      <div
                        key={iIdx}
                        className="pb-2 last:pb-0 border-b last:border-b-0 border-[var(--border-subtle)] space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[12.5px] gap-2">
                          <span className="text-[var(--text-primary)] truncate font-medium">
                            {item.name}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[var(--text-primary)] font-semibold font-mono tabular-nums">
                              ₹{formatCurrency(item.price)}
                            </span>
                            {!alreadyRecorded && receipt.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveParsedItem(idx, iIdx)}
                                aria-label={`Remove ${item.name}`}
                                title="Remove misread item"
                                className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--accent-danger-ink)] hover:bg-[var(--accent-danger-soft)] transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap text-[12px]">
                            <span
                              className={`font-semibold ${
                                inCatalog
                                  ? 'text-[var(--accent-success-ink)]'
                                  : 'text-[var(--accent-ink)]'
                              }`}
                            >
                              {inCatalog ? 'In Catalog' : 'New Item'}
                            </span>
                            {item.unit && (
                              <span className="font-medium text-[var(--text-secondary)]">
                                · {item.unit}
                              </span>
                            )}
                            {item.brand && (
                              <span className="font-medium text-[var(--text-secondary)]">
                                · {item.brand}
                              </span>
                            )}
                          </div>

                          <select
                            aria-label={`Category for ${item.name}`}
                            value={itemCategory}
                            disabled={alreadyRecorded}
                            onChange={(e) => {
                              if (e.target.value === '__new__') {
                                setCreatingCatForKey(rowKey);
                                setNewCategoryDraft('');
                              } else {
                                handleItemCategoryChange(idx, iIdx, e.target.value);
                              }
                            }}
                            className="input-field text-[12px] font-medium px-2 py-1 max-w-[180px] truncate disabled:opacity-70"
                          >
                            {categoryChoices.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                            <option value="__new__">+ New category...</option>
                          </select>
                        </div>

                        {creatingCatForKey === rowKey && (
                          <div className="flex items-center gap-1.5 pt-1">
                            <input
                              type="text"
                              value={newCategoryDraft}
                              onChange={(e) => setNewCategoryDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleConfirmNewCategory(idx, iIdx);
                                } else if (e.key === 'Escape') {
                                  setCreatingCatForKey(null);
                                  setNewCategoryDraft('');
                                }
                              }}
                              placeholder="New category name"
                              aria-label="New category name"
                              autoFocus
                              className="input-field flex-1 px-2.5 py-1 text-[12px]"
                            />
                            <button
                              type="button"
                              onClick={() => handleConfirmNewCategory(idx, iIdx)}
                              disabled={!newCategoryDraft.trim()}
                              className="btn-primary px-2.5 py-1 text-[12px] disabled:opacity-50 flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" strokeWidth={2.5} />
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCreatingCatForKey(null);
                                setNewCategoryDraft('');
                              }}
                              aria-label="Cancel new category"
                              className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {!alreadyRecorded &&
                    (addingItemForReceipt === idx ? (
                      <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                          <input
                            type="text"
                            placeholder="Item name (e.g. Dolo 650mg)"
                            aria-label="Missing item name"
                            value={draftItemName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftItemName(val);
                              if (val.trim().length > 2) {
                                setDraftItemCategory(
                                  inferCategoryFromName(val, 'Other Expenses')
                                );
                              }
                            }}
                            className="input-field sm:col-span-2 px-2.5 py-1.5 text-[12px]"
                          />
                          <input
                            type="number"
                            min="1"
                            step="0.01"
                            placeholder="Price ₹"
                            aria-label="Missing item price"
                            value={draftItemPrice}
                            onChange={(e) => setDraftItemPrice(e.target.value)}
                            className="input-field px-2.5 py-1.5 text-[12px] font-mono tabular-nums"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <select
                            aria-label="Missing item category"
                            value={draftItemCategory}
                            onChange={(e) => setDraftItemCategory(e.target.value)}
                            className="input-field flex-1 px-2.5 py-1.5 text-[12px]"
                          >
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleAddMissingItem(idx)}
                            disabled={!draftItemName.trim() || Number(draftItemPrice) <= 0}
                            className="btn-primary px-3 py-1.5 text-[12px] disabled:opacity-50"
                          >
                            Add Item
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingItemForReceipt(null);
                              setDraftItemName('');
                              setDraftItemPrice('');
                            }}
                            className="px-2 py-1.5 rounded-lg text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAddingItemForReceipt(idx);
                          setDraftItemName('');
                          setDraftItemPrice('');
                          setDraftItemCategory('Other Expenses');
                        }}
                        className="w-full pt-1.5 text-[12px] font-semibold text-[var(--accent-ink)] hover:opacity-80 flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3 h-3" strokeWidth={2.5} />
                        Add missing item to receipt
                      </button>
                    ))}
                </div>

                {/* Summary Bar */}
                <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] border-y border-[var(--border-subtle)] py-2">
                  <div className="px-2 text-center">
                    <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                      Subtotal
                    </p>
                    <p className="text-[12.5px] font-bold text-[var(--text-primary)] font-mono tabular-nums mt-0.5">
                      ₹{formatCurrency(receipt.subtotal)}
                    </p>
                  </div>
                  <div className="px-2 text-center">
                    <label
                      htmlFor={`receipt-tax-${idx}`}
                      className="block text-[12px] font-medium text-[var(--text-secondary)]"
                    >
                      Tax (₹)
                    </label>
                    {!alreadyRecorded ? (
                      <input
                        id={`receipt-tax-${idx}`}
                        type="number"
                        min="0"
                        step="0.01"
                        aria-label="Receipt tax amount"
                        value={receipt.taxTotal}
                        onChange={(e) =>
                          handleReceiptMetaChange(idx, {
                            taxTotal: Number(e.target.value) || 0,
                          })
                        }
                        className="input-field w-full px-1.5 py-0.5 text-center text-[12.5px] font-bold text-[var(--accent-warning-ink)] font-mono tabular-nums mt-0.5"
                      />
                    ) : (
                      <p className="text-[12.5px] font-bold text-[var(--accent-warning-ink)] font-mono tabular-nums mt-0.5">
                        ₹{formatCurrency(receipt.taxTotal)}
                      </p>
                    )}
                  </div>
                  <div className="px-2 text-center">
                    <label
                      htmlFor={`receipt-fee-${idx}`}
                      className="block text-[12px] font-medium text-[var(--text-secondary)]"
                    >
                      Fees (₹)
                    </label>
                    {!alreadyRecorded ? (
                      <input
                        id={`receipt-fee-${idx}`}
                        type="number"
                        min="0"
                        step="0.01"
                        aria-label="Receipt delivery or platform fees"
                        value={receipt.deliveryFee}
                        onChange={(e) =>
                          handleReceiptMetaChange(idx, {
                            deliveryFee: Number(e.target.value) || 0,
                          })
                        }
                        className="input-field w-full px-1.5 py-0.5 text-center text-[12.5px] font-bold text-[var(--accent-danger-ink)] font-mono tabular-nums mt-0.5"
                      />
                    ) : (
                      <p className="text-[12.5px] font-bold text-[var(--accent-danger-ink)] font-mono tabular-nums mt-0.5">
                        ₹{formatCurrency(receipt.deliveryFee)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Save new items to catalog option + Action Buttons */}
                <div className="space-y-2">
                  {!alreadyRecorded && newItemsCount > 0 && (
                    <label className="flex items-center gap-2 px-1 py-0.5 text-[12px] text-[var(--text-primary)] font-medium cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={shouldSaveNew}
                        onChange={(e) =>
                          setSaveNewToCatalog((prev) => ({
                            ...prev,
                            [idx]: e.target.checked,
                          }))
                        }
                        className="w-3.5 h-3.5 rounded border-[var(--border-strong)] accent-[var(--accent-primary)]"
                      />
                      <span>
                        Add {newItemsCount} new item{newItemsCount > 1 ? 's' : ''} to Quick Mart
                        catalog
                      </span>
                    </label>
                  )}

                  <button
                    type="button"
                    disabled={alreadyRecorded || receipt.items.length === 0}
                    onClick={() => {
                      const res = recordReceiptAsTransaction(receipt, {
                        saveNewItemsToCatalog: shouldSaveNew,
                      });
                      const customSuffix =
                        res.createdCustomItemsCount && res.createdCustomItemsCount > 0
                          ? ` & ${res.createdCustomItemsCount} custom item${
                              res.createdCustomItemsCount > 1 ? 's' : ''
                            } saved`
                          : '';
                      const recurringSuffix =
                        res.autoRecurringAddedCount && res.autoRecurringAddedCount > 0
                          ? ` · ${res.autoRecurringAddedCount} recurring item${
                              res.autoRecurringAddedCount > 1 ? 's' : ''
                            } captured`
                          : '';
                      const alertSuffix = res.triggeredAlertsCount
                        ? ` (${res.triggeredAlertsCount} alert${
                            res.triggeredAlertsCount > 1 ? 's' : ''
                          } triggered!)`
                        : '';
                      setRecordFeedback({
                        idx,
                        ok: res.ok,
                        message: res.ok
                          ? `Recorded ₹${formatCurrency(receipt.total)} transaction, ${
                              res.observationsCount ?? 0
                            } price points${customSuffix}${recurringSuffix}${alertSuffix}`
                          : res.error || 'Already recorded',
                      });
                    }}
                    className={`w-full py-2.5 px-3 rounded-xl text-[12.5px] font-bold transition-colors flex items-center justify-center gap-1.5 border ${
                      alreadyRecorded
                        ? 'bg-[var(--accent-success-soft)] text-[var(--accent-success-ink)] border-[var(--accent-success-border)] cursor-default'
                        : 'btn-primary border-transparent'
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
                      className={`text-[12px] font-semibold px-1 ${
                        recordFeedback.ok ? 'text-[var(--accent-success-ink)]' : 'text-[var(--accent-warning-ink)]'
                      }`}
                    >
                      {recordFeedback.message}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={receipt.items.length === 0}
                      onClick={() => handleImportReceiptToCart(idx)}
                      className={`flex-1 py-2 px-3 rounded-xl text-[12.5px] font-semibold transition-colors flex items-center justify-center gap-1.5 border ${
                        importedIdx === idx
                          ? 'bg-[var(--accent-success-soft)] text-[var(--accent-success-ink)] border-[var(--accent-success-border)]'
                          : 'btn-secondary'
                      }`}
                    >
                      {importedIdx === idx ? (
                        <>
                          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                          Imported ({receipt.items.length})
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-3.5 h-3.5" strokeWidth={2.25} />
                          Import to cart
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveAudit(idx)}
                      className={`px-3.5 py-2 rounded-xl text-[12.5px] font-semibold transition-colors flex items-center justify-center gap-1.5 border ${
                        savedIdx === idx
                          ? 'bg-[var(--accent-success-soft)] text-[var(--accent-success-ink)] border-[var(--accent-success-border)]'
                          : 'btn-secondary'
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

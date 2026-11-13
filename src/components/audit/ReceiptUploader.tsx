import { useState, useRef } from 'react';
import { Upload, ScanLine, FileImage, Loader2, Check, Trash2, ShoppingBag, Receipt } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { mockParseReceipt } from '../../utils/auditEngine';
import { formatCurrency } from '../../utils/categoryStyles';

export function ReceiptUploader() {
  const parsedReceipts = useAppStore((s) => s.parsedReceipts);
  const addParsedReceipt = useAppStore((s) => s.addParsedReceipt);
  const clearParsedReceipts = useAppStore((s) => s.clearParsedReceipts);
  const addToCart = useAppStore((s) => s.addToCart);
  const items = useAppStore((s) => s.items);

  const [isScanning, setIsScanning] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setIsScanning(true);
    setTimeout(() => {
      const parsed = mockParseReceipt(file.name, file.size);
      addParsedReceipt(parsed);
      setIsScanning(false);
    }, 1800 + Math.random() * 800);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
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
      <div className="flex items-center gap-2">
        <ScanLine className="w-4 h-4 text-brand-400" strokeWidth={2.5} />
        <h3 className="text-sm font-extrabold tracking-tight">Receipt OCR Scanner</h3>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300 ${
          dragOver
            ? 'border-brand-500/50 bg-brand-500/5 scale-[1.02]'
            : 'border-white/[0.08] hover:border-brand-500/30 bg-white/[0.02]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleSelect}
          className="hidden"
        />
        {isScanning ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Loader2 className="w-10 h-10 text-brand-400 animate-spin" strokeWidth={2} />
              <ScanLine className="w-5 h-5 text-brand-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" strokeWidth={2.5} />
            </div>
            <p className="text-sm font-bold text-brand-400">Scanning receipt...</p>
            <p className="text-[11px] text-zinc-500">Extracting items, taxes & fees</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <Upload className="w-6 h-6 text-brand-400" strokeWidth={2} />
            </div>
            <p className="text-sm font-bold text-zinc-200">Upload receipt screenshot</p>
            <p className="text-[11px] text-zinc-500">Drag & drop or tap to browse · PNG, JPG</p>
          </div>
        )}
      </div>

      {/* Parsed Receipts */}
      {parsedReceipts.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              {parsedReceipts.length} parsed receipt{parsedReceipts.length > 1 ? 's' : ''}
            </p>
            <button
              onClick={clearParsedReceipts}
              className="text-[11px] font-bold text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" strokeWidth={2.5} />
              Clear
            </button>
          </div>

          {parsedReceipts.map((receipt, idx) => (
            <div
              key={idx}
              className="glass rounded-xl p-3.5 animate-fade-in-up"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-brand-400" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{receipt.merchant}</p>
                    <p className="text-[10px] text-zinc-500 font-medium">
                      {new Date(receipt.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Total</p>
                  <p className="text-sm font-extrabold font-mono tabular-nums text-white">
                    ₹{formatCurrency(receipt.total)}
                  </p>
                </div>
              </div>

              {/* Parsed Items */}
              <div className="space-y-1.5 mb-3">
                {receipt.items.map((item, iIdx) => (
                  <div key={iIdx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-zinc-300 truncate font-medium">{item.name}</span>
                      {item.tax !== undefined && item.tax > 0 && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/15 flex-shrink-0">
                          +₹{item.tax} tax
                        </span>
                      )}
                      {item.deliveryFee !== undefined && item.deliveryFee > 0 && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/15 flex-shrink-0">
                          +₹{item.deliveryFee} fee
                        </span>
                      )}
                    </div>
                    <span className="text-zinc-400 font-mono flex-shrink-0">₹{formatCurrency(item.price)}</span>
                  </div>
                ))}
              </div>

              {/* Summary Bar */}
              <div className="grid grid-cols-3 gap-1.5 mb-3 pt-2 border-t border-white/[0.06]">
                <div className="text-center">
                  <p className="text-[8px] font-bold uppercase text-zinc-600">Subtotal</p>
                  <p className="text-xs font-bold text-zinc-300 font-mono">₹{formatCurrency(receipt.subtotal)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-bold uppercase text-zinc-600">Tax</p>
                  <p className="text-xs font-bold text-orange-400 font-mono">₹{formatCurrency(receipt.taxTotal)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-bold uppercase text-zinc-600">Delivery</p>
                  <p className="text-xs font-bold text-red-400 font-mono">₹{formatCurrency(receipt.deliveryFee)}</p>
                </div>
              </div>

              {/* Import Button */}
              <button
                onClick={() => receipt.items.forEach((item) => handleImportItem(item.name, item.price))}
                className="w-full bg-white/[0.04] hover:bg-brand-500/15 text-zinc-300 hover:text-brand-400 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-white/[0.06] hover:border-brand-500/30"
              >
                <ShoppingBag className="w-3.5 h-3.5" strokeWidth={2.5} />
                Import items to cart
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

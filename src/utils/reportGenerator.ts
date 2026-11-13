import type { CartItem, Transaction, ParsedReceipt, FeeFlag } from '../store/useStore';
import { FEE_TYPE_LABELS } from './auditEngine';
import { formatCurrency } from './categoryStyles';

export function generateReportText(opts: {
  items: CartItem[];
  transactions: Transaction[];
  totalBudget: number;
  sessionBudget: number | null;
  parsedReceipts: ParsedReceipt[];
  feeFlags: FeeFlag[];
}): string {
  const { items, transactions, totalBudget, sessionBudget, parsedReceipts, feeFlags } = opts;
  const cartItems = items.filter((i) => i.quantity > 0);
  const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const totalFees = feeFlags.reduce((sum, f) => sum + f.estimatedCost, 0);

  const lines: string[] = [];
  lines.push('═══════════════════════════════════════════════');
  lines.push('              CARTAUDIT REPORT                  ');
  lines.push('         Smart Budget Audit Summary             ');
  lines.push('═══════════════════════════════════════════════');
  lines.push('');
  lines.push(`Generated: ${new Date().toLocaleString('en-IN')}`);
  lines.push('');

  lines.push('── CURRENT CART ──');
  if (cartItems.length === 0) {
    lines.push('  (empty)');
  } else {
    cartItems.forEach((item) => {
      lines.push(`  ${item.icon} ${item.name} — ₹${formatCurrency(item.price)} x${item.quantity} = ₹${formatCurrency(item.price * item.quantity)} [${item.category}]`);
    });
    lines.push(`  ─────────────────────────────`);
    lines.push(`  Cart Total: ₹${formatCurrency(cartTotal)}`);
  }
  lines.push('');

  if (sessionBudget !== null) {
    lines.push('── SESSION BUDGET GUARDRAIL ──');
    lines.push(`  Session Limit: ₹${formatCurrency(sessionBudget)}`);
    lines.push(`  Cart Total:    ₹${formatCurrency(cartTotal)}`);
    const over = cartTotal - sessionBudget;
    if (over > 0) {
      lines.push(`  Status: OVER LIMIT by ₹${formatCurrency(over)}`);
    } else {
      lines.push(`  Status: Within limit (₹${formatCurrency(Math.abs(over))} remaining)`);
    }
    lines.push('');
  }

  lines.push('── BUDGET OVERVIEW ──');
  lines.push(`  Monthly Budget: ₹${formatCurrency(totalBudget)}`);
  lines.push(`  Total Spent:    ₹${formatCurrency(totalSpent)}`);
  lines.push(`  Remaining:      ₹${formatCurrency(totalBudget - totalSpent)}`);
  lines.push('');

  if (feeFlags.length > 0) {
    lines.push('── HIDDEN FEE & DARK PATTERN DETECTION ──');
    feeFlags.forEach((flag) => {
      lines.push(`  [${flag.severity.toUpperCase()}] ${FEE_TYPE_LABELS[flag.type]}: ${flag.itemName}`);
      lines.push(`    → ${flag.message}`);
      lines.push(`    → Estimated cost: ₹${formatCurrency(flag.estimatedCost)}`);
    });
    lines.push(`  ─────────────────────────────`);
    lines.push(`  Total flagged cost: ₹${formatCurrency(totalFees)}`);
    lines.push('');
  } else {
    lines.push('── HIDDEN FEE & DARK PATTERN DETECTION ──');
    lines.push('  No deceptive patterns detected. Clean cart.');
    lines.push('');
  }

  if (parsedReceipts.length > 0) {
    lines.push('── PARSED RECEIPTS ──');
    parsedReceipts.forEach((r, idx) => {
      lines.push(`  Receipt #${idx + 1}: ${r.merchant} — ${new Date(r.date).toLocaleDateString('en-IN')}`);
      lines.push(`    Subtotal: ₹${formatCurrency(r.subtotal)} | Tax: ₹${formatCurrency(r.taxTotal)} | Delivery: ₹${formatCurrency(r.deliveryFee)} | Total: ₹${formatCurrency(r.total)}`);
    });
    lines.push('');
  }

  const totalSavings = totalFees;
  lines.push('── SUMMARY ──');
  lines.push(`  Items in cart: ${cartItems.length}`);
  lines.push(`  Transactions recorded: ${transactions.length}`);
  lines.push(`  Fee flags raised: ${feeFlags.length}`);
  lines.push(`  Estimated savings if flagged fees avoided: ₹${formatCurrency(totalSavings)}`);
  lines.push('');
  lines.push('═══════════════════════════════════════════════');
  lines.push('  Stay sharp. Spend smart. — CartAudit          ');
  lines.push('═══════════════════════════════════════════════');

  return lines.join('\n');
}

export function downloadTextReport(text: string): void {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cartaudit-report-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadHtmlReport(text: string): void {
  const html = `<html><head><title>CartAudit Report</title><style>
  body{background:#09090b;color:#e4e4e7;font-family:monospace;padding:40px;max-width:600px;margin:0 auto}
  pre{white-space:pre-wrap;word-wrap:break-word;font-size:13px;line-height:1.6}
  </style></head><body><pre>${text.replace(/</g,'&lt;')}</pre></body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cartaudit-report-${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

'use client';
import React from 'react';
import { X, Printer, Download } from 'lucide-react';
import { toast } from 'sonner';

interface Voucher {
  id: string;
  number: string;
  type: string;
  payee: string;
  date: string;
  amount: number;
  description: string;
  template: string;
  status: string;
}

interface Props {
  voucher: Voucher;
  onClose: () => void;
  onPrint: () => void;
}

function amountToWords(n: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (n === 0) return 'Zero';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + amountToWords(n % 100) : '');
  if (n < 10000) return ones[Math.floor(n / 1000)] + ' Thousand' + (n % 1000 ? ' ' + amountToWords(n % 1000) : '');
  return n.toString();
}

export default function VoucherPrintPreview({ voucher, onClose, onPrint }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/30 backdrop-blur-sm fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Voucher print preview"
    >
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl scale-in flex flex-col max-h-[90vh]">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Print Preview — {voucher.number}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Template: {voucher.template}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Voucher preview */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          <div className="bg-white border-2 border-border rounded-xl p-8 shadow-inner">
            {/* Voucher header */}
            <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-foreground/10">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Reynolds Consulting LLC
                </p>
                <h3 className="text-xl font-bold text-foreground">{voucher.type} Voucher</h3>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Voucher No.</p>
                <p className="text-lg font-bold font-mono text-primary">{voucher.number}</p>
                <p className="text-xs text-muted-foreground mt-1">Date: {voucher.date}</p>
              </div>
            </div>

            {/* Payee row */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Pay To</p>
                <p className="text-base font-semibold text-foreground border-b border-dashed border-border pb-1">{voucher.payee}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Amount</p>
                <p className="text-base font-bold font-mono text-foreground border-b border-dashed border-border pb-1">
                  PHP ₱{voucher.amount.toLocaleString()}.00
                </p>
              </div>
            </div>

            {/* Amount in words */}
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Amount in Words</p>
              <div className="bg-muted/40 rounded-lg px-4 py-2.5 border border-border">
                <p className="text-sm text-foreground font-medium">
                  {amountToWords(voucher.amount)} Pesos and 00/100 Only ****
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Narration / Description</p>
              <div className="bg-muted/40 rounded-lg px-4 py-2.5 border border-border min-h-[48px]">
                <p className="text-sm text-foreground">{voucher.description}</p>
              </div>
            </div>

            {/* Account details table */}
            <table className="w-full text-sm mb-8 border border-border rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Account</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Debit</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Credit</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-4 py-2.5 text-foreground">
                    {voucher.type === 'Receipt' ? 'Cash / Bank Account' : `${voucher.payee} — Accounts Payable`}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-foreground">
                    {voucher.type === 'Receipt' ? `$${voucher.amount.toLocaleString()}.00` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-foreground">
                    {voucher.type !== 'Receipt' ? `$${voucher.amount.toLocaleString()}.00` : '—'}
                  </td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-2.5 text-foreground">
                    {voucher.type === 'Receipt' ? 'Accounts Receivable' : 'Cash / Bank Account'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-foreground">
                    {voucher.type !== 'Receipt' ? `$${voucher.amount.toLocaleString()}.00` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-foreground">
                    {voucher.type === 'Receipt' ? `$${voucher.amount.toLocaleString()}.00` : '—'}
                  </td>
                </tr>
                <tr className="border-t border-border bg-muted/30">
                  <td className="px-4 py-2.5 font-bold text-foreground">Total</td>
                  <td className="px-4 py-2.5 text-right font-bold font-mono text-foreground">${voucher.amount.toLocaleString()}.00</td>
                  <td className="px-4 py-2.5 text-right font-bold font-mono text-foreground">${voucher.amount.toLocaleString()}.00</td>
                </tr>
              </tbody>
            </table>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-6 pt-4 border-t border-dashed border-border">
              {['Prepared By', 'Reviewed By', 'Authorized By'].map((sig) => (
                <div key={`sig-${sig}`} className="text-center">
                  <div className="h-10 border-b border-dashed border-foreground/30 mb-1" />
                  <p className="text-xs text-muted-foreground">{sig}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors">
            Close
          </button>
          <button
            onClick={() => toast.info(`Downloading ${voucher.number}.pdf`)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <Download size={14} />
            Download PDF
          </button>
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-150"
          >
            <Printer size={14} />
            Print Voucher
          </button>
        </div>
      </div>
    </div>
  );
}
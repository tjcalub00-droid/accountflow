export interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
}

export type InvoiceStatus =
  | 'paid'
  | 'sent'
  | 'draft'
  | 'partial'
  | 'overdue'
  | 'void'
  | 'closed';

export type EditableInvoiceStatus = Extract<
  InvoiceStatus,
  'paid' | 'sent' | 'overdue' | 'partial' | 'closed'
>;

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  paid: 'PAYMENT RECEIVED',
  sent: 'OPEN',
  overdue: 'OVERDUE',
  partial: 'PARTIAL',
  closed: 'CLOSE',
  draft: 'DRAFT',
  void: 'VOID',
};

export const editableInvoiceStatuses: Array<{
  value: EditableInvoiceStatus;
  label: string;
}> = [
  { value: 'paid', label: invoiceStatusLabels.paid },
  { value: 'sent', label: invoiceStatusLabels.sent },
  { value: 'overdue', label: invoiceStatusLabels.overdue },
  { value: 'partial', label: invoiceStatusLabels.partial },
  { value: 'closed', label: invoiceStatusLabels.closed },
];

export interface Invoice {
  id: string;
  number: string;
  customer: string;
  email: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  items: InvoiceLineItem[];
  notes: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[char];
  });
}

export function buildInvoiceDocumentHtml(invoice: Invoice): string {
  const money = (amount: number) =>
    `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const lineItems = invoice.items.length
    ? invoice.items.map((item) => `
        <tr>
          <td>${escapeHtml(item.description)}</td>
          <td class="right">${item.quantity.toLocaleString()}</td>
          <td class="right">${money(item.rate)}</td>
          <td class="right">${money(item.quantity * item.rate)}</td>
        </tr>`).join('')
    : `<tr><td colspan="4" class="unavailable">Line-item details are unavailable for this older invoice.</td></tr>`;

  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(invoice.number)} · Invoice</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 48px; color: #172033; font: 14px/1.5 Arial, sans-serif; }
          .sheet { max-width: 760px; margin: 0 auto; }
          .top { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 28px; border-bottom: 2px solid #e6eaf0; }
          .brand { font-size: 19px; font-weight: 700; letter-spacing: .02em; }
          .eyebrow { margin: 4px 0 0; color: #667085; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; }
          h1 { margin: 0; font-size: 30px; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 28px 0; }
          .label { color: #667085; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
          .value { margin-top: 5px; font-size: 14px; font-weight: 600; }
          .muted { margin-top: 3px; color: #667085; }
          .status { display: inline-block; margin-top: 10px; padding: 3px 9px; border-radius: 999px; background: #f1f4f8; color: #344054; font-size: 11px; font-weight: 700; letter-spacing: .04em; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { padding: 13px 10px; border-bottom: 1px solid #e6eaf0; text-align: left; }
          th { color: #667085; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
          .right { text-align: right; white-space: nowrap; }
          .unavailable { color: #667085; }
          .total { width: 280px; margin: 20px 0 0 auto; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .grand-total { margin-top: 4px; padding-top: 13px; border-top: 2px solid #172033; font-size: 18px; font-weight: 700; }
          .notes { margin-top: 36px; padding-top: 16px; border-top: 1px solid #e6eaf0; white-space: pre-wrap; overflow-wrap: anywhere; }
          .notes-label { margin-bottom: 5px; color: #667085; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
          .footer { margin-top: 48px; color: #667085; text-align: center; font-size: 12px; }
          @page { size: auto; margin: 16mm; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <main class="sheet">
          <header class="top">
            <div><div class="brand">OdinThor</div><p class="eyebrow">Your Eyes to your Business</p></div>
            <div><p class="eyebrow">Invoice</p><h1>${escapeHtml(invoice.number)}</h1><span class="status">${escapeHtml(invoiceStatusLabels[invoice.status])}</span></div>
          </header>
          <section class="meta">
            <div><div class="label">Bill to</div><div class="value">${escapeHtml(invoice.customer)}</div><div class="muted">${escapeHtml(invoice.email || '—')}</div></div>
            <div>
              <div class="label">Issue date</div><div class="value">${escapeHtml(invoice.issueDate)}</div>
              <div class="label" style="margin-top:12px">Due date</div><div class="value">${escapeHtml(invoice.dueDate)}</div>
            </div>
          </section>
          <table>
            <thead><tr><th>Description</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Amount</th></tr></thead>
            <tbody>${lineItems}</tbody>
          </table>
          <section class="total">
            <div class="total-row"><span>Subtotal</span><span>${money(invoice.amount)}</span></div>
            <div class="total-row"><span>Tax</span><span>${money(invoice.tax)}</span></div>
            <div class="total-row grand-total"><span>Total</span><span>${money(invoice.total)}</span></div>
          </section>
          ${invoice.notes ? `<section class="notes"><div class="notes-label">Notes / Payment Terms</div><div>${escapeHtml(invoice.notes)}</div></section>` : ''}
          <footer class="footer">Thank you for your business.</footer>
        </main>
      </body>
    </html>`;
}

'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Search, Plus, ChevronUp, ChevronDown, Send, CheckCircle, Eye, Trash2, Download, FileText, Printer } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import CreateInvoiceForm from './CreateInvoiceForm';
import InvoicePreviewModal from './InvoicePreviewModal';
import {
  buildInvoiceDocumentHtml,
  invoiceStatusLabels,
  type EditableInvoiceStatus,
  type Invoice,
} from './invoiceDocument';
import { notifyInvoicesChanged } from './invoiceEvents';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const statusFilters = ['All', 'Draft', 'Open', 'Payment Received', 'Overdue', 'Partial', 'Close', 'Void'];
const statusFilterValues: Record<string, Invoice['status']> = {
  Draft: 'draft',
  Open: 'sent',
  'Payment Received': 'paid',
  Overdue: 'overdue',
  Partial: 'partial',
  Close: 'closed',
  Void: 'void',
};
type SortKey = 'number' | 'customer' | 'issueDate' | 'dueDate' | 'total' | 'status';

function isSchemaError(error: any): boolean {
  if (!error) return false;
  if (error.code && typeof error.code === 'string') {
    const cls = error.code.substring(0, 2);
    if (cls === '42' || cls === '08') return true;
    if (cls === '23') return false;
  }
  if (error.message) {
    return /relation.*does not exist|column.*does not exist|function.*does not exist|syntax error/i.test(error.message);
  }
  return false;
}

export default function InvoicesTableSection() {
  const { getEffectiveOwnerId, isOwner, isAccountant } = useAuth();
  const supabase = createClient();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortKey, setSortKey] = useState<SortKey>('number');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const canEdit = isOwner() || isAccountant();

  const fetchInvoices = async () => {
    setLoadingData(true);
    try {
      const ownerId = getEffectiveOwnerId();
      if (!ownerId) return;
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });
      if (error) {
        if (isSchemaError(error)) throw error;
        toast.error('Failed to load invoices');
        return;
      }
      setInvoices(
        (data || []).map((row: any) => ({
          id: row.id,
          number: row.invoice_number,
          customer: row.customer,
          email: row.customer_email,
          issueDate: row.issue_date,
          dueDate: row.due_date,
          amount: Number(row.amount),
          tax: Number(row.tax),
          total: Number(row.total),
          status: row.status,
          items: Array.isArray(row.items)
            ? row.items.map((item: any) => ({
                description: String(item.description ?? ''),
                quantity: Number(item.quantity) || 0,
                rate: Number(item.rate) || 0,
              }))
            : [],
          notes: row.notes ?? '',
        }))
      );
    } catch (err: any) {
      toast.error(err?.message || 'Error loading invoices');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDelete = async (id: string) => {
    if (!canEdit) return;
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) { toast.error('Failed to delete invoice'); return; }
      toast.success('Invoice deleted');
      notifyInvoicesChanged();
      fetchInvoices();
    } catch {
      toast.error('Error deleting invoice');
    }
  };

  const handleMarkPaid = async (ids: string[]) => {
    if (!canEdit) return;
    try {
      const { error } = await supabase.from('invoices').update({ status: 'paid' }).in('id', ids);
      if (error) { toast.error('Failed to update invoices'); return; }
      toast.success(`${ids.length} invoice(s) marked as paid`);
      notifyInvoicesChanged();
      setSelectedRows(new Set());
      fetchInvoices();
    } catch {
      toast.error('Error updating invoices');
    }
  };

  const handleStatusChange = async (
    invoice: Invoice,
    status: EditableInvoiceStatus
  ): Promise<boolean> => {
    if (!canEdit) return false;
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status } as never)
        .eq('id', invoice.id);
      if (error) {
        toast.error(error.message || 'Failed to update invoice status');
        return false;
      }

      setInvoices((current) =>
        current.map((item) => item.id === invoice.id ? { ...item, status } : item)
      );
      setPreviewInvoice((current) =>
        current?.id === invoice.id ? { ...current, status } : current
      );
      notifyInvoicesChanged();
      toast.success(`${invoice.number} status changed to ${invoiceStatusLabels[status]}`);
      return true;
    } catch {
      toast.error('Failed to update invoice status');
      return false;
    }
  };

  const handlePrint = (inv: Invoice) => {
    const printWindow = window.open('', '_blank', 'width=900,height=720');
    if (!printWindow) {
      toast.error('Allow pop-ups to print this invoice');
      return;
    }

    printWindow.opener = null;
    printWindow.document.write(buildInvoiceDocumentHtml(inv));
    printWindow.document.close();
    printWindow.addEventListener('afterprint', () => printWindow.close(), { once: true });
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  };

  const filtered = useMemo(() => {
    let list = [...invoices];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (inv) =>
          inv.number.toLowerCase().includes(q) ||
          inv.customer.toLowerCase().includes(q) ||
          inv.email.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'All') {
      list = list.filter((inv) => inv.status === statusFilterValues[statusFilter]);
    }
    list.sort((a, b) => {
      let va: string | number = a[sortKey] as string | number;
      let vb: string | number = b[sortKey] as string | number;
      if (sortKey === 'total') { va = a.total; vb = b.total; }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [invoices, search, statusFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === paged.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(paged.map((r) => r.id)));
  };

  const openInvoicePreview = (invoice: Invoice) => {
    setPreviewInvoice(invoice);
    setPreviewOpen(true);
  };

  const handleInvoiceCreated = (invoice: Invoice) => {
    setCreateOpen(false);
    setInvoices((current) => [invoice, ...current.filter((item) => item.id !== invoice.id)]);
    notifyInvoicesChanged();
    openInvoicePreview(invoice);
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortDir === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />
    ) : (
      <ChevronDown size={12} className="text-muted-foreground opacity-30" />
    );

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-3 py-2 text-sm bg-muted border border-border rounded-lg w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 overflow-x-auto">
            {statusFilters.map((sf) => (
              <button
                key={`sf-${sf}`}
                onClick={() => { setStatusFilter(sf); setPage(1); }}
                className={`px-2 sm:px-3 py-1 text-xs font-semibold rounded-md transition-all duration-150 whitespace-nowrap ${
                  statusFilter === sf ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {sf}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors">
            <Download size={14} />
            Export
          </button>
          {canEdit && (
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-150"
            >
              <Plus size={14} />
              Create Invoice
            </button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedRows.size > 0 && canEdit && (
        <div className="flex items-center gap-3 px-5 py-2.5 bg-primary/5 border-b border-primary/20 slide-up">
          <span className="text-sm font-semibold text-primary">{selectedRows.size} selected</span>
          <button
            onClick={() => { toast.success(`${selectedRows.size} reminders sent`); setSelectedRows(new Set()); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors"
          >
            <Send size={12} />
            Send Reminder
          </button>
          <button
            onClick={() => handleMarkPaid(Array.from(selectedRows))}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-success border border-success/30 rounded-lg hover:bg-success/10 transition-colors"
          >
            <CheckCircle size={12} />
            Mark Paid
          </button>
          <button
            onClick={() => { toast.error(`${selectedRows.size} invoices deleted`); setSelectedRows(new Set()); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-danger border border-danger/30 rounded-lg hover:bg-danger/10 transition-colors"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left w-10">
                <input type="checkbox" checked={selectedRows.size === paged.length && paged.length > 0} onChange={toggleAll} className="rounded" />
              </th>
              {([
                { key: 'number', label: 'Invoice #' },
                { key: 'customer', label: 'Customer' },
                { key: 'issueDate', label: 'Issue Date' },
                { key: 'dueDate', label: 'Due Date' },
              ] as { key: SortKey; label: string }[]).map((col) => (
                <th key={`th-${col.key}`} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors" onClick={() => toggleSort(col.key)}>
                  <span className="flex items-center gap-1">{col.label}<SortIcon col={col.key} /></span>
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Subtotal</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tax</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors" onClick={() => toggleSort('total')}>
                <span className="flex items-center justify-end gap-1">Total<SortIcon col="total" /></span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors" onClick={() => toggleSort('status')}>
                <span className="flex items-center gap-1">Status<SortIcon col="status" /></span>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingData ? (
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading invoices...</p>
                  </div>
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <FileText size={32} className="text-muted-foreground/40" />
                    <p className="text-sm font-semibold text-foreground">No invoices found</p>
                    <p className="text-xs text-muted-foreground">
                      {search || statusFilter !== 'All' ? 'Try adjusting your filters' : 'Create your first invoice to get started'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paged.map((inv) => (
                <tr key={inv.id} className="border-b border-border hover:bg-muted/40 transition-colors group">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedRows.has(inv.id)} onChange={() => toggleRow(inv.id)} className="rounded" />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">{inv.number}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{inv.customer}</p>
                    <p className="text-xs text-muted-foreground">{inv.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{inv.issueDate}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {inv.dueDate}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-foreground">₱{inv.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">₱{inv.tax.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-bold text-foreground">₱{inv.total.toLocaleString()}</td>
                   <td className="px-4 py-3">
                     <StatusBadge status={inv.status} label={invoiceStatusLabels[inv.status]} />
                   </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button title="Preview invoice" aria-label={`Preview invoice ${inv.number}`} onClick={() => openInvoicePreview(inv)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                        <Eye size={13} />
                      </button>
                      <button
                        title={`Print invoice ${inv.number}`}
                        aria-label={`Print invoice ${inv.number}`}
                        onClick={() => handlePrint(inv)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Printer size={13} />
                      </button>
                      {canEdit && (
                        <button title="Delete" onClick={() => handleDelete(inv.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted disabled:opacity-40 transition-colors">Prev</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted disabled:opacity-40 transition-colors">Next</button>
          </div>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Invoice">
        <CreateInvoiceForm onClose={() => setCreateOpen(false)} onCreated={handleInvoiceCreated} />
      </Modal>
      <InvoicePreviewModal
        invoice={previewInvoice}
        open={previewOpen}
        canEdit={canEdit}
        onClose={() => setPreviewOpen(false)}
        onPrint={handlePrint}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
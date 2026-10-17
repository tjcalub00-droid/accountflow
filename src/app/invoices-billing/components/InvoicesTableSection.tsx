'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Search, Plus, ChevronUp, ChevronDown, Send, CheckCircle, Eye, Trash2, FileText, Pencil, History } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import dynamic from 'next/dynamic';
const CreateInvoiceForm = dynamic(() => import('./CreateInvoiceForm'), { ssr: false });
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ExportButtons from '@/components/ui/ExportButtons';
import Image from 'next/image';

type InvoiceStatus = 'paid' | 'sent' | 'draft' | 'partial' | 'void';

interface Invoice {
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
}

const statusFilters = ['All', 'Paid', 'Unpaid'];
type SortKey = 'number' | 'customer' | 'issueDate' | 'dueDate' | 'total' | 'status';

interface InvoiceChange {
  field: string;
  from: string;
  to: string;
}

interface InvoiceLog {
  id: string;
  createdAt: string;
  modifiedByName: string;
  changes: InvoiceChange[];
}

interface EditForm {
  customer: string;
  email: string;
  issueDate: string;
  dueDate: string;
  amount: string;
  tax: string;
  notes: string;
}

const formatLogTimestamp = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const isPaidStatus = (s: InvoiceStatus) => s === 'paid';
const statusLabel = (s: InvoiceStatus) => (isPaidStatus(s) ? 'Paid' : 'Unpaid');

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
  const { getEffectiveOwnerId, isOwner, isAccountant, user, profile } = useAuth();
  const supabase = createClient();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortKey, setSortKey] = useState<SortKey>('number');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<{ invoice: Invoice; value: 'paid' | 'unpaid' } | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [logInvoice, setLogInvoice] = useState<Invoice | null>(null);
  const [logs, setLogs] = useState<InvoiceLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const canEdit = isOwner() || isAccountant();
  const effectiveOwnerId = getEffectiveOwnerId();

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const ownerId = effectiveOwnerId;
        if (!ownerId) return;
        const { data } = await supabase
          .from('company_settings')
          .select('company_name')
          .eq('owner_id', ownerId)
          .maybeSingle();
        if (data?.company_name) setCompanyName(data.company_name);
      } catch {
        // ignore, fall back to default name
      }
    };
    loadCompany();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveOwnerId]);

  const notifyChanged = () => {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('invoices-changed'));
  };

  const requestStatusChange = (inv: Invoice, value: 'paid' | 'unpaid') => {
    if (!canEdit) return;
    const current = isPaidStatus(inv.status) ? 'paid' : 'unpaid';
    if (current === value) return;
    setPendingStatus({ invoice: inv, value });
  };

  const handleChangeStatus = async (inv: Invoice, value: 'paid' | 'unpaid') => {
    if (!canEdit) return;
    const newStatus: InvoiceStatus = value === 'paid' ? 'paid' : 'sent';
    setUpdatingStatus(true);
    try {
      const { error } = await supabase.from('invoices').update({ status: newStatus }).eq('id', inv.id);
      if (error) { toast.error('Failed to update invoice status'); return; }
      toast.success(`${inv.number} marked as ${value === 'paid' ? 'Paid' : 'Unpaid'}`);
      setViewInvoice({ ...inv, status: newStatus });
      await fetchInvoices();
      notifyChanged();
    } catch {
      toast.error('Error updating invoice status');
    } finally {
      setUpdatingStatus(false);
      setPendingStatus(null);
    }
  };

  const fetchInvoices = async () => {
    const ownerId = effectiveOwnerId;
    if (!ownerId) return;
    setLoadingData(true);
    try {
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
          number: row.invoice_number ?? '',
          customer: row.customer ?? '',
          email: row.customer_email ?? '',
          issueDate: row.issue_date ?? '',
          dueDate: row.due_date ?? '',
          amount: Number(row.amount) || 0,
          tax: Number(row.tax) || 0,
          total: Number(row.total) || 0,
          status: (row.status === 'paid' ? 'paid' : row.status === 'void' ? 'void' : 'sent') as InvoiceStatus,
        }))
      );
    } catch (err: any) {
      toast.error(err?.message || 'Error loading invoices');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!effectiveOwnerId) return;
    fetchInvoices();
    const handler = () => fetchInvoices();
    window.addEventListener('invoices-changed', handler);
    return () => window.removeEventListener('invoices-changed', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveOwnerId]);

  const handleDelete = async (id: string) => {
    if (!canEdit) return;
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) { toast.error('Failed to delete invoice'); return; }
      toast.success('Invoice deleted');
      fetchInvoices();
      notifyChanged();
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
      setSelectedRows(new Set());
      fetchInvoices();
      notifyChanged();
    } catch {
      toast.error('Error updating invoices');
    }
  };

  const openEdit = async (inv: Invoice) => {
    if (!canEdit) return;
    setEditInvoice(inv);
    setEditForm({
      customer: inv.customer,
      email: inv.email,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      amount: String(inv.amount),
      tax: String(inv.tax),
      notes: '',
    });
    setEditNotes('');
    try {
      const { data } = await supabase.from('invoices').select('notes').eq('id', inv.id).maybeSingle();
      const existingNotes = data?.notes ?? '';
      setEditNotes(existingNotes);
      setEditForm((prev) => (prev ? { ...prev, notes: existingNotes } : prev));
    } catch {
      // notes remain empty
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInvoice || !editForm || !canEdit) return;

    const customer = editForm.customer.trim();
    const amount = Number(editForm.amount);
    const tax = Number(editForm.tax);

    if (customer.length < 2) { toast.error('Customer name is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) { toast.error('Enter a valid email address'); return; }
    if (!editForm.issueDate || !editForm.dueDate) { toast.error('Issue and due dates are required'); return; }
    if (editForm.dueDate < editForm.issueDate) { toast.error('Due date must be on or after the issue date'); return; }
    if (!isFinite(amount) || amount <= 0) { toast.error('Subtotal must be greater than 0'); return; }
    if (!isFinite(tax) || tax < 0) { toast.error('Tax cannot be negative'); return; }

    const total = amount + tax;
    const newNotes = editForm.notes.trim();

    const changes: InvoiceChange[] = [];
    const track = (field: string, from: string, to: string) => {
      if (from !== to) changes.push({ field, from, to });
    };
    track('Customer', editInvoice.customer, customer);
    track('Email', editInvoice.email, editForm.email.trim());
    track('Issue Date', editInvoice.issueDate, editForm.issueDate);
    track('Due Date', editInvoice.dueDate, editForm.dueDate);
    track('Subtotal', editInvoice.amount.toFixed(2), amount.toFixed(2));
    track('Tax', editInvoice.tax.toFixed(2), tax.toFixed(2));
    track('Total', editInvoice.total.toFixed(2), total.toFixed(2));
    track('Notes', editNotes.trim(), newNotes);

    if (changes.length === 0) {
      toast.info('No changes to save');
      return;
    }

    const ownerId = effectiveOwnerId;
    if (!ownerId || !user) { toast.error('Not authenticated'); return; }

    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          customer,
          customer_email: editForm.email.trim(),
          issue_date: editForm.issueDate,
          due_date: editForm.dueDate,
          amount,
          tax,
          total,
          notes: newNotes || null,
        })
        .eq('id', editInvoice.id);
      if (error) {
        if (isSchemaError(error)) throw error;
        toast.error(error.message || 'Failed to update invoice');
        return;
      }

      const { error: logError } = await supabase.from('invoice_logs').insert({
        invoice_id: editInvoice.id,
        owner_id: ownerId,
        modified_by: user.id,
        modified_by_name: profile?.full_name || profile?.email || user.email || '',
        changes,
      });
      if (logError) {
        toast.warning(`Invoice saved, but the log entry failed: ${logError.message}`);
      } else {
        toast.success(`${editInvoice.number} updated`);
      }

      setEditInvoice(null);
      setEditForm(null);
      await fetchInvoices();
      notifyChanged();
    } catch (err: any) {
      toast.error(err?.message || 'Error updating invoice');
    } finally {
      setSavingEdit(false);
    }
  };

  const openLog = async (inv: Invoice) => {
    setLogInvoice(inv);
    setLogs([]);
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('invoice_logs')
        .select('*')
        .eq('invoice_id', inv.id)
        .order('created_at', { ascending: false });
      if (error) {
        if (isSchemaError(error)) throw error;
        toast.error(error.message || 'Failed to load invoice log');
        return;
      }
      setLogs(
        (data || []).map((row: any) => ({
          id: row.id,
          createdAt: row.created_at,
          modifiedByName: row.modified_by_name ?? '',
          changes: Array.isArray(row.changes) ? row.changes : [],
        }))
      );
    } catch (err: any) {
      toast.error(err?.message || 'Error loading invoice log');
    } finally {
      setLoadingLogs(false);
    }
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
      list = list.filter((inv) =>
        statusFilter === 'Paid' ? isPaidStatus(inv.status) : !isPaidStatus(inv.status)
      );
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
          <ExportButtons
            filename="invoices"
            title="Invoices Report"
            subtitle={`${filtered.length} invoice(s)${statusFilter !== 'All' ? ` - Status: ${statusFilter}` : ''}`}
            columns={[
              { header: 'Invoice #', key: 'number' },
              { header: 'Customer', key: 'customer' },
              { header: 'Email', key: 'email' },
              { header: 'Issue Date', key: 'issueDate' },
              { header: 'Due Date', key: 'dueDate' },
              { header: 'Subtotal', key: 'amount' },
              { header: 'Tax', key: 'tax' },
              { header: 'Total', key: 'total' },
              { header: 'Status', key: 'status' },
            ]}
            rows={filtered.map((inv) => ({
              number: inv.number,
              customer: inv.customer,
              email: inv.email,
              issueDate: inv.issueDate,
              dueDate: inv.dueDate,
              amount: inv.amount.toFixed(2),
              tax: inv.tax.toFixed(2),
              total: inv.total.toFixed(2),
              status: statusLabel(inv.status),
            }))}
          />
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
            Mark as Paid
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
                  <td className="px-4 py-3"><StatusBadge status={isPaidStatus(inv.status) ? 'paid' : 'sent'} label={statusLabel(inv.status)} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button title="View" onClick={() => setViewInvoice(inv)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                        <Eye size={13} />
                      </button>
                      {canEdit && (
                        <button title="Edit" onClick={() => openEdit(inv)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                          <Pencil size={13} />
                        </button>
                      )}
                      <button title="Log" onClick={() => openLog(inv)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                        <History size={13} />
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
        <CreateInvoiceForm onClose={() => { setCreateOpen(false); fetchInvoices(); notifyChanged(); }} />
      </Modal>

      <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title={viewInvoice ? `Invoice ${viewInvoice.number}` : 'Invoice'}>
        {viewInvoice && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <Image
                src="/assets/images/istockphoto-1271371970-612x612-1789378855208.jpg"
                alt="Company logo"
                width={56}
                height={56}
                className="rounded object-cover flex-shrink-0"
              />
              <p className="text-lg font-bold text-foreground">{companyName || 'Odin'}</p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Billed To</p>
                <p className="text-base font-semibold text-foreground mt-1">{viewInvoice.customer}</p>
                <p className="text-sm text-muted-foreground">{viewInvoice.email}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status</p>
                <div className="mt-1 flex sm:justify-end">
                  {canEdit ? (
                    <select
                      value={isPaidStatus(viewInvoice.status) ? 'paid' : 'unpaid'}
                      disabled={updatingStatus}
                      onChange={(e) => requestStatusChange(viewInvoice, e.target.value as 'paid' | 'unpaid')}
                      className="px-3 py-2 text-sm font-semibold bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                      aria-label="Change invoice status"
                    >
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                    </select>
                  ) : (
                    <StatusBadge
                      status={isPaidStatus(viewInvoice.status) ? 'paid' : 'sent'}
                      label={statusLabel(viewInvoice.status)}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Issue Date</p>
                <p className="text-sm text-foreground mt-1">{viewInvoice.issueDate}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Due Date</p>
                <p className="text-sm text-foreground mt-1">{viewInvoice.dueDate}</p>
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono text-foreground">₱{viewInvoice.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-mono text-foreground">₱{viewInvoice.tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-border pt-2">
                <span className="text-foreground">Total</span>
                <span className="font-mono text-foreground">₱{viewInvoice.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!editInvoice}
        onClose={() => { if (!savingEdit) { setEditInvoice(null); setEditForm(null); } }}
        title={editInvoice ? `Edit Invoice ${editInvoice.number}` : 'Edit Invoice'}
      >
        {editInvoice && editForm && (
          <form onSubmit={handleSaveEdit} className="p-4 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Customer Name</label>
                <input
                  value={editForm.customer}
                  onChange={(e) => setEditForm({ ...editForm, customer: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Billing Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Issue Date</label>
                <input
                  type="date"
                  value={editForm.issueDate}
                  onChange={(e) => setEditForm({ ...editForm, issueDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Due Date</label>
                <input
                  type="date"
                  value={editForm.dueDate}
                  onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Subtotal (PHP)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-right"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Tax (PHP)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={editForm.tax}
                  onChange={(e) => setEditForm({ ...editForm, tax: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-right"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Notes</label>
              <textarea
                rows={3}
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div className="flex justify-between text-base font-bold border-t border-border pt-3">
              <span className="text-foreground">Total</span>
              <span className="font-mono text-foreground">
                ₱{((Number(editForm.amount) || 0) + (Number(editForm.tax) || 0)).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <button
                type="button"
                disabled={savingEdit}
                onClick={() => { setEditInvoice(null); setEditForm(null); }}
                className="px-4 py-2 text-sm font-semibold text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={!!logInvoice}
        onClose={() => setLogInvoice(null)}
        title={logInvoice ? `Modification Log - ${logInvoice.number}` : 'Modification Log'}
        size="lg"
      >
        <div className="p-4 sm:p-6">
          {loadingLogs ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading log...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <History size={32} className="text-muted-foreground/40" />
              <p className="text-sm font-semibold text-foreground">No modifications recorded</p>
              <p className="text-xs text-muted-foreground">Changes saved through Edit will appear here.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {logs.map((log) => (
                <li key={log.id} className="border border-border rounded-lg p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-foreground">{formatLogTimestamp(log.createdAt)}</p>
                    {log.modifiedByName && (
                      <p className="text-xs text-muted-foreground">by {log.modifiedByName}</p>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {log.changes.map((c, idx) => (
                      <li key={`${log.id}-${idx}`} className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{c.field}:</span>{' '}
                        <span className="line-through">{c.from || '—'}</span>{' → '}
                        <span className="text-foreground">{c.to || '—'}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <Modal
        open={!!pendingStatus}
        onClose={() => { if (!updatingStatus) setPendingStatus(null); }}
        title="Confirm Status Change"
        size="sm"
      >
        {pendingStatus && (
          <div className="p-6 space-y-5">
            <p className="text-sm text-foreground">
              Are you sure you want to change invoice{' '}
              <span className="font-semibold font-mono">{pendingStatus.invoice.number}</span> from{' '}
              <span className="font-semibold">{statusLabel(pendingStatus.invoice.status)}</span> to{' '}
              <span className="font-semibold">{pendingStatus.value === 'paid' ? 'Paid' : 'Unpaid'}</span>?
            </p>
            <p className="text-xs text-muted-foreground">
              This will update your Paid and Unpaid totals and financial reports.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => setPendingStatus(null)}
                className="px-4 py-2 text-sm font-semibold text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => handleChangeStatus(pendingStatus.invoice, pendingStatus.value)}
                className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {updatingStatus ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Search, Plus, ChevronUp, ChevronDown, Paperclip, Tag, Trash2, Edit2, Download, Receipt } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import LogExpenseForm from './LogExpenseForm';
import AutoCategorizationRules, { type CategorizationRule } from './AutoCategorizationRules';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type ExpenseStatus = 'approved' | 'pending' | 'rejected';

interface Expense {
  id: string;
  date: string;
  vendor: string;
  category: string;
  amount: number;
  paymentMethod: string;
  receipt: boolean;
  taxDeductible: boolean;
  status: ExpenseStatus;
  notes: string;
}

const categoryColors: Record<string, string> = {
  'Software & Tools': 'bg-primary/10 text-primary',
  'Contractors': 'bg-purple-100 text-purple-700',
  'Office & Admin': 'bg-warning/10 text-warning',
  'Marketing': 'bg-pink-100 text-pink-700',
  'Travel': 'bg-sky-100 text-sky-700',
  'Utilities': 'bg-muted text-muted-foreground',
  'Professional Services': 'bg-success/10 text-success',
  'Equipment': 'bg-orange-100 text-orange-700',
};

const allCategories = ['All Categories', ...Object.keys(categoryColors)];
type SortKey = 'date' | 'vendor' | 'category' | 'amount' | 'status';

function isSchemaError(error: any): boolean {
  if (!error) return false;
  if (error.code && typeof error.code === 'string') {
    const cls = error.code.substring(0, 2);
    if (cls === '42' || cls === '08') return true;
    if (cls === '23') return false;
  }
  if (error.message) {
    return /relation.*does not exist|column.*does not exist|syntax error/i.test(error.message);
  }
  return false;
}

export default function ExpensesTableSection() {
  const { getEffectiveOwnerId, isOwner, isAccountant } = useAuth();
  const supabase = createClient();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [logOpen, setLogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [rules, setRules] = useState<CategorizationRule[]>([]);
  const perPage = 10;

  const canEdit = isOwner() || isAccountant();

  const fetchExpenses = async () => {
    setLoadingData(true);
    try {
      const ownerId = getEffectiveOwnerId();
      if (!ownerId) return;
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('owner_id', ownerId)
        .order('expense_date', { ascending: false });
      if (error) {
        if (isSchemaError(error)) throw error;
        toast.error('Failed to load expenses');
        return;
      }
      setExpenses(
        (data || []).map((row: any) => ({
          id: row.id,
          date: row.expense_date,
          vendor: row.vendor,
          category: row.category,
          amount: Number(row.amount),
          paymentMethod: row.payment_method,
          receipt: row.has_receipt,
          taxDeductible: row.tax_deductible,
          status: row.status as ExpenseStatus,
          notes: row.notes || '',
        }))
      );
    } catch (err: any) {
      toast.error(err?.message || 'Error loading expenses');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleDelete = async (id: string) => {
    if (!canEdit) return;
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) { toast.error('Failed to delete expense'); return; }
      toast.success('Expense deleted');
      fetchExpenses();
    } catch {
      toast.error('Error deleting expense');
    }
  };

  const handleApprove = async (ids: string[]) => {
    if (!canEdit) return;
    try {
      const { error } = await supabase.from('expenses').update({ status: 'approved' }).in('id', ids);
      if (error) { toast.error('Failed to approve expenses'); return; }
      toast.success(`${ids.length} expense(s) approved`);
      setSelectedRows(new Set());
      fetchExpenses();
    } catch {
      toast.error('Error approving expenses');
    }
  };

  const filtered = useMemo(() => {
    let list = [...expenses];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.vendor.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || e.notes.toLowerCase().includes(q));
    }
    if (categoryFilter !== 'All Categories') {
      list = list.filter((e) => e.category === categoryFilter);
    }
    list.sort((a, b) => {
      const va = a[sortKey] as string | number;
      const vb = b[sortKey] as string | number;
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [expenses, search, categoryFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortDir === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />
    ) : (
      <ChevronDown size={12} className="text-muted-foreground opacity-30" />
    );

  return (
    <div className="space-y-4">
      <AutoCategorizationRules onRulesChange={setRules} />
      <div className="bg-card border border-border rounded-xl shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 pr-3 py-2 text-sm bg-muted border border-border rounded-lg w-full sm:w-52 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
            >
              {allCategories.map((c) => (
                <option key={`cat-opt-${c}`} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors">
              <Download size={14} />
              Export
            </button>
            {canEdit && (
              <button
                onClick={() => setLogOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-150"
              >
                <Plus size={14} />
                Log Expense
              </button>
            )}
          </div>
        </div>

        {/* Bulk actions */}
        {selectedRows.size > 0 && canEdit && (
          <div className="flex items-center gap-3 px-5 py-2.5 bg-primary/5 border-b border-primary/20 slide-up">
            <span className="text-sm font-semibold text-primary">{selectedRows.size} selected</span>
            <button
              onClick={() => handleApprove(Array.from(selectedRows))}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-success border border-success/30 rounded-lg hover:bg-success/10 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => { toast.error(`${selectedRows.size} expenses deleted`); setSelectedRows(new Set()); }}
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
                  <input type="checkbox" checked={selectedRows.size === paged.length && paged.length > 0} onChange={() => { if (selectedRows.size === paged.length) setSelectedRows(new Set()); else setSelectedRows(new Set(paged.map((r) => r.id))); }} className="rounded" />
                </th>
                {([
                  { key: 'date', label: 'Date' },
                  { key: 'vendor', label: 'Vendor' },
                  { key: 'category', label: 'Category' },
                ] as { key: SortKey; label: string }[]).map((col) => (
                  <th key={`th-exp-${col.key}`} onClick={() => toggleSort(col.key)} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    <span className="flex items-center gap-1">{col.label}<SortIcon col={col.key} /></span>
                  </th>
                ))}
                <th onClick={() => toggleSort('amount')} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  <span className="flex items-center justify-end gap-1">Amount<SortIcon col="amount" /></span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Payment</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">Receipt</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tax Ded.</th>
                <th onClick={() => toggleSort('status')} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
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
                      <p className="text-sm text-muted-foreground">Loading expenses...</p>
                    </div>
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Receipt size={32} className="text-muted-foreground/40" />
                      <p className="text-sm font-semibold text-foreground">No expenses found</p>
                      <p className="text-xs text-muted-foreground">
                        {search || categoryFilter !== 'All Categories' ? 'Try adjusting your filters' : 'Log your first expense to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((exp) => (
                  <tr key={exp.id} className="border-b border-border hover:bg-muted/40 transition-colors group">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedRows.has(exp.id)} onChange={() => { setSelectedRows((prev) => { const next = new Set(prev); if (next.has(exp.id)) next.delete(exp.id); else next.add(exp.id); return next; }); }} className="rounded" />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{exp.date}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{exp.vendor}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${categoryColors[exp.category] || 'bg-muted text-muted-foreground'}`}>
                        <Tag size={10} />
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-foreground">₱{exp.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{exp.paymentMethod}</td>
                    <td className="px-4 py-3 text-center">
                      {exp.receipt ? (
                        <span className="inline-flex items-center gap-1 text-xs text-success"><Paperclip size={11} />Yes</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {exp.taxDeductible ? (
                        <span className="text-xs text-success font-semibold">Yes</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={exp.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEdit && (
                          <>
                            <button title="Edit" onClick={() => toast.info(`Editing ${exp.vendor}`)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                              <Edit2 size={13} />
                            </button>
                            <button title="Delete" onClick={() => handleDelete(exp.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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

        <Modal open={logOpen} onClose={() => setLogOpen(false)} title="Log Expense">
          <LogExpenseForm onClose={() => { setLogOpen(false); fetchExpenses(); }} rules={rules} />
        </Modal>
      </div>
    </div>
  );
}
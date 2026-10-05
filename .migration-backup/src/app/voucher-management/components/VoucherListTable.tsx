'use client';
import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Printer,
  Download,
  Eye,
  Trash2,
  Plus,
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import VoucherPrintPreview from './VoucherPrintPreview';
import type { NewVoucher } from './CreateVoucherModal';

type VoucherStatus = 'draft' | 'active' | 'printed' | 'archived';
type VoucherType = 'Payment' | 'Receipt' | 'Journal' | 'Petty Cash';

interface Voucher {
  id: string;
  number: string;
  type: VoucherType;
  payee: string;
  date: string;
  amount: number;
  description: string;
  template: string;
  status: VoucherStatus;
  printedOn?: string;
}

let voucherCounter = 32;
const vouchers: Voucher[] = [];

type SortKey = 'number' | 'date' | 'payee' | 'amount' | 'status' | 'type';

interface Props {
  additionalVouchers?: NewVoucher[];
}

export default function VoucherListTable({ additionalVouchers = [] }: Props) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortKey, setSortKey] = useState<SortKey>('number');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [previewVoucher, setPreviewVoucher] = useState<Voucher | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    const allVouchers = [...(additionalVouchers as Voucher[]), ...vouchers];
    let list = [...allVouchers];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.number.toLowerCase().includes(q) ||
          v.payee.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'All') list = list.filter((v) => v.type === typeFilter);
    if (statusFilter !== 'All') list = list.filter((v) => v.status === statusFilter.toLowerCase());
    list.sort((a, b) => {
      const va = a[sortKey] as string | number;
      const vb = b[sortKey] as string | number;
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [search, typeFilter, statusFilter, sortKey, sortDir]);

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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortDir === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />
    ) : (
      <ChevronDown size={12} className="text-muted-foreground opacity-30" />
    );

  const typeColors: Record<VoucherType, string> = {
    'Payment': 'bg-primary/10 text-primary',
    'Receipt': 'bg-success/10 text-success',
    'Journal': 'bg-purple-100 text-purple-700',
    'Petty Cash': 'bg-warning/10 text-warning',
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search vouchers..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-3 py-2 text-sm bg-muted border border-border rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {['All', 'Payment', 'Receipt', 'Journal', 'Petty Cash'].map((t) => (
              <option key={`type-opt-${t}`} value={t}>{t === 'All' ? 'All Types' : t}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {['All', 'Draft', 'Active', 'Printed', 'Archived'].map((s) => (
              <option key={`vstatus-opt-${s}`} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
            ))}
          </select>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors">
          <Download size={14} />
          Export All
        </button>
      </div>

      {/* Bulk actions */}
      {selectedRows.size > 0 && (
        <div className="flex items-center gap-3 px-5 py-2.5 bg-primary/5 border-b border-primary/20 slide-up">
          <span className="text-sm font-semibold text-primary">{selectedRows.size} selected</span>
          <button
            onClick={() => { toast.success(`${selectedRows.size} vouchers sent to printer`); setSelectedRows(new Set()); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors"
          >
            <Printer size={12} />
            Print Selected
          </button>
          <button
            onClick={() => { toast.error(`${selectedRows.size} vouchers deleted`); setSelectedRows(new Set()); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-danger border border-danger/30 rounded-lg hover:bg-danger/10 transition-colors"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm min-w-[860px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={selectedRows.size === paged.length && paged.length > 0}
                  onChange={() => {
                    if (selectedRows.size === paged.length) setSelectedRows(new Set());
                    else setSelectedRows(new Set(paged.map((r) => r.id)));
                  }}
                  className="rounded"
                />
              </th>
              {(
                [
                  { key: 'number', label: 'Voucher #' },
                  { key: 'type', label: 'Type' },
                  { key: 'payee', label: 'Payee' },
                  { key: 'date', label: 'Date' },
                ] as { key: SortKey; label: string }[]
              ).map((col) => (
                <th
                  key={`vth-${col.key}`}
                  onClick={() => toggleSort(col.key)}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                >
                  <span className="flex items-center gap-1">{col.label}<SortIcon col={col.key} /></span>
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Description</th>
              <th
                onClick={() => toggleSort('amount')}
                className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              >
                <span className="flex items-center justify-end gap-1">Amount<SortIcon col="amount" /></span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Template</th>
              <th
                onClick={() => toggleSort('status')}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-1">Status<SortIcon col="status" /></span>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Plus size={32} className="text-muted-foreground/40" />
                    <p className="text-sm font-semibold text-foreground">No vouchers found</p>
                    <p className="text-xs text-muted-foreground">
                      Try adjusting your search or create a new voucher.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paged.map((vch) => (
                <tr
                  key={vch.id}
                  className={`border-b border-border hover:bg-muted/40 transition-colors group ${
                    selectedRows.has(vch.id) ? 'bg-primary/5' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedRows.has(vch.id)} onChange={() => toggleRow(vch.id)} className="rounded" />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{vch.number}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${typeColors[vch.type]}`}>
                      {vch.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{vch.payee}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{vch.date}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground truncate max-w-[200px]">{vch.description}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-foreground">
                    ${vch.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-muted-foreground truncate max-w-[140px]">{vch.template}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <StatusBadge status={vch.status} />
                      {vch.printedOn && (
                        <p className="text-xs text-muted-foreground mt-0.5">Printed {vch.printedOn}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        title="Preview voucher"
                        onClick={() => setPreviewVoucher(vch)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        title="Print voucher"
                        onClick={() => toast.success(`${vch.number} sent to printer`)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        <Printer size={13} />
                      </button>
                      <button
                        title="Download PDF"
                        onClick={() => toast.info(`Downloading ${vch.number}.pdf`)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Download size={13} />
                      </button>
                      <button
                        title="Delete voucher — this cannot be undone"
                        onClick={() => toast.error(`${vch.number} deleted`)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length} vouchers
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={`vch-page-${i + 1}`}
              onClick={() => setPage(i + 1)}
              className={`w-8 h-8 text-xs font-semibold rounded-lg transition-colors ${
                page === i + 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {/* Print preview modal */}
      {previewVoucher && (
        <VoucherPrintPreview
          voucher={previewVoucher}
          onClose={() => setPreviewVoucher(null)}
          onPrint={() => {
            toast.success(`${previewVoucher.number} sent to printer`);
            setPreviewVoucher(null);
          }}
        />
      )}
    </div>
  );
}
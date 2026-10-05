'use client';
import React, { useState } from 'react';
import { Printer, Download, X, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Map page names to Supabase tables
const PAGE_TABLE_MAP: Record<string, string | null> = {
  'Invoices & Billing': 'invoices',
  'Expenses': 'expenses',
  'Payroll & Tax': 'payroll_runs',
  'Voucher Management': 'vouchers',
  'Dashboard': null,
  'Financial Reports': null,
};

interface BackupModalProps {
  open: boolean;
  onClose: () => void;
  pageName: string;
}

function BackupModal({ open, onClose, pageName }: BackupModalProps) {
  const currentYear = 2026;
  const currentMonth = 8;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [exporting, setExporting] = useState(false);
  const { getEffectiveOwnerId } = useAuth();
  const supabase = createClient();

  const years = [currentYear - 2, currentYear - 1, currentYear];

  const fetchTableData = async (tableName: string, startDate: string, endDate: string) => {
    const ownerId = getEffectiveOwnerId();
    if (!ownerId) return [];

    const dateColumn = tableName === 'invoices' ? 'issue_date'
      : tableName === 'expenses' ? 'expense_date'
      : tableName === 'payroll_runs' ? 'pay_date'
      : tableName === 'vouchers'? 'voucher_date' :'created_at';

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('owner_id', ownerId)
      .gte(dateColumn, startDate)
      .lte(dateColumn, endDate)
      .order(dateColumn, { ascending: true });

    if (error) return [];
    return data || [];
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const monthName = MONTHS[selectedMonth];
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
      const endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

      const tableName = PAGE_TABLE_MAP[pageName];
      let records: any[] = [];

      if (tableName) {
        records = await fetchTableData(tableName, startDate, endDate);
      }

      const fileName = `odinthor-${pageName.toLowerCase().replace(/\s+/g, '-')}-${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

      if (format === 'csv') {
        let csvContent = [
          `Odinthor Backup — ${pageName}`,
          `Period: ${monthName} 1, ${selectedYear} to ${monthName} ${daysInMonth}, ${selectedYear}`,
          `Exported: ${new Date().toISOString()}`,
          `Records: ${records.length}`,
          '',
        ].join('\n');

        if (records.length > 0) {
          const headers = Object.keys(records[0]).join(',');
          const rows = records.map((r) =>
            Object.values(r).map((v) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v)).join(',')
          );
          csvContent += [headers, ...rows].join('\n');
        } else {
          csvContent += 'No records found for this period.';
        }

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const jsonData = {
          backup: {
            page: pageName,
            period: { start: startDate, end: endDate, month: monthName, year: selectedYear },
            exportedAt: new Date().toISOString(),
            recordCount: records.length,
          },
          records,
        };
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Download size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Monthly Backup</h2>
              <p className="text-xs text-muted-foreground">{pageName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <p className="text-sm text-muted-foreground">
            Export all <span className="font-medium text-foreground">{pageName}</span> activity from the{' '}
            <span className="font-medium text-foreground">1st to the last day</span> of the selected month.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Month</label>
              <div className="relative">
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="w-full appearance-none px-3 py-2.5 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring pr-8">
                  {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Year</label>
              <div className="relative">
                <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="w-full appearance-none px-3 py-2.5 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring pr-8">
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="bg-muted/60 border border-border rounded-lg px-4 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">Backup period</p>
            <p className="text-sm font-semibold text-foreground">
              {MONTHS[selectedMonth]} 1, {selectedYear} — {MONTHS[selectedMonth]} {new Date(selectedYear, selectedMonth + 1, 0).getDate()}, {selectedYear}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Export Format</label>
            <div className="flex gap-2">
              {(['csv', 'json'] as const).map((f) => (
                <button key={f} onClick={() => setFormat(f)} className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-all ${format === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'}`}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exporting…
              </>
            ) : (
              <>
                <Download size={14} />
                Export Backup
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface PageActionsProps {
  pageName: string;
}

export default function PageActions({ pageName }: PageActionsProps) {
  const [backupOpen, setBackupOpen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="flex items-center gap-2 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted hover:text-foreground transition-colors"
          title="Print this page"
        >
          <Printer size={14} />
          Print
        </button>
        <button
          onClick={() => setBackupOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted hover:text-foreground transition-colors"
          title="Backup monthly activity"
        >
          <Download size={14} />
          Backup
        </button>
      </div>

      <BackupModal
        open={backupOpen}
        onClose={() => setBackupOpen(false)}
        pageName={pageName}
      />
    </>
  );
}

'use client';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { exportToCsv, exportToPdf, type ExportColumn, type ExportRow } from '@/lib/exportUtils';
import { useAuth } from '@/contexts/AuthContext';

interface ExportButtonsProps {
  filename: string;
  title: string;
  columns: ExportColumn[];
  rows: ExportRow[];
  subtitle?: string;
  landscape?: boolean;
  disabled?: boolean;
}

export default function ExportButtons({
  filename,
  title,
  columns,
  rows,
  subtitle,
  landscape,
  disabled,
}: ExportButtonsProps) {
  const { profile, user } = useAuth();
  const [busy, setBusy] = useState(false);
  const isEmpty = !rows || rows.length === 0;

  const handleCsv = () => {
    if (isEmpty) {
      toast.error('No data to export');
      return;
    }
    try {
      exportToCsv(filename, columns, rows);
      toast.success('CSV exported');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  const handlePdf = async () => {
    if (isEmpty) {
      toast.error('No data to export');
      return;
    }
    setBusy(true);
    try {
      await exportToPdf(filename, title, columns, rows, {
        subtitle,
        landscape,
        exportedBy: profile?.full_name || user?.email || undefined,
      });
      toast.success('PDF exported');
    } catch {
      toast.error('Failed to export PDF');
    } finally {
      setBusy(false);
    }
  };

  const btn =
    'flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={handleCsv} disabled={disabled || busy} className={btn} title="Export as CSV">
        <FileSpreadsheet size={14} />
        CSV
      </button>
      <button type="button" onClick={handlePdf} disabled={disabled || busy} className={btn} title="Export as PDF">
        <FileText size={14} />
        {busy ? 'Exporting...' : 'PDF'}
      </button>
    </div>
  );
}

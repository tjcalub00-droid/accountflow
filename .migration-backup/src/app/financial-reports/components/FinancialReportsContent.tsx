'use client';
import React, { useState, useRef } from 'react';
import { Download, RefreshCw, X, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import ProfitLossReport from './ProfitLossReport';
import BalanceSheetReport from './BalanceSheetReport';
import CashFlowReport from './CashFlowReport';

const tabs = [
  { id: 'pl', label: 'Profit & Loss' },
  { id: 'bs', label: 'Balance Sheet' },
  { id: 'cf', label: 'Cash Flow' },
];

const periods = [
  { value: 'sep-2026', label: 'September 2026' },
  { value: 'q3-2026', label: 'Q3 2026 (Jul–Sep)' },
  { value: 'ytd-2026', label: 'YTD 2026 (Jan–Sep)' },
  { value: 'fy-2025', label: 'Full Year 2025' },
];

interface CompanyInfo {
  name: string;
  taxId: string;
  address: string;
}

function ExportModal({
  open,
  onClose,
  onExport,
}: {
  open: boolean;
  onClose: () => void;
  onExport: (info: CompanyInfo) => void;
}) {
  const [info, setInfo] = useState<CompanyInfo>({ name: '', taxId: '', address: '' });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExport(info);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-primary" />
            <h2 className="text-base font-semibold text-foreground">Company Details for PDF</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Company Name <span className="text-danger">*</span>
            </label>
            <input
              required
              value={info.name}
              onChange={(e) => setInfo((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. Acme Corporation"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Tax ID / TIN <span className="text-danger">*</span>
            </label>
            <input
              required
              value={info.taxId}
              onChange={(e) => setInfo((p) => ({ ...p, taxId: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. 123-456-789-000"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Address <span className="text-danger">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={info.address}
              onChange={(e) => setInfo((p) => ({ ...p, address: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="e.g. 123 Main St, Manila, Philippines"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-150"
            >
              <Download size={14} />
              Export PDF
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FinancialReportsContent() {
  const [activeTab, setActiveTab] = useState('pl');
  const [period, setPeriod] = useState('q3-2026');
  const [compare, setCompare] = useState(true);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const { profile, user } = useAuth();

  const reportLabel = tabs.find((t) => t.id === activeTab)?.label ?? '';
  const periodLabel = periods.find((p) => p.value === period)?.label ?? period;

  const handleExport = (info: CompanyInfo) => {
    setExportModalOpen(false);

    const exportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const exportedBy = profile?.full_name || user?.email || 'Unknown User';

    // Inject print-only header/footer styles + content
    const styleId = 'pdf-print-style';
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        #report-print-area, #report-print-area * { visibility: visible; }
        #report-print-area { position: fixed; top: 0; left: 0; width: 100%; }
        #pdf-print-header, #pdf-print-footer { display: block !important; }
        @page { margin: 20mm; }
      }
    `;

    // Build header element
    const headerId = 'pdf-print-header';
    let header = document.getElementById(headerId);
    if (!header) {
      header = document.createElement('div');
      header.id = headerId;
      document.body.prepend(header);
    }
    header.style.cssText =
      'display:none; font-family:sans-serif; border-bottom:2px solid #333; padding-bottom:12px; margin-bottom:16px;';
    header.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <div style="font-size:20px; font-weight:700; color:#111;">${info.name}</div>
          <div style="font-size:12px; color:#555; margin-top:2px;">TIN / Tax ID: ${info.taxId}</div>
          <div style="font-size:12px; color:#555;">${info.address}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:15px; font-weight:600; color:#333;">${reportLabel} Report</div>
          <div style="font-size:12px; color:#555; margin-top:2px;">Period: ${periodLabel}</div>
        </div>
      </div>
    `;

    // Build footer element
    const footerId = 'pdf-print-footer';
    let footer = document.getElementById(footerId);
    if (!footer) {
      footer = document.createElement('div');
      footer.id = footerId;
      document.body.appendChild(footer);
    }
    footer.style.cssText =
      'display:none; font-family:sans-serif; border-top:1px solid #ccc; padding-top:8px; margin-top:16px; font-size:11px; color:#666; display:flex; justify-content:space-between;';
    footer.innerHTML = `
      <span>Exported on: ${exportDate}</span>
      <span>Exported by: ${exportedBy}</span>
    `;

    // Wrap report area
    const reportArea = document.getElementById('report-print-area');
    if (!reportArea) {
      const area = document.createElement('div');
      area.id = 'report-print-area';
      const mainContent = document.querySelector('main') || document.body;
      mainContent.appendChild(area);
    }

    setTimeout(() => {
      window.print();
      toast.success('Report exported as PDF');
      // Cleanup after print
      setTimeout(() => {
        document.getElementById(headerId)?.remove();
        document.getElementById(footerId)?.remove();
        document.getElementById(styleId)?.remove();
      }, 1000);
    }, 100);
  };

  return (
    <div className="space-y-4">
      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExport}
      />

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 bg-card border border-border rounded-xl px-5 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 overflow-x-auto">
            {tabs?.map((tab) => (
              <button
                key={`report-tab-${tab?.id}`}
                onClick={() => setActiveTab(tab?.id)}
                className={`px-3 sm:px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-150 whitespace-nowrap ${
                  activeTab === tab?.id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab?.label}
              </button>
            ))}
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e?.target?.value)}
            className="px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {periods?.map((p) => (
              <option key={`period-${p?.value}`} value={p?.value}>{p?.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e?.target?.checked)}
              className="rounded"
            />
            Compare to prior period
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toast?.info('Refreshing report data...')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-150"
          >
            <Download size={14} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Report content */}
      <div id="report-print-area">
        {activeTab === 'pl' && <ProfitLossReport period={period} compare={compare} />}
        {activeTab === 'bs' && <BalanceSheetReport period={period} compare={compare} />}
        {activeTab === 'cf' && <CashFlowReport period={period} compare={compare} />}
      </div>
    </div>
  );
}
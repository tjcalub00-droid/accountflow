'use client';
import React, { useState, useRef } from 'react';
import { Download, RefreshCw, X, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import ProfitLossReport from './ProfitLossReport';
import BalanceSheetReport from './BalanceSheetReport';
import CashFlowReport from './CashFlowReport';
import { exportToCsv } from '@/lib/exportUtils';
import { useFinancialData, type FinancialData } from '../useFinancialData';

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

type CsvRow = { section: string; account: string; current: number; prior: number };

const reportStructures: Record<string, { section: string; accounts: string[] }[]> = {
  pl: [
    { section: 'Revenue', accounts: ['Consulting Services', 'Retainer Contracts', 'Project-Based Work', 'Other Income'] },
    { section: 'Cost of Goods Sold', accounts: ['Subcontractor Fees', 'Project Tools & Licenses'] },
    {
      section: 'Operating Expenses',
      accounts: [
        'Owner Draw / Salary',
        'Software Subscriptions',
        'Marketing & Advertising',
        'Office & Administrative',
        'Travel & Entertainment',
        'Business Insurance',
        'Professional Services',
      ],
    },
  ],
  bs: [
    { section: 'Current Assets', accounts: ['Cash & Cash Equivalents', 'Accounts Receivable', 'Prepaid Expenses', 'Other Current Assets'] },
    { section: 'Fixed Assets', accounts: ['Computer Equipment', 'Office Furniture', 'Capitalized Software'] },
    { section: 'Current Liabilities', accounts: ['Accounts Payable', 'Accrued Expenses', 'Tax Payable (Current)', 'Deferred Revenue'] },
    { section: 'Long-Term Liabilities', accounts: ['Business Line of Credit'] },
    { section: "Owner's Equity", accounts: ["Owner's Capital", 'Retained Earnings'] },
  ],
  cf: [
    {
      section: 'Operating Activities',
      accounts: [
        'Net Income',
        'Depreciation & Amortization',
        'Decrease (Increase) in AR',
        'Increase (Decrease) in AP',
        'Change in Accrued Expenses',
        'Change in Deferred Revenue',
      ],
    },
    { section: 'Investing Activities', accounts: ['Purchase of Equipment', 'Capitalized Software Development'] },
    { section: 'Financing Activities', accounts: ["Owner's Draw", 'Repayment of Line of Credit'] },
  ],
};

function getReportCsvRows(reportId: string, data: FinancialData | null): CsvRow[] {
  const c = data?.current;
  const p = data?.prior;
  const values: Record<string, [number, number]> = {
    'Consulting Services': [c?.pl.revenue.consulting ?? 0, p?.pl.revenue.consulting ?? 0],
    'Retainer Contracts': [c?.pl.revenue.retainer ?? 0, p?.pl.revenue.retainer ?? 0],
    'Project-Based Work': [c?.pl.revenue.project ?? 0, p?.pl.revenue.project ?? 0],
    'Other Income': [c?.pl.revenue.other ?? 0, p?.pl.revenue.other ?? 0],
    'Subcontractor Fees': [c?.pl.cogs.contractors ?? 0, p?.pl.cogs.contractors ?? 0],
    'Project Tools & Licenses': [c?.pl.cogs.tools ?? 0, p?.pl.cogs.tools ?? 0],
    'Owner Draw / Salary': [c?.pl.opex.salaries ?? 0, p?.pl.opex.salaries ?? 0],
    'Software Subscriptions': [c?.pl.opex.software ?? 0, p?.pl.opex.software ?? 0],
    'Marketing & Advertising': [c?.pl.opex.marketing ?? 0, p?.pl.opex.marketing ?? 0],
    'Office & Administrative': [c?.pl.opex.office ?? 0, p?.pl.opex.office ?? 0],
    'Travel & Entertainment': [c?.pl.opex.travel ?? 0, p?.pl.opex.travel ?? 0],
    'Business Insurance': [c?.pl.opex.insurance ?? 0, p?.pl.opex.insurance ?? 0],
    'Professional Services': [c?.pl.opex.professional ?? 0, p?.pl.opex.professional ?? 0],
  };
  const bsValues: Record<string, [number, number]> = {
    'Cash & Cash Equivalents': [c?.bs.cash ?? 0, p?.bs.cash ?? 0],
    'Accounts Receivable': [c?.bs.ar ?? 0, p?.bs.ar ?? 0],
    'Prepaid Expenses': [c?.bs.prepaid ?? 0, p?.bs.prepaid ?? 0],
    'Other Current Assets': [c?.bs.otherCurrent ?? 0, p?.bs.otherCurrent ?? 0],
    'Computer Equipment': [c?.bs.equipment ?? 0, p?.bs.equipment ?? 0],
    'Office Furniture': [c?.bs.furniture ?? 0, p?.bs.furniture ?? 0],
    'Capitalized Software': [c?.bs.software ?? 0, p?.bs.software ?? 0],
    'Accounts Payable': [c?.bs.ap ?? 0, p?.bs.ap ?? 0],
    'Accrued Expenses': [c?.bs.accrued ?? 0, p?.bs.accrued ?? 0],
    'Tax Payable (Current)': [c?.bs.taxPayable ?? 0, p?.bs.taxPayable ?? 0],
    'Deferred Revenue': [c?.bs.deferred ?? 0, p?.bs.deferred ?? 0],
    'Business Line of Credit': [c?.bs.loan ?? 0, p?.bs.loan ?? 0],
    "Owner's Capital": [c?.bs.capital ?? 0, p?.bs.capital ?? 0],
    'Retained Earnings': [c?.bs.retained ?? 0, p?.bs.retained ?? 0],
  };
  const cfValues: Record<string, [number, number]> = {
    'Net Income': [c?.cf.netIncome ?? 0, p?.cf.netIncome ?? 0],
    'Depreciation & Amortization': [c?.cf.depreciation ?? 0, p?.cf.depreciation ?? 0],
    'Decrease (Increase) in AR': [c?.cf.arChange ?? 0, p?.cf.arChange ?? 0],
    'Increase (Decrease) in AP': [c?.cf.apChange ?? 0, p?.cf.apChange ?? 0],
    'Change in Accrued Expenses': [c?.cf.accruedChange ?? 0, p?.cf.accruedChange ?? 0],
    'Change in Deferred Revenue': [c?.cf.deferredChange ?? 0, p?.cf.deferredChange ?? 0],
    'Purchase of Equipment': [c?.cf.equipment ?? 0, p?.cf.equipment ?? 0],
    'Capitalized Software Development': [c?.cf.software ?? 0, p?.cf.software ?? 0],
    "Owner's Draw": [c?.cf.ownerDraw ?? 0, p?.cf.ownerDraw ?? 0],
    'Repayment of Line of Credit': [c?.cf.loanRepayment ?? 0, p?.cf.loanRepayment ?? 0],
  };
  const lookup = reportId === 'pl' ? values : reportId === 'bs' ? bsValues : cfValues;

  const rows: CsvRow[] = [];
  (reportStructures[reportId] ?? []).forEach((sec) => {
    sec.accounts.forEach((account) => {
      const [current, prior] = lookup[account] ?? [0, 0];
      rows.push({ section: sec.section, account, current, prior });
    });
  });
  return rows;
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
  const { data, loading, error, reload } = useFinancialData(period);

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

  const handleExportCsv = () => {
    const rows = getReportCsvRows(activeTab, data);
    exportToCsv(
      `${reportLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${period}`,
      [
        { header: 'Section', key: 'section' },
        { header: 'Account', key: 'account' },
        { header: 'Current', key: 'current' },
        { header: 'Prior', key: 'prior' },
      ],
      rows
    );
    toast.success('Report exported as CSV');
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
            onClick={async () => {
              await reload();
              toast?.success('Report data refreshed');
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <Download size={14} />
            Export CSV
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
        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}
        {!data && loading && <div className="animate-pulse bg-muted rounded-xl h-96 w-full" />}
        {data && activeTab === 'pl' && <ProfitLossReport period={period} compare={compare} data={data} />}
        {data && activeTab === 'bs' && <BalanceSheetReport period={period} compare={compare} data={data} />}
        {data && activeTab === 'cf' && <CashFlowReport period={period} compare={compare} data={data} />}
      </div>
    </div>
  );
}
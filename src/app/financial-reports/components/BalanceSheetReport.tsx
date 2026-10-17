'use client';
import React from 'react';
import type { FinancialData } from '../useFinancialData';

interface Props { period: string; compare: boolean; data: FinancialData; }

function buildBsData(data: FinancialData) {
  const c = data.current.bs;
  const p = data.prior.bs;
  return {
    currentAssets: [
      { id: 'ca-cash', label: 'Cash & Cash Equivalents', current: c.cash, prior: p.cash },
      { id: 'ca-ar', label: 'Accounts Receivable', current: c.ar, prior: p.ar },
      { id: 'ca-prepaid', label: 'Prepaid Expenses', current: c.prepaid, prior: p.prepaid },
      { id: 'ca-other', label: 'Other Current Assets', current: c.otherCurrent, prior: p.otherCurrent },
    ],
    fixedAssets: [
      { id: 'fa-equipment', label: 'Computer Equipment', current: c.equipment, prior: p.equipment },
      { id: 'fa-furniture', label: 'Office Furniture', current: c.furniture, prior: p.furniture },
      { id: 'fa-software', label: 'Capitalized Software', current: c.software, prior: p.software },
    ],
    currentLiabilities: [
      { id: 'cl-ap', label: 'Accounts Payable', current: c.ap, prior: p.ap },
      { id: 'cl-accrued', label: 'Accrued Expenses', current: c.accrued, prior: p.accrued },
      { id: 'cl-tax', label: 'Tax Payable (Current)', current: c.taxPayable, prior: p.taxPayable },
      { id: 'cl-deferred', label: 'Deferred Revenue', current: c.deferred, prior: p.deferred },
    ],
    longTermLiabilities: [
      { id: 'll-loan', label: 'Business Line of Credit', current: c.loan, prior: p.loan },
    ],
    equity: [
      { id: 'eq-capital', label: "Owner's Capital", current: c.capital, prior: p.capital },
      { id: 'eq-retained', label: 'Retained Earnings', current: c.retained, prior: p.retained },
    ],
  };
}

function formatUSD(n: number) {
  if (n < 0) return `(₱${Math.abs(n).toLocaleString('en-US')})`;
  return `₱${n.toLocaleString('en-US')}`;
}

function Section({ title, rows, compare, totalLabel }: {
  title: string;
  rows: { id: string; label: string; current: number; prior: number }[];
  compare: boolean;
  totalLabel: string;
}) {
  const total = rows.reduce((s, r) => s + r.current, 0);
  const totalPrior = rows.reduce((s, r) => s + r.prior, 0);
  return (
    <>
      <tr className="bg-muted/20">
        <td colSpan={compare ? 3 : 2} className="px-5 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </td>
      </tr>
      {rows.map((r) => (
        <tr key={r.id} className="border-b border-border hover:bg-muted/30 transition-colors">
          <td className="px-5 pl-10 py-2.5 text-sm text-foreground">{r.label}</td>
          <td className="px-5 py-2.5 text-right font-mono text-sm text-foreground">{formatUSD(r.current)}</td>
          {compare && <td className="px-5 py-2.5 text-right font-mono text-sm text-muted-foreground">{formatUSD(r.prior)}</td>}
        </tr>
      ))}
      <tr className="border-b border-border bg-muted/50">
        <td className="px-5 py-2.5 text-sm font-semibold text-foreground">{totalLabel}</td>
        <td className="px-5 py-2.5 text-right font-mono text-sm font-bold text-foreground">{formatUSD(total)}</td>
        {compare && <td className="px-5 py-2.5 text-right font-mono text-sm font-semibold text-muted-foreground">{formatUSD(totalPrior)}</td>}
      </tr>
    </>
  );
}

export default function BalanceSheetReport({ period, compare, data }: Props) {
  const bsData = buildBsData(data);
  const totalCurrentAssets = bsData.currentAssets.reduce((s, r) => s + r.current, 0);
  const totalFixedAssets = bsData.fixedAssets.reduce((s, r) => s + r.current, 0);
  const totalAssets = totalCurrentAssets + totalFixedAssets;
  const totalCurrentLiab = bsData.currentLiabilities.reduce((s, r) => s + r.current, 0);
  const totalLTLiab = bsData.longTermLiabilities.reduce((s, r) => s + r.current, 0);
  const totalLiab = totalCurrentLiab + totalLTLiab;
  const totalEquity = bsData.equity.reduce((s, r) => s + r.current, 0);

  const totalAssetsPrior = [...bsData.currentAssets, ...bsData.fixedAssets].reduce((s, r) => s + r.prior, 0);
  const totalLiabPrior = [...bsData.currentLiabilities, ...bsData.longTermLiabilities].reduce((s, r) => s + r.prior, 0);
  const totalEquityPrior = bsData.equity.reduce((s, r) => s + r.prior, 0);

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { id: 'bs-assets', label: 'Total Assets', value: formatUSD(totalAssets), color: 'text-primary' },
          { id: 'bs-liab', label: 'Total Liabilities', value: formatUSD(totalLiab), color: 'text-danger' },
          { id: 'bs-equity', label: "Owner's Equity", value: formatUSD(totalEquity), color: 'text-success' },
        ].map((k) => (
          <div key={k.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{k.label}</p>
            <p className={`text-2xl font-bold font-mono ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assets */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Assets</h3>
              {compare && (
                <div className="flex gap-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <span>Current</span>
                  <span>Prior</span>
                </div>
              )}
            </div>
          </div>
          <table className="w-full">
            <tbody>
              <Section title="Current Assets" rows={bsData.currentAssets} compare={compare} totalLabel="Total Current Assets" />
              <Section title="Fixed Assets" rows={bsData.fixedAssets} compare={compare} totalLabel="Total Fixed Assets" />
              <tr className="bg-primary/5">
                <td className="px-5 py-3 text-sm font-bold text-foreground">TOTAL ASSETS</td>
                <td className="px-5 py-3 text-right font-mono text-sm font-bold text-primary">{formatUSD(totalAssets)}</td>
                {compare && <td className="px-5 py-3 text-right font-mono text-sm font-semibold text-muted-foreground">{formatUSD(totalAssetsPrior)}</td>}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Liabilities + Equity */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-semibold text-foreground">Liabilities & Equity</h3>
          </div>
          <table className="w-full">
            <tbody>
              <Section title="Current Liabilities" rows={bsData.currentLiabilities} compare={compare} totalLabel="Total Current Liabilities" />
              <Section title="Long-Term Liabilities" rows={bsData.longTermLiabilities} compare={compare} totalLabel="Total Long-Term Liabilities" />
              <tr className="bg-danger/5">
                <td className="px-5 py-3 text-sm font-bold text-foreground">TOTAL LIABILITIES</td>
                <td className="px-5 py-3 text-right font-mono text-sm font-bold text-danger">{formatUSD(totalLiab)}</td>
                {compare && <td className="px-5 py-3 text-right font-mono text-sm font-semibold text-muted-foreground">{formatUSD(totalLiabPrior)}</td>}
              </tr>
              <Section title="Owner's Equity" rows={bsData.equity} compare={compare} totalLabel="Total Equity" />
              <tr className="bg-success/5">
                <td className="px-5 py-3 text-sm font-bold text-foreground">TOTAL LIABILITIES + EQUITY</td>
                <td className="px-5 py-3 text-right font-mono text-sm font-bold text-success">{formatUSD(totalLiab + totalEquity)}</td>
                {compare && <td className="px-5 py-3 text-right font-mono text-sm font-semibold text-muted-foreground">{formatUSD(totalLiabPrior + totalEquityPrior)}</td>}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
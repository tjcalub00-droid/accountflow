'use client';
import React from 'react';
import CashFlowChart from './charts/CashFlowChart';

interface Props { period: string; compare: boolean; }

const cfData = {
  operating: [
    { id: 'cfo-ni', label: 'Net Income', current: 0, prior: 0 },
    { id: 'cfo-dep', label: 'Depreciation & Amortization', current: 0, prior: 0 },
    { id: 'cfo-ar', label: 'Decrease (Increase) in AR', current: 0, prior: 0 },
    { id: 'cfo-ap', label: 'Increase (Decrease) in AP', current: 0, prior: 0 },
    { id: 'cfo-accrued', label: 'Change in Accrued Expenses', current: 0, prior: 0 },
    { id: 'cfo-deferred', label: 'Change in Deferred Revenue', current: 0, prior: 0 },
  ],
  investing: [
    { id: 'cfi-equip', label: 'Purchase of Equipment', current: 0, prior: 0 },
    { id: 'cfi-software', label: 'Capitalized Software Development', current: 0, prior: 0 },
  ],
  financing: [
    { id: 'cff-draw', label: "Owner\'s Draw", current: 0, prior: 0 },
    { id: 'cff-loan', label: 'Repayment of Line of Credit', current: 0, prior: 0 },
  ],
};

function formatUSD(n: number) {
  if (n < 0) return `(₱${Math.abs(n).toLocaleString()})`;
  return `₱${n.toLocaleString()}`;
}

export default function CashFlowReport({ period, compare }: Props) {
  const totalOperating = cfData.operating.reduce((s, r) => s + r.current, 0);
  const totalOperatingPrior = cfData.operating.reduce((s, r) => s + r.prior, 0);
  const totalInvesting = cfData.investing.reduce((s, r) => s + r.current, 0);
  const totalInvestingPrior = cfData.investing.reduce((s, r) => s + r.prior, 0);
  const totalFinancing = cfData.financing.reduce((s, r) => s + r.current, 0);
  const totalFinancingPrior = cfData.financing.reduce((s, r) => s + r.prior, 0);
  const netChange = totalOperating + totalInvesting + totalFinancing;
  const netChangePrior = totalOperatingPrior + totalInvestingPrior + totalFinancingPrior;
  const endingCash = 0;
  const beginningCash = endingCash - netChange;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { id: 'cf-op', label: 'Operating Cash Flow', value: formatUSD(totalOperating), color: totalOperating >= 0 ? 'text-success' : 'text-danger' },
          { id: 'cf-inv', label: 'Investing Cash Flow', value: formatUSD(totalInvesting), color: totalInvesting >= 0 ? 'text-success' : 'text-warning' },
          { id: 'cf-fin', label: 'Financing Cash Flow', value: formatUSD(totalFinancing), color: totalFinancing >= 0 ? 'text-success' : 'text-danger' },
          { id: 'cf-net', label: 'Net Cash Change', value: formatUSD(netChange), color: netChange >= 0 ? 'text-success' : 'text-danger' },
        ].map((k) => (
          <div key={k.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{k.label}</p>
            <p className={`text-2xl font-bold font-mono ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Cash Flow</h3>
          <CashFlowChart />
        </div>

        <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <span>Account</span>
              <div className="flex gap-8">
                <span>Current</span>
                {compare && <span>Prior</span>}
              </div>
            </div>
          </div>
          <table className="w-full">
            <tbody>
              {[
                { section: 'Operating Activities', rows: cfData.operating, total: totalOperating, totalPrior: totalOperatingPrior, totalLabel: 'Net Cash from Operations' },
                { section: 'Investing Activities', rows: cfData.investing, total: totalInvesting, totalPrior: totalInvestingPrior, totalLabel: 'Net Cash from Investing' },
                { section: 'Financing Activities', rows: cfData.financing, total: totalFinancing, totalPrior: totalFinancingPrior, totalLabel: 'Net Cash from Financing' },
              ].map((sec) => (
                <React.Fragment key={`cf-sec-${sec.section}`}>
                  <tr className="bg-muted/20">
                    <td colSpan={compare ? 3 : 2} className="px-5 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {sec.section}
                    </td>
                  </tr>
                  {sec.rows.map((r) => (
                    <tr key={r.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-5 pl-10 py-2.5 text-sm text-foreground">{r.label}</td>
                      <td className={`px-5 py-2.5 text-right font-mono text-sm ${r.current < 0 ? 'text-danger' : 'text-foreground'}`}>
                        {formatUSD(r.current)}
                      </td>
                      {compare && (
                        <td className={`px-5 py-2.5 text-right font-mono text-sm ${r.prior < 0 ? 'text-danger/60' : 'text-muted-foreground'}`}>
                          {formatUSD(r.prior)}
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr className="border-b border-border bg-muted/50">
                    <td className="px-5 py-2.5 text-sm font-semibold text-foreground">{sec.totalLabel}</td>
                    <td className={`px-5 py-2.5 text-right font-mono text-sm font-bold ${sec.total < 0 ? 'text-danger' : 'text-success'}`}>
                      {formatUSD(sec.total)}
                    </td>
                    {compare && (
                      <td className={`px-5 py-2.5 text-right font-mono text-sm font-semibold ${sec.totalPrior < 0 ? 'text-danger/60' : 'text-muted-foreground'}`}>
                        {formatUSD(sec.totalPrior)}
                      </td>
                    )}
                  </tr>
                </React.Fragment>
              ))}
              <tr className="bg-muted/30">
                <td className="px-5 py-2.5 text-sm text-foreground">Beginning Cash Balance</td>
                <td className="px-5 py-2.5 text-right font-mono text-sm text-foreground">{formatUSD(beginningCash)}</td>
                {compare && <td className="px-5 py-2.5 text-right font-mono text-sm text-muted-foreground">—</td>}
              </tr>
              <tr className="bg-success/5">
                <td className="px-5 py-3 text-sm font-bold text-foreground">ENDING CASH BALANCE</td>
                <td className="px-5 py-3 text-right font-mono text-sm font-bold text-success">{formatUSD(endingCash)}</td>
                {compare && <td className="px-5 py-3 text-right font-mono text-sm font-semibold text-muted-foreground">—</td>}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
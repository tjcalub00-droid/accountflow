'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const PLChart = dynamic(() => import('./charts/PLChart'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-muted rounded-xl h-56 w-full" />,
});

interface Props {
  period: string;
  compare: boolean;
}

const plData = {
  revenue: [
    { id: 'rev-consulting', label: 'Consulting Services', current: 0, prior: 0 },
    { id: 'rev-retainer', label: 'Retainer Contracts', current: 0, prior: 0 },
    { id: 'rev-project', label: 'Project-Based Work', current: 0, prior: 0 },
    { id: 'rev-other', label: 'Other Income', current: 0, prior: 0 },
  ],
  cogs: [
    { id: 'cogs-contractors', label: 'Subcontractor Fees', current: 0, prior: 0 },
    { id: 'cogs-tools', label: 'Project Tools & Licenses', current: 0, prior: 0 },
  ],
  opex: [
    { id: 'opex-salaries', label: 'Owner Draw / Salary', current: 0, prior: 0 },
    { id: 'opex-software', label: 'Software Subscriptions', current: 0, prior: 0 },
    { id: 'opex-marketing', label: 'Marketing & Advertising', current: 0, prior: 0 },
    { id: 'opex-office', label: 'Office & Administrative', current: 0, prior: 0 },
    { id: 'opex-travel', label: 'Travel & Entertainment', current: 0, prior: 0 },
    { id: 'opex-insurance', label: 'Business Insurance', current: 0, prior: 0 },
    { id: 'opex-professional', label: 'Professional Services', current: 0, prior: 0 },
  ],
};

function formatUSD(n: number) {
  return `₱${n.toLocaleString()}`;
}

function formatChange(current: number, prior: number) {
  if (!prior) return null;
  const pct = ((current - prior) / prior) * 100;
  const positive = pct >= 0;
  return (
    <span className={`text-xs font-semibold ${positive ? 'text-success' : 'text-danger'}`}>
      {positive ? '+' : ''}{pct.toFixed(1)}%
    </span>
  );
}

interface ReportRowProps {
  id: string;
  label: string;
  current: number;
  prior: number;
  compare: boolean;
  bold?: boolean;
  indent?: boolean;
  highlight?: 'positive' | 'negative' | 'neutral';
}

function ReportRow({ id, label, current, prior, compare, bold, indent, highlight }: ReportRowProps) {
  const bgMap = {
    positive: 'bg-success/5',
    negative: 'bg-danger/5',
    neutral: 'bg-muted/50',
  };
  return (
    <tr className={`border-b border-border last:border-0 ${highlight ? bgMap[highlight] : 'hover:bg-muted/30'} transition-colors`}>
      <td className={`px-5 py-2.5 text-sm ${bold ? 'font-semibold text-foreground' : 'text-foreground'} ${indent ? 'pl-10' : ''}`}>
        {label}
      </td>
      <td className={`px-5 py-2.5 text-right font-mono text-sm ${bold ? 'font-bold text-foreground' : 'text-foreground'}`}>
        {formatUSD(current)}
      </td>
      {compare && (
        <>
          <td className="px-5 py-2.5 text-right font-mono text-sm text-muted-foreground">
            {formatUSD(prior)}
          </td>
          <td className="px-5 py-2.5 text-right">
            {formatChange(current, prior)}
          </td>
        </>
      )}
    </tr>
  );
}

export default function ProfitLossReport({ period, compare }: Props) {
  const totalRevenue = plData.revenue.reduce((s, r) => s + r.current, 0);
  const totalRevenuePrior = plData.revenue.reduce((s, r) => s + r.prior, 0);
  const totalCOGS = plData.cogs.reduce((s, r) => s + r.current, 0);
  const totalCOGSPrior = plData.cogs.reduce((s, r) => s + r.prior, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const grossProfitPrior = totalRevenuePrior - totalCOGSPrior;
  const totalOpex = plData.opex.reduce((s, r) => s + r.current, 0);
  const totalOpexPrior = plData.opex.reduce((s, r) => s + r.prior, 0);
  const netIncome = grossProfit - totalOpex;
  const netIncomePrior = grossProfitPrior - totalOpexPrior;
  const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0';
  const netMargin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-4">
      {/* KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { id: 'pl-kpi-rev', label: 'Total Revenue', value: formatUSD(totalRevenue), sub: `Prior: ${formatUSD(totalRevenuePrior)}`, color: 'text-foreground' },
          { id: 'pl-kpi-gp', label: 'Gross Profit', value: formatUSD(grossProfit), sub: `Margin: ${grossMargin}%`, color: 'text-success' },
          { id: 'pl-kpi-opex', label: 'Operating Expenses', value: formatUSD(totalOpex), sub: `Prior: ${formatUSD(totalOpexPrior)}`, color: 'text-warning' },
          { id: 'pl-kpi-ni', label: 'Net Income', value: formatUSD(netIncome), sub: `Net margin: ${netMargin}%`, color: netIncome > 0 ? 'text-success' : 'text-danger' },
        ].map((k) => (
          <div key={k.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{k.label}</p>
            <p className={`text-2xl font-bold font-mono ${k.color}`}>{k.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="lg:col-span-1 bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Trend</h3>
          <PLChart />
        </div>

        {/* Table */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <div className="grid grid-cols-12 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <div className="col-span-6">Account</div>
              <div className="col-span-2 text-right">Current</div>
              {compare && (
                <>
                  <div className="col-span-2 text-right">Prior</div>
                  <div className="col-span-2 text-right">Change</div>
                </>
              )}
            </div>
          </div>
          <table className="w-full">
            <tbody>
              <tr className="bg-muted/20">
                <td colSpan={compare ? 4 : 2} className="px-5 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Revenue
                </td>
              </tr>
              {plData.revenue.map((r) => (
                <ReportRow key={r.id} {...r} compare={compare} indent />
              ))}
              <ReportRow id="total-rev" label="Total Revenue" current={totalRevenue} prior={totalRevenuePrior} compare={compare} bold highlight="neutral" />

              <tr className="bg-muted/20">
                <td colSpan={compare ? 4 : 2} className="px-5 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Cost of Goods Sold
                </td>
              </tr>
              {plData.cogs.map((r) => (
                <ReportRow key={r.id} {...r} compare={compare} indent />
              ))}
              <ReportRow id="total-cogs" label="Total COGS" current={totalCOGS} prior={totalCOGSPrior} compare={compare} bold highlight="neutral" />
              <ReportRow id="gross-profit" label="Gross Profit" current={grossProfit} prior={grossProfitPrior} compare={compare} bold highlight="positive" />

              <tr className="bg-muted/20">
                <td colSpan={compare ? 4 : 2} className="px-5 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Operating Expenses
                </td>
              </tr>
              {plData.opex.map((r) => (
                <ReportRow key={r.id} {...r} compare={compare} indent />
              ))}
              <ReportRow id="total-opex" label="Total Operating Expenses" current={totalOpex} prior={totalOpexPrior} compare={compare} bold highlight="neutral" />
              <ReportRow id="net-income" label="Net Income" current={netIncome} prior={netIncomePrior} compare={compare} bold highlight={netIncome >= 0 ? 'positive' : 'negative'} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
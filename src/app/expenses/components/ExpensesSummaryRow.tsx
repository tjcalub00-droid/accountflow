import React from 'react';
import { TrendingDown, Tag, Receipt, CheckCircle2 } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const stats = [
  {
    id: 'exp-stat-total',
    label: 'Total Expenses',
    value: '$0',
    sub: '0 transactions',
    icon: TrendingDown,
    iconBg: 'bg-danger/10',
    iconColor: 'text-danger',
  },
  {
    id: 'exp-stat-deductible',
    label: 'Tax Deductible',
    value: '$0',
    sub: '0% of total',
    icon: Tag,
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
  },
  {
    id: 'exp-stat-receipts',
    label: 'Missing Receipts',
    value: '0',
    sub: '$0 unverified',
    icon: Receipt,
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
  },
  {
    id: 'exp-stat-approved',
    label: 'Approved',
    value: '0',
    sub: 'of 0 transactions',
    icon: CheckCircle2,
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
  },
];

export default function ExpensesSummaryRow() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats?.map((s) => {
        const Icon = s?.icon;
        return (
          <div key={s?.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {s?.label}
              </p>
              <div className={`w-8 h-8 rounded-lg ${s?.iconBg} flex items-center justify-center`}>
                <Icon size={14} className={s?.iconColor} />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{s?.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s?.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
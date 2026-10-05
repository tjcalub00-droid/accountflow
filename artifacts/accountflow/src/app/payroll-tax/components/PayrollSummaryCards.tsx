import React from 'react';
import { Users, DollarSign, AlertTriangle, Calendar } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const cards = [
  {
    id: 'pr-employees',
    label: 'Active Employees',
    value: '0',
    sub: 'No employees added yet',
    icon: Users,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    id: 'pr-next',
    label: 'Next Payroll',
    value: '₱0',
    sub: 'Bimonthly — no payroll scheduled',
    icon: DollarSign,
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
  },
  {
    id: 'pr-ytd',
    label: 'Total Payroll YTD',
    value: '₱0',
    sub: 'Gross wages YTD (24 pay periods)',
    icon: Calendar,
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
  },
  {
    id: 'pr-tax-due',
    label: 'Payroll Tax Due',
    value: '₱0',
    sub: 'No tax obligations',
    icon: AlertTriangle,
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
  },
];

export default function PayrollSummaryCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards?.map((c) => {
        const Icon = c?.icon;
        return (
          <div key={c?.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{c?.label}</p>
              <div className={`w-8 h-8 rounded-lg ${c?.iconBg} flex items-center justify-center`}>
                <Icon size={14} className={c?.iconColor} />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{c?.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{c?.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
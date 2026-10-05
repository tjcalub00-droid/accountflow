import React from 'react';
import { FileText, CheckCircle2, Clock } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';



const stats = [
  {
    id: 'stat-total-sent',
    label: 'Total Invoiced',
    value: '₱0',
    icon: FileText,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    sub: '0 invoices',
  },
  {
    id: 'stat-collected',
    label: 'Collected',
    value: '₱0',
    icon: CheckCircle2,
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
    sub: '0% collection rate',
  },
  {
    id: 'stat-outstanding',
    label: 'Outstanding',
    value: '₱0',
    icon: Clock,
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
    sub: '0 open invoices',
  },
];

export default function InvoicesSummaryStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
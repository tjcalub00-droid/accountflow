'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { FileText, CheckCircle2, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface InvoiceTotals {
  collectedAmount: number;
  collectedCount: number;
  outstandingAmount: number;
  outstandingCount: number;
}

const formatPeso = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function InvoicesSummaryStats() {
  const { getEffectiveOwnerId } = useAuth();
  const effectiveOwnerId = getEffectiveOwnerId();
  const [totals, setTotals] = useState<InvoiceTotals>({
    collectedAmount: 0,
    collectedCount: 0,
    outstandingAmount: 0,
    outstandingCount: 0,
  });

  const loadTotals = useCallback(async () => {
    try {
      const ownerId = effectiveOwnerId;
      if (!ownerId) return;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('invoices')
        .select('total, status')
        .eq('owner_id', ownerId);
      if (error) return;

      const next: InvoiceTotals = {
        collectedAmount: 0,
        collectedCount: 0,
        outstandingAmount: 0,
        outstandingCount: 0,
      };
      (data || []).forEach((row: any) => {
        const amt = Number(row?.total) || 0;
        if (row?.status === 'paid') {
          next.collectedAmount += amt;
          next.collectedCount += 1;
        } else if (row?.status !== 'void') {
          next.outstandingAmount += amt;
          next.outstandingCount += 1;
        }
      });
      setTotals(next);
    } catch {
      // keep previous totals on failure
    }
  }, [effectiveOwnerId]);

  useEffect(() => {
    loadTotals();
    const handler = () => loadTotals();
    window.addEventListener('invoices-changed', handler);
    return () => window.removeEventListener('invoices-changed', handler);
  }, [loadTotals]);

  const totalInvoiced = totals.collectedAmount + totals.outstandingAmount;
  const totalCount = totals.collectedCount + totals.outstandingCount;
  const rate = totalInvoiced > 0 ? Math.round((totals.collectedAmount / totalInvoiced) * 100) : 0;

  const stats = [
    {
      id: 'stat-total-sent',
      label: 'Total Invoiced',
      value: formatPeso(totalInvoiced),
      icon: FileText,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      sub: `${totalCount} invoice${totalCount === 1 ? '' : 's'} (paid + unpaid)`,
    },
    {
      id: 'stat-collected',
      label: 'Paid',
      value: formatPeso(totals.collectedAmount),
      icon: CheckCircle2,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
      sub: `${rate}% paid`,
    },
    {
      id: 'stat-outstanding',
      label: 'Unpaid',
      value: formatPeso(totals.outstandingAmount),
      icon: Clock,
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
      sub: `${totals.outstandingCount} unpaid invoice${totals.outstandingCount === 1 ? '' : 's'}`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((s) => {
        const StatIcon = s.icon;
        return (
          <div key={s.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {s.label}
              </p>
              <div className={`w-8 h-8 rounded-lg ${s.iconBg} flex items-center justify-center`}>
                <StatIcon size={14} className={s.iconColor} />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
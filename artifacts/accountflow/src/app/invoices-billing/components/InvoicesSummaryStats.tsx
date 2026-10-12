import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { INVOICES_CHANGED_EVENT } from './invoiceEvents';

interface InvoiceSummary {
  totalInvoiced: number;
  collected: number;
  outstanding: number;
  paidCount: number;
  openCount: number;
}

interface MonthRange {
  start: string;
  end: string;
  label: string;
}

const emptySummary: InvoiceSummary = {
  totalInvoiced: 0,
  collected: 0,
  outstanding: 0,
  paidCount: 0,
  openCount: 0,
};

const openStatuses = new Set(['pending', 'sent', 'overdue', 'partial']);

function asLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentMonthRange(): MonthRange {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    start: asLocalDateKey(firstDay),
    end: asLocalDateKey(lastDay),
    label: now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  };
}

const currency = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function InvoicesSummaryStats() {
  const { getEffectiveOwnerId, loading: authLoading } = useAuth();
  const ownerId = getEffectiveOwnerId();
  const monthRange = useMemo(getCurrentMonthRange, []);
  const supabase = useMemo(() => createClient(), []);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    let active = true;

    const fetchSummary = async () => {
      if (!ownerId) {
        setSummary(emptySummary);
        setLoadError(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(false);
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('total, status')
          .eq('owner_id', ownerId)
          .gte('issue_date', monthRange.start)
          .lte('issue_date', monthRange.end);

        if (error) throw error;

        const invoices = (data ?? []) as unknown as Array<{
          total: number | string | null;
          status: string;
        }>;
        const paidInvoices = invoices.filter((invoice) => invoice.status === 'paid');
        const openInvoices = invoices.filter((invoice) => openStatuses.has(invoice.status));
        const sumTotals = (rows: typeof invoices) =>
          rows.reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);

        if (active) {
          setSummary({
            totalInvoiced: sumTotals([...paidInvoices, ...openInvoices]),
            collected: sumTotals(paidInvoices),
            outstanding: sumTotals(openInvoices),
            paidCount: paidInvoices.length,
            openCount: openInvoices.length,
          });
          setLoadError(false);
        }
      } catch {
        if (active) {
          setSummary(null);
          setLoadError(true);
          toast.error('Failed to load this month’s invoice totals');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchSummary();

    const channel = ownerId
      ? supabase
          .channel(`invoice-summary-${ownerId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'invoices',
              filter: `owner_id=eq.${ownerId}`,
            },
            () => void fetchSummary()
          )
          .subscribe()
      : null;

    const handleLocalChange = () => void fetchSummary();
    window.addEventListener(INVOICES_CHANGED_EVENT, handleLocalChange);

    return () => {
      active = false;
      window.removeEventListener(INVOICES_CHANGED_EVENT, handleLocalChange);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [authLoading, monthRange, ownerId, supabase]);

  const errorSub = loadError ? 'Could not load invoice data' : null;
  const cards = [
    {
      id: 'stat-total-invoiced',
      label: 'Total Invoiced',
      value: loading ? '—' : loadError ? '—' : currency.format(summary?.totalInvoiced ?? 0),
      icon: FileText,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      sub: errorSub ?? `Paid + open invoices · ${monthRange.label}`,
    },
    {
      id: 'stat-collected',
      label: 'Collected',
      value: loading ? '—' : loadError ? '—' : currency.format(summary?.collected ?? 0),
      icon: CheckCircle2,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
      sub: errorSub ?? `${summary?.paidCount ?? 0} paid invoices · ${monthRange.label}`,
    },
    {
      id: 'stat-outstanding',
      label: 'Outstanding',
      value: loading ? '—' : loadError ? '—' : currency.format(summary?.outstanding ?? 0),
      icon: Clock,
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
      sub: errorSub ?? `${summary?.openCount ?? 0} open · ${monthRange.label} · full Partial totals`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {card.label}
              </p>
              <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <Icon size={14} className={card.iconColor} />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground" aria-live="polite">
              {card.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
          </div>
        );
      })}
    </div>
  );
}

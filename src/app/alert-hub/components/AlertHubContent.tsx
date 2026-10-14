'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CalendarClock,
  Users,
  UserX,
  CheckCircle2,
  X,
  Eye,
  RotateCcw,
  BellOff,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ExportButtons from '@/components/ui/ExportButtons';
import Icon from '@/components/ui/AppIcon';


type AlertCategory = 'overdue_invoice' | 'tax_deadline' | 'pending_payroll' | 'profile_gap';
type AlertSeverity = 'critical' | 'warning' | 'info';
type AckState = 'acknowledged' | 'dismissed';

interface HubAlert {
  key: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  dueDate: string | null;
  href: string;
}

const categoryMeta: Record<AlertCategory, { label: string; icon: React.ElementType }> = {
  overdue_invoice: { label: 'Overdue Invoices', icon: AlertTriangle },
  tax_deadline: { label: 'Tax Deadlines', icon: CalendarClock },
  pending_payroll: { label: 'Pending Payroll', icon: Users },
  profile_gap: { label: 'Employee Profile Gaps', icon: UserX },
};

const severityStyles: Record<AlertSeverity, string> = {
  critical: 'bg-danger/10 text-danger border-danger/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  info: 'bg-primary/10 text-primary border-primary/20',
};

const filterTabs: { id: 'all' | AlertCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'overdue_invoice', label: 'Invoices' },
  { id: 'tax_deadline', label: 'Tax' },
  { id: 'pending_payroll', label: 'Payroll' },
  { id: 'profile_gap', label: 'Profiles' },
];

const fmtMoney = (n: number) => `₱${n.toLocaleString('en-US')}`;

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysBetween(fromISO: string, toISOStr: string): number {
  const a = new Date(`${fromISO}T00:00:00`).getTime();
  const b = new Date(`${toISOStr}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

function buildTaxDeadlines(todayISO: string): HubAlert[] {
  const today = new Date(`${todayISO}T00:00:00`);
  const alerts: HubAlert[] = [];
  const obligations = [
    { id: 'sss', label: 'SSS contributions remittance', day: 10 },
    { id: 'pagibig', label: 'Pag-IBIG contributions remittance', day: 10 },
    { id: 'wht', label: 'BIR withholding tax on compensation (1601-C)', day: 10 },
    { id: 'vat', label: 'BIR VAT return (2550M/Q)', day: 25 },
  ];
  for (let offset = 0; offset <= 1; offset++) {
    const base = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    for (const ob of obligations) {
      const due = new Date(base.getFullYear(), base.getMonth(), ob.day);
      const dueISO = toISO(due);
      const diff = daysBetween(todayISO, dueISO);
      if (diff < -3 || diff > 14) continue;
      const monthLabel = due.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      alerts.push({
        key: `tax:${ob.id}:${dueISO}`,
        category: 'tax_deadline',
        severity: diff < 0 ? 'critical' : diff <= 3 ? 'warning' : 'info',
        title: `${ob.label} — ${monthLabel}`,
        description:
          diff < 0
            ? `Deadline passed ${Math.abs(diff)} day(s) ago`
            : diff === 0
            ? 'Due today'
            : `Due in ${diff} day(s)`,
        dueDate: dueISO,
        href: '/payroll-tax',
      });
    }
  }
  return alerts;
}

function isSchemaError(error: any): boolean {
  if (!error) return false;
  if (error.code && typeof error.code === 'string') {
    const cls = error.code.substring(0, 2);
    if (cls === '42' || cls === '08') return true;
  }
  return /relation.*does not exist|column.*does not exist/i.test(error.message || '');
}

export default function AlertHubContent() {
  const { getEffectiveOwnerId, isOwner, isAccountant, user } = useAuth();
  const supabase = createClient();
  const canAct = isOwner() || isAccountant();

  const [alerts, setAlerts] = useState<HubAlert[]>([]);
  const [acks, setAcks] = useState<Record<string, AckState>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | AlertCategory>('all');
  const [showHandled, setShowHandled] = useState(false);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const ownerId = getEffectiveOwnerId();
      if (!ownerId) return;
      const todayISO = toISO(new Date());
      const built: HubAlert[] = [];

      const [invRes, payRes, empRes, ackRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('id, invoice_number, customer, due_date, total, status')
          .eq('owner_id', ownerId)
          .not('status', 'in', '(paid,void,draft)')
          .lt('due_date', todayISO),
        supabase
          .from('payroll_runs')
          .select('id, pay_period, pay_date, status, net_pay')
          .eq('owner_id', ownerId)
          .in('status', ['pending', 'scheduled', 'processing']),
        supabase
          .from('employees')
          .select('id, full_name, role, monthly_salary, sss_rate, pagibig_rate, hdmf_rate')
          .eq('owner_id', ownerId)
          .eq('is_active', true),
        supabase.from('alert_acknowledgements').select('alert_key, action').eq('owner_id', ownerId),
      ]);

      if (invRes.error && !isSchemaError(invRes.error)) toast.error('Failed to load invoice alerts');
      (invRes.data || []).forEach((row: any) => {
        const days = daysBetween(row.due_date, todayISO);
        built.push({
          key: `invoice:${row.id}`,
          category: 'overdue_invoice',
          severity: days > 14 ? 'critical' : 'warning',
          title: `${row.invoice_number} — ${row.customer}`,
          description: `${fmtMoney(Number(row.total))} overdue by ${days} day(s)`,
          dueDate: row.due_date,
          href: '/invoices-billing',
        });
      });

      if (payRes.error && !isSchemaError(payRes.error)) toast.error('Failed to load payroll alerts');
      const grouped = new Map<string, { period: string; payDate: string; status: string; count: number; net: number }>();
      (payRes.data || []).forEach((row: any) => {
        const k = `${row.pay_period}|${row.pay_date}|${row.status}`;
        const g = grouped.get(k) || { period: row.pay_period, payDate: row.pay_date, status: row.status, count: 0, net: 0 };
        g.count += 1;
        g.net += Number(row.net_pay);
        grouped.set(k, g);
      });
      grouped.forEach((g, k) => {
        const diff = daysBetween(todayISO, g.payDate);
        built.push({
          key: `payroll:${k}`,
          category: 'pending_payroll',
          severity: diff < 0 ? 'critical' : diff <= 3 ? 'warning' : 'info',
          title: `Payroll ${g.period} is ${g.status}`,
          description: `${g.count} record(s), net ${fmtMoney(g.net)} — pay date ${g.payDate}${
            diff < 0 ? ` (${Math.abs(diff)} day(s) past)` : ''
          }`,
          dueDate: g.payDate,
          href: '/payroll-tax',
        });
      });

      if (empRes.error && !isSchemaError(empRes.error)) toast.error('Failed to load employee alerts');
      (empRes.data || []).forEach((row: any) => {
        const missing: string[] = [];
        if (!row.role || !String(row.role).trim()) missing.push('role');
        if (!Number(row.monthly_salary)) missing.push('monthly salary');
        if (!Number(row.sss_rate)) missing.push('SSS rate');
        if (!Number(row.pagibig_rate)) missing.push('Pag-IBIG rate');
        if (!Number(row.hdmf_rate)) missing.push('HDMF rate');
        if (missing.length > 0) {
          built.push({
            key: `profile:${row.id}:${missing.join(',')}`,
            category: 'profile_gap',
            severity: missing.includes('monthly salary') || missing.includes('role') ? 'warning' : 'info',
            title: row.full_name || 'Unnamed employee',
            description: `Missing: ${missing.join(', ')}`,
            dueDate: null,
            href: '/employee-management',
          });
        }
      });

      built.push(...buildTaxDeadlines(todayISO));

      const sevOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
      built.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);
      setAlerts(built);

      if (ackRes.error && !isSchemaError(ackRes.error)) toast.error('Failed to load alert states');
      const map: Record<string, AckState> = {};
      (ackRes.data || []).forEach((r: any) => {
        map[r.alert_key] = r.action as AckState;
      });
      setAcks(map);
    } catch (err: any) {
      toast.error(err?.message || 'Error loading alerts');
    } finally {
      setLoading(false);
    }
  }, [getEffectiveOwnerId, supabase]);

  useEffect(() => {
    loadAlerts();
  }, []);

  const setAction = async (key: string, action: AckState) => {
    if (!canAct) return;
    const ownerId = getEffectiveOwnerId();
    if (!ownerId) return;
    const { error } = await supabase
      .from('alert_acknowledgements')
      .upsert(
        { owner_id: ownerId, alert_key: key, action, acted_by: user?.id ?? null },
        { onConflict: 'owner_id,alert_key' }
      );
    if (error) {
      toast.error('Failed to update alert');
      return;
    }
    setAcks((prev) => ({ ...prev, [key]: action }));
    toast.success(action === 'acknowledged' ? 'Alert acknowledged' : 'Alert dismissed');
  };

  const restore = async (key: string) => {
    if (!canAct) return;
    const ownerId = getEffectiveOwnerId();
    if (!ownerId) return;
    const { error } = await supabase
      .from('alert_acknowledgements')
      .delete()
      .eq('owner_id', ownerId)
      .eq('alert_key', key);
    if (error) {
      toast.error('Failed to restore alert');
      return;
    }
    setAcks((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    toast.success('Alert restored');
  };

  const active = useMemo(() => alerts.filter((a) => !acks[a.key]), [alerts, acks]);
  const acknowledged = useMemo(() => alerts.filter((a) => acks[a.key] === 'acknowledged'), [alerts, acks]);
  const dismissed = useMemo(() => alerts.filter((a) => acks[a.key] === 'dismissed'), [alerts, acks]);

  const visibleActive = filter === 'all' ? active : active.filter((a) => a.category === filter);
  const handled = [...acknowledged, ...dismissed].filter((a) => filter === 'all' || a.category === filter);

  const countBy = (cat: AlertCategory) => active.filter((a) => a.category === cat).length;

  const exportRows = alerts.map((a) => ({
    category: categoryMeta[a.category].label,
    severity: a.severity,
    title: a.title,
    description: a.description,
    dueDate: a.dueDate ?? '',
    state: acks[a.key] ?? 'active',
  }));

  const renderAlert = (a: HubAlert, handledView: boolean) => {
    const Icon = categoryMeta[a.category].icon;
    const state = acks[a.key];
    return (
      <div
        key={a.key}
        className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-b border-border last:border-0 ${
          handledView ? 'opacity-70' : ''
        }`}
      >
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${severityStyles[a.severity]}`}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">{a.title}</p>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${severityStyles[a.severity]}`}>
              {a.severity}
            </span>
            {state && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-muted text-muted-foreground border border-border">
                {state}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link
            href={a.href}
            className="px-2.5 py-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors"
          >
            View
          </Link>
          {canAct && !handledView && (
            <>
              <button
                onClick={() => setAction(a.key, 'acknowledged')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-success border border-success/30 rounded-lg hover:bg-success/10 transition-colors"
              >
                <Eye size={12} />
                Acknowledge
              </button>
              <button
                onClick={() => setAction(a.key, 'dismissed')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <X size={12} />
                Dismiss
              </button>
            </>
          )}
          {canAct && handledView && (
            <button
              onClick={() => restore(a.key)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <RotateCcw size={12} />
              Restore
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.keys(categoryMeta) as AlertCategory[]).map((cat) => {
          const Icon = categoryMeta[cat].icon;
          const n = countBy(cat);
          return (
            <button
              key={`sum-${cat}`}
              onClick={() => setFilter(cat)}
              className="bg-card border border-border rounded-xl p-4 shadow-sm text-left hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {categoryMeta[cat].label}
                </p>
                <Icon size={16} className={n > 0 ? 'text-warning' : 'text-success'} />
              </div>
              <p className={`text-2xl font-bold font-mono ${n > 0 ? 'text-foreground' : 'text-success'}`}>{n}</p>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border rounded-xl px-5 py-3">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1 overflow-x-auto">
          {filterTabs.map((t) => (
            <button
              key={`ft-${t.id}`}
              onClick={() => setFilter(t.id)}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all duration-150 whitespace-nowrap ${
                filter === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowHandled((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <BellOff size={14} />
            {showHandled ? 'Hide' : 'Show'} handled ({acknowledged.length + dismissed.length})
          </button>
          <ExportButtons
            filename="alert-hub"
            title="Alert Hub Report"
            columns={[
              { header: 'Category', key: 'category' },
              { header: 'Severity', key: 'severity' },
              { header: 'Alert', key: 'title' },
              { header: 'Details', key: 'description' },
              { header: 'Due Date', key: 'dueDate' },
              { header: 'State', key: 'state' },
            ]}
            rows={exportRows}
          />
        </div>
      </div>

      {/* Active alerts */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Active Alerts ({visibleActive.length})</h3>
        </div>
        {loading ? (
          <div className="px-4 py-16 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading alerts...</p>
          </div>
        ) : visibleActive.length === 0 ? (
          <div className="px-4 py-14 flex flex-col items-center gap-2 text-center">
            <CheckCircle2 size={32} className="text-success" />
            <p className="text-sm font-semibold text-foreground">All clear</p>
            <p className="text-xs text-muted-foreground">No active alerts in this category.</p>
          </div>
        ) : (
          visibleActive.map((a) => renderAlert(a, false))
        )}
      </div>

      {/* Handled */}
      {showHandled && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-semibold text-foreground">Acknowledged & Dismissed ({handled.length})</h3>
          </div>
          {handled.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-muted-foreground">Nothing here yet.</div>
          ) : (
            handled.map((a) => renderAlert(a, true))
          )}
        </div>
      )}
    </div>
  );
}

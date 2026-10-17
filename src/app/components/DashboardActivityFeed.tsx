'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Receipt,
  Users,
  Ticket,
  ImageIcon,
  UsersRound,
  History,
  type LucideIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ActivityItem {
  key: string;
  icon: LucideIcon;
  title: string;
  detail: string;
  href: string;
  timestamp: string;
}

const LIMIT = 8;

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function wasEdited(created?: string, updated?: string): boolean {
  if (!created || !updated) return false;
  return new Date(updated).getTime() - new Date(created).getTime() > 2000;
}

export default function DashboardActivityFeed() {
  const { profile, loading: authLoading, getEffectiveOwnerId } = useAuth();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const ownerId = profile ? getEffectiveOwnerId() : null;
    if (!ownerId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    let cancelled = false;

    const load = async () => {
      const [inv, exp, pay, vou, rec, emp, logs] = await Promise.all([
        supabase.from('invoices').select('id, invoice_number, customer, total, created_at, updated_at').eq('owner_id', ownerId).order('updated_at', { ascending: false }).limit(LIMIT),
        supabase.from('expenses').select('id, vendor, category, amount, created_at, updated_at').eq('owner_id', ownerId).order('updated_at', { ascending: false }).limit(LIMIT),
        supabase.from('payroll_runs').select('id, employee_name, pay_period, net_pay, created_at, updated_at').eq('owner_id', ownerId).order('updated_at', { ascending: false }).limit(LIMIT),
        supabase.from('vouchers').select('id, voucher_number, party_name, amount, created_at, updated_at').eq('owner_id', ownerId).order('updated_at', { ascending: false }).limit(LIMIT),
        supabase.from('receipts').select('id, file_name, created_at').eq('owner_id', ownerId).order('created_at', { ascending: false }).limit(LIMIT),
        supabase.from('employees').select('id, full_name, role, created_at, updated_at').eq('owner_id', ownerId).order('updated_at', { ascending: false }).limit(LIMIT),
        supabase.from('invoice_logs').select('id, invoice_id, modified_by_name, created_at').eq('owner_id', ownerId).order('created_at', { ascending: false }).limit(LIMIT),
      ]);

      const out: ActivityItem[] = [];
      const money = (n: unknown) => `₱${Number(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

      (inv.data ?? []).forEach((r: any) =>
        out.push({
          key: `inv-${r.id}`,
          icon: FileText,
          title: `Invoice ${r.invoice_number} ${wasEdited(r.created_at, r.updated_at) ? 'updated' : 'created'}`,
          detail: `${r.customer} · ${money(r.total)}`,
          href: '/invoices-billing',
          timestamp: r.updated_at ?? r.created_at,
        })
      );
      (exp.data ?? []).forEach((r: any) =>
        out.push({
          key: `exp-${r.id}`,
          icon: Receipt,
          title: `Expense ${wasEdited(r.created_at, r.updated_at) ? 'updated' : 'logged'}`,
          detail: `${r.vendor} · ${r.category} · ${money(r.amount)}`,
          href: '/expenses',
          timestamp: r.updated_at ?? r.created_at,
        })
      );
      (pay.data ?? []).forEach((r: any) =>
        out.push({
          key: `pay-${r.id}`,
          icon: Users,
          title: `Payroll ${wasEdited(r.created_at, r.updated_at) ? 'updated' : 'run'}`,
          detail: `${r.employee_name} · ${r.pay_period} · ${money(r.net_pay)}`,
          href: '/payroll-tax',
          timestamp: r.updated_at ?? r.created_at,
        })
      );
      (vou.data ?? []).forEach((r: any) =>
        out.push({
          key: `vou-${r.id}`,
          icon: Ticket,
          title: `Voucher ${r.voucher_number} ${wasEdited(r.created_at, r.updated_at) ? 'updated' : 'created'}`,
          detail: `${r.party_name} · ${money(r.amount)}`,
          href: '/voucher-management',
          timestamp: r.updated_at ?? r.created_at,
        })
      );
      (rec.data ?? []).forEach((r: any) =>
        out.push({
          key: `rec-${r.id}`,
          icon: ImageIcon,
          title: 'Receipt uploaded',
          detail: r.file_name,
          href: '/receipt-storage',
          timestamp: r.created_at,
        })
      );
      (emp.data ?? []).forEach((r: any) =>
        out.push({
          key: `emp-${r.id}`,
          icon: UsersRound,
          title: `Employee ${wasEdited(r.created_at, r.updated_at) ? 'updated' : 'added'}`,
          detail: `${r.full_name}${r.role ? ` · ${r.role}` : ''}`,
          href: '/employee-management',
          timestamp: r.updated_at ?? r.created_at,
        })
      );
      (logs.data ?? []).forEach((r: any) =>
        out.push({
          key: `log-${r.id}`,
          icon: History,
          title: 'Invoice modified',
          detail: r.modified_by_name ? `by ${r.modified_by_name}` : 'Edit logged',
          href: '/invoices-billing',
          timestamp: r.created_at,
        })
      );

      out.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      if (!cancelled) {
        setItems(out.slice(0, LIMIT));
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, profile]);

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-base font-semibold text-foreground">Recent Activity</h3>
        <Link
          href="/invoices-billing"
          className="text-xs font-semibold text-primary hover:underline"
        >
          View all transactions
        </Link>
      </div>
      {loading ? (
        <div className="px-5 py-10 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-muted rounded-lg h-10 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="px-5 py-12 flex flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
          <p className="text-xs text-muted-foreground mt-1">
            Changes to invoices, expenses, payroll, vouchers, receipts and employees will appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={15} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {formatWhen(item.timestamp)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
'use client';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PeriodRange {
  start: string; // inclusive YYYY-MM-DD
  end: string; // inclusive YYYY-MM-DD
}

export interface PLFigures {
  revenue: { consulting: number; retainer: number; project: number; other: number };
  cogs: { contractors: number; tools: number };
  opex: {
    salaries: number;
    software: number;
    marketing: number;
    office: number;
    travel: number;
    insurance: number;
    professional: number;
  };
  totalRevenue: number;
  totalCogs: number;
  totalOpex: number;
  netIncome: number;
}

export interface BSFigures {
  cash: number;
  ar: number;
  prepaid: number;
  otherCurrent: number;
  equipment: number;
  furniture: number;
  software: number;
  ap: number;
  accrued: number;
  taxPayable: number;
  deferred: number;
  loan: number;
  capital: number;
  retained: number;
}

export interface CFFigures {
  netIncome: number;
  depreciation: number;
  arChange: number;
  apChange: number;
  accruedChange: number;
  deferredChange: number;
  equipment: number;
  software: number;
  ownerDraw: number;
  loanRepayment: number;
  operating: number;
  investing: number;
  financing: number;
  netChange: number;
  endingCash: number;
  beginningCash: number;
}

export interface MonthlyPoint {
  month: string;
  revenue: number;
  netIncome: number;
  cashFlow: number;
}

export interface PeriodFigures {
  pl: PLFigures;
  bs: BSFigures;
  cf: CFFigures;
}

export interface FinancialData {
  current: PeriodFigures;
  prior: PeriodFigures;
  monthly: MonthlyPoint[];
}

interface InvoiceRow {
  total: number | string | null;
  status: string;
  issue_date: string;
  due_date: string | null;
  updated_at: string | null;
}
interface ExpenseRow {
  amount: number | string | null;
  category: string | null;
  status: string;
  expense_date: string;
}
interface PayrollRow {
  gross_pay: number | string | null;
  net_pay: number | string | null;
  status: string;
  pay_date: string;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function lastDay(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}
function ymd(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function getPeriodRanges(period: string): { current: PeriodRange; prior: PeriodRange } {
  switch (period) {
    case 'sep-2026':
      return {
        current: { start: ymd(2026, 9, 1), end: ymd(2026, 9, 30) },
        prior: { start: ymd(2026, 8, 1), end: ymd(2026, 8, 31) },
      };
    case 'ytd-2026':
      return {
        current: { start: ymd(2026, 1, 1), end: ymd(2026, 9, 30) },
        prior: { start: ymd(2025, 1, 1), end: ymd(2025, 9, 30) },
      };
    case 'fy-2025':
      return {
        current: { start: ymd(2025, 1, 1), end: ymd(2025, 12, 31) },
        prior: { start: ymd(2024, 1, 1), end: ymd(2024, 12, 31) },
      };
    case 'q3-2026':
    default:
      return {
        current: { start: ymd(2026, 7, 1), end: ymd(2026, 9, 30) },
        prior: { start: ymd(2026, 4, 1), end: ymd(2026, 6, 30) },
      };
  }
}

const num = (v: number | string | null | undefined) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const inRange = (d: string | null | undefined, r: PeriodRange) => !!d && d >= r.start && d <= r.end;
const upTo = (d: string | null | undefined, end: string) => !!d && d <= end;

function mapExpenseCategory(category: string | null): keyof PLFigures['cogs'] | keyof PLFigures['opex'] {
  const c = (category ?? '').toLowerCase();
  if (c.includes('contractor')) return 'contractors';
  if (c.includes('equipment')) return 'tools';
  if (c.includes('software') || c.includes('tool')) return 'software';
  if (c.includes('marketing')) return 'marketing';
  if (c.includes('travel')) return 'travel';
  if (c.includes('insurance')) return 'insurance';
  if (c.includes('professional')) return 'professional';
  return 'office';
}

const COGS_KEYS = ['contractors', 'tools'];

function computePL(
  invoices: InvoiceRow[],
  expenses: ExpenseRow[],
  payroll: PayrollRow[],
  range: PeriodRange
): PLFigures {
  const revenueTotal = invoices
    .filter((i) => i.status === 'paid' && inRange(i.issue_date, range))
    .reduce((s, i) => s + num(i.total), 0);

  const cogs = { contractors: 0, tools: 0 };
  const opex = { salaries: 0, software: 0, marketing: 0, office: 0, travel: 0, insurance: 0, professional: 0 };

  expenses
    .filter((e) => e.status === 'approved' && inRange(e.expense_date, range))
    .forEach((e) => {
      const key = mapExpenseCategory(e.category);
      if (COGS_KEYS.includes(key)) {
        cogs[key as keyof typeof cogs] += num(e.amount);
      } else {
        opex[key as keyof typeof opex] += num(e.amount);
      }
    });

  payroll
    .filter((p) => p.status === 'paid' && inRange(p.pay_date, range))
    .forEach((p) => {
      opex.salaries += num(p.gross_pay);
    });

  const totalCogs = cogs.contractors + cogs.tools;
  const totalOpex = Object.values(opex).reduce((s, v) => s + v, 0);
  return {
    revenue: { consulting: revenueTotal, retainer: 0, project: 0, other: 0 },
    cogs,
    opex,
    totalRevenue: revenueTotal,
    totalCogs,
    totalOpex,
    netIncome: revenueTotal - totalCogs - totalOpex,
  };
}

function computeCashAsOf(
  invoices: InvoiceRow[],
  expenses: ExpenseRow[],
  payroll: PayrollRow[],
  end: string
): number {
  const inflow = invoices
    .filter((i) => i.status === 'paid' && upTo(i.issue_date, end))
    .reduce((s, i) => s + num(i.total), 0);
  const outExp = expenses
    .filter((e) => e.status === 'approved' && upTo(e.expense_date, end))
    .reduce((s, e) => s + num(e.amount), 0);
  const outPay = payroll
    .filter((p) => p.status === 'paid' && upTo(p.pay_date, end))
    .reduce((s, p) => s + num(p.net_pay), 0);
  return inflow - outExp - outPay;
}

function computeAR(invoices: InvoiceRow[], end: string): number {
  return invoices
    .filter((i) => ['sent', 'partial', 'overdue'].includes(i.status) && upTo(i.issue_date, end))
    .reduce((s, i) => s + num(i.total), 0);
}

function computeAccrued(payroll: PayrollRow[], end: string): number {
  return payroll
    .filter((p) => ['pending', 'scheduled', 'processing'].includes(p.status) && upTo(p.pay_date, end))
    .reduce((s, p) => s + num(p.net_pay), 0);
}

function computePending(expenses: ExpenseRow[], end: string): number {
  return expenses
    .filter((e) => e.status === 'pending' && upTo(e.expense_date, end))
    .reduce((s, e) => s + num(e.amount), 0);
}

function computeBS(
  invoices: InvoiceRow[],
  expenses: ExpenseRow[],
  payroll: PayrollRow[],
  end: string
): BSFigures {
  const cash = computeCashAsOf(invoices, expenses, payroll, end);
  const ar = computeAR(invoices, end);
  const ap = computePending(expenses, end);
  const accrued = computeAccrued(payroll, end);
  const totalAssets = cash + ar;
  const totalLiab = ap + accrued;
  return {
    cash,
    ar,
    prepaid: 0,
    otherCurrent: 0,
    equipment: 0,
    furniture: 0,
    software: 0,
    ap,
    accrued,
    taxPayable: 0,
    deferred: 0,
    loan: 0,
    capital: 0,
    retained: totalAssets - totalLiab,
  };
}

function computeCF(
  pl: PLFigures,
  bsEnd: BSFigures,
  bsBeforeStart: BSFigures
): CFFigures {
  const arChange = -(bsEnd.ar - bsBeforeStart.ar);
  const apChange = bsEnd.ap - bsBeforeStart.ap;
  const accruedChange = bsEnd.accrued - bsBeforeStart.accrued;
  const operating = pl.netIncome + arChange + apChange + accruedChange;
  const netChange = operating;
  return {
    netIncome: pl.netIncome,
    depreciation: 0,
    arChange,
    apChange,
    accruedChange,
    deferredChange: 0,
    equipment: 0,
    software: 0,
    ownerDraw: 0,
    loanRepayment: 0,
    operating,
    investing: 0,
    financing: 0,
    netChange,
    endingCash: bsEnd.cash,
    beginningCash: bsBeforeStart.cash,
  };
}

function dayBefore(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - 1));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function computePeriod(
  invoices: InvoiceRow[],
  expenses: ExpenseRow[],
  payroll: PayrollRow[],
  range: PeriodRange
): PeriodFigures {
  const pl = computePL(invoices, expenses, payroll, range);
  const bs = computeBS(invoices, expenses, payroll, range.end);
  const bsBefore = computeBS(invoices, expenses, payroll, dayBefore(range.start));
  const cf = computeCF(pl, bs, bsBefore);
  return { pl, bs, cf };
}

function computeMonthly(
  invoices: InvoiceRow[],
  expenses: ExpenseRow[],
  payroll: PayrollRow[],
  range: PeriodRange
): MonthlyPoint[] {
  // Last 6 months ending at the current period's end month
  const [endY, endM] = range.end.split('-').map(Number);
  const points: MonthlyPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const idx = endM - 1 - i;
    const year = endY + Math.floor(idx / 12);
    const month = ((idx % 12) + 12) % 12 + 1;
    const mr: PeriodRange = { start: ymd(year, month, 1), end: ymd(year, month, lastDay(year, month)) };
    const pl = computePL(invoices, expenses, payroll, mr);
    const bs = computeBS(invoices, expenses, payroll, mr.end);
    const bsBefore = computeBS(invoices, expenses, payroll, dayBefore(mr.start));
    const cf = computeCF(pl, bs, bsBefore);
    points.push({
      month: MONTH_NAMES[month - 1],
      revenue: pl.totalRevenue,
      netIncome: pl.netIncome,
      cashFlow: cf.netChange,
    });
  }
  return points;
}

export function useFinancialData(period: string) {
  const { getEffectiveOwnerId, profile } = useAuth();
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const ownerId = getEffectiveOwnerId?.();
    if (!ownerId) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const [inv, exp, pay] = await Promise.all([
        supabase
          .from('invoices')
          .select('total, status, issue_date, due_date, updated_at')
          .eq('owner_id', ownerId),
        supabase
          .from('expenses')
          .select('amount, category, status, expense_date')
          .eq('owner_id', ownerId),
        supabase
          .from('payroll_runs')
          .select('gross_pay, net_pay, status, pay_date')
          .eq('owner_id', ownerId),
      ]);
      if (inv.error) throw inv.error;
      if (exp.error) throw exp.error;
      if (pay.error) throw pay.error;

      const invoices = ((inv.data ?? []) as InvoiceRow[]).filter((i) => i.status !== 'void');
      const expenses = (exp.data ?? []) as ExpenseRow[];
      const payroll = (pay.data ?? []) as PayrollRow[];

      const { current, prior } = getPeriodRanges(period);
      setData({
        current: computePeriod(invoices, expenses, payroll, current),
        prior: computePeriod(invoices, expenses, payroll, prior),
        monthly: computeMonthly(invoices, expenses, payroll, current),
      });
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, profile?.id, profile?.owner_id]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

'use client';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Eye, Download } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type PayrollStatus = 'paid' | 'processing' | 'scheduled' | 'pending';

interface PayrollRun {
  id: string;
  payPeriod: string;
  payDate: string;
  employee: string;
  role: string;
  grossPay: number;
  sss: number;
  pagibig: number;
  hdmf: number;
  deductions: number;
  netPay: number;
  status: PayrollStatus;
  half: 'first' | 'second';
}

type SortKey = 'payDate' | 'employee' | 'grossPay' | 'netPay' | 'status';

function isSchemaError(error: any): boolean {
  if (!error) return false;
  if (error.code && typeof error.code === 'string') {
    const cls = error.code.substring(0, 2);
    if (cls === '42' || cls === '08') return true;
    if (cls === '23') return false;
  }
  if (error.message) {
    return /relation.*does not exist|column.*does not exist|syntax error/i.test(error.message);
  }
  return false;
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: 'asc' | 'desc' }) {
  return sortKey === col ? (
    sortDir === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />
  ) : (
    <ChevronDown size={12} className="text-muted-foreground opacity-30" />
  );
}

interface HalfTableProps {
  title: string;
  rows: PayrollRun[];
  loading: boolean;
  half: 'first' | 'second';
}

function HalfTable({ title, rows, loading, half }: HalfTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('payDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...rows].sort((a, b) => {
    const va = a[sortKey] as string | number;
    const vb = b[sortKey] as string | number;
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const colSpanEmpty = half === 'first' ? 11 : 8;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/20">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm" style={{ minWidth: half === 'first' ? '1000px' : '800px' }}>
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {/* Pay Date */}
              <th
                onClick={() => toggleSort('payDate')}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-1">Pay Date<SortIcon col="payDate" sortKey={sortKey} sortDir={sortDir} /></span>
              </th>
              {/* Employee */}
              <th
                onClick={() => toggleSort('employee')}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-1">Employee<SortIcon col="employee" sortKey={sortKey} sortDir={sortDir} /></span>
              </th>
              {/* Pay Period */}
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pay Period</th>
              {/* Gross Pay */}
              <th
                onClick={() => toggleSort('grossPay')}
                className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              >
                <span className="flex items-center justify-end gap-1">Gross Pay<SortIcon col="grossPay" sortKey={sortKey} sortDir={sortDir} /></span>
              </th>
              {/* First half extra columns */}
              {half === 'first' && (
                <>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">SSS</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pagibig</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">HDMF</th>
                </>
              )}
              {/* Deductions */}
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Deductions</th>
              {/* Net Pay */}
              <th
                onClick={() => toggleSort('netPay')}
                className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              >
                <span className="flex items-center justify-end gap-1">Net Pay<SortIcon col="netPay" sortKey={sortKey} sortDir={sortDir} /></span>
              </th>
              {/* Status */}
              <th
                onClick={() => toggleSort('status')}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-1">Status<SortIcon col="status" sortKey={sortKey} sortDir={sortDir} /></span>
              </th>
              {/* Actions */}
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {half === 'first' ? 'Actions' : 'Action'}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpanEmpty} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading payroll data...</p>
                  </div>
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={colSpanEmpty} className="px-4 py-12 text-center">
                  <p className="text-sm text-muted-foreground">No payroll records found</p>
                </td>
              </tr>
            ) : (
              sorted.map((run) => (
                <tr key={run.id} className="border-b border-border hover:bg-muted/40 transition-colors group">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{run.payDate}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{run.employee}</p>
                    <p className="text-xs text-muted-foreground">{run.role}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{run.payPeriod}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-foreground">₱{run.grossPay.toLocaleString()}</td>
                  {half === 'first' && (
                    <>
                      <td className="px-4 py-3 text-right font-mono text-sm text-danger/80">
                        {run.sss > 0 ? `(₱${run.sss.toLocaleString()})` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-danger/80">
                        {run.pagibig > 0 ? `(₱${run.pagibig.toLocaleString()})` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-danger/80">
                        {run.hdmf > 0 ? `(₱${run.hdmf.toLocaleString()})` : '—'}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3 text-right font-mono text-sm text-danger/80">
                    {run.deductions > 0 ? `(₱${run.deductions.toLocaleString()})` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-bold text-success">₱{run.netPay.toLocaleString()}</td>
                  <td className="px-4 py-3"><StatusBadge status={run.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        title="View pay stub"
                        onClick={() => toast.info(`Viewing pay stub for ${run.employee}`)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        title="Download pay stub PDF"
                        onClick={() => toast.success('Pay stub downloaded')}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Download size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PayrollTable() {
  const { getEffectiveOwnerId } = useAuth();
  const supabase = createClient();

  const [allRuns, setAllRuns] = useState<PayrollRun[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchPayroll = async () => {
    setLoadingData(true);
    try {
      const ownerId = getEffectiveOwnerId();
      if (!ownerId) return;
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('owner_id', ownerId)
        .order('pay_date', { ascending: false });
      if (error) {
        if (isSchemaError(error)) throw error;
        toast.error('Failed to load payroll data');
        return;
      }
      setAllRuns(
        (data || []).map((row: any) => {
          const grossPay = Number(row.gross_pay);
          const federalTax = Number(row.federal_tax ?? 0);
          const stateTax = Number(row.state_tax ?? 0);
          const fica = Number(row.fica ?? 0);
          const healthIns = Number(row.health_ins ?? 0);
          // Map existing fields: SSS ≈ federal_tax, Pagibig ≈ state_tax, HDMF ≈ fica, Deductions ≈ health_ins
          const sss = federalTax;
          const pagibig = stateTax;
          const hdmf = fica;
          const deductions = healthIns;
          const netPay = Number(row.net_pay);
          // Determine half from pay_period string or default to first
          const period: string = row.pay_period ?? '';
          const isSecond = /16|second|2nd/i.test(period);
          return {
            id: row.id,
            payPeriod: period,
            payDate: row.pay_date,
            employee: row.employee_name,
            role: row.employee_role,
            grossPay,
            sss,
            pagibig,
            hdmf,
            deductions,
            netPay,
            status: row.status as PayrollStatus,
            half: isSecond ? 'second' : 'first',
          } as PayrollRun;
        })
      );
    } catch (err: any) {
      toast.error(err?.message || 'Error loading payroll');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, []);

  const firstHalf = allRuns.filter((r) => r.half === 'first');
  const secondHalf = allRuns.filter((r) => r.half === 'second');

  return (
    <div className="space-y-6">
      <HalfTable title="1st Half Payroll (1st – 15th)" rows={firstHalf} loading={loadingData} half="first" />
      <HalfTable title="2nd Half Payroll (16th – End of Month)" rows={secondHalf} loading={loadingData} half="second" />
    </div>
  );
}
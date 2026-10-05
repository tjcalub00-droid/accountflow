'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface PayrollFormData {
  payPeriodType: 'first-half' | 'second-half';
  payPeriodMonth: string;
  payDate: string;
  notes: string;
}

interface EmployeeRow {
  id: string;
  name: string;
  role: string;
  monthlyGross: number;
  sssRate: number;
  pagibigRate: number;
  hdmfRate: number;
  monthlyNet: number;
  included: boolean;
}

function getPeriodDates(month: string, type: 'first-half' | 'second-half') {
  if (!month) return { start: '', end: '' };
  const [year, mon] = month.split('-').map(Number);
  if (type === 'first-half') {
    return { start: `${month}-01`, end: `${month}-15` };
  } else {
    const lastDay = new Date(year, mon, 0).getDate();
    return { start: `${month}-16`, end: `${month}-${String(lastDay).padStart(2, '0')}` };
  }
}

function getDefaultPayDate(month: string, type: 'first-half' | 'second-half') {
  if (!month) return '';
  if (type === 'first-half') return `${month}-15`;
  const [year, mon] = month.split('-').map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  return `${month}-${String(lastDay).padStart(2, '0')}`;
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function RunPayrollModal({ open, onClose }: Props) {
  const { getEffectiveOwnerId } = useAuth();
  const supabase = createClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [processedPeriods, setProcessedPeriods] = useState<string[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PayrollFormData>({
    defaultValues: {
      payPeriodType: 'first-half',
      payPeriodMonth: getCurrentMonth(),
      payDate: '',
      notes: '',
    },
  });

  const periodType = watch('payPeriodType');
  const periodMonth = watch('payPeriodMonth');

  useEffect(() => {
    if (periodMonth) {
      setValue('payDate', getDefaultPayDate(periodMonth, periodType));
    }
  }, [periodType, periodMonth, setValue]);

  const fetchEmployees = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const ownerId = getEffectiveOwnerId();
      if (!ownerId) return;
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('is_active', true)
        .order('full_name', { ascending: true });
      if (error) {
        toast.error('Failed to load employees');
        return;
      }
      setEmployees(
        (data || []).map((row: any) => {
          const sss = Number(row.sss_rate);
          const pagibig = Number(row.pagibig_rate);
          const hdmf = Number(row.hdmf_rate);
          const monthlyGross = Number(row.monthly_salary);
          const monthlyNet = monthlyGross - sss - pagibig - hdmf;
          return {
            id: row.id,
            name: row.full_name,
            role: row.role,
            monthlyGross,
            sssRate: sss,
            pagibigRate: pagibig,
            hdmfRate: hdmf,
            monthlyNet,
            included: true,
          };
        })
      );
    } finally {
      setLoadingEmployees(false);
    }
  }, [getEffectiveOwnerId, supabase]);

  useEffect(() => {
    if (open) fetchEmployees();
  }, [open, fetchEmployees]);

  const toggleIncluded = (id: string) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, included: !e.included } : e))
    );
  };

  const { start: periodStart, end: periodEnd } = getPeriodDates(periodMonth, periodType);

  const halfGross = (monthly: number) => Math.round(monthly / 2);
  const halfNet = (monthly: number) => Math.round(monthly / 2);
  const halfSss = (rate: number) => Math.round(rate / 2);
  const halfPagibig = (rate: number) => Math.round(rate / 2);
  const halfHdmf = (rate: number) => Math.round(rate / 2);

  const included = employees.filter((e) => e.included);
  const totalGross = included.reduce((s, e) => s + halfGross(e.monthlyGross), 0);
  const totalNet = included.reduce((s, e) => s + halfNet(e.monthlyNet), 0);

  const periodLabel =
    periodType === 'first-half'
      ? `1st–15th (${periodMonth})`
      : `16th–End (${periodMonth})`;

  const onSubmit = async (data: PayrollFormData) => {
    const periodKey = `${periodStart}__${periodEnd}`;
    if (processedPeriods.includes(periodKey)) {
      toast.error(`Payroll for ${periodLabel} has already been processed.`);
      return;
    }
    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const ownerId = getEffectiveOwnerId();
      if (!ownerId) return;

      const rows = included.map((emp) => ({
        owner_id: ownerId,
        pay_period: periodLabel,
        pay_date: data.payDate,
        employee_name: emp.name,
        employee_role: emp.role,
        gross_pay: halfGross(emp.monthlyGross),
        federal_tax: halfSss(emp.sssRate),
        state_tax: halfPagibig(emp.pagibigRate),
        fica: halfHdmf(emp.hdmfRate),
        health_ins: 0,
        net_pay: halfNet(emp.monthlyNet),
        status: 'paid' as const,
      }));

      const { error } = await supabase.from('payroll_runs').insert(rows);
      if (error) {
        toast.error('Failed to process payroll');
        return;
      }

      setProcessedPeriods((prev) => [...prev, periodKey]);
      toast.success(
        `Bimonthly payroll processed — ₱${totalNet.toLocaleString()} net to ${included.length} employee${included.length !== 1 ? 's' : ''}`
      );
      onClose();
      setConfirmed(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={() => { onClose(); setConfirmed(false); }} title="Run Payroll" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
        {/* Pay Period */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b border-border">
            Pay Period
            <span className="ml-2 text-xs font-normal text-muted-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-full">Bimonthly</span>
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Month <span className="text-danger">*</span>
              </label>
              <input
                type="month"
                {...register('payPeriodMonth', { required: 'Month is required' })}
                className={`w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring ${errors.payPeriodMonth ? 'border-danger' : 'border-input'}`}
              />
              {errors.payPeriodMonth && <p className="text-xs text-danger mt-1">{errors.payPeriodMonth.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Pay Cycle <span className="text-danger">*</span>
              </label>
              <select
                {...register('payPeriodType', { required: true })}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="first-half">1st – 15th (1st Half)</option>
                <option value="second-half">16th – End (2nd Half)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Pay Date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                {...register('payDate', {
                  required: 'Pay date is required',
                  validate: (v) => {
                    if (!v) return 'Pay date is required';
                    if (periodEnd && v < periodEnd) return 'Pay date must be on or after period end';
                    return true;
                  },
                })}
                className={`w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring ${errors.payDate ? 'border-danger' : 'border-input'}`}
              />
              {errors.payDate && <p className="text-xs text-danger mt-1">{errors.payDate.message}</p>}
            </div>
          </div>
          {periodStart && periodEnd && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              <span className="font-semibold text-foreground">Period:</span>
              <span>{periodStart}</span>
              <span>→</span>
              <span>{periodEnd}</span>
              <span className="ml-auto text-primary font-semibold">{periodLabel}</span>
            </div>
          )}
        </div>

        {/* Employee Summary */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b border-border">
            Employee Summary
            <span className="ml-2 text-xs font-normal text-muted-foreground">(½ monthly salary)</span>
          </h3>
          {loadingEmployees ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading employees...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No active employees found.</p>
              <a href="/employee-management" className="text-sm text-primary hover:underline mt-1 inline-block">
                Add employees first →
              </a>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Employee</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gross (½)</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Net Pay (½)</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">Include</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-foreground">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">{emp.role}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm text-foreground">
                        ₱{halfGross(emp.monthlyGross).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm font-semibold text-success">
                        ₱{halfNet(emp.monthlyNet).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={emp.included}
                          onChange={() => toggleIncluded(emp.id)}
                          className="rounded"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30">
                    <td className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-foreground">
                      Total ({included.length} employees)
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm font-bold text-foreground">
                      ₱{totalGross.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm font-bold text-success">
                      ₱{totalNet.toLocaleString()}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Confirmation step */}
        {confirmed && (
          <div className="flex items-start gap-3 bg-warning/5 border border-warning/20 rounded-xl p-4 slide-up">
            <CheckCircle2 size={16} className="text-warning mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-warning">Confirm Payroll Run</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                This will record payroll totaling <strong>₱{totalNet.toLocaleString()}</strong> for{' '}
                <strong>{included.length} employee{included.length !== 1 ? 's' : ''}</strong> for{' '}
                <strong>{periodLabel}</strong>. This action cannot be undone.
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Notes (optional)</label>
          <textarea
            {...register('notes', {
              maxLength: { value: 500, message: 'Notes cannot exceed 500 characters' },
            })}
            rows={2}
            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="e.g. Includes Sep bonus"
          />
          {errors.notes && <p className="text-xs text-danger mt-1">{errors.notes.message}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => { onClose(); setConfirmed(false); }}
            className="px-4 py-2 text-sm font-semibold text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || (employees.length === 0 && !loadingEmployees)}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg disabled:opacity-70 active:scale-95 transition-all duration-150 min-w-[160px] justify-center ${
              confirmed
                ? 'bg-warning text-warning-foreground hover:bg-warning/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isSubmitting ? (
              <><Loader2 size={14} className="animate-spin" />Processing...</>
            ) : confirmed ? (
              'Confirm & Process'
            ) : (
              'Review & Continue'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
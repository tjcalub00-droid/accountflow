'use client';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Employee } from './EmployeeManagementContent';

interface Props {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  fullName: string;
  role: string;
  monthlySalary: number;
  sssRate: number;
  pagibigRate: number;
  hdmfRate: number;
}

export default function EmployeeFormModal({ open, employee, onClose, onSaved }: Props) {
  const { getEffectiveOwnerId } = useAuth();
  const supabase = createClient();
  const isEdit = !!employee;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      fullName: '',
      role: '',
      monthlySalary: 0,
      sssRate: 0,
      pagibigRate: 0,
      hdmfRate: 0,
    },
  });

  useEffect(() => {
    if (open) {
      reset(
        employee
          ? {
              fullName: employee.fullName,
              role: employee.role,
              monthlySalary: employee.monthlySalary,
              sssRate: employee.sssRate,
              pagibigRate: employee.pagibigRate,
              hdmfRate: employee.hdmfRate,
            }
          : { fullName: '', role: '', monthlySalary: 0, sssRate: 0, pagibigRate: 0, hdmfRate: 0 }
      );
    }
  }, [open, employee, reset]);

  const monthlySalary = watch('monthlySalary') || 0;
  const sssRate = watch('sssRate') || 0;
  const pagibigRate = watch('pagibigRate') || 0;
  const hdmfRate = watch('hdmfRate') || 0;
  const totalDeductions = Number(sssRate) + Number(pagibigRate) + Number(hdmfRate);
  const netMonthly = Number(monthlySalary) - totalDeductions;

  const onSubmit = async (data: FormData) => {
    const ownerId = getEffectiveOwnerId();
    if (!ownerId) return;

    const payload = {
      full_name: data.fullName.trim(),
      role: data.role.trim(),
      monthly_salary: Number(data.monthlySalary),
      sss_rate: Number(data.sssRate),
      pagibig_rate: Number(data.pagibigRate),
      hdmf_rate: Number(data.hdmfRate),
    };

    if (isEdit && employee) {
      const { error } = await supabase
        .from('employees')
        .update(payload)
        .eq('id', employee.id);
      if (error) {
        toast.error('Failed to update employee');
        return;
      }
      toast.success(`${data.fullName} updated successfully`);
    } else {
      const { error } = await supabase
        .from('employees')
        .insert({ ...payload, owner_id: ownerId });
      if (error) {
        toast.error('Failed to add employee');
        return;
      }
      toast.success(`${data.fullName} added successfully`);
    }
    onSaved();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Employee' : 'Add Employee'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
        {/* Basic Info */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 pb-2 border-b border-border">
            Basic Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Full Name <span className="text-danger">*</span>
              </label>
              <input
                {...register('fullName', { required: 'Full name is required' })}
                className={`w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring ${errors.fullName ? 'border-danger' : 'border-input'}`}
                placeholder="e.g. Juan dela Cruz"
              />
              {errors.fullName && <p className="text-xs text-danger mt-1">{errors.fullName.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Role / Position <span className="text-danger">*</span>
              </label>
              <input
                {...register('role', { required: 'Role is required' })}
                className={`w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring ${errors.role ? 'border-danger' : 'border-input'}`}
                placeholder="e.g. Operations Manager"
              />
              {errors.role && <p className="text-xs text-danger mt-1">{errors.role.message}</p>}
            </div>
          </div>
        </div>

        {/* Salary & Deductions */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 pb-2 border-b border-border">
            Salary & Deduction Rates
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Monthly Salary (₱) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                {...register('monthlySalary', {
                  required: 'Monthly salary is required',
                  min: { value: 0, message: 'Must be 0 or more' },
                })}
                className={`w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring ${errors.monthlySalary ? 'border-danger' : 'border-input'}`}
                placeholder="e.g. 18000"
              />
              {errors.monthlySalary && <p className="text-xs text-danger mt-1">{errors.monthlySalary.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">SSS Rate (₱/month)</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                {...register('sssRate', { min: { value: 0, message: 'Must be 0 or more' } })}
                className={`w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring ${errors.sssRate ? 'border-danger' : 'border-input'}`}
                placeholder="e.g. 1125"
              />
              {errors.sssRate && <p className="text-xs text-danger mt-1">{errors.sssRate.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Pagibig Rate (₱/month)</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                {...register('pagibigRate', { min: { value: 0, message: 'Must be 0 or more' } })}
                className={`w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring ${errors.pagibigRate ? 'border-danger' : 'border-input'}`}
                placeholder="e.g. 100"
              />
              {errors.pagibigRate && <p className="text-xs text-danger mt-1">{errors.pagibigRate.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">HDMF Rate (₱/month)</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                {...register('hdmfRate', { min: { value: 0, message: 'Must be 0 or more' } })}
                className={`w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring ${errors.hdmfRate ? 'border-danger' : 'border-input'}`}
                placeholder="e.g. 200"
              />
              {errors.hdmfRate && <p className="text-xs text-danger mt-1">{errors.hdmfRate.message}</p>}
            </div>
          </div>
        </div>

        {/* Pay preview */}
        <div className="bg-muted/40 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Total Deductions / month</p>
            <p className="font-mono font-semibold text-danger/80">
              {totalDeductions > 0 ? `(₱${Number(totalDeductions).toLocaleString()})` : '—'}
            </p>
          </div>
          <div className="text-right space-y-0.5">
            <p className="text-xs text-muted-foreground">Estimated Net Pay / month</p>
            <p className="font-mono font-bold text-success text-base">₱{Number(netMonthly).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-150 disabled:opacity-70 min-w-[120px] justify-center"
          >
            {isSubmitting ? (
              <><Loader2 size={14} className="animate-spin" />Saving...</>
            ) : isEdit ? (
              'Save Changes'
            ) : (
              'Add Employee'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

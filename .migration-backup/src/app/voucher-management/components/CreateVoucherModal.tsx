'use client';
import React, { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Loader2, Printer } from 'lucide-react';
import Modal from '@/components/ui/Modal';

export type VoucherType = 'Payment' | 'Receipt' | 'Journal' | 'Petty Cash' | 'Payroll';

interface Props {
  open: boolean;
  onClose: () => void;
  onVoucherPrinted?: (voucher: NewVoucher) => void;
  voucherType?: VoucherType;
}

export interface NewVoucher {
  id: string;
  number: string;
  type: VoucherType;
  payee: string;
  date: string;
  amount: number;
  description: string;
  template: string;
  reference: string;
  status: 'printed';
  printedOn: string;
}

// ── Payroll form ──────────────────────────────────────────────────────────────
interface PayrollFormData {
  name: string;
  date: string;
  grossIncome: number;
  philhealth: number;
  sss: number;
  pagibig: number;
  cashAdvance: number;
  attendance: number;
  misc: number;
}

// ── Generic form (Payment, Receipt, Journal, Petty Cash) ─────────────────────
interface GenericFormData {
  payee: string;
  date: string;
  amount: number;
  description: string;
  reference: string;
}

let voucherCounter = 1;

function generateVoucherNumber() {
  const num = voucherCounter++;
  return `VCH-${String(num).padStart(4, '0')}`;
}

function todayFormatted() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function safeNum(val: unknown): number {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

const inputClass =
  'w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring';
const labelClass = 'block text-xs font-semibold text-foreground mb-1';

// ── Payroll sub-form ──────────────────────────────────────────────────────────
function PayrollForm({
  onSubmit,
  onClose,
  isSubmitting,
}: {
  onSubmit: (v: NewVoucher) => void;
  onClose: () => void;
  isSubmitting: boolean;
}) {
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<PayrollFormData>({
    defaultValues: { grossIncome: 0, philhealth: 0, sss: 0, pagibig: 0, cashAdvance: 0, attendance: 0, misc: 0 },
  });
  const watched = useWatch({ control });
  const totalDeductions =
    safeNum(watched.philhealth) + safeNum(watched.sss) + safeNum(watched.pagibig) +
    safeNum(watched.cashAdvance) + safeNum(watched.attendance) + safeNum(watched.misc);
  const netIncome = safeNum(watched.grossIncome) - totalDeductions;

  const submit = (data: PayrollFormData) => {
    const gross = safeNum(data.grossIncome);
    const deductions =
      safeNum(data.philhealth) + safeNum(data.sss) + safeNum(data.pagibig) +
      safeNum(data.cashAdvance) + safeNum(data.attendance) + safeNum(data.misc);
    const net = gross - deductions;
    onSubmit({
      id: `vch-new-${Date.now()}`,
      number: generateVoucherNumber(),
      type: 'Payroll',
      payee: data.name,
      date: todayFormatted(),
      amount: net,
      description: `Payroll Voucher — Gross: ${gross.toFixed(2)}, Deductions: ${deductions.toFixed(2)}, Net: ${net.toFixed(2)}`,
      template: 'Payroll Voucher',
      reference: '',
      status: 'printed',
      printedOn: todayFormatted(),
    });
    reset();
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="p-6 space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass}>Name <span className="text-danger">*</span></label>
          <input {...register('name', { required: 'Name is required' })} className={inputClass} placeholder="Employee name" />
          {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass}>Date <span className="text-danger">*</span></label>
          <input type="date" {...register('date', { required: 'Date is required' })} className={inputClass} />
          {errors.date && <p className="text-xs text-danger mt-1">{errors.date.message}</p>}
        </div>
      </div>
      <div>
        <label className={labelClass}>Gross Income <span className="text-danger">*</span></label>
        <input type="number" step="0.01" min="0" {...register('grossIncome', { required: 'Required', valueAsNumber: true, min: { value: 0, message: 'Must be ≥ 0' } })} className={`${inputClass} font-mono`} placeholder="0.00" />
        {errors.grossIncome && <p className="text-xs text-danger mt-1">{errors.grossIncome.message}</p>}
      </div>
      <div>
        <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-3 border-b border-border pb-1">Deductions</p>
        <div className="grid grid-cols-2 gap-3">
          {([
            { key: 'philhealth', label: 'Philhealth' },
            { key: 'sss', label: 'SSS' },
            { key: 'pagibig', label: 'Pag-ibig' },
            { key: 'cashAdvance', label: 'Cash Advance' },
            { key: 'attendance', label: 'Attendance' },
            { key: 'misc', label: 'Misc' },
          ] as { key: keyof PayrollFormData; label: string }[]).map(({ key, label }) => (
            <div key={key}>
              <label className={labelClass}>{label}</label>
              <input type="number" step="0.01" min="0" {...register(key, { valueAsNumber: true, min: { value: 0, message: 'Must be ≥ 0' } })} className={`${inputClass} font-mono`} placeholder="0.00" />
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between items-center text-sm text-muted-foreground border-t border-border pt-2">
          <span className="font-medium">Total Deductions</span>
          <span className="font-mono font-semibold text-danger">− {totalDeductions.toFixed(2)}</span>
        </div>
      </div>
      <div className="rounded-lg bg-muted/50 border border-border px-4 py-3 flex justify-between items-center">
        <span className="text-sm font-bold text-foreground">Net Income</span>
        <span className={`text-lg font-bold font-mono ${netIncome < 0 ? 'text-danger' : 'text-success'}`}>{netIncome.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-70 active:scale-95 transition-all duration-150 min-w-[160px] justify-center">
          {isSubmitting ? <><Loader2 size={14} className="animate-spin" />Printing...</> : <><Printer size={14} />Print Voucher</>}
        </button>
      </div>
    </form>
  );
}

// ── Generic sub-form ──────────────────────────────────────────────────────────
function GenericVoucherForm({
  voucherType,
  onSubmit,
  onClose,
  isSubmitting,
}: {
  voucherType: VoucherType;
  onSubmit: (v: NewVoucher) => void;
  onClose: () => void;
  isSubmitting: boolean;
}) {
  const payeeLabel = voucherType === 'Receipt' ? 'Received From' : 'Payee / Party';
  const amountLabel = voucherType === 'Receipt' ? 'Amount Received' : 'Amount';

  const { register, handleSubmit, reset, formState: { errors } } = useForm<GenericFormData>({
    defaultValues: { amount: 0 },
  });

  const submit = (data: GenericFormData) => {
    onSubmit({
      id: `vch-new-${Date.now()}`,
      number: generateVoucherNumber(),
      type: voucherType,
      payee: data.payee,
      date: todayFormatted(),
      amount: safeNum(data.amount),
      description: data.description,
      template: `${voucherType} Voucher`,
      reference: data.reference,
      status: 'printed',
      printedOn: todayFormatted(),
    });
    reset();
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass}>{payeeLabel} <span className="text-danger">*</span></label>
          <input {...register('payee', { required: `${payeeLabel} is required` })} className={inputClass} placeholder={voucherType === 'Receipt' ? 'Customer name' : 'Vendor / payee name'} />
          {errors.payee && <p className="text-xs text-danger mt-1">{errors.payee.message}</p>}
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass}>Date <span className="text-danger">*</span></label>
          <input type="date" {...register('date', { required: 'Date is required' })} className={inputClass} />
          {errors.date && <p className="text-xs text-danger mt-1">{errors.date.message}</p>}
        </div>
      </div>
      <div>
        <label className={labelClass}>{amountLabel} <span className="text-danger">*</span></label>
        <input type="number" step="0.01" min="0.01" {...register('amount', { required: 'Amount is required', valueAsNumber: true, min: { value: 0.01, message: 'Must be > 0' } })} className={`${inputClass} font-mono`} placeholder="0.00" />
        {errors.amount && <p className="text-xs text-danger mt-1">{errors.amount.message}</p>}
      </div>
      <div>
        <label className={labelClass}>Description <span className="text-danger">*</span></label>
        <textarea rows={2} {...register('description', { required: 'Description is required' })} className={`${inputClass} resize-none`} placeholder="Brief description of this voucher" />
        {errors.description && <p className="text-xs text-danger mt-1">{errors.description.message}</p>}
      </div>
      <div>
        <label className={labelClass}>Reference / Check No.</label>
        <input {...register('reference')} className={inputClass} placeholder="Optional reference number" />
      </div>
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-70 active:scale-95 transition-all duration-150 min-w-[160px] justify-center">
          {isSubmitting ? <><Loader2 size={14} className="animate-spin" />Printing...</> : <><Printer size={14} />Print Voucher</>}
        </button>
      </div>
    </form>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function CreateVoucherModal({ open, onClose, onVoucherPrinted, voucherType = 'Payroll' }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleMap: Record<VoucherType, string> = {
    Payment: 'Print Payment Voucher',
    Receipt: 'Print Receipt Voucher',
    Journal: 'Print Journal Voucher',
    'Petty Cash': 'Print Petty Cash Voucher',
    Payroll: 'Print Payroll Voucher',
  };

  const handleVoucher = async (voucher: NewVoucher) => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsSubmitting(false);
    toast.success(`${voucher.number} printed and added to voucher list`);
    onVoucherPrinted?.(voucher);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={titleMap[voucherType]} size="md">
      {voucherType === 'Payroll' ? (
        <PayrollForm onSubmit={handleVoucher} onClose={onClose} isSubmitting={isSubmitting} />
      ) : (
        <GenericVoucherForm voucherType={voucherType} onSubmit={handleVoucher} onClose={onClose} isSubmitting={isSubmitting} />
      )}
    </Modal>
  );
}
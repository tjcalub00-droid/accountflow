'use client';
import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Invoice } from './invoiceDocument';

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
}

interface InvoiceFormData {
  customer: string;
  email: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  items: LineItem[];
}

interface Props {
  onClose: () => void;
  onCreated: (invoice: Invoice) => void;
}

export default function CreateInvoiceForm({ onClose, onCreated }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, getEffectiveOwnerId } = useAuth();
  const supabase = createClient();
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    defaultValues: {
      items: [{ description: '', quantity: 1, rate: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items');
  const issueDateVal = watch('issueDate');

  const subtotal = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.rate || 0), 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const onSubmit = async (data: InvoiceFormData) => {
    const lineItems = data.items.map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity),
      rate: Number(item.rate),
    }));
    const invoiceSubtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const invoiceTax = invoiceSubtotal * 0.1;
    const invoiceTotal = invoiceSubtotal + invoiceTax;

    // Numeric constraint: at least one line item must have amount > 0
    const hasValidItem = lineItems.some(
      (item) => item.description.trim() !== '' && item.quantity >= 1 && item.rate >= 0
    );
    if (!hasValidItem) {
      toast.error('Add at least one line item with a description and valid quantity.');
      return;
    }
    if (invoiceSubtotal <= 0) {
      toast.error('Invoice total must be greater than ₱0.00.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ownerId = getEffectiveOwnerId();
      if (!ownerId || !user) { toast.error('Not authenticated'); return; }

      // Duplicate detection: same customer + same issue date
      const { data: existing, error: dupErr } = await supabase
        .from('invoices')
        .select('id')
        .eq('owner_id', ownerId)
        .eq('customer', data.customer.trim())
        .eq('issue_date', data.issueDate)
        .limit(1);

      if (!dupErr && existing && existing.length > 0) {
        toast.error(`A duplicate invoice for "${data.customer}" on ${data.issueDate} already exists.`);
        setIsSubmitting(false);
        return;
      }

      // Generate invoice number
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', ownerId);
      const invoiceNumber = `INV-${String((count || 0) + 1).padStart(4, '0')}`;

      const { data: created, error } = await supabase.from('invoices').insert({
        user_id: user.id,
        owner_id: ownerId,
        invoice_number: invoiceNumber,
        customer: data.customer.trim(),
        customer_email: data.email.trim(),
        issue_date: data.issueDate,
        due_date: data.dueDate,
        amount: invoiceSubtotal,
        tax: invoiceTax,
        total: invoiceTotal,
        status: 'draft',
        notes: data.notes || null,
        items: lineItems,
      }).select('id').single();

      if (error) { toast.error('Failed to create invoice'); return; }
      const createdId = (created as unknown as { id?: string } | null)?.id;
      if (!createdId) {
        toast.error('Invoice saved, but its preview could not be opened.');
        return;
      }
      toast.success(`Invoice ${invoiceNumber} created for ${data.customer}`);
      onCreated({
        id: createdId,
        number: invoiceNumber,
        customer: data.customer.trim(),
        email: data.email.trim(),
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        amount: invoiceSubtotal,
        tax: invoiceTax,
        total: invoiceTotal,
        status: 'draft',
        items: lineItems,
        notes: data.notes || '',
      });
    } catch (err: any) {
      toast.error(err?.message || 'Error creating invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-6">
      {/* Customer info */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">
          Customer Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Customer Name <span className="text-danger">*</span>
            </label>
            <input
              {...register('customer', {
                required: 'Customer name is required',
                minLength: { value: 2, message: 'Name must be at least 2 characters' },
                validate: (v) => v.trim().length >= 2 || 'Customer name is required',
              })}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. NovaStar Solutions"
            />
            {errors.customer && (
              <p className="text-xs text-danger mt-1">{errors.customer.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Billing Email <span className="text-danger">*</span>
            </label>
            <input
              type="email"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
              })}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="billing@client.com"
            />
            {errors.email && (
              <p className="text-xs text-danger mt-1">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Issue Date <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              {...register('issueDate', { required: 'Issue date is required' })}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.issueDate && (
              <p className="text-xs text-danger mt-1">{errors.issueDate.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Due Date <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              {...register('dueDate', {
                required: 'Due date is required',
                validate: (v) => {
                  if (!issueDateVal) return true;
                  return v >= issueDateVal || 'Due date must be on or after the issue date';
                },
              })}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.dueDate && (
              <p className="text-xs text-danger mt-1">{errors.dueDate.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Line items */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">
          Line Items
        </h3>
        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            <div className="col-span-6">Description</div>
            <div className="col-span-2 text-right">Qty</div>
            <div className="col-span-2 text-right">Rate (PHP)</div>
            <div className="col-span-1 text-right">Amount</div>
            <div className="col-span-1" />
          </div>
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-6">
                <input
                  {...register(`items.${index}.description`, {
                    required: 'Description required',
                    validate: (v) => v.trim().length > 0 || 'Description required',
                  })}
                  className={`w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring ${errors.items?.[index]?.description ? 'border-danger' : 'border-input'}`}
                  placeholder="Service description"
                />
                {errors.items?.[index]?.description && (
                  <p className="text-xs text-danger mt-0.5">{errors.items[index]?.description?.message}</p>
                )}
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  min="1"
                  {...register(`items.${index}.quantity`, {
                    valueAsNumber: true,
                    required: 'Required',
                    min: { value: 1, message: 'Min 1' },
                    validate: (v) => (Number.isInteger(v) && v >= 1) || 'Must be ≥ 1',
                  })}
                  className={`w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-right font-mono ${errors.items?.[index]?.quantity ? 'border-danger' : 'border-input'}`}
                />
                {errors.items?.[index]?.quantity && (
                  <p className="text-xs text-danger mt-0.5">{errors.items[index]?.quantity?.message}</p>
                )}
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  {...register(`items.${index}.rate`, {
                    valueAsNumber: true,
                    required: 'Required',
                    min: { value: 0, message: 'Min 0' },
                  })}
                  className={`w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-right font-mono ${errors.items?.[index]?.rate ? 'border-danger' : 'border-input'}`}
                />
                {errors.items?.[index]?.rate && (
                  <p className="text-xs text-danger mt-0.5">{errors.items[index]?.rate?.message}</p>
                )}
              </div>
              <div className="col-span-1 text-right font-mono text-sm text-foreground font-semibold pt-2">
                ₱{((items[index]?.quantity || 0) * (items[index]?.rate || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="col-span-1 flex justify-center pt-1">
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => append({ description: '', quantity: 1, rate: 0 })}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mt-2"
          >
            <Plus size={12} />
            Add line item
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-mono">₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Tax (10%)</span>
            <span className="font-mono">₱{tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between font-bold text-foreground border-t border-border pt-2">
            <span>Total</span>
            <span className={`font-mono ${subtotal <= 0 ? 'text-danger' : ''}`}>₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          {subtotal <= 0 && (
            <p className="text-xs text-danger">Total must be greater than ₱0.00</p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">
          Notes / Payment Terms
        </label>
        <p className="text-xs text-muted-foreground mb-1">
          These will appear at the bottom of the invoice PDF.
        </p>
        <textarea
          {...register('notes')}
          rows={2}
          className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          placeholder="e.g. Payment due within 30 days. Thank you for your business."
        />
      </div>

      {/* Actions */}
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
          className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-70 active:scale-95 transition-all duration-150 min-w-[140px] justify-center"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Creating...
            </>
          ) : (
            'Create Invoice'
          )}
        </button>
      </div>
    </form>
  );
}
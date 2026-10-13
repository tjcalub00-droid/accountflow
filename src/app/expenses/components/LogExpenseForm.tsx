'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Upload, Loader2, Zap, X, FileText, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CategorizationRule } from './AutoCategorizationRules';

interface ExpenseFormData {
  vendor: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod: string;
  taxDeductible: boolean;
  notes: string;
}

export interface ExpenseEditData {
  id: string;
  vendor: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod: string;
  taxDeductible: boolean;
  notes: string;
  receiptUrl?: string | null;
}

interface Props {
  onClose: () => void;
  rules?: CategorizationRule[];
  editData?: ExpenseEditData | null;
}

const categories = [
  'Software & Tools',
  'Contractors',
  'Office & Admin',
  'Marketing',
  'Travel',
  'Utilities',
  'Professional Services',
  'Equipment',
];

const paymentMethods = ['Business Card', 'Personal Card', 'Bank Transfer', 'Cash', 'Auto-pay', 'Check'];

const MAX_EXPENSE_AMOUNT = 1_000_000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

export default function LogExpenseForm({ onClose, rules = [], editData }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(editData?.receiptUrl ?? null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [autoTaggedCategory, setAutoTaggedCategory] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, getEffectiveOwnerId } = useAuth();
  const supabase = createClient();
  const isEditing = !!editData;

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<ExpenseFormData>({
    defaultValues: {
      taxDeductible: editData?.taxDeductible ?? true,
      vendor: editData?.vendor ?? '',
      category: editData?.category ?? '',
      amount: editData?.amount ?? ('' as any),
      date: editData?.date ?? '',
      paymentMethod: editData?.paymentMethod ?? 'Business Card',
      notes: editData?.notes ?? '',
    },
  });

  const vendorValue = watch('vendor');

  useEffect(() => {
    if (!vendorValue || rules.length === 0) {
      setAutoTaggedCategory(null);
      return;
    }
    const lowerVendor = vendorValue.toLowerCase();
    const matchedRule = rules.find((r) =>
      lowerVendor.includes(r.vendorContains.toLowerCase())
    );
    if (matchedRule) {
      setValue('category', matchedRule.category);
      setAutoTaggedCategory(matchedRule.category);
    } else {
      setAutoTaggedCategory(null);
    }
  }, [vendorValue, rules, setValue]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only PDF, PNG, JPG, WEBP, or GIF files are allowed');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be under 10MB');
      return;
    }
    setSelectedFile(file);
    setRemoveReceipt(false);
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only PDF, PNG, JPG, WEBP, or GIF files are allowed');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be under 10MB');
      return;
    }
    setSelectedFile(file);
    setRemoveReceipt(false);
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveExistingReceipt = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExistingReceiptUrl(null);
    setRemoveReceipt(true);
  };

  const uploadReceipt = async (file: File, ownerId: string): Promise<string | null> => {
    const ext = file.name.split('.').pop() ?? 'bin';
    const path = `${ownerId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from('expense-receipts')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      toast.error('Failed to upload receipt: ' + error.message);
      return null;
    }
    const { data } = supabase.storage.from('expense-receipts').getPublicUrl(path);
    // Use signed URL approach since bucket is private
    const { data: signedData, error: signedErr } = await supabase.storage
      .from('expense-receipts')
      .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year
    if (signedErr || !signedData) return data.publicUrl;
    // Store the storage path so we can generate fresh signed URLs later
    return path;
  };

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      const ownerId = getEffectiveOwnerId();
      if (!ownerId || !user) { toast.error('Not authenticated'); return; }

      let receiptUrl: string | null = existingReceiptUrl;

      // Upload new file if selected
      if (selectedFile) {
        const uploadedPath = await uploadReceipt(selectedFile, ownerId);
        if (!uploadedPath) { setIsSubmitting(false); return; }
        receiptUrl = uploadedPath;
      } else if (removeReceipt) {
        receiptUrl = null;
      }

      if (isEditing && editData) {
        // Update existing expense
        const { error } = await supabase.from('expenses').update({
          expense_date: data.date,
          vendor: data.vendor.trim(),
          category: data.category,
          amount: Number(data.amount),
          payment_method: data.paymentMethod,
          has_receipt: !!receiptUrl,
          receipt_url: receiptUrl,
          tax_deductible: data.taxDeductible,
          notes: data.notes || null,
          updated_at: new Date().toISOString(),
        }).eq('id', editData.id);

        if (error) { toast.error('Failed to update expense: ' + error.message); return; }
        toast.success(`Expense updated — ${data.vendor}`);
        onClose();
        return;
      }

      // Duplicate detection for new expenses
      const { data: existing, error: dupErr } = await supabase
        .from('expenses')
        .select('id')
        .eq('owner_id', ownerId)
        .eq('vendor', data.vendor.trim())
        .eq('expense_date', data.date)
        .eq('amount', Number(data.amount))
        .limit(1);

      if (!dupErr && existing && existing.length > 0) {
        toast.error(`A duplicate expense for "${data.vendor}" on ${data.date} with the same amount already exists.`);
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from('expenses').insert({
        user_id: user.id,
        owner_id: ownerId,
        expense_date: data.date,
        vendor: data.vendor.trim(),
        category: data.category,
        amount: Number(data.amount),
        payment_method: data.paymentMethod,
        has_receipt: !!receiptUrl,
        receipt_url: receiptUrl,
        tax_deductible: data.taxDeductible,
        status: 'pending',
        notes: data.notes || null,
      });

      if (error) { toast.error('Failed to log expense: ' + error.message); return; }
      toast.success(`Expense logged — ${data.vendor} ₱${data.amount}`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Error saving expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasReceipt = selectedFile || (existingReceiptUrl && !removeReceipt);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-foreground mb-1">
            Vendor / Payee <span className="text-danger">*</span>
          </label>
          <input
            {...register('vendor', {
              required: 'Vendor is required',
              minLength: { value: 2, message: 'Vendor name must be at least 2 characters' },
              validate: (v) => v.trim().length >= 2 || 'Vendor is required',
            })}
            className={`w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring ${errors.vendor ? 'border-danger' : 'border-input'}`}
            placeholder="e.g. Adobe Inc."
          />
          {errors.vendor && <p className="text-xs text-danger mt-1">{errors.vendor.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Category <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <select
              {...register('category', { required: 'Category is required' })}
              className={`w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring ${errors.category ? 'border-danger' : autoTaggedCategory ? 'border-primary' : 'border-input'}`}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={`cat-form-${c}`} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {autoTaggedCategory && (
            <p className="flex items-center gap-1 text-xs text-primary mt-1">
              <Zap size={10} />
              Auto-tagged by rule
            </p>
          )}
          {errors.category && !autoTaggedCategory && (
            <p className="text-xs text-danger mt-1">{errors.category.message}</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Amount (PHP) <span className="text-danger">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            {...register('amount', {
              required: 'Amount is required',
              valueAsNumber: true,
              min: { value: 0.01, message: 'Amount must be greater than ₱0.00' },
              max: { value: MAX_EXPENSE_AMOUNT, message: `Amount cannot exceed ₱${MAX_EXPENSE_AMOUNT.toLocaleString()}` },
              validate: (v) => (!isNaN(v) && isFinite(v)) || 'Enter a valid number',
            })}
            className={`w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono ${errors.amount ? 'border-danger' : 'border-input'}`}
            placeholder="0.00"
          />
          {errors.amount && <p className="text-xs text-danger mt-1">{errors.amount.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Date <span className="text-danger">*</span>
          </label>
          <input
            type="date"
            {...register('date', {
              required: 'Date is required',
              validate: (v) => {
                if (!v) return 'Date is required';
                const selected = new Date(v);
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                if (selected > today) return 'Date cannot be in the future';
                const minDate = new Date('2000-01-01');
                if (selected < minDate) return 'Date must be after Jan 1, 2000';
                return true;
              },
            })}
            className={`w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring ${errors.date ? 'border-danger' : 'border-input'}`}
          />
          {errors.date && <p className="text-xs text-danger mt-1">{errors.date.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Payment Method
          </label>
          <select
            {...register('paymentMethod')}
            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {paymentMethods.map((pm) => (
              <option key={`pm-${pm}`} value={pm}>{pm}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Receipt upload */}
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">Receipt Attachment</label>
        <p className="text-xs text-muted-foreground mb-2">
          Upload a photo or PDF of the receipt for audit compliance and proof of business deductions.
        </p>

        {/* Existing receipt (edit mode) */}
        {existingReceiptUrl && !removeReceipt && !selectedFile && (
          <div className="flex items-center gap-3 p-3 mb-2 bg-success/5 border border-success/20 rounded-lg">
            <FileText size={16} className="text-success flex-shrink-0" />
            <span className="text-xs text-success font-medium flex-1 truncate">Receipt attached</span>
            <a
              href={`/api/receipt-proxy?path=${encodeURIComponent(existingReceiptUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink size={11} />
              View
            </a>
            <button
              type="button"
              onClick={handleRemoveExistingReceipt}
              className="text-muted-foreground hover:text-danger transition-colors"
              title="Remove receipt"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* New file selected */}
        {selectedFile ? (
          <div className="flex items-center gap-3 p-3 border border-primary/30 bg-primary/5 rounded-lg">
            {selectedFile.type === 'application/pdf' ? (
              <FileText size={16} className="text-primary flex-shrink-0" />
            ) : (
              <ImageIcon size={16} className="text-primary flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="text-muted-foreground hover:text-danger transition-colors"
              title="Remove file"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div
            onClick={handleDropZoneClick}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
              hasReceipt
                ? 'border-success/40 bg-success/5' :'border-border hover:border-primary/40 hover:bg-primary/5'
            }`}
          >
            <Upload size={20} className="text-muted-foreground" />
            <p className="text-xs text-muted-foreground text-center">
              {existingReceiptUrl && !removeReceipt
                ? 'Click to replace receipt' :'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-muted-foreground">PDF, PNG, JPG up to 10MB</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.gif"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Tax deductible */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="taxDeductible"
          {...register('taxDeductible')}
          className="w-4 h-4 rounded"
        />
        <label htmlFor="taxDeductible" className="text-sm text-foreground">
          Mark as tax deductible
        </label>
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">Notes</label>
        <textarea
          {...register('notes', {
            maxLength: { value: 500, message: 'Notes cannot exceed 500 characters' },
          })}
          rows={2}
          className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          placeholder="Brief description of this expense..."
        />
        {errors.notes && <p className="text-xs text-danger mt-1">{errors.notes.message}</p>}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors">
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-70 active:scale-95 transition-all duration-150 min-w-[120px] justify-center"
        >
          {isSubmitting ? (
            <><Loader2 size={14} className="animate-spin" />{isEditing ? 'Saving...' : 'Logging...'}</>
          ) : (
            isEditing ? 'Save Changes' : 'Log Expense'
          )}
        </button>
      </div>
    </form>
  );
}
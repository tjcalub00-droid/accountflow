import React, { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import {
  buildInvoiceDocumentHtml,
  editableInvoiceStatuses,
  invoiceStatusLabels,
  type EditableInvoiceStatus,
  type Invoice,
} from './invoiceDocument';

interface Props {
  invoice: Invoice | null;
  open: boolean;
  canEdit: boolean;
  onClose: () => void;
  onPrint: (invoice: Invoice) => void;
  onStatusChange: (invoice: Invoice, status: EditableInvoiceStatus) => Promise<boolean>;
}

export default function InvoicePreviewModal({
  invoice,
  open,
  canEdit,
  onClose,
  onPrint,
  onStatusChange,
}: Props) {
  const [selectedStatus, setSelectedStatus] = useState<Invoice['status'] | ''>(invoice?.status ?? '');
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    setSelectedStatus(invoice?.status ?? '');
  }, [invoice?.id, invoice?.status]);

  const handleStatusChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (!invoice) return;
    const nextStatus = event.target.value as EditableInvoiceStatus;
    setSelectedStatus(nextStatus);
    setSavingStatus(true);

    try {
      const saved = await onStatusChange(invoice, nextStatus);
      if (!saved) setSelectedStatus(invoice.status);
    } catch {
      setSelectedStatus(invoice.status);
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <Modal
      open={open && !!invoice}
      onClose={onClose}
      title={invoice ? `Invoice ${invoice.number}` : 'Invoice preview'}
      size="xl"
    >
      {invoice && (
        <div className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <label htmlFor="invoice-preview-status" className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Invoice status
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                {canEdit ? 'Changes save immediately.' : 'You do not have permission to change this invoice.'}
              </p>
            </div>
            <select
              id="invoice-preview-status"
              value={selectedStatus}
              onChange={handleStatusChange}
              disabled={!canEdit || savingStatus}
              className="w-full sm:w-auto min-w-48 px-3 py-2 text-sm font-semibold border border-border rounded-lg bg-background text-foreground disabled:opacity-60"
            >
              {invoice.status !== 'paid' &&
                invoice.status !== 'sent' &&
                invoice.status !== 'overdue' &&
                invoice.status !== 'partial' &&
                invoice.status !== 'closed' && (
                  <option value={invoice.status} disabled>
                    {invoiceStatusLabels[invoice.status]}
                  </option>
                )}
              {editableInvoiceStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <iframe
            title={`Preview of invoice ${invoice.number}`}
            srcDoc={buildInvoiceDocumentHtml(invoice)}
            sandbox=""
            className="w-full h-[min(68vh,680px)] rounded-lg border border-border bg-white"
          />
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => onPrint(invoice)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Printer size={15} />
              Print invoice
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

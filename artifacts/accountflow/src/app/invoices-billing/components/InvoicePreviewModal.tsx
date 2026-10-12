import React from 'react';
import { Printer } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { buildInvoiceDocumentHtml, type Invoice } from './invoiceDocument';

interface Props {
  invoice: Invoice | null;
  open: boolean;
  onClose: () => void;
  onPrint: (invoice: Invoice) => void;
}

export default function InvoicePreviewModal({ invoice, open, onClose, onPrint }: Props) {
  return (
    <Modal
      open={open && !!invoice}
      onClose={onClose}
      title={invoice ? `Invoice ${invoice.number}` : 'Invoice preview'}
      size="xl"
    >
      {invoice && (
        <div className="p-4 sm:p-6">
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

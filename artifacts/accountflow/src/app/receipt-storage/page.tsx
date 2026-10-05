import React from 'react';
import AppLayout from '@/components/AppLayout';
import ReceiptStorageContent from './components/ReceiptStorageContent';

export default function ReceiptStoragePage() {
  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Receipt Storage</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Capture or upload receipts and keep them organized in one place
          </p>
        </div>
        <ReceiptStorageContent />
      </div>
    </AppLayout>
  );
}

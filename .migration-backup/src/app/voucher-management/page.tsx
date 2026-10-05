import React from 'react';
import AppLayout from '@/components/AppLayout';
import VoucherManagementContent from './components/VoucherManagementContent';
import PageActions from '@/components/ui/PageActions';

export default function VoucherManagementPage() {
  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Voucher Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create, print, and manage payment vouchers with custom templates
            </p>
          </div>
          <PageActions pageName="Voucher Management" />
        </div>
        <VoucherManagementContent />
      </div>
    </AppLayout>
  );
}
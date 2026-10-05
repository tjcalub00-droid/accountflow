import React from 'react';
import AppLayout from '@/components/AppLayout';
import InvoicesSummaryStats from './components/InvoicesSummaryStats';
import InvoicesTableSection from './components/InvoicesTableSection';
import PageActions from '@/components/ui/PageActions';

export default function InvoicesBillingPage() {
  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Invoices & Billing</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create, send, and track all client invoices
            </p>
          </div>
          <PageActions pageName="Invoices & Billing" />
        </div>
        <InvoicesSummaryStats />
        <InvoicesTableSection />
      </div>
    </AppLayout>
  );
}
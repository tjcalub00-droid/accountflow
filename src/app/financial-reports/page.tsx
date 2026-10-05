import React from 'react';
import AppLayout from '@/components/AppLayout';
import FinancialReportsContent from './components/FinancialReportsContent';
import PageActions from '@/components/ui/PageActions';

export default function FinancialReportsPage() {
  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Financial Reports</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              P&L, Balance Sheet, and Cash Flow — Reynolds Consulting LLC
            </p>
          </div>
          <PageActions pageName="Financial Reports" />
        </div>
        <FinancialReportsContent />
      </div>
    </AppLayout>
  );
}
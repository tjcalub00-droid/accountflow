import React from 'react';
import AppLayout from '@/components/AppLayout';
import PayrollTaxContent from './components/PayrollTaxContent';
import PageActions from '@/components/ui/PageActions';

export default function PayrollTaxPage() {
  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Payroll</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Process payroll and manage employee deductions
            </p>
          </div>
          <PageActions pageName="Payroll" />
        </div>
        <PayrollTaxContent />
      </div>
    </AppLayout>
  );
}
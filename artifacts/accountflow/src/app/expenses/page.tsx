import React from 'react';
import AppLayout from '@/components/AppLayout';
import ExpensesSummaryRow from './components/ExpensesSummaryRow';
import ExpensesTableSection from './components/ExpensesTableSection';
import PageActions from '@/components/ui/PageActions';

export default function ExpensesPage() {
  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Expenses</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Log, categorize, and review all business spending
            </p>
          </div>
          <PageActions pageName="Expenses" />
        </div>
        <ExpensesSummaryRow />
        <ExpensesTableSection />
      </div>
    </AppLayout>
  );
}
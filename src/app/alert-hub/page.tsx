import React from 'react';
import AppLayout from '@/components/AppLayout';
import AlertHubContent from './components/AlertHubContent';

export default function AlertHubPage() {
  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Alert Hub</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overdue invoices, upcoming tax deadlines, pending payroll, and employee profile gaps in one place
          </p>
        </div>
        <AlertHubContent />
      </div>
    </AppLayout>
  );
}

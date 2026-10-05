import React from 'react';
import AppLayout from '@/components/AppLayout';
import EmployeeManagementContent from './components/EmployeeManagementContent';

export default function EmployeeManagementPage() {
  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Employee Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Register and manage employee profiles for payroll processing
          </p>
        </div>
        <EmployeeManagementContent />
      </div>
    </AppLayout>
  );
}

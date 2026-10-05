'use client';
import React, { useState } from 'react';
import PayrollSummaryCards from './PayrollSummaryCards';
import PayrollTable from './PayrollTable';
import RunPayrollModal from './RunPayrollModal';
import { Play, Calendar } from 'lucide-react';

export default function PayrollTaxContent() {
  const [runPayrollOpen, setRunPayrollOpen] = useState(false);

  return (
    <div className="space-y-5">
      <PayrollSummaryCards />

      {/* Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors">
            <Calendar size={14} />
            Bimonthly Schedule
          </button>
          <button
            onClick={() => setRunPayrollOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-150"
          >
            <Play size={14} />
            Run Payroll
          </button>
        </div>
      </div>

      <PayrollTable />

      <RunPayrollModal open={runPayrollOpen} onClose={() => setRunPayrollOpen(false)} />
    </div>
  );
}
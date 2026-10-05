'use client';
import React from 'react';

export default function TaxObligationsPanel() {
  return (
    <div className="space-y-4">
      {/* YTD summary */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground">Tax Liability Summary — YTD</h3>
        </div>
        <div className="px-5 py-12 flex flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-muted-foreground">No tax data yet</p>
          <p className="text-xs text-muted-foreground mt-1">Tax liability will be calculated once payroll runs are recorded.</p>
        </div>
      </div>

      {/* Filing calendar */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground">Filing Calendar</h3>
        </div>
        <div className="px-5 py-12 flex flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-muted-foreground">No filing obligations</p>
          <p className="text-xs text-muted-foreground mt-1">Tax filing deadlines will appear here once your account is set up.</p>
        </div>
      </div>
    </div>
  );
}
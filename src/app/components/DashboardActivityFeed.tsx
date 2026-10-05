import React from 'react';
import Link from 'next/link';

export default function DashboardActivityFeed() {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-base font-semibold text-foreground">Recent Activity</h3>
        <Link
          href="/invoices-billing"
          className="text-xs font-semibold text-primary hover:underline"
        >
          View all transactions
        </Link>
      </div>
      <div className="px-5 py-12 flex flex-col items-center justify-center text-center">
        <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
        <p className="text-xs text-muted-foreground mt-1">Transactions will appear here once you start adding invoices and expenses.</p>
      </div>
    </div>
  );
}
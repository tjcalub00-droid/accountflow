import React from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardAlertBanner from './components/DashboardAlertBanner';
import DashboardBentoGrid from './components/DashboardBentoGrid';
import DashboardChartsRow from './components/DashboardChartsRow';
import DashboardActivityFeed from './components/DashboardActivityFeed';
import PageActions from '@/components/ui/PageActions';

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Financial Overview</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Reynolds Consulting LLC · Fiscal Year 2026
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Last updated:</span>
              <span className="text-xs font-mono font-medium text-foreground">Sep 14, 2026 · 12:03 AM</span>
              <span className="w-2 h-2 rounded-full bg-success inline-block" title="Live data" />
            </div>
            <PageActions pageName="Financial Overview" />
          </div>
        </div>

        <DashboardAlertBanner />
        <DashboardBentoGrid />
        <DashboardChartsRow />
        <DashboardActivityFeed />
      </div>
    </AppLayout>
  );
}
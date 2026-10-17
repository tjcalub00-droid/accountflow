'use client';
import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardAlertBanner from './components/DashboardAlertBanner';
import DashboardBentoGrid from './components/DashboardBentoGrid';
import DashboardChartsRow from './components/DashboardChartsRow';
import DashboardActivityFeed from './components/DashboardActivityFeed';
import PageActions from '@/components/ui/PageActions';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { ChevronDown } from 'lucide-react';

export default function DashboardPage() {
  const { profile, loading: authLoading, getEffectiveOwnerId } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [fiscalYear, setFiscalYear] = useState('');
  const [overviewOpen, setOverviewOpen] = useState(false);

  useEffect(() => {
    if (authLoading || !profile) return;
    const ownerId = getEffectiveOwnerId();
    if (!ownerId) return;
    const supabase = createClient();
    supabase?.from('company_settings')?.select('company_name')?.eq('owner_id', ownerId)?.maybeSingle()?.then(({ data }) => {
        setCompanyName(data?.company_name || '');
      });
  }, [authLoading, profile]);

  useEffect(() => {
    const now = new Date();
    setFiscalYear(String(now?.getFullYear()));
    setLastUpdated(
      now?.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    );
  }, []);

  const displayName = companyName || profile?.full_name || 'Your Business';

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6 fade-in">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div>
            <button
              type="button"
              onClick={() => setOverviewOpen((v) => !v)}
              aria-expanded={overviewOpen}
              className="sm:pointer-events-none flex items-center gap-1.5 text-left"
            >
              <h1 className="text-lg sm:text-2xl font-bold text-foreground">Financial Overview</h1>
              <ChevronDown
                size={16}
                className={`sm:hidden text-muted-foreground transition-transform duration-200 ${overviewOpen ? 'rotate-180' : ''}`}
              />
            </button>
            <p className={`text-sm text-muted-foreground mt-0.5 ${overviewOpen ? 'block' : 'hidden'} sm:block`}>
              {displayName}
              {fiscalYear ? ` · Fiscal Year ${fiscalYear}` : ''}
            </p>
          </div>
          <div className={`${overviewOpen ? 'flex' : 'hidden'} sm:flex items-center gap-3 flex-wrap`}>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Last updated:</span>
              <span className="text-xs font-mono font-medium text-foreground">{lastUpdated}</span>
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
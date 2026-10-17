'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const RevenueVsExpensesChart = dynamic(
  () => import('./charts/RevenueVsExpensesChart'),
  { ssr: false, loading: () => <div className="animate-pulse bg-muted rounded-xl h-72 w-full" /> }
);

const ExpenseCategoryChart = dynamic(
  () => import('./charts/ExpenseCategoryChart'),
  { ssr: false, loading: () => <div className="animate-pulse bg-muted rounded-xl h-72 w-full" /> }
);

export default function DashboardChartsRow() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm border-l-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base text-foreground font-normal">Revenue vs Expenses</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Last 6 months</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
              Revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-danger inline-block" />
              Expenses
            </span>
          </div>
        </div>
        <RevenueVsExpensesChart />
      </div>
      <div className="border border-border rounded-xl p-5 shadow-sm bg-[rgba(241,208,208,1)]">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-foreground">Expense Breakdown</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Sep 2026</p>
        </div>
        <ExpenseCategoryChart />
      </div>
    </div>);

}
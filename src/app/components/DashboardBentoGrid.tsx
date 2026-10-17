'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, FileX, AlertCircle, CreditCard,  } from 'lucide-react';

export default function DashboardBentoGrid() {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const now = new Date();
    const formatted = now?.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    setCurrentDate(formatted);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {/* AR */}
      <div className="col-span-1 border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow bg-[rgba(186,251,177,1)]">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Accounts Receivable
          </p>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp size={15} className="text-primary" />
          </div>
        </div>
        <p className="text-2xl font-bold font-mono text-foreground">₱0</p>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-0.5">
            <ArrowUpRight size={11} />0.0%
          </span>
          <span className="text-xs text-muted-foreground">0 open invoices</span>
        </div>
      </div>

      {/* AP */}
      <div className="col-span-1 border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow bg-[rgba(253,253,165,1)]">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Accounts Payable
          </p>
          <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <TrendingDown size={15} className="text-warning" />
          </div>
        </div>
        <p className="text-2xl font-bold font-mono text-foreground">₱0</p>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-0.5">
            <ArrowDownRight size={11} />0.0%
          </span>
          <span className="text-xs text-muted-foreground">0 unpaid bills</span>
        </div>
      </div>

      {/* Overdue */}
      <div className="col-span-1 border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow bg-[rgba(254,144,144,1)]">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Overdue Invoices
          </p>
          <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center">
            <FileX size={15} className="text-danger" />
          </div>
        </div>
        <p className="text-2xl font-bold font-mono text-foreground">₱0</p>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-xs font-semibold text-muted-foreground">0 invoices</span>
          <span className="text-xs text-muted-foreground">No overdue</span>
        </div>
      </div>

      {/* Monthly Revenue */}
      <div className="col-span-1 border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow bg-[rgba(177,177,251,1)]">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Monthly Revenue
          </p>
          <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
            <ArrowUpRight size={15} className="text-success" />
          </div>
        </div>
        <p className="text-2xl font-bold font-mono text-foreground">₱0</p>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-0.5">
            <ArrowUpRight size={11} />0.0%
          </span>
          <span className="text-xs text-muted-foreground">MTD</span>
        </div>
        {currentDate && (
          <p className="text-xs text-muted-foreground mt-1.5">as of {currentDate}</p>
        )}
      </div>

      {/* Monthly Expenses */}
      <div className="col-span-1 border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow bg-[rgba(231,139,249,1)]">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-thin">
            Monthly Expenses
          </p>
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <CreditCard size={15} className="text-muted-foreground" />
          </div>
        </div>
        <p className="text-2xl font-bold font-mono text-foreground">₱0</p>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-0.5">
            <ArrowDownRight size={11} />0.0%
          </span>
          <span className="text-xs text-muted-foreground">vs last month</span>
        </div>
        {currentDate && (
          <p className="text-xs text-muted-foreground mt-1.5">as of {currentDate}</p>
        )}
      </div>

      {/* Tax Liability */}
      <div className="col-span-1 border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow bg-[rgba(253,253,165,1)]">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Tax Liability YTD
          </p>
          <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <AlertCircle size={15} className="text-warning" />
          </div>
        </div>
        <p className="text-2xl font-bold font-mono text-foreground">₱0</p>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-xs font-semibold text-muted-foreground">No payments due</span>
        </div>
      </div>
    </div>
  );
}
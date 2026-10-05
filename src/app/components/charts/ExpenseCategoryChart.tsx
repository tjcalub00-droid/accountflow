'use client';
import React from 'react';

export default function ExpenseCategoryChart() {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-center">
      <p className="text-sm font-medium text-muted-foreground">No expense data yet</p>
      <p className="text-xs text-muted-foreground mt-1">Expense breakdown will appear once you log expenses.</p>
    </div>
  );
}
'use client';
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PLPoint {
  month: string;
  revenue: number;
  netIncome: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-lg">
      <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={`plt-${p.dataKey}`} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.fill }} />
          <span className="text-muted-foreground capitalize">{p.dataKey === 'netIncome' ? 'Net Income' : 'Revenue'}:</span>
          <span className="font-bold font-mono">₱{Number(p.value).toLocaleString('en-US')}</span>
        </div>
      ))}
    </div>
  );
}

export default function PLChart({ data = [] }: { data?: PLPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barGap={2}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="revenue" fill="var(--primary)" radius={[3, 3, 0, 0]} opacity={0.6} />
        <Bar dataKey="netIncome" fill="var(--accent)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
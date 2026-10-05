'use client';
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const data = [
  { month: 'Apr', cashFlow: 0 },
  { month: 'May', cashFlow: 0 },
  { month: 'Jun', cashFlow: 0 },
  { month: 'Jul', cashFlow: 0 },
  { month: 'Aug', cashFlow: 0 },
  { month: 'Sep', cashFlow: 0 },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-lg">
      <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm font-bold font-mono ${v < 0 ? 'text-danger' : 'text-success'}`}>
        {v < 0 ? `($${Math.abs(v).toLocaleString()})` : `$${v.toLocaleString()}`}
      </p>
    </div>
  );
}

export default function CashFlowChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="cashFlow"
          stroke="var(--accent)"
          strokeWidth={2.5}
          dot={{ fill: 'var(--accent)', r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
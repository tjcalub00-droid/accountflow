import React, { useCallback, useEffect, useState } from 'react';
import { Users, DollarSign, AlertTriangle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { getBimonthlyEmployeePay, mapEmployeeRecord } from '@/lib/employee-pay';

interface PayrollRosterSummary {
  activeEmployees: number;
  estimatedNextNet: number;
}

export default function PayrollSummaryCards() {
  const { getEffectiveOwnerId, loading: authLoading } = useAuth();
  const ownerId = getEffectiveOwnerId();
  const supabase = createClient();
  const [summary, setSummary] = useState<PayrollRosterSummary | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!ownerId) {
      setSummary({ activeEmployees: 0, estimatedNextNet: 0 });
      return;
    }

    const { data, error } = await supabase
      .from('employees')
      .select('id, full_name, role, monthly_salary, sss_rate, pagibig_rate, hdmf_rate, is_active')
      .eq('owner_id', ownerId)
      .eq('is_active', true);

    if (error) {
      setSummary(null);
      toast.error('Failed to load the employee payroll summary');
      return;
    }

    const activeEmployees = (data || []).map((row) => mapEmployeeRecord(row));
    setSummary({
      activeEmployees: activeEmployees.length,
      estimatedNextNet: activeEmployees.reduce(
        (sum, employee) => sum + getBimonthlyEmployeePay(employee).net,
        0
      ),
    });
  }, [ownerId, supabase]);

  useEffect(() => {
    if (!authLoading) void fetchSummary();
  }, [authLoading, fetchSummary]);

  const cards = [
    {
      id: 'pr-employees',
      label: 'Active Employees',
      value: summary ? summary.activeEmployees.toLocaleString() : '—',
      sub: 'Synced from employee roster',
      icon: Users,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      id: 'pr-next',
      label: 'Next Payroll (Est.)',
      value: summary ? `₱${summary.estimatedNextNet.toLocaleString()}` : '—',
      sub: 'Net pay · half of active monthly salaries',
      icon: DollarSign,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      id: 'pr-ytd',
      label: 'Total Payroll YTD',
      value: '₱0',
      sub: 'Gross wages YTD (24 pay periods)',
      icon: Calendar,
      iconBg: 'bg-muted',
      iconColor: 'text-muted-foreground',
    },
    {
      id: 'pr-tax-due',
      label: 'Payroll Tax Due',
      value: '₱0',
      sub: 'No tax obligations',
      icon: AlertTriangle,
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards?.map((c) => {
        const Icon = c?.icon;
        return (
          <div key={c?.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{c?.label}</p>
              <div className={`w-8 h-8 rounded-lg ${c?.iconBg} flex items-center justify-center`}>
                <Icon size={14} className={c?.iconColor} />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{c?.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{c?.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
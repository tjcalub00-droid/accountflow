'use client';
import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Save, CheckCircle, AlertCircle } from 'lucide-react';

const CURRENCIES = [
  { code: 'USD', label: 'USD – US Dollar' },
  { code: 'EUR', label: 'EUR – Euro' },
  { code: 'GBP', label: 'GBP – British Pound' },
  { code: 'CAD', label: 'CAD – Canadian Dollar' },
  { code: 'AUD', label: 'AUD – Australian Dollar' },
  { code: 'JPY', label: 'JPY – Japanese Yen' },
  { code: 'INR', label: 'INR – Indian Rupee' },
  { code: 'NGN', label: 'NGN – Nigerian Naira' },
  { code: 'ZAR', label: 'ZAR – South African Rand' },
  { code: 'BRL', label: 'BRL – Brazilian Real' },
];

const PAY_CYCLES = [
  { value: 'bimonthly', label: 'Bimonthly (twice a month, 1st & 15th)' },
  { value: 'biweekly', label: 'Biweekly (every two weeks)' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

interface CompanySettings {
  id?: string;
  company_name: string;
  tax_id: string;
  currency: string;
  pay_cycle: string;
}

export default function CompanySettingsPage() {
  const { getEffectiveOwnerId, isOwner } = useAuth();
  const supabase = createClient();

  const [settings, setSettings] = useState<CompanySettings>({
    company_name: '',
    tax_id: '',
    currency: 'USD',
    pay_cycle: 'bimonthly',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const ownerId = getEffectiveOwnerId();
      if (!ownerId) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('owner_id', ownerId)
        .single();

      if (data && !error) {
        setSettings({
          id: data.id,
          company_name: data.company_name ?? '',
          tax_id: data.tax_id ?? '',
          currency: data.currency ?? 'USD',
          pay_cycle: data.pay_cycle ?? 'bimonthly',
        });
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const ownerId = getEffectiveOwnerId();
    if (!ownerId) return;

    setSaving(true);
    try {
      const payload = {
        owner_id: ownerId,
        company_name: settings.company_name.trim(),
        tax_id: settings.tax_id.trim(),
        currency: settings.currency,
        pay_cycle: settings.pay_cycle,
      };

      const { error } = await supabase
        .from('company_settings')
        .upsert(payload, { onConflict: 'owner_id' });

      if (error) throw error;
      showToast('success', 'Company settings saved successfully.');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Company Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure your business profile, tax information, and payroll preferences
            </p>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium border ${
              toast.type === 'success' ?'bg-success/10 border-success/30 text-success' :'bg-danger/10 border-danger/30 text-danger'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle size={16} className="flex-shrink-0" />
            ) : (
              <AlertCircle size={16} className="flex-shrink-0" />
            )}
            {toast.message}
          </div>
        )}

        {loading ? (
          <div className="bg-card border border-border rounded-xl p-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Business Identity */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={18} className="text-primary" />
                <h2 className="text-base font-semibold text-foreground">Business Identity</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Company Name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="company_name">
                    Company Name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="company_name"
                    type="text"
                    required
                    placeholder="Acme Corp"
                    value={settings.company_name}
                    onChange={(e) => setSettings((s) => ({ ...s, company_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                  />
                </div>

                {/* Tax ID */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="tax_id">
                    Tax ID / EIN
                  </label>
                  <input
                    id="tax_id"
                    type="text"
                    placeholder="12-3456789"
                    value={settings.tax_id}
                    onChange={(e) => setSettings((s) => ({ ...s, tax_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                  />
                  <p className="text-xs text-muted-foreground">Used on invoices and tax documents</p>
                </div>
              </div>
            </div>

            {/* Financial Preferences */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-5">
              <h2 className="text-base font-semibold text-foreground">Financial Preferences</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Currency */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="currency">
                    Default Currency <span className="text-danger">*</span>
                  </label>
                  <select
                    id="currency"
                    required
                    value={settings.currency}
                    onChange={(e) => setSettings((s) => ({ ...s, currency: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">Applied to invoices, expenses, and reports</p>
                </div>

                {/* Pay Cycle */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="pay_cycle">
                    Pay Cycle <span className="text-danger">*</span>
                  </label>
                  <select
                    id="pay_cycle"
                    required
                    value={settings.pay_cycle}
                    onChange={(e) => setSettings((s) => ({ ...s, pay_cycle: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                  >
                    {PAY_CYCLES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">Determines payroll run schedule</p>
                </div>
              </div>
            </div>

            {/* Save */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || !isOwner()}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                {saving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>

            {!isOwner() && (
              <p className="text-xs text-muted-foreground text-right">
                Only the account owner can modify company settings.
              </p>
            )}
          </form>
        )}
      </div>
    </AppLayout>
  );
}

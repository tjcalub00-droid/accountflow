'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Mail, Lock, Building2, Check, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';


const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'NGN', 'ZAR', 'BRL', 'PHP'];

const BUSINESS_TYPES = [
  'Sole Proprietorship',
  'Partnership',
  'Corporation',
  'LLC',
  'Freelancer / Self-employed',
  'Non-profit',
  'Other',
];

const STEPS = [
  { id: 1, label: 'Confirm Email', icon: Mail },
  { id: 2, label: 'Set Password', icon: Lock },
  { id: 3, label: 'Business Details', icon: Building2 },
];

const inputClass =
  'w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring';
const labelClass =
  'block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Step 1
  const [emailConfirmed, setEmailConfirmed] = useState(false);

  // Step 2
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 3
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
  const [taxId, setTaxId] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (profile?.onboarding_completed) {
      router.replace('/');
    }
  }, [authLoading, user, profile, router]);

  useEffect(() => {
    if (profile?.full_name) setFullName((prev) => prev || profile.full_name);
  }, [profile]);

  const goNext = () => {
    setError('');
    if (step === 2) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const goBack = () => {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!companyName.trim()) {
      setError('Company name is required.');
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      // 1. Set password
      const { error: pwError } = await supabase.auth.updateUser({ password });
      if (pwError) throw pwError;

      // 2. Save business details (owner of own account)
      const ownerId = profile?.owner_id ?? user.id;
      const { error: csError } = await supabase.from('company_settings').upsert(
        {
          owner_id: ownerId,
          company_name: companyName.trim(),
          tax_id: taxId.trim(),
          currency,
          business_type: businessType,
          business_address: businessAddress.trim(),
          business_phone: phone.trim(),
        },
        { onConflict: 'owner_id' }
      );
      if (csError) throw csError;

      // 3. Mark profile as onboarded
      const { error: profError } = await supabase
        .from('user_profiles')
        .update({
          full_name: fullName.trim() || profile?.full_name || '',
          phone: phone.trim(),
          onboarding_completed: true,
        })
        .eq('id', user.id);
      if (profError) throw profError;

      // Full reload so auth context and middleware pick up the new state
      window.location.href = '/';
    } catch (err: any) {
      setError(err?.message || 'Could not complete setup. Please try again.');
      setSaving(false);
    }
  };

  if (authLoading || !user || profile?.onboarding_completed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-1 mb-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">Odin</span>
            <Image
              src="/assets/images/istockphoto-1271371970-612x612-1789378855208.jpg"
              alt="Odinthor hammer logo"
              width={36}
              height={36}
              className="rounded object-cover flex-shrink-0"
            />
            <span className="text-2xl font-bold tracking-tight text-foreground">Thor</span>
          </div>
          <h1 className="text-lg font-semibold text-foreground">Welcome! Let&apos;s set up your account</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Complete these 3 quick steps to get started
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-6 px-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = step > s.id;
            const active = step === s.id;
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                      done
                        ? 'bg-primary border-primary text-primary-foreground'
                        : active
                        ? 'border-primary text-primary bg-card' :'border-border text-muted-foreground bg-card'
                    }`}
                  >
                    {done ? <Check size={16} /> : <Icon size={16} />}
                  </div>
                  <span
                    className={`text-[11px] font-semibold ${
                      active || done ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 mb-5 ${step > s.id ? 'bg-primary' : 'bg-border'}`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-lg p-6 sm:p-8">
          <form onSubmit={handleFinish} className="space-y-4">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Confirm your email</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Make sure this is the email address you want to use to sign in and receive account notices.
                  </p>
                </div>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <input
                    type="email"
                    value={user?.email ?? profile?.email ?? ''}
                    readOnly
                    className={`${inputClass} opacity-80 cursor-not-allowed`}
                  />
                </div>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailConfirmed}
                    onChange={(e) => setEmailConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-primary"
                  />
                  <span className="text-sm text-foreground">
                    I confirm this is my correct email address.
                  </span>
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Set your password</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose a secure password with at least 8 characters.
                  </p>
                </div>
                <div>
                  <label className={labelClass}>New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      minLength={8}
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Business details</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tell us about your business. You can change these later in Company Settings.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Your Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 555 123 4567"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>
                    Company Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Corp"
                    required
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Business Type</label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className={inputClass}
                    >
                      {BUSINESS_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className={inputClass}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Tax ID / EIN</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="12-3456789"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Business Address</label>
                  <textarea
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    placeholder="Street, City, State, ZIP"
                    rows={2}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-danger/10 border border-danger/20 rounded-lg">
                <AlertCircle size={14} className="text-danger flex-shrink-0 mt-0.5" />
                <p className="text-xs text-danger">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-foreground bg-muted border border-border rounded-lg hover:bg-muted/70 transition-all disabled:opacity-60"
                >
                  <ArrowLeft size={15} />
                  Back
                </button>
              ) : (
                <span />
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={step === 1 && !emailConfirmed}
                  className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Continue
                  <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check size={15} />
                  )}
                  {saving ? 'Saving…' : 'Finish Setup'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

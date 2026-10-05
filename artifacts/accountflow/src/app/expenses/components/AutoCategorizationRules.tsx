'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CategorizationRule {
  id: string;
  vendorContains: string;
  category: string;
}

const categories = [
  'Software & Tools',
  'Contractors',
  'Office & Admin',
  'Marketing',
  'Travel',
  'Utilities',
  'Professional Services',
  'Equipment',
];

const STORAGE_KEY_PREFIX = 'expense_rules_';

interface Props {
  onRulesChange?: (rules: CategorizationRule[]) => void;
}

export default function AutoCategorizationRules({ onRulesChange }: Props) {
  const { getEffectiveOwnerId } = useAuth();
  const supabase = createClient();
  const [rules, setRules] = useState<CategorizationRule[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [newVendor, setNewVendor] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [vendorError, setVendorError] = useState('');
  const [categoryError, setCategoryError] = useState('');

  const storageKey = () => {
    const ownerId = getEffectiveOwnerId();
    return `${STORAGE_KEY_PREFIX}${ownerId || 'default'}`;
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey());
      if (stored) {
        const parsed = JSON.parse(stored) as CategorizationRule[];
        setRules(parsed);
        onRulesChange?.(parsed);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const saveRules = (updated: CategorizationRule[]) => {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
    setRules(updated);
    onRulesChange?.(updated);
  };

  const handleAdd = () => {
    let valid = true;
    if (!newVendor.trim() || newVendor.trim().length < 2) {
      setVendorError('Enter at least 2 characters');
      valid = false;
    } else {
      setVendorError('');
    }
    if (!newCategory) {
      setCategoryError('Select a category');
      valid = false;
    } else {
      setCategoryError('');
    }
    if (!valid) return;

    const duplicate = rules.find(
      (r) => r.vendorContains.toLowerCase() === newVendor.trim().toLowerCase() && r.category === newCategory
    );
    if (duplicate) {
      toast.error('This rule already exists');
      return;
    }

    const newRule: CategorizationRule = {
      id: `rule-${Date.now()}`,
      vendorContains: newVendor.trim(),
      category: newCategory,
    };
    const updated = [...rules, newRule];
    saveRules(updated);
    setNewVendor('');
    setNewCategory('');
    toast.success(`Rule added: "${newRule.vendorContains}" → ${newRule.category}`);
  };

  const handleDelete = (id: string) => {
    const updated = rules.filter((r) => r.id !== id);
    saveRules(updated);
    toast.success('Rule removed');
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap size={14} className="text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Auto-Categorization Rules</p>
            <p className="text-xs text-muted-foreground">
              {rules.length === 0
                ? 'No rules defined — expenses are categorized manually'
                : `${rules.length} rule${rules.length !== 1 ? 's' : ''} active`}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={16} className="text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            When a vendor name <strong>contains</strong> the keyword below, the category is automatically applied on entry.
          </p>

          {/* Add new rule */}
          <div className="flex flex-wrap items-start gap-2">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Vendor contains
              </label>
              <input
                type="text"
                value={newVendor}
                onChange={(e) => { setNewVendor(e.target.value); setVendorError(''); }}
                placeholder="e.g. Adobe"
                className={`w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring ${vendorError ? 'border-danger' : 'border-input'}`}
              />
              {vendorError && <p className="text-xs text-danger mt-1">{vendorError}</p>}
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Assign category
              </label>
              <select
                value={newCategory}
                onChange={(e) => { setNewCategory(e.target.value); setCategoryError(''); }}
                className={`w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring ${categoryError ? 'border-danger' : 'border-input'}`}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={`rule-cat-${c}`} value={c}>{c}</option>
                ))}
              </select>
              {categoryError && <p className="text-xs text-danger mt-1">{categoryError}</p>}
            </div>
            <div className="pt-5">
              <button
                type="button"
                onClick={handleAdd}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-150"
              >
                <Plus size={14} />
                Add Rule
              </button>
            </div>
          </div>

          {/* Rules list */}
          {rules.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Active Rules</p>
              <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between px-4 py-2.5 bg-background hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground text-xs">Vendor contains</span>
                      <span className="font-semibold text-foreground bg-muted px-2 py-0.5 rounded text-xs font-mono">
                        {rule.vendorContains}
                      </span>
                      <span className="text-muted-foreground text-xs">→</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                        <Tag size={10} />
                        {rule.category}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(rule.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors"
                      title="Remove rule"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
              No rules yet. Add a rule above to auto-tag expenses on entry.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

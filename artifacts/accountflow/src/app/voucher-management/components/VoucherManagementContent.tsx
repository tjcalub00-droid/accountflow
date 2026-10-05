'use client';
import React, { useState } from 'react';
import VoucherTemplateSection from './VoucherTemplateSection';
import VoucherListTable from './VoucherListTable';
import CreateVoucherModal from './CreateVoucherModal';
import type { NewVoucher } from './CreateVoucherModal';
import { Plus, X, FileText, CreditCard, Receipt, Wallet, Users } from 'lucide-react';

const tabs = [
  { id: 'vouchers', label: 'Vouchers' },
  { id: 'templates', label: 'Templates' },
];

type VoucherType = 'Payment' | 'Receipt' | 'Journal' | 'Petty Cash' | 'Payroll';

const voucherTypes: { type: VoucherType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    type: 'Payment',
    label: 'Payment Voucher',
    description: 'Record outgoing payments to vendors or suppliers',
    icon: <CreditCard size={22} className="text-primary" />,
  },
  {
    type: 'Receipt',
    label: 'Receipt Voucher',
    description: 'Record incoming payments from customers',
    icon: <Receipt size={22} className="text-success" />,
  },
  {
    type: 'Journal',
    label: 'Journal Voucher',
    description: 'General journal entries and adjustments',
    icon: <FileText size={22} className="text-warning" />,
  },
  {
    type: 'Petty Cash',
    label: 'Petty Cash Voucher',
    description: 'Small cash disbursements and reimbursements',
    icon: <Wallet size={22} className="text-secondary" />,
  },
  {
    type: 'Payroll',
    label: 'Payroll Voucher',
    description: 'Employee payroll with deductions and net income',
    icon: <Users size={22} className="text-info" />,
  },
];

function VoucherTypePickerModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (type: VoucherType) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Select Voucher Type</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-2">
          {voucherTypes.map(({ type, label, description, icon }) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-150 text-left group"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                {icon}
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function VoucherManagementContent() {
  const [activeTab, setActiveTab] = useState('vouchers');
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<VoucherType>('Payroll');
  const [newVouchers, setNewVouchers] = useState<NewVoucher[]>([]);

  const handleVoucherPrinted = (voucher: NewVoucher) => {
    setNewVouchers((prev) => [voucher, ...prev]);
    setActiveTab('vouchers');
  };

  const handleTypeSelect = (type: VoucherType) => {
    setSelectedType(type);
    setTypePickerOpen(false);
    setCreateOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {tabs?.map((tab) => (
            <button
              key={`vm-tab-${tab?.id}`}
              onClick={() => setActiveTab(tab?.id)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-150 ${
                activeTab === tab?.id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab?.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setTypePickerOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-150"
        >
          <Plus size={14} />
          Create Voucher
        </button>
      </div>

      {activeTab === 'templates' && <VoucherTemplateSection />}
      {activeTab === 'vouchers' && <VoucherListTable additionalVouchers={newVouchers} />}

      <VoucherTypePickerModal
        open={typePickerOpen}
        onClose={() => setTypePickerOpen(false)}
        onSelect={handleTypeSelect}
      />

      <CreateVoucherModal
        open={createOpen}
        voucherType={selectedType}
        onClose={() => setCreateOpen(false)}
        onVoucherPrinted={handleVoucherPrinted}
      />
    </div>
  );
}
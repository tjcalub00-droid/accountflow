'use client';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Upload, CheckCircle2, Trash2, Eye, Star, LayoutTemplate } from 'lucide-react';

const templates = [
  {
    id: 'tpl-001',
    name: 'Standard Payment Voucher',
    type: 'Payment',
    lastUsed: 'Sep 13, 2026',
    usageCount: 38,
    isDefault: true,
    preview: 'Two-column layout with logo, payee details, amount in words, authorized signature line.',
  },
  {
    id: 'tpl-002',
    name: 'Receipt Voucher — Blue',
    type: 'Receipt',
    lastUsed: 'Sep 10, 2026',
    usageCount: 14,
    isDefault: false,
    preview: 'Blue header band, receipt number top-right, itemized amount table, cash/check indicator.',
  },
  {
    id: 'tpl-003',
    name: 'Journal Entry Voucher',
    type: 'Journal',
    lastUsed: 'Aug 28, 2026',
    usageCount: 7,
    isDefault: false,
    preview: 'Debit/credit ledger columns, narration field, prepared/approved signature blocks.',
  },
  {
    id: 'tpl-004',
    name: 'Petty Cash Voucher',
    type: 'Payment',
    lastUsed: 'Sep 5, 2026',
    usageCount: 22,
    isDefault: false,
    preview: 'Compact single-page layout, purpose field, cash amount, recipient signature.',
  },
];

export default function VoucherTemplateSection() {
  const [dragging, setDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setUploadedFile(file.name);
      toast.success(`Template "${file.name}" uploaded successfully`);
    }
  };

  return (
    <div className="space-y-5">
      {/* Upload zone */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4">Upload Custom Template</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Upload a PDF, DOCX, or HTML template file. Supported placeholders:{' '}
          <code className="font-mono bg-muted px-1 rounded">{'{{payee}}'}</code>,{' '}
          <code className="font-mono bg-muted px-1 rounded">{'{{amount}}'}</code>,{' '}
          <code className="font-mono bg-muted px-1 rounded">{'{{date}}'}</code>,{' '}
          <code className="font-mono bg-muted px-1 rounded">{'{{voucher_no}}'}</code>
        </p>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => { setUploadedFile('custom_voucher_template.pdf'); toast.success('Template uploaded'); }}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200 ${
            dragging
              ? 'border-primary/60 bg-primary/5 scale-[1.01]'
              : uploadedFile
              ? 'border-success/40 bg-success/5' :'border-border hover:border-primary/40 hover:bg-primary/5'
          }`}
        >
          {uploadedFile ? (
            <>
              <CheckCircle2 size={28} className="text-success" />
              <p className="text-sm font-semibold text-success">{uploadedFile} uploaded</p>
              <p className="text-xs text-muted-foreground">Click to replace with a different file</p>
            </>
          ) : (
            <>
              <Upload size={28} className="text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Drop your template here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse — PDF, DOCX, HTML up to 20MB</p>
              </div>
            </>
          )}
        </div>
        {uploadedFile && (
          <div className="mt-3 flex items-center gap-3">
            <input
              type="text"
              placeholder="Template name"
              defaultValue={uploadedFile.replace(/\.[^.]+$/, '').replace(/_/g, ' ')}
              className="flex-1 px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select className="px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="payment">Payment Voucher</option>
              <option value="receipt">Receipt Voucher</option>
              <option value="journal">Journal Voucher</option>
            </select>
            <button
              onClick={() => toast.success('Template saved to library')}
              className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Save Template
            </button>
          </div>
        )}
      </div>

      {/* Template gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group"
          >
            {/* Template preview mockup */}
            <div className="w-full h-28 bg-muted rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
              <LayoutTemplate size={32} className="text-muted-foreground/30" />
              {tpl.isDefault && (
                <span className="absolute top-2 right-2 flex items-center gap-1 text-xs font-semibold bg-warning/15 text-warning px-2 py-0.5 rounded-full">
                  <Star size={10} />
                  Default
                </span>
              )}
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => toast.info(`Previewing ${tpl.name}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-card border border-border rounded-lg shadow-sm hover:bg-muted transition-colors"
                >
                  <Eye size={12} />
                  Preview
                </button>
              </div>
            </div>

            <div className="flex items-start justify-between mb-1">
              <p className="text-sm font-semibold text-foreground leading-tight">{tpl.name}</p>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary mb-2">
              {tpl.type}
            </span>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{tpl.preview}</p>

            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <span>Used {tpl.usageCount}x</span>
              <span>Last: {tpl.lastUsed}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toast.success(`${tpl.name} set as default`)}
                className="flex-1 px-3 py-1.5 text-xs font-semibold text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Set Default
              </button>
              <button
                onClick={() => toast.error(`Template deleted`)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors"
                title="Delete template — this cannot be undone"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
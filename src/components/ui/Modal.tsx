'use client';
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
};

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-foreground/30 backdrop-blur-sm fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`bg-card shadow-2xl w-full ${sizeMap[size]} modal-sheet flex flex-col rounded-t-3xl sm:rounded-2xl h-[92dvh] max-h-[92dvh] sm:h-auto sm:max-h-[90vh]`}
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 flex-shrink-0" aria-hidden="true">
          <span className="w-10 h-1.5 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border flex-shrink-0">
          <h2 id="modal-title" className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>
        <div className="modal-sheet-body overflow-y-auto scrollbar-thin flex-1 overscroll-contain pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </div>
    </div>
  );
}
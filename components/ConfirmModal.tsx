'use client';

import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Clear History',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onCancel();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={onCancel}
        className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      />
      <div
        className="fixed left-1/2 top-1/2 z-[1001] w-[90%] max-w-sm rounded-3xl border border-border bg-popover p-6 shadow-2xl"
        style={{ animation: 'modalSlideUp 0.3s ease-out' }}
      >
        <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <TriangleAlert className="size-6 text-primary" />
        </div>

        <h2 className="mb-2 font-serif text-xl font-semibold text-foreground">{title}</h2>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{message}</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl border border-border px-5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[#a83226]"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </>
  );
}

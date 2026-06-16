'use client';

import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onHide: () => void;
}

export default function Toast({ message, isVisible, onHide }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onHide, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[100]"
      style={{ animation: 'slideUp 0.3s ease-out' }}
    >
      <div className="flex items-center gap-2 rounded-full border border-accent/30 bg-popover px-5 py-2.5 text-sm font-medium text-foreground shadow-xl backdrop-blur-md">
        <TriangleAlert className="size-4 text-accent" />
        {message}
      </div>
    </div>
  );
}

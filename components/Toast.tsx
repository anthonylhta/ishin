'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onHide: () => void;
  icon?: string;
}

export default function Toast({ message, isVisible, onHide, icon = '✓' }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      // Every current toast is an error message — give it time to be read.
      const timer = setTimeout(() => {
        onHide();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide]);

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 100,
      animation: 'slideUp 0.3s ease-out',
    }}>
      <div style={{
        background: '#1A1917',
      border: '1px solid rgba(201, 168, 76, 0.3)',
      backdropFilter: 'blur(8px)',
      color: '#F0EDE8',
      padding: '10px 20px',
      borderRadius: '100px',
      fontSize: '0.875rem',
      fontWeight: 500,
      letterSpacing: '0.5px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
    }}>
        <span>{icon}</span>
        {message}
      </div>
    </div>
  );
}
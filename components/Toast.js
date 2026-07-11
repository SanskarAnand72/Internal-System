'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';

export default function Toast() {
  const { toast } = useApp();

  if (!toast) return null;

  const bgStyle = toast.type === 'success'
    ? 'rgba(16, 185, 129, 0.15)'
    : 'rgba(99, 102, 241, 0.15)';

  const borderStyle = toast.type === 'success'
    ? 'rgba(16, 185, 129, 0.3)'
    : 'rgba(99, 102, 241, 0.3)';

  const colorStyle = toast.type === 'success' ? '#10b981' : '#818cf8';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 99999,
        background: bgStyle,
        border: `1px solid ${borderStyle}`,
        color: colorStyle,
        backdropFilter: 'blur(12px)',
        padding: '10px 16px',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: 600,
        boxShadow: 'var(--shadow-lg)',
        transform: 'translateY(0)',
        opacity: 1,
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: 'var(--font)'
      }}
    >
      {toast.message}
    </div>
  );
}

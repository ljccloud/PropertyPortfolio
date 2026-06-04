'use client';

import React from 'react';

export const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontFamily: 'inherit',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

export const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none' as any,
};

export const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: 'var(--text2)',
  marginBottom: 5,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

export const btnPrimary: React.CSSProperties = {
  width: '100%', padding: 13,
  borderRadius: 'var(--radius-sm)',
  fontFamily: 'inherit', fontSize: 15, fontWeight: 500,
  cursor: 'pointer', border: 'none',
  background: 'var(--text)', color: 'var(--bg)',
  marginTop: 4,
};

export const btnSecondary: React.CSSProperties = {
  ...btnPrimary,
  background: 'var(--surface2)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
};

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export function Grid2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>;
}

export function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{
        position: 'relative',
        background: 'var(--surface)',
        borderRadius: '20px 20px 0 0',
        padding: '16px 16px 48px',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, background: 'var(--border2)', borderRadius: 2, margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text2)', lineHeight: 1, padding: 4 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

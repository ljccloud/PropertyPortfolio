'use client';

import { X } from 'lucide-react';
import { PeriodFilter } from '@/types';

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        marginBottom: 10,
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      {children}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

const badgeStyles: Record<string, { bg: string; color: string }> = {
  Open:    { bg: 'var(--amber-bg)', color: 'var(--amber)' },
  Closed:  { bg: 'var(--green-bg)', color: 'var(--green)' },
  income:  { bg: 'var(--green-bg)', color: 'var(--green)' },
  expense: { bg: 'var(--red-bg)',   color: 'var(--red)' },
  valid:   { bg: 'var(--green-bg)', color: 'var(--green)' },
  expiring:{ bg: 'var(--amber-bg)', color: 'var(--amber)' },
  expired: { bg: 'var(--red-bg)',   color: 'var(--red)' },
  missing: { bg: 'var(--surface2)', color: 'var(--text2)' },
  Let:     { bg: 'var(--green-bg)', color: 'var(--green)' },
  Vacant:  { bg: 'var(--amber-bg)', color: 'var(--amber)' },
};

export function Badge({ label }: { label: string }) {
  const s = badgeStyles[label] || { bg: 'var(--surface2)', color: 'var(--text2)' };
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 11,
      fontWeight: 500,
      padding: '2px 8px',
      borderRadius: 20,
      background: s.bg,
      color: s.color,
    }}>
      {label}
    </span>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      background: 'rgba(0,0,0,0.4)',
    }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0 }} />
      <div style={{
        position: 'relative',
        background: 'var(--surface)',
        borderRadius: '20px 20px 0 0',
        padding: '16px 16px 40px',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, background: 'var(--border2)', borderRadius: 2, margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 500 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

export function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </label>
      <input
        {...props}
        style={{
          width: '100%', padding: '10px 12px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--surface)',
          color: 'var(--text)',
          fontFamily: 'inherit',
          fontSize: 14,
          outline: 'none',
        }}
      />
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────

export function Select({
  label,
  children,
  ...props
}: { label: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </label>
      <select
        {...props}
        style={{
          width: '100%', padding: '10px 12px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--surface)',
          color: 'var(--text)',
          fontFamily: 'inherit',
          fontSize: 14,
          outline: 'none',
          appearance: 'none',
        }}
      >
        {children}
      </select>
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

export function Textarea({
  label,
  ...props
}: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </label>
      <textarea
        {...props}
        rows={3}
        style={{
          width: '100%', padding: '10px 12px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--surface)',
          color: 'var(--text)',
          fontFamily: 'inherit',
          fontSize: 14,
          outline: 'none',
          resize: 'none',
        }}
      />
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

export function Button({
  children,
  variant = 'primary',
  className = '',
  style = {},
  ...props
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  style?: React.CSSProperties;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary:   { background: 'var(--text)', color: 'var(--bg)' },
    secondary: { background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' },
    danger:    { background: 'var(--red-bg)', color: 'var(--red)' },
  };
  return (
    <button
      {...props}
      style={{
        width: '100%',
        padding: '13px',
        borderRadius: 'var(--radius-sm)',
        fontFamily: 'inherit',
        fontSize: 15,
        fontWeight: 500,
        cursor: 'pointer',
        border: 'none',
        marginTop: 4,
        ...styles[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ─── Period Selector ──────────────────────────────────────────────────────────

const periods: { key: PeriodFilter; label: string }[] = [
  { key: 'ytd',     label: 'YTD' },
  { key: 'tax-ytd', label: 'Tax YTD' },
  { key: 'tax-q',   label: 'Tax Q' },
  { key: 'all',     label: 'All' },
  { key: 'custom',  label: 'Custom' },
];

export function PeriodSelector({
  value,
  onChange,
  customFrom,
  customTo,
  onCustomChange,
}: {
  value: PeriodFilter;
  onChange: (v: PeriodFilter) => void;
  customFrom?: string;
  customTo?: string;
  onCustomChange?: (from: string, to: string) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: value === 'custom' ? 8 : 0 }}>
        {periods.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            style={{
              fontSize: 13,
              fontWeight: 500,
              padding: '7px 14px',
              border: '1px solid var(--border)',
              borderRadius: 20,
              background: value === key ? 'var(--text)' : 'transparent',
              color: value === key ? 'var(--bg)' : 'var(--text2)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              fontFamily: 'inherit',
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {value === 'custom' && onCustomChange && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="date"
            value={customFrom}
            onChange={e => onCustomChange(e.target.value, customTo || '')}
            style={{ flex: 1, padding: '6px 8px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit' }}
          />
          <span style={{ color: 'var(--text2)', flexShrink: 0, fontSize: 13 }}>to</span>
          <input
            type="date"
            value={customTo}
            onChange={e => onCustomChange(customFrom || '', e.target.value)}
            style={{ flex: 1, padding: '6px 8px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit' }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Metric card ──────────────────────────────────────────────────────────────

export function MetricCard({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '12px 14px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.02em', marginBottom: 3, color: valueColor || 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text2)' }}>{sub}</div>}
    </div>
  );
}

// ─── Page header ──────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{
      height: 'var(--header-h)',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 10,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 18, color: 'var(--text)', flex: 1 }}>{title}</h1>
      {action}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

export function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '20px 0 8px' }}>
      {title}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text2)', fontSize: 14 }}>
      {message}
    </div>
  );
}

// ─── Loading spinner ──────────────────────────────────────────────────────────

export function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{
        width: 20, height: 20,
        border: '2px solid var(--border2)',
        borderTopColor: 'var(--text2)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      padding: '9px 0',
      borderBottom: '1px solid var(--border)',
      gap: 12,
    }}>
      <span style={{ fontSize: 13, color: 'var(--text2)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 14, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// ─── Alert strip ─────────────────────────────────────────────────────────────

export function AlertStrip({ message, variant = 'red' }: { message: string; variant?: 'red' | 'amber' }) {
  const styles = {
    red:   { background: 'var(--red-bg)',   border: '1px solid #E8A0A0', color: 'var(--red)' },
    amber: { background: 'var(--amber-bg)', border: '1px solid #E8C878', color: 'var(--amber)' },
  };
  return (
    <div style={{
      ...styles[variant],
      borderRadius: 'var(--radius-sm)',
      padding: '10px 12px',
      marginBottom: 8,
      fontSize: 13,
    }}>
      {message}
    </div>
  );
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function fmt(amount: number): string {
  return '£' + Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function fmtFull(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
}

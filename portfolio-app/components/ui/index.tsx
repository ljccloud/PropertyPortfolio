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
      className={`bg-[#16181f] border border-[#1e2130] rounded-2xl p-4 ${
        onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

const badgeColors: Record<string, string> = {
  Open: 'bg-red-500/15 text-red-400',
  Closed: 'bg-emerald-500/15 text-emerald-400',
  income: 'bg-emerald-500/15 text-emerald-400',
  expense: 'bg-red-500/15 text-red-400',
  valid: 'bg-emerald-500/15 text-emerald-400',
  expiring: 'bg-amber-500/15 text-amber-400',
  expired: 'bg-red-500/15 text-red-400',
  missing: 'bg-[#2a2d3a] text-[#8b8fa8]',
};

export function Badge({ label }: { label: string }) {
  const colors = badgeColors[label] || 'bg-[#2a2d3a] text-[#8b8fa8]';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors}`}>
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#16181f] border border-[#1e2130] rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[#1e2130] sticky top-0 bg-[#16181f] z-10">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="p-2 text-[#8b8fa8] hover:text-white rounded-xl hover:bg-[#1e2130]">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
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
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-[#8b8fa8] uppercase tracking-wide">{label}</label>
      <input
        {...props}
        className="w-full bg-[#0f1117] border border-[#1e2130] rounded-xl px-3.5 py-3 text-sm text-white placeholder-[#555870] focus:outline-none focus:border-[#6c63ff] transition-colors"
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
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-[#8b8fa8] uppercase tracking-wide">{label}</label>
      <select
        {...props}
        className="w-full bg-[#0f1117] border border-[#1e2130] rounded-xl px-3.5 py-3 text-sm text-white focus:outline-none focus:border-[#6c63ff] transition-colors appearance-none"
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
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-[#8b8fa8] uppercase tracking-wide">{label}</label>
      <textarea
        {...props}
        rows={3}
        className="w-full bg-[#0f1117] border border-[#1e2130] rounded-xl px-3.5 py-3 text-sm text-white placeholder-[#555870] focus:outline-none focus:border-[#6c63ff] transition-colors resize-none"
      />
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = 'flex items-center justify-center gap-2 font-medium rounded-xl px-4 py-3 text-sm transition-all active:scale-[0.97] disabled:opacity-50';
  const variants = {
    primary: 'bg-[#6c63ff] text-white hover:bg-[#7c73ff]',
    secondary: 'bg-[#1e2130] text-[#8b8fa8] hover:text-white hover:bg-[#2a2d3a]',
    danger: 'bg-red-500/15 text-red-400 hover:bg-red-500/25',
  };
  return (
    <button {...props} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

// ─── Period Selector ──────────────────────────────────────────────────────────

const periods: { key: PeriodFilter; label: string }[] = [
  { key: 'ytd', label: 'YTD' },
  { key: 'tax-ytd', label: 'Tax YTD' },
  { key: 'tax-q', label: 'Tax Q' },
  { key: 'all', label: 'All' },
  { key: 'custom', label: 'Custom' },
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
    <div className="space-y-2">
      <div className="flex gap-1 bg-[#16181f] border border-[#1e2130] rounded-xl p-1">
        {periods.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-all ${
              value === key
                ? 'bg-[#6c63ff] text-white'
                : 'text-[#8b8fa8] hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {value === 'custom' && onCustomChange && (
        <div className="flex gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={e => onCustomChange(e.target.value, customTo || '')}
            className="flex-1 bg-[#0f1117] border border-[#1e2130] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6c63ff]"
          />
          <input
            type="date"
            value={customTo}
            onChange={e => onCustomChange(customFrom || '', e.target.value)}
            className="flex-1 bg-[#0f1117] border border-[#1e2130] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6c63ff]"
          />
        </div>
      )}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  sub,
  color = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  color?: 'default' | 'green' | 'red' | 'purple';
}) {
  const colors = {
    default: 'text-white',
    green: 'text-emerald-400',
    red: 'text-red-400',
    purple: 'text-[#6c63ff]',
  };
  return (
    <div className="bg-[#16181f] border border-[#1e2130] rounded-2xl p-4 space-y-1">
      <p className="text-xs text-[#8b8fa8] uppercase tracking-wide font-medium">{label}</p>
      <p className={`text-xl font-semibold ${colors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-[#555870]">{sub}</p>}
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
    <div className="flex items-center justify-between px-4 pt-14 pb-4 sticky top-0 bg-[#0f1117]/95 backdrop-blur-md z-10 border-b border-[#1e2130]">
      <h1 className="text-xl font-semibold">{title}</h1>
      {action}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

export function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 py-2">
      <h2 className="text-xs font-semibold text-[#8b8fa8] uppercase tracking-widest">{title}</h2>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-16 px-4">
      <p className="text-[#555870] text-sm text-center">{message}</p>
    </div>
  );
}

// ─── Loading spinner ──────────────────────────────────────────────────────────

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-[#6c63ff] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function fmt(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
}

export function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

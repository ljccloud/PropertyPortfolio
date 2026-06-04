import { parseISO, format, startOfYear, addMonths } from 'date-fns';
import { Transaction, PeriodFilter, CustomPeriod } from '@/types';

// ─── UK Tax Year helpers ──────────────────────────────────────────────────────
// UK tax year: 6 April to 5 April the following year
// Bug fix: original used `month >= 3 && day >= 6` which is wrong for e.g. May 3
// (month=4 >=3 but day=3 <6 → returned wrong year)
// Correct: past Apr 6 means month > 3, OR month === 3 AND day >= 6

export function ukTaxYearStart(date: Date = new Date()): Date {
  const m = date.getMonth(); // 0-indexed, April = 3
  const d = date.getDate();
  const year = (m > 3 || (m === 3 && d >= 6))
    ? date.getFullYear()
    : date.getFullYear() - 1;
  return new Date(year, 3, 6); // 6 April
}

export function ukTaxYearEnd(date: Date = new Date()): Date {
  const start = ukTaxYearStart(date);
  // End is 5 April of the following year, at end of day
  return new Date(start.getFullYear() + 1, 3, 5, 23, 59, 59, 999);
}

export function ukTaxQuarterStart(date: Date = new Date()): Date {
  const tyStart = ukTaxYearStart(date);
  // Four quarters: Apr6, Jul6, Oct6, Jan6
  const quarters = [0, 3, 6, 9].map(m => addMonths(tyStart, m));
  // Find the most recent quarter start that is <= date
  const past = quarters.filter(q => q <= date);
  return past[past.length - 1] || quarters[0];
}

export function ukTaxQuarterEnd(date: Date = new Date()): Date {
  const qStart = ukTaxQuarterStart(date);
  // Quarter end = day before next quarter start, end of day
  const nextQStart = addMonths(qStart, 3);
  const end = new Date(nextQStart);
  end.setDate(end.getDate() - 1);
  end.setHours(23, 59, 59, 999);
  return end;
}

// ─── Period resolution ────────────────────────────────────────────────────────

export interface DateRange {
  from: Date;
  to: Date;
}

export function resolvePeriod(
  filter: PeriodFilter,
  custom?: CustomPeriod
): DateRange {
  const now = new Date();

  switch (filter) {
    case 'ytd':
      return {
        from: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0), // Jan 1 00:00:00
        to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
      };
    case 'tax-ytd':
      return {
        from: ukTaxYearStart(now),
        to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
      };
    case 'tax-q':
      return {
        from: ukTaxQuarterStart(now),
        to: ukTaxQuarterEnd(now),
      };
    case 'all':
      return {
        from: new Date('2000-01-01T00:00:00'),
        to: new Date('2099-12-31T23:59:59'),
      };
    case 'custom':
      if (!custom) throw new Error('Custom period requires from/to dates');
      return {
        from: new Date(custom.from + 'T00:00:00'),
        to: new Date(custom.to + 'T23:59:59'),
      };
    default:
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: now,
      };
  }
}

// ─── Daily proration ──────────────────────────────────────────────────────────
// For a transaction spanning a period, apportion the amount proportionally by day.
// Uses Math.round() to avoid floating-point day-count errors.

export function prorateTransaction(
  transaction: Transaction,
  queryRange: DateRange
): number {
  // Parse transaction bounds — always treat as full days
  const txStart = new Date(transaction.dateStart + 'T00:00:00');
  const txEnd = transaction.dateEnd
    ? new Date(transaction.dateEnd + 'T23:59:59')
    : new Date(transaction.dateStart + 'T23:59:59'); // single-day

  // No overlap at all
  if (txEnd < queryRange.from || txStart > queryRange.to) return 0;

  // Single-day transaction: either in range or not
  if (!transaction.dateEnd || transaction.dateStart === transaction.dateEnd) {
    return txStart >= queryRange.from && txStart <= queryRange.to
      ? transaction.amount
      : 0;
  }

  // Multi-day: calculate overlap using Math.round to avoid float drift
  const totalDays = Math.round((txEnd.getTime() - txStart.getTime()) / 86400000) + 1;

  const overlapStart = txStart < queryRange.from ? queryRange.from : txStart;
  const overlapEnd = txEnd > queryRange.to ? queryRange.to : txEnd;

  if (overlapStart > overlapEnd) return 0;

  const overlapDays = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1;

  return (transaction.amount * overlapDays) / totalDays;
}

// ─── Ownership share ──────────────────────────────────────────────────────────

export function applyOwnership(amount: number, ownershipPct: number): number {
  return (amount * ownershipPct) / 100;
}

// ─── Summarise transactions for a period ──────────────────────────────────────

export interface FinanceSummary {
  income: number;
  expenses: number;
  agentFees: number;
  netIncome: number; // income minus agent fees
  profit: number;   // income minus all expenses
}

export function summariseTransactions(
  transactions: Transaction[],
  period: DateRange,
  ownershipPct: number = 100
): FinanceSummary {
  let income = 0;
  let expenses = 0;
  let agentFees = 0;

  for (const tx of transactions) {
    const prorated = prorateTransaction(tx, period);
    if (prorated === 0) continue;
    const owned = applyOwnership(prorated, ownershipPct);

    if (tx.type === 'income') {
      income += owned;
    } else {
      expenses += owned;
      if (tx.category === 'Managing Agent fees') {
        agentFees += owned;
      }
    }
  }

  return {
    income: round2(income),
    expenses: round2(expenses),
    agentFees: round2(agentFees),
    netIncome: round2(income - agentFees),
    profit: round2(income - expenses),
  };
}

// ─── Yield ────────────────────────────────────────────────────────────────────

export function calculateYield(annualRent: number, propertyValue: number): number {
  if (!propertyValue) return 0;
  return round2((annualRent / propertyValue) * 100);
}

// ─── MTD CSV export ───────────────────────────────────────────────────────────

export function exportToCsv(
  transactions: Transaction[],
  period: DateRange,
  ownershipPct: number = 100
): string {
  const rows: string[] = [
    'Date (UK),Date Start,Date End,Property,Type,Category,Description,Supplier,Full Amount,Apportioned Amount',
  ];

  for (const tx of transactions) {
    const prorated = prorateTransaction(tx, period);
    if (prorated === 0) continue;
    const owned = applyOwnership(prorated, ownershipPct);
    const ukDate = tx.dateStart
      ? (() => { try { const d = new Date(tx.dateStart + 'T00:00:00'); return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`; } catch { return tx.dateStart; } })()
      : '';
    rows.push([
      ukDate,
      tx.dateStart,
      tx.dateEnd || tx.dateStart,
      `"${tx.propertyAddress}"`,
      tx.type,
      `"${tx.category}"`,
      `"${tx.description || ''}"`,
      `"${tx.supplier || ''}"`,
      tx.amount.toFixed(2),
      owned.toFixed(2),
    ].join(','));
  }

  return rows.join('\n');
}

// ─── Period label ─────────────────────────────────────────────────────────────

export function periodLabel(filter: PeriodFilter, custom?: CustomPeriod): string {
  const range = resolvePeriod(filter, custom);
  const f = (d: Date) => format(d, 'd MMM yyyy'); // UK format: day month year
  switch (filter) {
    case 'ytd':     return `YTD ${range.from.getFullYear()}`;
    case 'tax-ytd': return `Tax YTD ${f(range.from)}–today`;
    case 'tax-q':   return `Tax Q (${f(range.from)}–${f(range.to)})`;
    case 'all':     return 'All time';
    case 'custom':  return `${f(range.from)}–${f(range.to)}`;
    default:        return '';
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

import {
  startOfDay,
  endOfDay,
  differenceInCalendarDays,
  parseISO,
  isWithinInterval,
  startOfYear,
  endOfYear,
  format,
  addMonths,
  addYears,
} from 'date-fns';
import { Transaction, PeriodFilter, CustomPeriod, TransactionType } from '@/types';

// ─── UK Tax Year helpers ──────────────────────────────────────────────────────
// UK tax year: 6 April to 5 April

export function ukTaxYearStart(date: Date = new Date()): Date {
  const year = date.getMonth() >= 3 && date.getDate() >= 6
    ? date.getFullYear()
    : date.getFullYear() - 1;
  return new Date(year, 3, 6); // April 6
}

export function ukTaxYearEnd(date: Date = new Date()): Date {
  const start = ukTaxYearStart(date);
  return new Date(start.getFullYear() + 1, 3, 5); // April 5 next year
}

export function ukTaxQuarterStart(date: Date = new Date()): Date {
  const start = ukTaxYearStart(date);
  const quarters = [0, 3, 6, 9].map(m => addMonths(start, m));
  // Find the most recent quarter start that is <= date
  const past = quarters.filter(q => q <= date);
  return past[past.length - 1] || quarters[0];
}

export function ukTaxQuarterEnd(date: Date = new Date()): Date {
  const qStart = ukTaxQuarterStart(date);
  return addMonths(qStart, 3);
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
      return { from: startOfYear(now), to: now };
    case 'tax-ytd':
      return { from: ukTaxYearStart(now), to: now };
    case 'tax-q':
      return { from: ukTaxQuarterStart(now), to: ukTaxQuarterEnd(now) };
    case 'all':
      return { from: new Date('2000-01-01'), to: new Date('2099-12-31') };
    case 'custom':
      if (!custom) throw new Error('Custom period requires from/to dates');
      return { from: parseISO(custom.from), to: parseISO(custom.to) };
    default:
      return { from: startOfYear(now), to: now };
  }
}

// ─── Daily proration ──────────────────────────────────────────────────────────
// For a transaction that spans a period, apportion the amount to the query window.

export function prorateTransaction(
  transaction: Transaction,
  queryRange: DateRange
): number {
  const txStart = startOfDay(parseISO(transaction.dateStart));
  const txEnd = transaction.dateEnd
    ? endOfDay(parseISO(transaction.dateEnd))
    : endOfDay(txStart); // single-day transaction

  // No overlap
  if (txEnd < queryRange.from || txStart > queryRange.to) return 0;

  // Full transaction within range
  const totalDays = differenceInCalendarDays(txEnd, txStart) + 1;

  // Intersection
  const overlapStart = txStart < queryRange.from ? queryRange.from : txStart;
  const overlapEnd = txEnd > queryRange.to ? queryRange.to : txEnd;
  const overlapDays = differenceInCalendarDays(overlapEnd, overlapStart) + 1;

  if (totalDays <= 1) return transaction.amount;

  return (transaction.amount * overlapDays) / totalDays;
}

// ─── Apply ownership share ────────────────────────────────────────────────────

export function applyOwnership(amount: number, ownershipPct: number): number {
  return (amount * ownershipPct) / 100;
}

// ─── Summarise transactions ───────────────────────────────────────────────────

export interface FinanceSummary {
  income: number;
  expenses: number;
  agentFees: number;
  netIncome: number; // income - agent fees
  profit: number;   // income - all expenses
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

// ─── Yield calculation ────────────────────────────────────────────────────────

export function calculateYield(annualRent: number, propertyValue: number): number {
  if (!propertyValue || propertyValue === 0) return 0;
  return round2((annualRent / propertyValue) * 100);
}

// ─── MTD CSV export ───────────────────────────────────────────────────────────

export function exportToCsv(
  transactions: Transaction[],
  period: DateRange,
  ownershipPct: number = 100
): string {
  const rows: string[] = [
    'Date,Property,Type,Category,Description,Supplier,Amount,Prorated Amount',
  ];

  for (const tx of transactions) {
    const prorated = prorateTransaction(tx, period);
    if (prorated === 0) continue;

    const owned = applyOwnership(prorated, ownershipPct);
    rows.push(
      [
        tx.dateStart,
        `"${tx.propertyAddress}"`,
        tx.type,
        `"${tx.category}"`,
        `"${tx.description || ''}"`,
        `"${tx.supplier || ''}"`,
        tx.amount.toFixed(2),
        owned.toFixed(2),
      ].join(',')
    );
  }

  return rows.join('\n');
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Period label helper ──────────────────────────────────────────────────────

export function periodLabel(filter: PeriodFilter, custom?: CustomPeriod): string {
  const range = resolvePeriod(filter, custom);
  switch (filter) {
    case 'ytd': return `YTD (Jan ${format(range.from, 'yyyy')}–now)`;
    case 'tax-ytd': return `Tax YTD (${format(range.from, 'd MMM yyyy')}–now)`;
    case 'tax-q': return `Tax Q (${format(range.from, 'd MMM')}–${format(range.to, 'd MMM yyyy')})`;
    case 'all': return 'All time';
    case 'custom': return `${format(range.from, 'd MMM yyyy')}–${format(range.to, 'd MMM yyyy')}`;
  }
}

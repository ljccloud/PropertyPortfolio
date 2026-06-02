'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ChevronRight, ShieldCheck, ShieldAlert, ShieldOff, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import {
  PageHeader, PeriodSelector, StatCard, Card, Spinner, EmptyState,
  fmt, fmtPct, SectionHeader
} from '@/components/ui';
import { resolvePeriod, summariseTransactions, calculateYield, periodLabel } from '@/lib/finance';
import { Property, Transaction, Document, PeriodFilter, CustomPeriod } from '@/types';

function certStatus(docs: Document[], propertyId: string, type: string) {
  const relevant = docs
    .filter(d => d.propertyId === propertyId && d.category === 'Certificates' && d.certificateType === type)
    .sort((a, b) => (b.expiryDate || '').localeCompare(a.expiryDate || ''));

  if (!relevant.length) return 'missing';
  const latest = relevant[0];
  if (!latest.expiryDate) return 'missing';
  const days = differenceInDays(parseISO(latest.expiryDate), new Date());
  if (days < 0) return 'expired';
  if (days <= 60) return 'expiring';
  return 'valid';
}

function CertBadge({ status, label }: { status: string; label: string }) {
  const config = {
    valid: { icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    expiring: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    expired: { icon: ShieldOff, color: 'text-red-400', bg: 'bg-red-500/10' },
    missing: { icon: ShieldAlert, color: 'text-[#555870]', bg: 'bg-[#1e2130]' },
  }[status] || { icon: ShieldAlert, color: 'text-[#555870]', bg: 'bg-[#1e2130]' };

  const Icon = config.icon;
  return (
    <div className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl ${config.bg}`}>
      <Icon size={14} className={config.color} />
      <span className={`text-[9px] font-medium ${config.color}`}>{label}</span>
    </div>
  );
}

export default function OverviewPage() {
  const { data: session } = useSession();
  const [period, setPeriod] = useState<PeriodFilter>('ytd');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      fetch('/api/properties').then(r => r.json()),
      fetch('/api/finance').then(r => r.json()),
      fetch('/api/documents').then(r => r.json()),
    ]).then(([p, f, d]) => {
      setProperties(p.data || []);
      setTransactions(f.data || []);
      setDocuments(d.data || []);
      setLoading(false);
    });
  }, [session]);

  const custom: CustomPeriod | undefined =
    period === 'custom' && customFrom && customTo ? { from: customFrom, to: customTo } : undefined;

  const dateRange = period === 'custom' && !custom ? null : resolvePeriod(period, custom);

  // Portfolio-level aggregation
  const portfolioSummary = dateRange
    ? properties.map(prop => {
        const txs = transactions.filter(t => t.propertyId === prop.id);
        const ownershipPct = prop.owners.reduce((sum, o) => sum + o.percentage, 0) || 100;
        return { ...summariseTransactions(txs, dateRange, ownershipPct), property: prop };
      })
    : [];

  const totals = portfolioSummary.reduce(
    (acc, s) => ({
      income: acc.income + s.income,
      expenses: acc.expenses + s.expenses,
      agentFees: acc.agentFees + s.agentFees,
      netIncome: acc.netIncome + s.netIncome,
      profit: acc.profit + s.profit,
    }),
    { income: 0, expenses: 0, agentFees: 0, netIncome: 0, profit: 0 }
  );

  const totalRentPcm = properties.reduce((sum, p) => sum + (p.tenant?.rentPcm || 0), 0);
  const netIncomePct = totals.income > 0 ? ((totals.netIncome / totals.income) * 100) : 0;
  const profitPct = totals.income > 0 ? ((totals.profit / totals.income) * 100) : 0;

  const avgYield = properties.length > 0
    ? properties.reduce((sum, p) => {
        const annualRent = (p.tenant?.rentPcm || 0) * 12;
        return sum + calculateYield(annualRent, p.currentValue || p.purchasePrice || 0);
      }, 0) / properties.length
    : 0;

  if (loading) return (
    <div className="bg-[#0f1117] min-h-screen">
      <PageHeader title="Overview" />
      <Spinner />
    </div>
  );

  return (
    <div className="bg-[#0f1117] min-h-screen">
      <PageHeader title="Overview" />

      <div className="px-4 py-3 space-y-4">
        <PeriodSelector
          value={period}
          onChange={setPeriod}
          customFrom={customFrom}
          customTo={customTo}
          onCustomChange={(f, t) => { setCustomFrom(f); setCustomTo(t); }}
        />

        {/* Primary metrics */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Income" value={fmt(totals.income)} color="green" />
          <StatCard label="Expenses" value={fmt(totals.expenses)} color="red" />
          <StatCard label="Net" value={fmt(totals.profit)} color={totals.profit >= 0 ? 'green' : 'red'} />
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Rent PCM" value={fmt(totalRentPcm)} />
          <StatCard label="Net Income %" value={`${netIncomePct.toFixed(1)}%`} color="purple" sub="excl. agent fees" />
          <StatCard label="Profit %" value={`${profitPct.toFixed(1)}%`} color={profitPct >= 0 ? 'green' : 'red'} sub="after all costs" />
          <StatCard label="Avg Yield" value={`${avgYield.toFixed(1)}%`} color="purple" />
        </div>

        {/* Properties */}
        <SectionHeader title={`Properties (${properties.length})`} />

        {properties.length === 0 ? (
          <EmptyState message="No properties yet. Add one in the Properties tab." />
        ) : (
          <div className="space-y-3">
            {portfolioSummary.map(({ property, income, expenses, netIncome, profit }) => {
              const ownerPct = property.owners.reduce((s, o) => s + o.percentage, 0) || 100;
              const gasCert = certStatus(documents, property.id, 'Gas Safety');
              const epc = certStatus(documents, property.id, 'EPC');
              const eicr = certStatus(documents, property.id, 'EICR');
              const insurance = certStatus(documents, property.id, 'Other');

              return (
                <Link href={`/properties/${property.id}`} key={property.id}>
                  <Card className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{property.address}</p>
                          <span className="text-[10px] text-[#6c63ff] font-medium bg-[#6c63ff]/10 px-1.5 py-0.5 rounded-full shrink-0">
                            {ownerPct}%
                          </span>
                        </div>
                        <p className="text-xs text-[#555870] mt-0.5">
                          {fmt(property.tenant?.rentPcm || 0)}/mo
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-[#555870] mt-1 shrink-0" />
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="text-xs text-[#555870]">Income</p>
                        <p className="text-sm font-medium text-emerald-400">{fmt(income)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#555870]">Expenses</p>
                        <p className="text-sm font-medium text-red-400">{fmt(expenses)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#555870]">Net</p>
                        <p className={`text-sm font-medium ${netIncome >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(netIncome)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#555870]">Profit</p>
                        <p className={`text-sm font-medium ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(profit)}</p>
                      </div>
                    </div>

                    {/* Cert status */}
                    <div className="flex gap-2">
                      <CertBadge status={gasCert} label="Gas" />
                      <CertBadge status={epc} label="EPC" />
                      <CertBadge status={eicr} label="EICR" />
                      <CertBadge status={insurance} label="Ins." />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

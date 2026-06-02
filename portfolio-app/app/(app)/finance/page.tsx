'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { format, parseISO, addMonths, addYears } from 'date-fns';
import { Plus, Download, Trash2, Filter } from 'lucide-react';
import {
  PageHeader, Card, Modal, Input, Select, Textarea, Button,
  Badge, Spinner, EmptyState, SectionHeader, PeriodSelector, fmt
} from '@/components/ui';
import { resolvePeriod, prorateTransaction, periodLabel } from '@/lib/finance';
import {
  Transaction, Property, PeriodFilter, CustomPeriod,
  IncomeCategory, ExpenseCategory, TransactionType
} from '@/types';

const INCOME_CATEGORIES: IncomeCategory[] = ['Rental income', 'Other income'];
const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Managing Agent fees',
  'Legal and other professional fees',
  'Rent, rates, insurance and ground rents',
  'Property repairs and maintenance',
  'Cost of services',
  'Cost of replacing domestic items',
  'Other allowable property expenses',
  'Residential property finance costs',
];

const emptyForm = {
  propertyId: '',
  type: 'income' as TransactionType,
  category: 'Rental income' as string,
  dateStart: format(new Date(), 'yyyy-MM-dd'),
  dateEnd: '',
  amount: '',
  description: '',
  supplier: '',
};

export default function FinancePage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [period, setPeriod] = useState<PeriodFilter>('ytd');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [filterPropertyId, setFilterPropertyId] = useState('');

  useEffect(() => {
    if (!session) return;
    Promise.all([
      fetch('/api/finance').then(r => r.json()),
      fetch('/api/properties').then(r => r.json()),
    ]).then(([f, p]) => {
      setTransactions(f.data || []);
      setProperties(p.data || []);
      setLoading(false);
    });
  }, [session]);

  const custom: CustomPeriod | undefined =
    period === 'custom' && customFrom && customTo ? { from: customFrom, to: customTo } : undefined;

  const dateRange = period !== 'custom' || custom ? resolvePeriod(period, custom) : null;

  const filtered = useMemo(() => {
    if (!dateRange) return [];
    return transactions
      .filter(t => {
        if (filterPropertyId && t.propertyId !== filterPropertyId) return false;
        const prorated = prorateTransaction(t, dateRange);
        return prorated > 0;
      })
      .sort((a, b) => b.dateStart.localeCompare(a.dateStart));
  }, [transactions, dateRange, filterPropertyId]);

  const totals = useMemo(() => {
    if (!dateRange) return { income: 0, expenses: 0, profit: 0 };
    return filtered.reduce((acc, t) => {
      const prorated = prorateTransaction(t, dateRange);
      if (t.type === 'income') acc.income += prorated;
      else acc.expenses += prorated;
      acc.profit = acc.income - acc.expenses;
      return acc;
    }, { income: 0, expenses: 0, profit: 0 });
  }, [filtered, dateRange]);

  async function handleSave() {
    setSaving(true);
    const propertyAddress = properties.find(p => p.id === form.propertyId)?.address || '';
    const body = {
      ...form,
      propertyAddress,
      amount: Number(form.amount),
      dateEnd: form.dateEnd || undefined,
    };

    if (editTx) {
      const res = await fetch('/api/finance', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editTx.id, ...body }) });
      const { data } = await res.json();
      setTransactions(ts => ts.map(t => t.id === editTx.id ? data : t));
    } else {
      const res = await fetch('/api/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const { data } = await res.json();
      setTransactions(ts => [...ts, data]);
    }

    setShowModal(false);
    setEditTx(null);
    setForm(emptyForm);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await fetch('/api/finance', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setTransactions(ts => ts.filter(t => t.id !== id));
  }

  function openEdit(tx: Transaction) {
    setEditTx(tx);
    setForm({
      propertyId: tx.propertyId,
      type: tx.type,
      category: tx.category,
      dateStart: tx.dateStart,
      dateEnd: tx.dateEnd || '',
      amount: String(tx.amount),
      description: tx.description || '',
      supplier: tx.supplier || '',
    });
    setShowModal(true);
  }

  function setDatePreset(preset: '1m' | '3m' | '1y') {
    const start = parseISO(form.dateStart);
    const end = preset === '1m' ? addMonths(start, 1) : preset === '3m' ? addMonths(start, 3) : addYears(start, 1);
    setForm(f => ({ ...f, dateEnd: format(end, 'yyyy-MM-dd') }));
  }

  function downloadCsv() {
    const params = new URLSearchParams({ filter: period });
    if (custom) { params.set('from', custom.from); params.set('to', custom.to); }
    window.open(`/api/finance/export?${params}`, '_blank');
  }

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  if (loading) return <div className="bg-[#0f1117] min-h-screen"><PageHeader title="Finance" /><Spinner /></div>;

  return (
    <div className="bg-[#0f1117] min-h-screen">
      <PageHeader
        title="Finance Log"
        action={
          <div className="flex gap-2">
            <button onClick={downloadCsv} className="p-2 text-[#8b8fa8] hover:text-white">
              <Download size={18} />
            </button>
            <button
              onClick={() => { setEditTx(null); setForm(emptyForm); setShowModal(true); }}
              className="flex items-center gap-1.5 bg-[#6c63ff] text-white text-sm font-medium px-3 py-1.5 rounded-xl"
            >
              <Plus size={16} /> Add
            </button>
          </div>
        }
      />

      <div className="px-4 py-3 space-y-4">
        <PeriodSelector
          value={period}
          onChange={setPeriod}
          customFrom={customFrom}
          customTo={customTo}
          onCustomChange={(f, t) => { setCustomFrom(f); setCustomTo(t); }}
        />

        {/* Property filter */}
        <select
          value={filterPropertyId}
          onChange={e => setFilterPropertyId(e.target.value)}
          className="w-full bg-[#16181f] border border-[#1e2130] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#6c63ff]"
        >
          <option value="">All properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
        </select>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#16181f] border border-[#1e2130] rounded-xl p-3 text-center">
            <p className="text-[10px] text-[#8b8fa8] uppercase">Income</p>
            <p className="text-sm font-semibold text-emerald-400">{fmt(totals.income)}</p>
          </div>
          <div className="bg-[#16181f] border border-[#1e2130] rounded-xl p-3 text-center">
            <p className="text-[10px] text-[#8b8fa8] uppercase">Expenses</p>
            <p className="text-sm font-semibold text-red-400">{fmt(totals.expenses)}</p>
          </div>
          <div className="bg-[#16181f] border border-[#1e2130] rounded-xl p-3 text-center">
            <p className="text-[10px] text-[#8b8fa8] uppercase">Profit</p>
            <p className={`text-sm font-semibold ${totals.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(totals.profit)}</p>
          </div>
        </div>

        {/* Transaction list */}
        {filtered.length === 0 ? (
          <EmptyState message="No transactions in this period" />
        ) : (
          <div className="space-y-2">
            {filtered.map(tx => {
              const prorated = dateRange ? prorateTransaction(tx, dateRange) : tx.amount;
              const isProrated = Math.abs(prorated - tx.amount) > 0.01;
              return (
                <Card key={tx.id} className="space-y-2" onClick={() => openEdit(tx)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{tx.description || tx.category}</p>
                        <Badge label={tx.type} />
                      </div>
                      <p className="text-xs text-[#555870] mt-0.5">{tx.propertyAddress}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {tx.type === 'income' ? '+' : '-'}{fmt(prorated)}
                      </p>
                      {isProrated && (
                        <p className="text-[10px] text-[#555870]">of {fmt(tx.amount)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#555870]">
                      {format(parseISO(tx.dateStart), 'd MMM yyyy')}
                      {tx.dateEnd && ` → ${format(parseISO(tx.dateEnd), 'd MMM yyyy')}`}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#555870]">{tx.category}</span>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(tx.id); }}
                        className="p-1.5 text-[#555870] hover:text-red-400 rounded-lg"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editTx ? 'Edit Transaction' : 'Add Transaction'} onClose={() => { setShowModal(false); setEditTx(null); }}>
          <div className="space-y-4">
            <Select
              label="Property"
              value={form.propertyId}
              onChange={e => setForm(f => ({ ...f, propertyId: e.target.value }))}
            >
              <option value="">Select property…</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
            </Select>

            <div className="grid grid-cols-2 gap-3">
              <Select label="Type" value={form.type} onChange={e => {
                const type = e.target.value as TransactionType;
                setForm(f => ({ ...f, type, category: type === 'income' ? 'Rental income' : 'Managing Agent fees' }));
              }}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </Select>

              <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>

            <Input label="Amount (£)" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />

            <div className="space-y-2">
              <Input label="Date Start" type="date" value={form.dateStart} onChange={e => setForm(f => ({ ...f, dateStart: e.target.value }))} />
              <div className="flex gap-2">
                <Input label="Date End (optional)" type="date" value={form.dateEnd} onChange={e => setForm(f => ({ ...f, dateEnd: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                {(['1m', '3m', '1y'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setDatePreset(p)}
                    className="flex-1 text-xs py-1.5 bg-[#1e2130] text-[#8b8fa8] hover:text-white rounded-lg"
                  >
                    +{p}
                  </button>
                ))}
              </div>
            </div>

            <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <Input label="Supplier" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />

            <Button
              onClick={handleSave}
              disabled={saving || !form.propertyId || !form.amount}
              className="w-full"
            >
              {saving ? 'Saving…' : editTx ? 'Update' : 'Add Transaction'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

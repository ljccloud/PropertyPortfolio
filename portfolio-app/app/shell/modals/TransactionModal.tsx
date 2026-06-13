'use client';

import { useState } from 'react';
import { ModalShell, Field, Grid2, inputStyle, selectStyle, btnPrimary } from './ModalShell';
import { Property, Transaction } from '@/types';
import { format, addMonths, addYears } from 'date-fns';

const INCOME_CATS = ['Rental income', 'Other income'];
const EXPENSE_CATS = [
  'Managing Agent fees',
  'Legal and other professional fees',
  'Rent, rates, insurance and ground rents',
  'Property repairs and maintenance',
  'Cost of services',
  'Cost of replacing domestic items',
  'Other allowable property expenses',
  'Residential property finance costs',
];

interface Props {
  properties: Property[];
  transaction?: Transaction;
  defaultPropertyId?: string;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}

export default function TransactionModal({ properties, transaction, defaultPropertyId, onSave, onClose }: Props) {
  const isEdit = !!transaction;
  const [form, setForm] = useState({
    propertyId: transaction?.propertyId || defaultPropertyId || '',
    type: transaction?.type || 'income' as 'income' | 'expense',
    category: transaction?.category || 'Rental income',
    dateStart: transaction?.dateStart || format(new Date(), 'yyyy-MM-dd'),
    dateEnd: transaction?.dateEnd || '',
    amount: transaction?.amount?.toString() || '',
    description: transaction?.description || '',
    supplier: transaction?.supplier || '',
  });
  const [saving, setSaving] = useState(false);

  function set(key: string, value: any) { setForm(f => ({ ...f, [key]: value })); }

  function setType(t: 'income' | 'expense') {
    setForm(f => ({ ...f, type: t, category: t === 'income' ? 'Rental income' : 'Managing Agent fees' }));
  }

  function applyPreset(months: number) {
    if (!form.dateStart) return;
    // Use T00:00:00 to avoid UTC midnight shifting date in BST timezone
    const start = new Date(form.dateStart + 'T00:00:00');
    const end = addMonths(start, months);
    end.setDate(end.getDate() - 1);
    set('dateEnd', format(end, 'yyyy-MM-dd'));
  }

  async function handleSave() {
    if (!form.propertyId || !form.amount) return;
    setSaving(true);
    try {
      const prop = properties.find(p => p.id === form.propertyId);
      await onSave({
        ...(isEdit ? { id: transaction!.id } : {}),
        ...form,
        propertyAddress: prop?.address || '',
        amount: Number(form.amount),
        dateEnd: form.dateEnd || undefined,
      });
      onClose();
    } catch { /* error shown via toast */ } finally { setSaving(false); }
  }

  const cats = form.type === 'income' ? INCOME_CATS : EXPENSE_CATS;

  return (
    <ModalShell title={isEdit ? 'Edit Transaction' : 'Add Transaction'} onClose={onClose}>
      <Field label="Property">
        <select style={selectStyle} value={form.propertyId} onChange={e => set('propertyId', e.target.value)}>
          <option value="">Select property…</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
        </select>
      </Field>

      <Grid2>
        <Field label="Type">
          <select style={selectStyle} value={form.type} onChange={e => setType(e.target.value as any)}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </Field>
        <Field label="Category">
          <select style={selectStyle} value={form.category} onChange={e => set('category', e.target.value)}>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </Grid2>

      <Field label="Amount (£)">
        <input style={inputStyle} type="number" step="0.01" value={form.amount}
          onChange={e => set('amount', e.target.value)} placeholder="0.00" />
      </Field>

      <Field label="Date Start">
        <input style={inputStyle} type="date" value={form.dateStart}
          onChange={e => set('dateStart', e.target.value)} />
      </Field>

      <Field label="Date End (for period transactions)">
        <input style={inputStyle} type="date" value={form.dateEnd}
          onChange={e => set('dateEnd', e.target.value)} />
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          {([['+ 1 month', 1], ['+ 3 months', 3], ['+ 1 year', 12]] as const).map(([label, m]) => (
            <button key={label} onClick={() => applyPreset(m)} style={{ flex: 1, padding: '5px 4px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text2)' }}>
              {label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Description">
        <input style={inputStyle} type="text" value={form.description}
          onChange={e => set('description', e.target.value)} placeholder="e.g. Monthly rent" />
      </Field>

      <Field label="Supplier / Payee">
        <input style={inputStyle} type="text" value={form.supplier}
          onChange={e => set('supplier', e.target.value)} />
      </Field>

      <button onClick={handleSave} disabled={saving || !form.propertyId || !form.amount}
        style={{ ...btnPrimary, opacity: saving || !form.propertyId || !form.amount ? 0.6 : 1 }}>
        {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Transaction'}
      </button>
    </ModalShell>
  );
}

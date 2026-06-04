'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  PageHeader, PeriodSelector, MetricCard, Modal, Input, Select,
  Button, Spinner, EmptyState, Badge, fmt
} from '@/components/ui';
import { resolvePeriod, summariseTransactions } from '@/lib/finance';
import { Property, Transaction, PeriodFilter } from '@/types';

const emptyProperty = {
  address: '', reference: '', purchasePrice: '', purchaseDate: '',
  currentValue: '', owners: [{ id: '1', name: '', email: '', percentage: 100 }],
};

const S = {
  addBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: 'none', borderRadius: 20, background: 'var(--text)', color: 'var(--bg)', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'inherit' } as React.CSSProperties,
};

export default function PropertiesPage() {
  const { data: session } = useSession();
  const [properties, setProperties] = useState<Property[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyProperty);
  const [saving, setSaving] = useState(false);
  const [period, setPeriod] = useState<PeriodFilter>('ytd');

  useEffect(() => {
    if (!session) return;
    Promise.all([
      fetch('/api/properties').then(r => r.json()),
      fetch('/api/finance').then(r => r.json()),
    ]).then(([p, f]) => {
      setProperties(p.data || []);
      setTransactions(f.data || []);
      setLoading(false);
    });
  }, [session]);

  const dateRange = resolvePeriod(period);

  async function handleSave() {
    setSaving(true);
    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : undefined,
        currentValue: form.currentValue ? Number(form.currentValue) : undefined,
        owners: form.owners.map(o => ({ ...o, percentage: Number(o.percentage) })),
      }),
    });
    const { data } = await res.json();
    setProperties(p => [...p, data]);
    setShowModal(false);
    setForm(emptyProperty);
    setSaving(false);
  }

  if (loading) return <div style={{ background: 'var(--bg)', minHeight: '100vh' }}><PageHeader title="Properties" /><Spinner /></div>;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <PageHeader
        title="Properties"
        action={
          <button style={S.addBtn} onClick={() => setShowModal(true)}>+ Add</button>
        }
      />
      <div style={{ padding: 16 }}>
        <PeriodSelector value={period} onChange={setPeriod} />

        {properties.length === 0
          ? <EmptyState message="No properties yet. Tap Add to get started." />
          : properties.map(property => {
              const txs = transactions.filter(t => t.propertyId === property.id);
              const ownershipPct = property.owners.reduce((s, o) => s + o.percentage, 0) || 100;
              const summary = summariseTransactions(txs, dateRange, ownershipPct);
              return (
                <Link key={property.id} href={`/properties/${property.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 10, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 500 }}>{property.address}</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>{fmt(property.tenant?.rentPcm || 0)}/mo</div>
                      </div>
                      <Badge label={property.tenant ? 'Let' : 'Vacant'} />
                      <span style={{ fontSize: 18, color: 'var(--text3)' }}>›</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                      {[
                        { label: 'Income',   val: summary.income,    color: 'var(--green)' },
                        { label: 'Expenses', val: summary.expenses,  color: 'var(--red)' },
                        { label: 'Net',      val: summary.netIncome, color: summary.netIncome >= 0 ? 'var(--green)' : 'var(--red)' },
                        { label: 'Profit',   val: summary.profit,    color: summary.profit >= 0 ? 'var(--green)' : 'var(--red)' },
                      ].map(({ label, val, color }) => (
                        <div key={label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{label}</div>
                          <div style={{ fontSize: 12, fontWeight: 500, color }}>{fmt(val)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              );
            })
        }
      </div>

      {showModal && (
        <Modal title="Add Property" onClose={() => setShowModal(false)}>
          <Input label="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="14 High Street, London" />
          <Input label="Reference (optional)" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Purchase Price" type="number" value={form.purchasePrice} onChange={e => setForm(f => ({ ...f, purchasePrice: e.target.value }))} />
            <Input label="Purchase Date" type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} />
          </div>
          <Input label="Current Value" type="number" value={form.currentValue} onChange={e => setForm(f => ({ ...f, currentValue: e.target.value }))} />
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Owners</label>
              <button onClick={() => setForm(f => ({ ...f, owners: [...f.owners, { id: Date.now().toString(), name: '', email: '', percentage: 0 }] }))}
                style={{ fontSize: 13, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer' }}>
                + Add owner
              </button>
            </div>
            {form.owners.map((owner, i) => (
              <div key={owner.id} style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Input label="Name" value={owner.name} onChange={e => setForm(f => ({ ...f, owners: f.owners.map((o, j) => j === i ? { ...o, name: e.target.value } : o) }))} />
                  <Input label="%" type="number" value={owner.percentage} onChange={e => setForm(f => ({ ...f, owners: f.owners.map((o, j) => j === i ? { ...o, percentage: e.target.value as any } : o) }))} />
                </div>
                <Input label="Email" type="email" value={owner.email} onChange={e => setForm(f => ({ ...f, owners: f.owners.map((o, j) => j === i ? { ...o, email: e.target.value } : o) }))} />
              </div>
            ))}
          </div>
          <Button onClick={handleSave} disabled={saving || !form.address}>{saving ? 'Saving…' : 'Add Property'}</Button>
        </Modal>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Plus, ChevronRight, Building2 } from 'lucide-react';
import {
  PageHeader, Card, Modal, Input, Select, Button, Spinner,
  EmptyState, SectionHeader, fmt
} from '@/components/ui';
import { resolvePeriod, summariseTransactions } from '@/lib/finance';
import { Property, Transaction, PeriodFilter } from '@/types';
import { PeriodSelector } from '@/components/ui';

const emptyProperty = {
  address: '', reference: '', purchasePrice: '', purchaseDate: '',
  currentValue: '', owners: [{ id: '1', name: '', email: '', percentage: 100 }],
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

  function addOwner() {
    setForm(f => ({
      ...f,
      owners: [...f.owners, { id: Date.now().toString(), name: '', email: '', percentage: 0 }],
    }));
  }

  if (loading) return <div className="bg-[#0f1117] min-h-screen"><PageHeader title="Properties" /><Spinner /></div>;

  return (
    <div className="bg-[#0f1117] min-h-screen">
      <PageHeader
        title="Properties"
        action={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-[#6c63ff] text-white text-sm font-medium px-3 py-1.5 rounded-xl"
          >
            <Plus size={16} /> Add
          </button>
        }
      />

      <div className="px-4 py-3 space-y-4">
        <PeriodSelector value={period} onChange={setPeriod} />

        {properties.length === 0 ? (
          <EmptyState message="No properties yet. Tap Add to get started." />
        ) : (
          <div className="space-y-3">
            {properties.map(property => {
              const txs = transactions.filter(t => t.propertyId === property.id);
              const ownershipPct = property.owners.reduce((s, o) => s + o.percentage, 0) || 100;
              const summary = summariseTransactions(txs, dateRange, ownershipPct);

              return (
                <Link href={`/properties/${property.id}`} key={property.id}>
                  <Card className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#6c63ff]/15 rounded-xl flex items-center justify-center shrink-0">
                          <Building2 size={18} className="text-[#6c63ff]" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{property.address}</p>
                          <p className="text-xs text-[#555870]">{fmt(property.tenant?.rentPcm || 0)}/mo</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-[#555870] mt-2" />
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-1 border-t border-[#1e2130]">
                      {[
                        { label: 'Income', val: summary.income, color: 'text-emerald-400' },
                        { label: 'Expenses', val: summary.expenses, color: 'text-red-400' },
                        { label: 'Net Income', val: summary.netIncome, color: summary.netIncome >= 0 ? 'text-emerald-400' : 'text-red-400' },
                        { label: 'Profit', val: summary.profit, color: summary.profit >= 0 ? 'text-emerald-400' : 'text-red-400' },
                      ].map(({ label, val, color }) => (
                        <div key={label} className="text-center">
                          <p className="text-[10px] text-[#555870]">{label}</p>
                          <p className={`text-xs font-semibold ${color}`}>{fmt(val)}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <Modal title="Add Property" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <Input label="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="14 High Street, London" />
            <Input label="Reference (optional)" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Purchase Price" type="number" value={form.purchasePrice} onChange={e => setForm(f => ({ ...f, purchasePrice: e.target.value }))} placeholder="250000" />
              <Input label="Purchase Date" type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} />
            </div>
            <Input label="Current Value" type="number" value={form.currentValue} onChange={e => setForm(f => ({ ...f, currentValue: e.target.value }))} placeholder="300000" />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wide">Owners</label>
                <button onClick={addOwner} className="text-xs text-[#6c63ff]">+ Add owner</button>
              </div>
              {form.owners.map((owner, i) => (
                <div key={owner.id} className="bg-[#0f1117] rounded-xl p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Name" value={owner.name} onChange={e => setForm(f => ({ ...f, owners: f.owners.map((o, j) => j === i ? { ...o, name: e.target.value } : o) }))} />
                    <Input label="%" type="number" value={owner.percentage} onChange={e => setForm(f => ({ ...f, owners: f.owners.map((o, j) => j === i ? { ...o, percentage: e.target.value as any } : o) }))} />
                  </div>
                  <Input label="Email" type="email" value={owner.email} onChange={e => setForm(f => ({ ...f, owners: f.owners.map((o, j) => j === i ? { ...o, email: e.target.value } : o) }))} />
                </div>
              ))}
            </div>

            <Button onClick={handleSave} disabled={saving || !form.address} className="w-full">
              {saving ? 'Saving…' : 'Add Property'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

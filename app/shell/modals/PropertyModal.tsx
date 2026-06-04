'use client';

import { useState } from 'react';
import { ModalShell, Field, Grid2, inputStyle, btnPrimary, btnSecondary } from './ModalShell';
import { Property } from '@/types';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

interface Props {
  property?: Property;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}

export default function PropertyModal({ property, onSave, onClose }: Props) {
  const isEdit = !!property;
  const [form, setForm] = useState({
    address: property?.address || '',
    reference: property?.reference || '',
    purchasePrice: property?.purchasePrice?.toString() || '',
    purchaseDate: property?.purchaseDate || '',
    currentValue: property?.currentValue?.toString() || '',
    owners: property?.owners?.length
      ? property.owners
      : [{ id: '1', name: '', email: '', percentage: 100 }],
  });
  const [saving, setSaving] = useState(false);

  function set(key: string, value: any) { setForm(f => ({ ...f, [key]: value })); }

  function updateOwner(i: number, key: string, value: any) {
    setForm(f => ({ ...f, owners: f.owners.map((o, j) => j === i ? { ...o, [key]: value } : o) }));
  }

  function addOwner() {
    setForm(f => ({ ...f, owners: [...f.owners, { id: uid(), name: '', email: '', percentage: 0 }] }));
  }

  function removeOwner(i: number) {
    setForm(f => ({ ...f, owners: f.owners.filter((_, j) => j !== i) }));
  }

  async function handleSave() {
    if (!form.address.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...(isEdit ? { id: property!.id } : {}),
        ...form,
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : undefined,
        currentValue: form.currentValue ? Number(form.currentValue) : undefined,
        owners: form.owners.map(o => ({ ...o, percentage: Number(o.percentage) })),
        rentHistory: property?.rentHistory || [],
        keyContacts: property?.keyContacts || [],
      });
      onClose();
    } catch {
      // error already shown via toast in AppShell
    } finally {
      setSaving(false);
    }
  }

  const ownerTotal = form.owners.reduce((s, o) => s + Number(o.percentage), 0);

  return (
    <ModalShell title={isEdit ? 'Edit Property' : 'Add Property'} onClose={onClose}>
      <Field label="Address">
        <input style={inputStyle} type="text" value={form.address}
          onChange={e => set('address', e.target.value)} placeholder="14 High Street, London" />
      </Field>
      <Field label="Reference (optional)">
        <input style={inputStyle} type="text" value={form.reference}
          onChange={e => set('reference', e.target.value)} />
      </Field>
      <Grid2>
        <Field label="Purchase Price (£)">
          <input style={inputStyle} type="number" value={form.purchasePrice}
            onChange={e => set('purchasePrice', e.target.value)} placeholder="250000" />
        </Field>
        <Field label="Purchase Date">
          <input style={inputStyle} type="date" value={form.purchaseDate}
            onChange={e => set('purchaseDate', e.target.value)} />
        </Field>
      </Grid2>
      <Field label="Current Value (£)">
        <input style={inputStyle} type="number" value={form.currentValue}
          onChange={e => set('currentValue', e.target.value)} placeholder="300000" />
      </Field>

      {/* Owners */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Owners</span>
          <button onClick={addOwner} style={{ fontSize: 13, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add owner</button>
        </div>
        {form.owners.map((o, i) => (
          <div key={o.id} style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 8 }}>
            <Grid2>
              <Field label="Name">
                <input style={inputStyle} type="text" value={o.name}
                  onChange={e => updateOwner(i, 'name', e.target.value)} />
              </Field>
              <Field label="Share %">
                <input style={inputStyle} type="number" value={o.percentage} min={0} max={100}
                  onChange={e => updateOwner(i, 'percentage', e.target.value)} />
              </Field>
            </Grid2>
            <Field label="Email">
              <input style={inputStyle} type="email" value={o.email}
                onChange={e => updateOwner(i, 'email', e.target.value)} />
            </Field>
            {form.owners.length > 1 && (
              <button onClick={() => removeOwner(i)} style={{ fontSize: 12, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
            )}
          </div>
        ))}
        {form.owners.length > 0 && (
          <div style={{ fontSize: 12, padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: Math.abs(ownerTotal - 100) < 0.5 ? 'var(--green-bg)' : 'var(--amber-bg)', color: Math.abs(ownerTotal - 100) < 0.5 ? 'var(--green)' : 'var(--amber)' }}>
            Total: {ownerTotal}% {Math.abs(ownerTotal - 100) < 0.5 ? '✓' : '— must equal 100%'}
          </div>
        )}
      </div>

      <button onClick={handleSave} disabled={saving || !form.address.trim()} style={{ ...btnPrimary, opacity: saving || !form.address.trim() ? 0.6 : 1 }}>
        {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Property'}
      </button>
    </ModalShell>
  );
}

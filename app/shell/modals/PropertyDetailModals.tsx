'use client';

import { useState } from 'react';
import { ModalShell, Field, Grid2, inputStyle, btnPrimary } from './ModalShell';
import { Property } from '@/types';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

// ─── Tenant Modal ─────────────────────────────────────────────────────────────

interface TenantProps {
  property: Property;
  onSave: (data: Partial<Property>) => Promise<void>;
  onClose: () => void;
}

export function TenantModal({ property, onSave, onClose }: TenantProps) {
  const t = property.tenant;
  const [form, setForm] = useState({
    name: t?.name || '',
    email: t?.email || '',
    phone: t?.phone || '',
    leaseStart: t?.leaseStart || '',
    leaseEnd: t?.leaseEnd || '',
    deposit: t?.deposit?.toString() || '',
    rentPcm: t?.rentPcm?.toString() || '',
  });
  const [saving, setSaving] = useState(false);
  function set(key: string, v: any) { setForm(f => ({ ...f, [key]: v })); }

  async function handleSave() {
    setSaving(true);
    await onSave({
      tenant: {
        id: t?.id || uid(),
        name: form.name,
        email: form.email,
        phone: form.phone,
        leaseStart: form.leaseStart,
        leaseEnd: form.leaseEnd || undefined,
        deposit: Number(form.deposit) || 0,
        rentPcm: Number(form.rentPcm) || 0,
      }
    });
    setSaving(false);
    onClose();
  }

  return (
    <ModalShell title="Edit Tenant" onClose={onClose}>
      <Field label="Full Name">
        <input style={inputStyle} type="text" value={form.name} onChange={e => set('name', e.target.value)} />
      </Field>
      <Grid2>
        <Field label="Email">
          <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </Field>
        <Field label="Phone">
          <input style={inputStyle} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
        </Field>
      </Grid2>
      <Grid2>
        <Field label="Rent PCM (£)">
          <input style={inputStyle} type="number" value={form.rentPcm} onChange={e => set('rentPcm', e.target.value)} />
        </Field>
        <Field label="Deposit (£)">
          <input style={inputStyle} type="number" value={form.deposit} onChange={e => set('deposit', e.target.value)} />
        </Field>
      </Grid2>
      <Grid2>
        <Field label="Lease Start">
          <input style={inputStyle} type="date" value={form.leaseStart} onChange={e => set('leaseStart', e.target.value)} />
        </Field>
        <Field label="Lease End">
          <input style={inputStyle} type="date" value={form.leaseEnd} onChange={e => set('leaseEnd', e.target.value)} />
        </Field>
      </Grid2>
      <button onClick={handleSave} disabled={saving}
        style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </ModalShell>
  );
}

// ─── Agent Modal ──────────────────────────────────────────────────────────────

interface AgentProps {
  property: Property;
  onSave: (data: Partial<Property>) => Promise<void>;
  onClose: () => void;
}

export function AgentModal({ property, onSave, onClose }: AgentProps) {
  const a = property.lettingAgent;
  const [form, setForm] = useState({
    name: a?.name || '',
    company: a?.company || '',
    contact: a?.contact || '',
    email: a?.email || '',
    phone: a?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  function set(key: string, v: any) { setForm(f => ({ ...f, [key]: v })); }

  async function handleSave() {
    setSaving(true);
    await onSave({ lettingAgent: form });
    setSaving(false);
    onClose();
  }

  return (
    <ModalShell title="Edit Letting Agent" onClose={onClose}>
      <Field label="Agent Name">
        <input style={inputStyle} type="text" value={form.name} onChange={e => set('name', e.target.value)} />
      </Field>
      <Field label="Company">
        <input style={inputStyle} type="text" value={form.company} onChange={e => set('company', e.target.value)} />
      </Field>
      <Field label="Contact Name">
        <input style={inputStyle} type="text" value={form.contact} onChange={e => set('contact', e.target.value)} />
      </Field>
      <Grid2>
        <Field label="Email">
          <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </Field>
        <Field label="Phone">
          <input style={inputStyle} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
        </Field>
      </Grid2>
      <button onClick={handleSave} disabled={saving}
        style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </ModalShell>
  );
}

// ─── Rent History Modal ───────────────────────────────────────────────────────

interface RentHistoryProps {
  property: Property;
  onSave: (data: Partial<Property>) => Promise<void>;
  onClose: () => void;
}

export function RentHistoryModal({ property, onSave, onClose }: RentHistoryProps) {
  const [form, setForm] = useState({ dateFrom: '', dateTo: '', amount: '', notes: '' });
  const [saving, setSaving] = useState(false);
  function set(key: string, v: any) { setForm(f => ({ ...f, [key]: v })); }

  async function handleSave() {
    if (!form.amount || !form.dateFrom) return;
    setSaving(true);
    await onSave({
      rentHistory: [
        ...property.rentHistory,
        { id: uid(), dateFrom: form.dateFrom, dateTo: form.dateTo || undefined, amount: Number(form.amount), notes: form.notes || undefined },
      ]
    });
    setSaving(false);
    onClose();
  }

  return (
    <ModalShell title="Add Rent Record" onClose={onClose}>
      <Field label="Amount PCM (£)">
        <input style={inputStyle} type="number" value={form.amount} onChange={e => set('amount', e.target.value)} />
      </Field>
      <Grid2>
        <Field label="Date From">
          <input style={inputStyle} type="date" value={form.dateFrom} onChange={e => set('dateFrom', e.target.value)} />
        </Field>
        <Field label="Date To (leave blank if current)">
          <input style={inputStyle} type="date" value={form.dateTo} onChange={e => set('dateTo', e.target.value)} />
        </Field>
      </Grid2>
      <Field label="Notes">
        <input style={inputStyle} type="text" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="e.g. Annual increase" />
      </Field>
      <button onClick={handleSave} disabled={saving || !form.amount || !form.dateFrom}
        style={{ ...btnPrimary, opacity: saving || !form.amount || !form.dateFrom ? 0.6 : 1 }}>
        {saving ? 'Saving…' : 'Add Record'}
      </button>
    </ModalShell>
  );
}

// ─── Key Contact Modal ────────────────────────────────────────────────────────

interface ContactProps {
  property: Property;
  onSave: (data: Partial<Property>) => Promise<void>;
  onClose: () => void;
}

export function ContactModal({ property, onSave, onClose }: ContactProps) {
  const [form, setForm] = useState({ category: '', name: '', company: '', email: '', phone: '', notes: '' });
  const [saving, setSaving] = useState(false);
  function set(key: string, v: any) { setForm(f => ({ ...f, [key]: v })); }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave({
      keyContacts: [...property.keyContacts, { id: uid(), ...form }]
    });
    setSaving(false);
    onClose();
  }

  return (
    <ModalShell title="Add Key Contact" onClose={onClose}>
      <Field label="Category">
        <input style={inputStyle} type="text" value={form.category}
          onChange={e => set('category', e.target.value)} placeholder="Insurance, Solicitor, Plumber…" />
      </Field>
      <Field label="Name">
        <input style={inputStyle} type="text" value={form.name} onChange={e => set('name', e.target.value)} />
      </Field>
      <Field label="Company">
        <input style={inputStyle} type="text" value={form.company} onChange={e => set('company', e.target.value)} />
      </Field>
      <Grid2>
        <Field label="Email">
          <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </Field>
        <Field label="Phone">
          <input style={inputStyle} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
        </Field>
      </Grid2>
      <Field label="Notes">
        <textarea style={{ ...inputStyle, resize: 'none' }} rows={2} value={form.notes}
          onChange={e => set('notes', e.target.value)} />
      </Field>
      <button onClick={handleSave} disabled={saving || !form.name.trim()}
        style={{ ...btnPrimary, opacity: saving || !form.name.trim() ? 0.6 : 1 }}>
        {saving ? 'Saving…' : 'Add Contact'}
      </button>
    </ModalShell>
  );
}

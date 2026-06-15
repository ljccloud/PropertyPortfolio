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
    try {
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
      onClose();
    } catch {} finally { setSaving(false); }
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
    try { await onSave({ lettingAgent: form }); onClose(); } catch {} finally { setSaving(false); }
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
  const [error, setError] = useState('');
  function set(key: string, v: any) { setForm(f => ({ ...f, [key]: v })); }

  async function handleSave() {
    if (!form.amount || !form.dateFrom) return;
    setSaving(true);
    setError('');
    try {
      const existing = property.rentHistory || [];
      await onSave({
        rentHistory: [
          ...existing,
          { id: uid(), dateFrom: form.dateFrom, dateTo: form.dateTo || undefined, amount: Number(form.amount), notes: form.notes || undefined },
        ]
      });
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Save failed — please try again');
    } finally { setSaving(false); }
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
        <Field label="Date To (leave blank if current rent)">
          <input style={inputStyle} type="date" value={form.dateTo} onChange={e => set('dateTo', e.target.value)} />
        </Field>
      </Grid2>
      <Field label="Notes">
        <input style={inputStyle} type="text" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="e.g. Annual increase" />
      </Field>
      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</p>}
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
  contact?: any;
  onSave: (data: Partial<Property>) => Promise<void>;
  onClose: () => void;
}

export function ContactModal({ property, contact, onSave, onClose }: ContactProps) {
  const isEdit = !!contact;
  const [form, setForm] = useState({
    category: contact?.category || '',
    name: contact?.name || '',
    company: contact?.company || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    notes: contact?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  function set(key: string, v: any) { setForm(f => ({ ...f, [key]: v })); }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const existing = property.keyContacts || [];
      const updated = isEdit
        ? existing.map((c: any) => c.id === contact.id ? { ...c, ...form } : c)
        : [...existing, { id: uid(), ...form }];
      await onSave({ keyContacts: updated });
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Save failed — please try again');
    } finally { setSaving(false); }
  }

  return (
    <ModalShell title={isEdit ? 'Edit Contact' : 'Add Key Contact'} onClose={onClose}>
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
      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</p>}
      <button onClick={handleSave} disabled={saving || !form.name.trim()}
        style={{ ...btnPrimary, opacity: saving || !form.name.trim() ? 0.6 : 1 }}>
        {saving ? 'Saving…' : isEdit ? 'Save Contact' : 'Add Contact'}
      </button>
    </ModalShell>
  );
}

// ─── Renovation Modal ─────────────────────────────────────────────────────────

interface RenovationProps {
  property: Property;
  onSave: (data: Partial<Property>) => Promise<void>;
  onClose: () => void;
}

export function RenovationModal({ property, onSave, onClose }: RenovationProps) {
  const [form, setForm] = useState({ description: '', cost: '', date: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  function set(key: string, v: any) { setForm(f => ({ ...f, [key]: v })); }

  async function handleSave() {
    if (!form.description.trim() || !form.cost) return;
    setSaving(true);
    try {
      await onSave({
        renovations: [
          ...((property as any).renovations || []),
          { id: uid(), date: form.date, cost: Number(form.cost), description: form.description.trim() }
        ]
      });
      onClose();
    } catch {} finally { setSaving(false); }
  }

  return (
    <ModalShell title="Add Renovation" onClose={onClose}>
      <Field label="Description">
        <input style={inputStyle} type="text" value={form.description}
          onChange={e => set('description', e.target.value)} placeholder="e.g. Kitchen refurbishment" />
      </Field>
      <Grid2>
        <Field label="Cost (£)">
          <input style={inputStyle} type="number" step="0.01" value={form.cost}
            onChange={e => set('cost', e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Date">
          <input style={inputStyle} type="date" value={form.date}
            onChange={e => set('date', e.target.value)} />
        </Field>
      </Grid2>
      <button onClick={handleSave} disabled={saving || !form.description.trim() || !form.cost}
        style={{ ...btnPrimary, opacity: saving || !form.description.trim() || !form.cost ? 0.6 : 1 }}>
        {saving ? 'Saving…' : 'Add Renovation'}
      </button>
    </ModalShell>
  );
}

// ─── Appliance Modal ──────────────────────────────────────────────────────────

interface ApplianceProps {
  property: Property;
  appliance?: any;
  onSave: (data: Partial<Property>) => Promise<void>;
  onClose: () => void;
}

export function ApplianceModal({ property, appliance, onSave, onClose }: ApplianceProps) {
  const isEdit = !!appliance;
  const [form, setForm] = useState({
    name: appliance?.name || '',
    make: appliance?.make || '',
    model: appliance?.model || '',
    serialNumber: appliance?.serialNumber || '',
    purchaseDate: appliance?.purchaseDate || '',
    warrantyEndDate: appliance?.warrantyEndDate || '',
    supplier: appliance?.supplier || '',
    notes: appliance?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const existing = (property as any).appliances || [];
      const updated = isEdit
        ? existing.map((a: any) => a.id === appliance.id ? { ...a, ...form } : a)
        : [...existing, { id: uid(), ...form }];
      await onSave({ appliances: updated } as any);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Save failed — please try again');
    } finally { setSaving(false); }
  }

  return (
    <ModalShell title={isEdit ? 'Edit Appliance' : 'Add Appliance'} onClose={onClose}>
      <Field label="Name">
        <input style={inputStyle} type="text" value={form.name}
          onChange={e => set('name', e.target.value)} placeholder="e.g. Boiler, Fridge, Oven" />
      </Field>
      <Grid2>
        <Field label="Make">
          <input style={inputStyle} type="text" value={form.make}
            onChange={e => set('make', e.target.value)} placeholder="e.g. Worcester Bosch" />
        </Field>
        <Field label="Model">
          <input style={inputStyle} type="text" value={form.model}
            onChange={e => set('model', e.target.value)} />
        </Field>
      </Grid2>
      <Field label="Serial Number">
        <input style={inputStyle} type="text" value={form.serialNumber}
          onChange={e => set('serialNumber', e.target.value)} />
      </Field>
      <Grid2>
        <Field label="Purchase Date">
          <input style={inputStyle} type="date" value={form.purchaseDate}
            onChange={e => set('purchaseDate', e.target.value)} />
        </Field>
        <Field label="Warranty End">
          <input style={inputStyle} type="date" value={form.warrantyEndDate}
            onChange={e => set('warrantyEndDate', e.target.value)} />
        </Field>
      </Grid2>
      <Field label="Supplier">
        <input style={inputStyle} type="text" value={form.supplier}
          onChange={e => set('supplier', e.target.value)} />
      </Field>
      <Field label="Notes">
        <textarea style={{ ...inputStyle, resize: 'none' as const }} rows={2} value={form.notes}
          onChange={e => set('notes', e.target.value)} />
      </Field>
      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</p>}
      <button onClick={handleSave} disabled={saving || !form.name.trim()}
        style={{ ...btnPrimary, opacity: saving || !form.name.trim() ? 0.6 : 1 }}>
        {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Appliance'}
      </button>
    </ModalShell>
  );
}

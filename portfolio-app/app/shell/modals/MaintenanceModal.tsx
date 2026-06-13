'use client';

import { useState } from 'react';
import { ModalShell, Field, Grid2, inputStyle, selectStyle, btnPrimary } from './ModalShell';
import { Property, MaintenanceIssue } from '@/types';
import { format } from 'date-fns';

interface Props {
  properties: Property[];
  issue?: MaintenanceIssue;
  defaultPropertyId?: string;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}

export default function MaintenanceModal({ properties, issue, defaultPropertyId, onSave, onClose }: Props) {
  const isEdit = !!issue;
  const [form, setForm] = useState({
    propertyId: issue?.propertyId || defaultPropertyId || '',
    issue: issue?.issue || '',
    description: issue?.description || '',
    dateRaised: issue?.dateRaised || format(new Date(), 'yyyy-MM-dd'),
    dateResolved: issue?.dateResolved || '',
    resolution: issue?.resolution || '',
    costToResolve: issue?.costToResolve?.toString() || '',
  });
  const [saving, setSaving] = useState(false);

  function set(key: string, value: any) { setForm(f => ({ ...f, [key]: value })); }

  const isResolved = !!form.dateResolved;

  async function handleSave() {
    if (!form.propertyId || !form.issue.trim()) return;
    setSaving(true);
    try {
      const prop = properties.find(p => p.id === form.propertyId);
      await onSave({
        ...(isEdit ? { id: issue!.id } : {}),
        ...form,
        propertyAddress: prop?.address || '',
        costToResolve: form.costToResolve ? Number(form.costToResolve) : undefined,
        dateResolved: form.dateResolved || undefined,
        status: form.dateResolved ? 'Closed' : 'Open',
      });
      onClose();
    } catch { /* error shown via toast */ } finally { setSaving(false); }
  }

  return (
    <ModalShell title={isEdit ? 'Edit Issue' : 'Log Maintenance Issue'} onClose={onClose}>
      <Field label="Property">
        <select style={selectStyle} value={form.propertyId} onChange={e => set('propertyId', e.target.value)}>
          <option value="">Select property…</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
        </select>
      </Field>

      <Field label="Issue">
        <input style={inputStyle} type="text" value={form.issue}
          onChange={e => set('issue', e.target.value)} placeholder="e.g. Boiler not working" />
      </Field>

      <Field label="Description">
        <textarea style={{ ...inputStyle, resize: 'none' }} rows={2} value={form.description}
          onChange={e => set('description', e.target.value)} placeholder="More detail about the issue" />
      </Field>

      <Grid2>
        <Field label="Date Raised">
          <input style={inputStyle} type="date" value={form.dateRaised}
            onChange={e => set('dateRaised', e.target.value)} />
        </Field>
        <Field label="Date Resolved">
          <input style={inputStyle} type="date" value={form.dateResolved}
            onChange={e => set('dateResolved', e.target.value)} />
        </Field>
      </Grid2>

      {isResolved && (
        <Field label="Resolution Notes">
          <textarea style={{ ...inputStyle, resize: 'none' }} rows={2} value={form.resolution}
            onChange={e => set('resolution', e.target.value)} placeholder="What was done to fix it?" />
        </Field>
      )}

      <Field label="Cost to Resolve (£)">
        <input style={inputStyle} type="number" step="0.01" value={form.costToResolve}
          onChange={e => set('costToResolve', e.target.value)} placeholder="0.00" />
      </Field>

      {/* Status indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: isResolved ? 'var(--green-bg)' : 'var(--amber-bg)', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: isResolved ? 'var(--green)' : 'var(--amber)' }}>
          Status: <strong>{isResolved ? 'Closed' : 'Open'}</strong> — {isResolved ? 'resolved date is set' : 'add a resolved date to close'}
        </span>
      </div>

      <button onClick={handleSave} disabled={saving || !form.propertyId || !form.issue.trim()}
        style={{ ...btnPrimary, opacity: saving || !form.propertyId || !form.issue.trim() ? 0.6 : 1 }}>
        {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Log Issue'}
      </button>
    </ModalShell>
  );
}

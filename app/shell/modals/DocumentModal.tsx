'use client';

import { useState, useRef } from 'react';
import { ModalShell, Field, Grid2, inputStyle, selectStyle, btnPrimary } from './ModalShell';
import { Property } from '@/types';
import { format, addYears } from 'date-fns';

const DOC_CATS = ['Tenancy', 'Rent', 'Certificates', 'Appliances', 'Reference', 'Other'];
const CERT_TYPES = ['Gas Safety', 'EPC', 'EICR', 'Other'];

interface Props {
  properties: Property[];
  defaultPropertyId?: string;
  onUpload: (formData: FormData) => Promise<void>;
  onClose: () => void;
}

export default function DocumentModal({ properties, defaultPropertyId, onUpload, onClose }: Props) {
  const [form, setForm] = useState({
    propertyId: defaultPropertyId || '',
    category: 'Other',
    documentDate: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    certificateType: 'Gas Safety',
    issueDate: '',
    expiryDate: '',
    issuerNotes: '',
    epcRating: '',
    applianceName: '',
    applianceMake: '',
    applianceModel: '',
    applianceSerial: '',
    appliancePurchaseDate: '',
    warrantyEndDate: '',
    applianceNotes: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  function set(key: string, v: any) { setForm(f => ({ ...f, [key]: v })); }

  function setExpiryPreset(years: number) {
    if (!form.issueDate) return;
    const d = addYears(new Date(form.issueDate + 'T00:00:00'), years);
    set('expiryDate', format(d, 'yyyy-MM-dd'));
  }

  async function handleUpload() {
    if (!file || !form.propertyId || !form.description.trim()) return;
    setUploading(true);
    try {
      const prop = properties.find(p => p.id === form.propertyId);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('metadata', JSON.stringify({ ...form, propertyAddress: prop?.address || '' }));
      await onUpload(fd);
      onClose();
    } catch { /* error shown via toast */ } finally { setUploading(false); }
  }

  const canUpload = !!file && !!form.propertyId && !!form.description.trim();

  // iOS Safari requires the label/input approach for file picking to work
  const fileInputId = 'doc-file-input-modal';

  return (
    <ModalShell title="Upload Document" onClose={onClose}>
      <Field label="Property">
        <select style={selectStyle} value={form.propertyId} onChange={e => set('propertyId', e.target.value)}>
          <option value="">Select property…</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
        </select>
      </Field>

      <Grid2>
        <Field label="Category">
          <select style={selectStyle} value={form.category} onChange={e => set('category', e.target.value)}>
            {DOC_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Document Date">
          <input style={inputStyle} type="date" value={form.documentDate}
            onChange={e => set('documentDate', e.target.value)} />
        </Field>
      </Grid2>

      <Field label="Description">
        <input style={inputStyle} type="text" value={form.description}
          onChange={e => set('description', e.target.value)} placeholder="Brief description" />
      </Field>

      {/* Certificate fields */}
      {form.category === 'Certificates' && (
        <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Certificate Details</div>
          <Field label="Type">
            <select style={selectStyle} value={form.certificateType} onChange={e => set('certificateType', e.target.value)}>
              {CERT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          {form.certificateType === 'EPC' && (
            <Field label="EPC Rating (e.g. A, B, C)">
              <input style={inputStyle} type="text" value={form.epcRating}
                onChange={e => set('epcRating', e.target.value.toUpperCase().slice(0,1))}
                placeholder="e.g. C" maxLength={1} />
            </Field>
          )}
          <Grid2>
            <Field label="Issue Date">
              <input style={inputStyle} type="date" value={form.issueDate}
                onChange={e => set('issueDate', e.target.value)} />
            </Field>
            <Field label="Expiry Date">
              <input style={inputStyle} type="date" value={form.expiryDate}
                onChange={e => set('expiryDate', e.target.value)} />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button onClick={() => setExpiryPreset(1)} style={{ flex: 1, padding: 5, fontSize: 11, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text2)' }}>+ 1 year</button>
                <button onClick={() => setExpiryPreset(5)} style={{ flex: 1, padding: 5, fontSize: 11, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text2)' }}>+ 5 years</button>
              </div>
            </Field>
          </Grid2>
          <Field label="Issuer Notes">
            <input style={inputStyle} type="text" value={form.issuerNotes}
              onChange={e => set('issuerNotes', e.target.value)} />
          </Field>
        </div>
      )}

      {/* Appliance fields */}
      {form.category === 'Appliances' && (
        <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Appliance Details</div>
          <Field label="Name">
            <input style={inputStyle} type="text" value={form.applianceName}
              onChange={e => set('applianceName', e.target.value)} placeholder="e.g. Boiler" />
          </Field>
          <Grid2>
            <Field label="Make">
              <input style={inputStyle} type="text" value={form.applianceMake}
                onChange={e => set('applianceMake', e.target.value)} />
            </Field>
            <Field label="Model">
              <input style={inputStyle} type="text" value={form.applianceModel}
                onChange={e => set('applianceModel', e.target.value)} />
            </Field>
          </Grid2>
          <Field label="Serial Number">
            <input style={inputStyle} type="text" value={form.applianceSerial}
              onChange={e => set('applianceSerial', e.target.value)} />
          </Field>
          <Grid2>
            <Field label="Purchase Date">
              <input style={inputStyle} type="date" value={form.appliancePurchaseDate}
                onChange={e => set('appliancePurchaseDate', e.target.value)} />
            </Field>
            <Field label="Warranty End">
              <input style={inputStyle} type="date" value={form.warrantyEndDate}
                onChange={e => set('warrantyEndDate', e.target.value)} />
            </Field>
          </Grid2>
          <Field label="Notes">
            <textarea style={{ ...inputStyle, resize: 'none' }} rows={2} value={form.applianceNotes}
              onChange={e => set('applianceNotes', e.target.value)} />
          </Field>
        </div>
      )}

      {/* File picker — use label+input pattern for iOS Safari compatibility */}
      <div style={{ marginBottom: 12 }}>
        <input
          id={fileInputId}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={e => setFile(e.target.files?.[0] || null)}
          style={{
            // Visible but styled — iOS requires the input to be directly interactable
            width: '100%',
            padding: '10px 12px',
            border: '1.5px dashed var(--border2)',
            borderRadius: 'var(--radius)',
            background: 'var(--surface2)',
            fontFamily: 'inherit',
            fontSize: 13,
            color: 'var(--text2)',
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
        />
        {file && (
          <div style={{ marginTop: 6, fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>
            ✓ {file.name}
          </div>
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={uploading || !canUpload}
        style={{ ...btnPrimary, opacity: uploading || !canUpload ? 0.6 : 1 }}
      >
        {uploading ? 'Uploading to Drive…' : 'Upload Document'}
      </button>

      {!canUpload && !uploading && (
        <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginTop: 8 }}>
          {!form.propertyId ? 'Select a property' : !form.description.trim() ? 'Add a description' : 'Choose a file to upload'}
        </p>
      )}
    </ModalShell>
  );
}

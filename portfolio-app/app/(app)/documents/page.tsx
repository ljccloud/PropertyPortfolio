'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { format, parseISO, addYears } from 'date-fns';
import { Plus, ExternalLink, Trash2, Upload, FileText } from 'lucide-react';
import {
  PageHeader, Card, Modal, Input, Select, Textarea, Button, Badge,
  Spinner, EmptyState, SectionHeader, fmt
} from '@/components/ui';
import { Document, Property, DocumentCategory, CertificateType } from '@/types';

const CATEGORIES: DocumentCategory[] = ['Tenancy', 'Rent', 'Certificates', 'Appliances', 'Reference', 'Other'];
const CERT_TYPES: CertificateType[] = ['Gas Safety', 'EPC', 'EICR', 'Other'];

const emptyForm = {
  propertyId: '', category: 'Other' as DocumentCategory,
  documentDate: format(new Date(), 'yyyy-MM-dd'), description: '',
  // Cert
  certificateType: 'Gas Safety' as CertificateType,
  issueDate: '', expiryDate: '', issuerNotes: '',
  // Appliance
  applianceName: '', applianceMake: '', applianceModel: '',
  applianceSerial: '', appliancePurchaseDate: '', warrantyEndDate: '', applianceNotes: '',
};

export default function DocumentsPage() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filterPropertyId, setFilterPropertyId] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      fetch('/api/documents').then(r => r.json()),
      fetch('/api/properties').then(r => r.json()),
    ]).then(([d, p]) => {
      setDocuments(d.data || []);
      setProperties(p.data || []);
      setLoading(false);
    });
  }, [session]);

  const grouped = useMemo(() => {
    const filtered = filterPropertyId
      ? documents.filter(d => d.propertyId === filterPropertyId)
      : documents;

    const map: Record<string, { property: Property; docs: Document[] }> = {};
    filtered.forEach(doc => {
      if (!map[doc.propertyId]) {
        const prop = properties.find(p => p.id === doc.propertyId);
        if (!prop) return;
        map[doc.propertyId] = { property: prop, docs: [] };
      }
      map[doc.propertyId].docs.push(doc);
    });
    Object.values(map).forEach(g => g.docs.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)));
    return Object.values(map).sort((a, b) => a.property.address.localeCompare(b.property.address));
  }, [documents, properties, filterPropertyId]);

  async function handleUpload() {
    if (!file || !form.propertyId) return;
    setUploading(true);

    const propertyAddress = properties.find(p => p.id === form.propertyId)?.address || '';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify({ ...form, propertyAddress }));

    const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
    const { data } = await res.json();
    if (data) setDocuments(ds => [...ds, data]);

    setShowModal(false);
    setForm(emptyForm);
    setFile(null);
    setUploading(false);
  }

  async function handleDelete(id: string) {
    await fetch('/api/documents', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setDocuments(ds => ds.filter(d => d.id !== id));
  }

  function setExpiryPreset(years: 1 | 5) {
    if (!form.issueDate) return;
    const expiry = addYears(parseISO(form.issueDate), years);
    setForm(f => ({ ...f, expiryDate: format(expiry, 'yyyy-MM-dd') }));
  }

  if (loading) return <div className="bg-[#0f1117] min-h-screen"><PageHeader title="Documents" /><Spinner /></div>;

  return (
    <div className="bg-[#0f1117] min-h-screen">
      <PageHeader
        title="Documents"
        action={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-[#6c63ff] text-white text-sm font-medium px-3 py-1.5 rounded-xl"
          >
            <Plus size={16} /> Upload
          </button>
        }
      />

      <div className="px-4 py-3 space-y-4">
        {/* Property filter */}
        <select
          value={filterPropertyId}
          onChange={e => setFilterPropertyId(e.target.value)}
          className="w-full bg-[#16181f] border border-[#1e2130] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#6c63ff]"
        >
          <option value="">All properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
        </select>

        {grouped.length === 0 ? (
          <EmptyState message="No documents uploaded yet. Tap Upload to add one." />
        ) : (
          grouped.map(({ property, docs }) => (
            <div key={property.id} className="space-y-2">
              <SectionHeader title={property.address} />
              <div className="space-y-2">
                {docs.map(doc => (
                  <Card key={doc.id} className="space-y-1.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 bg-[#6c63ff]/15 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                          <FileText size={15} className="text-[#6c63ff]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.description}</p>
                          <p className="text-xs text-[#555870]">
                            {doc.category}
                            {doc.certificateType ? ` · ${doc.certificateType}` : ''}
                            {doc.applianceName ? ` · ${doc.applianceName}` : ''}
                          </p>
                          <p className="text-xs text-[#555870]">
                            {doc.documentDate ? format(parseISO(doc.documentDate), 'd MMM yyyy') : ''}
                          </p>
                          {doc.expiryDate && (
                            <p className="text-xs text-amber-400">
                              Expires: {format(parseISO(doc.expiryDate), 'd MMM yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <a href={doc.driveViewLink} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 text-[#555870] hover:text-[#6c63ff] rounded-lg">
                          <ExternalLink size={15} />
                        </a>
                        <button onClick={() => handleDelete(doc.id)}
                          className="p-1.5 text-[#555870] hover:text-red-400 rounded-lg">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#3a3d50] truncate pl-11">{doc.driveFileName}</p>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      {showModal && (
        <Modal title="Upload Document" onClose={() => { setShowModal(false); setFile(null); setForm(emptyForm); }}>
          <div className="space-y-4">
            <Select label="Property" value={form.propertyId} onChange={e => setForm(f => ({ ...f, propertyId: e.target.value }))}>
              <option value="">Select property…</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
            </Select>

            <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as DocumentCategory }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>

            <Input label="Document Date" type="date" value={form.documentDate} onChange={e => setForm(f => ({ ...f, documentDate: e.target.value }))} />
            <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" />

            {/* Certificate-specific fields */}
            {form.category === 'Certificates' && (
              <div className="space-y-3 bg-[#0f1117] rounded-xl p-3">
                <p className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wide">Certificate Details</p>
                <Select label="Type" value={form.certificateType} onChange={e => setForm(f => ({ ...f, certificateType: e.target.value as CertificateType }))}>
                  {CERT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
                <Input label="Issue Date" type="date" value={form.issueDate} onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))} />
                <div className="space-y-2">
                  <Input label="Expiry Date" type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
                  <div className="flex gap-2">
                    <button onClick={() => setExpiryPreset(1)} className="flex-1 text-xs py-1.5 bg-[#1e2130] text-[#8b8fa8] hover:text-white rounded-lg">+1 year</button>
                    <button onClick={() => setExpiryPreset(5)} className="flex-1 text-xs py-1.5 bg-[#1e2130] text-[#8b8fa8] hover:text-white rounded-lg">+5 years</button>
                  </div>
                </div>
                <Textarea label="Issuer Notes" value={form.issuerNotes} onChange={e => setForm(f => ({ ...f, issuerNotes: e.target.value }))} />
              </div>
            )}

            {/* Appliance-specific fields */}
            {form.category === 'Appliances' && (
              <div className="space-y-3 bg-[#0f1117] rounded-xl p-3">
                <p className="text-xs font-medium text-[#8b8fa8] uppercase tracking-wide">Appliance Details</p>
                <Input label="Name" value={form.applianceName} onChange={e => setForm(f => ({ ...f, applianceName: e.target.value }))} placeholder="e.g. Boiler" />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Make" value={form.applianceMake} onChange={e => setForm(f => ({ ...f, applianceMake: e.target.value }))} />
                  <Input label="Model" value={form.applianceModel} onChange={e => setForm(f => ({ ...f, applianceModel: e.target.value }))} />
                </div>
                <Input label="Serial Number" value={form.applianceSerial} onChange={e => setForm(f => ({ ...f, applianceSerial: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Purchase Date" type="date" value={form.appliancePurchaseDate} onChange={e => setForm(f => ({ ...f, appliancePurchaseDate: e.target.value }))} />
                  <Input label="Warranty End" type="date" value={form.warrantyEndDate} onChange={e => setForm(f => ({ ...f, warrantyEndDate: e.target.value }))} />
                </div>
                <Textarea label="Notes" value={form.applianceNotes} onChange={e => setForm(f => ({ ...f, applianceNotes: e.target.value }))} />
              </div>
            )}

            {/* File picker */}
            <div>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-[#1e2130] rounded-xl p-4 flex flex-col items-center gap-2 hover:border-[#6c63ff]/50 transition-colors"
              >
                <Upload size={20} className="text-[#555870]" />
                <p className="text-sm text-[#8b8fa8]">
                  {file ? file.name : 'Tap to select file'}
                </p>
              </button>
            </div>

            <Button
              onClick={handleUpload}
              disabled={uploading || !file || !form.propertyId || !form.description}
              className="w-full"
            >
              {uploading ? 'Uploading…' : 'Upload to Drive'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

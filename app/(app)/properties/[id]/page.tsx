'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  ArrowLeft, User, Phone, Mail, Calendar, FileText,
  Wrench, ExternalLink, Plus, Trash2, ChevronDown, ChevronUp,
  Key, Clock
} from 'lucide-react';
import Link from 'next/link';
import {
  Card, Badge, Modal, Input, Select, Textarea, Button, Spinner,
  EmptyState, SectionHeader, fmt
} from '@/components/ui';
import { Property, Document, MaintenanceIssue, RentHistoryEntry, KeyContact } from '@/types';

type Section = 'reference' | 'tenant' | 'agent' | 'rent' | 'certs' | 'contacts' | 'docs' | 'maintenance';

export default function PropertyDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Section[]>(['reference']);
  const [editSection, setEditSection] = useState<Section | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      fetch(`/api/properties/${id}`).then(r => r.json()),
      fetch(`/api/documents?propertyId=${id}`).then(r => r.json()),
      fetch(`/api/maintenance?propertyId=${id}`).then(r => r.json()),
    ]).then(([p, d, m]) => {
      setProperty(p.data);
      setDocuments(d.data || []);
      setMaintenance(m.data || []);
      setLoading(false);
    });
  }, [session, id]);

  function toggle(s: Section) {
    setExpanded(e => e.includes(s) ? e.filter(x => x !== s) : [...e, s]);
  }

  async function saveProperty(updates: Partial<Property>) {
    setSaving(true);
    const res = await fetch(`/api/properties/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const { data } = await res.json();
    setProperty(data);
    setEditSection(null);
    setSaving(false);
  }

  const certDocs = documents.filter(d => d.category === 'Certificates');
  const applianceDocs = documents.filter(d => d.category === 'Appliances');

  function certBadge(expiryDate?: string) {
    if (!expiryDate) return 'missing';
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0) return 'expired';
    if (days <= 60) return 'expiring';
    return 'valid';
  }

  if (loading) return <div className=" min-h-screen pt-14"><Spinner /></div>;
  if (!property) return <div className=" min-h-screen pt-14"><EmptyState message="Property not found" /></div>;

  const yield_ = property.currentValue && property.tenant?.rentPcm
    ? (((property.tenant.rentPcm * 12) / property.currentValue) * 100).toFixed(1)
    : null;

  return (
    <div className=" min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 sticky top-0 /95 backdrop-blur-md z-10 border-b border-[#E2DDD4]">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-[#6B6760]">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold truncate">{property.address}</h1>
          {property.reference && <p className="text-xs text-[#A09D98]">{property.reference}</p>}
        </div>
      </div>

      <div className="px-4 py-3 space-y-2">

        {/* Reference section */}
        <SectionRow
          title="Reference"
          section="reference"
          expanded={expanded}
          onToggle={toggle}
          onEdit={() => { setEditSection('reference'); setEditForm({ ...property }); }}
        >
          <div className="grid grid-cols-2 gap-3">
            <InfoItem label="Purchase Price" value={property.purchasePrice ? fmt(property.purchasePrice) : '—'} />
            <InfoItem label="Purchase Date" value={property.purchaseDate ? format(parseISO(property.purchaseDate), 'd MMM yyyy') : '—'} />
            <InfoItem label="Current Value" value={property.currentValue ? fmt(property.currentValue) : '—'} />
            <InfoItem label="Gross Yield" value={yield_ ? `${yield_}%` : '—'} />
          </div>
          <div className="mt-3 space-y-1">
            <p className="text-xs text-[#6B6760] uppercase tracking-wide font-medium">Ownership</p>
            {property.owners.map(o => (
              <div key={o.id} className="flex justify-between text-sm">
                <span>{o.name || 'Owner'}</span>
                <span className="text-[#1A3A5C] font-medium">{o.percentage}%</span>
              </div>
            ))}
          </div>
        </SectionRow>

        {/* Tenant */}
        <SectionRow
          title="Tenant"
          section="tenant"
          expanded={expanded}
          onToggle={toggle}
          onEdit={() => { setEditSection('tenant'); setEditForm(property.tenant || {}); }}
        >
          {property.tenant ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User size={14} className="text-[#A09D98]" />
                <span>{property.tenant.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail size={14} className="text-[#A09D98]" />
                <a href={`mailto:${property.tenant.email}`} className="text-[#1A3A5C]">{property.tenant.email}</a>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone size={14} className="text-[#A09D98]" />
                <a href={`tel:${property.tenant.phone}`} className="text-[#1A3A5C]">{property.tenant.phone}</a>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <InfoItem label="Rent PCM" value={fmt(property.tenant.rentPcm)} />
                <InfoItem label="Deposit" value={fmt(property.tenant.deposit)} />
                <InfoItem label="Lease Start" value={property.tenant.leaseStart ? format(parseISO(property.tenant.leaseStart), 'd MMM yyyy') : '—'} />
                {property.tenant.leaseEnd && <InfoItem label="Lease End" value={format(parseISO(property.tenant.leaseEnd), 'd MMM yyyy')} />}
              </div>
            </div>
          ) : <EmptyState message="No tenant recorded" />}
        </SectionRow>

        {/* Letting Agent */}
        <SectionRow
          title="Letting Agent"
          section="agent"
          expanded={expanded}
          onToggle={toggle}
          onEdit={() => { setEditSection('agent'); setEditForm(property.lettingAgent || {}); }}
        >
          {property.lettingAgent ? (
            <div className="space-y-1.5 text-sm">
              <p><span className="text-[#A09D98]">Agent: </span>{property.lettingAgent.name}</p>
              <p><span className="text-[#A09D98]">Company: </span>{property.lettingAgent.company}</p>
              <p><span className="text-[#A09D98]">Contact: </span>{property.lettingAgent.contact}</p>
              {property.lettingAgent.email && (
                <a href={`mailto:${property.lettingAgent.email}`} className="flex items-center gap-1 text-[#1A3A5C]">
                  <Mail size={13} />{property.lettingAgent.email}
                </a>
              )}
            </div>
          ) : <EmptyState message="No letting agent recorded" />}
        </SectionRow>

        {/* Rent History */}
        <SectionRow title="Rent History" section="rent" expanded={expanded} onToggle={toggle}
          onEdit={() => { setEditSection('rent'); setEditForm({ dateFrom: '', dateTo: '', amount: '', notes: '' }); }}
          editLabel="+ Add"
        >
          {property.rentHistory.length === 0 ? (
            <EmptyState message="No rent history recorded" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[#A09D98] text-left">
                  <th className="pb-2">From</th><th className="pb-2">To</th><th className="pb-2">Amount</th><th className="pb-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD4]">
                {property.rentHistory.map(r => (
                  <tr key={r.id} className="text-xs">
                    <td className="py-2">{r.dateFrom ? format(parseISO(r.dateFrom), 'd MMM yy') : '—'}</td>
                    <td className="py-2">{r.dateTo ? format(parseISO(r.dateTo), 'd MMM yy') : 'Present'}</td>
                    <td className="py-2 font-medium">{fmt(r.amount)}</td>
                    <td className="py-2 text-[#A09D98]">{r.notes || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionRow>

        {/* Certificates */}
        <SectionRow title="Certificates & Appliances" section="certs" expanded={expanded} onToggle={toggle}>
          {certDocs.length === 0 && applianceDocs.length === 0 ? (
            <EmptyState message="No certificates or appliances. Upload via Documents tab." />
          ) : (
            <div className="space-y-3">
              {certDocs.length > 0 && (
                <div>
                  <p className="text-xs text-[#6B6760] font-medium mb-2">Certificates</p>
                  {certDocs.map(d => (
                    <div key={d.id} className="flex items-center justify-between py-2 border-b border-[#E2DDD4] last:border-0">
                      <div>
                        <p className="text-sm font-medium">{d.certificateType}</p>
                        <p className="text-xs text-[#A09D98]">
                          Expires: {d.expiryDate ? format(parseISO(d.expiryDate), 'd MMM yyyy') : '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge label={certBadge(d.expiryDate)} />
                        <a href={d.driveViewLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink size={14} className="text-[#A09D98]" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {applianceDocs.length > 0 && (
                <div>
                  <p className="text-xs text-[#6B6760] font-medium mb-2">Appliances</p>
                  {applianceDocs.map(d => (
                    <div key={d.id} className="flex items-center justify-between py-2 border-b border-[#E2DDD4] last:border-0">
                      <div>
                        <p className="text-sm font-medium">{d.applianceName}</p>
                        <p className="text-xs text-[#A09D98]">{d.applianceMake} {d.applianceModel}</p>
                      </div>
                      <a href={d.driveViewLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={14} className="text-[#A09D98]" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </SectionRow>

        {/* Key Contacts */}
        <SectionRow title="Key Contacts" section="contacts" expanded={expanded} onToggle={toggle}
          onEdit={() => { setEditSection('contacts'); setEditForm({ category: '', name: '', company: '', email: '', phone: '', notes: '' }); }}
          editLabel="+ Add"
        >
          {property.keyContacts.length === 0 ? (
            <EmptyState message="No key contacts recorded" />
          ) : (
            <div className="space-y-2">
              {property.keyContacts.map(c => (
                <div key={c.id} className="flex items-start justify-between py-2 border-b border-[#E2DDD4] last:border-0">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-[#A09D98]">{c.category} {c.company ? `· ${c.company}` : ''}</p>
                    {c.email && <a href={`mailto:${c.email}`} className="text-xs text-[#1A3A5C]">{c.email}</a>}
                  </div>
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="text-xs text-[#1A3A5C]">{c.phone}</a>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionRow>

        {/* Documents */}
        <SectionRow title="Documents" section="docs" expanded={expanded} onToggle={toggle}>
          {documents.length === 0 ? (
            <EmptyState message="No documents uploaded yet" />
          ) : (
            <div className="space-y-2">
              {documents.map(d => (
                <a
                  key={d.id}
                  href={d.driveViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between py-2 border-b border-[#E2DDD4] last:border-0"
                >
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-sm truncate">{d.description}</p>
                    <p className="text-xs text-[#A09D98]">{d.category} · {d.documentDate ? format(parseISO(d.documentDate), 'd MMM yyyy') : ''}</p>
                  </div>
                  <ExternalLink size={14} className="text-[#A09D98] shrink-0" />
                </a>
              ))}
            </div>
          )}
        </SectionRow>

        {/* Maintenance */}
        <SectionRow title="Maintenance" section="maintenance" expanded={expanded} onToggle={toggle}>
          {maintenance.length === 0 ? (
            <EmptyState message="No maintenance issues recorded" />
          ) : (
            <div className="space-y-2">
              {maintenance.slice(0, 5).map(m => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-[#E2DDD4] last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{m.issue}</p>
                    <p className="text-xs text-[#A09D98]">{m.dateRaised ? format(parseISO(m.dateRaised), 'd MMM yyyy') : ''}</p>
                  </div>
                  <Badge label={m.status} />
                </div>
              ))}
            </div>
          )}
        </SectionRow>
      </div>

      {/* Edit modals */}
      {editSection === 'reference' && (
        <Modal title="Edit Reference" onClose={() => setEditSection(null)}>
          <div className="space-y-4">
            <Input label="Address" value={editForm.address || ''} onChange={e => setEditForm((f: any) => ({ ...f, address: e.target.value }))} />
            <Input label="Reference" value={editForm.reference || ''} onChange={e => setEditForm((f: any) => ({ ...f, reference: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Purchase Price" type="number" value={editForm.purchasePrice || ''} onChange={e => setEditForm((f: any) => ({ ...f, purchasePrice: Number(e.target.value) }))} />
              <Input label="Purchase Date" type="date" value={editForm.purchaseDate || ''} onChange={e => setEditForm((f: any) => ({ ...f, purchaseDate: e.target.value }))} />
            </div>
            <Input label="Current Value" type="number" value={editForm.currentValue || ''} onChange={e => setEditForm((f: any) => ({ ...f, currentValue: Number(e.target.value) }))} />
            <Button onClick={() => saveProperty(editForm)} disabled={saving} className="w-full">
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </Modal>
      )}

      {editSection === 'tenant' && (
        <Modal title="Edit Tenant" onClose={() => setEditSection(null)}>
          <div className="space-y-4">
            <Input label="Name" value={editForm.name || ''} onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))} />
            <Input label="Email" type="email" value={editForm.email || ''} onChange={e => setEditForm((f: any) => ({ ...f, email: e.target.value }))} />
            <Input label="Phone" type="tel" value={editForm.phone || ''} onChange={e => setEditForm((f: any) => ({ ...f, phone: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Rent PCM" type="number" value={editForm.rentPcm || ''} onChange={e => setEditForm((f: any) => ({ ...f, rentPcm: Number(e.target.value) }))} />
              <Input label="Deposit" type="number" value={editForm.deposit || ''} onChange={e => setEditForm((f: any) => ({ ...f, deposit: Number(e.target.value) }))} />
              <Input label="Lease Start" type="date" value={editForm.leaseStart || ''} onChange={e => setEditForm((f: any) => ({ ...f, leaseStart: e.target.value }))} />
              <Input label="Lease End" type="date" value={editForm.leaseEnd || ''} onChange={e => setEditForm((f: any) => ({ ...f, leaseEnd: e.target.value }))} />
            </div>
            <Button onClick={() => saveProperty({ tenant: { id: property!.tenant?.id || '1', ...editForm } })} disabled={saving} className="w-full">
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </Modal>
      )}

      {editSection === 'agent' && (
        <Modal title="Edit Letting Agent" onClose={() => setEditSection(null)}>
          <div className="space-y-4">
            <Input label="Agent Name" value={editForm.name || ''} onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))} />
            <Input label="Company" value={editForm.company || ''} onChange={e => setEditForm((f: any) => ({ ...f, company: e.target.value }))} />
            <Input label="Contact" value={editForm.contact || ''} onChange={e => setEditForm((f: any) => ({ ...f, contact: e.target.value }))} />
            <Input label="Email" type="email" value={editForm.email || ''} onChange={e => setEditForm((f: any) => ({ ...f, email: e.target.value }))} />
            <Input label="Phone" type="tel" value={editForm.phone || ''} onChange={e => setEditForm((f: any) => ({ ...f, phone: e.target.value }))} />
            <Button onClick={() => saveProperty({ lettingAgent: editForm })} disabled={saving} className="w-full">
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </Modal>
      )}

      {editSection === 'rent' && (
        <Modal title="Add Rent History Entry" onClose={() => setEditSection(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Date From" type="date" value={editForm.dateFrom || ''} onChange={e => setEditForm((f: any) => ({ ...f, dateFrom: e.target.value }))} />
              <Input label="Date To" type="date" value={editForm.dateTo || ''} onChange={e => setEditForm((f: any) => ({ ...f, dateTo: e.target.value }))} />
            </div>
            <Input label="Amount (PCM)" type="number" value={editForm.amount || ''} onChange={e => setEditForm((f: any) => ({ ...f, amount: Number(e.target.value) }))} />
            <Textarea label="Notes" value={editForm.notes || ''} onChange={e => setEditForm((f: any) => ({ ...f, notes: e.target.value }))} />
            <Button
              onClick={() => saveProperty({
                rentHistory: [...(property?.rentHistory || []), { id: Date.now().toString(), ...editForm }]
              })}
              disabled={saving}
              className="w-full"
            >
              {saving ? 'Saving…' : 'Add Entry'}
            </Button>
          </div>
        </Modal>
      )}

      {editSection === 'contacts' && (
        <Modal title="Add Key Contact" onClose={() => setEditSection(null)}>
          <div className="space-y-4">
            <Input label="Category" value={editForm.category || ''} onChange={e => setEditForm((f: any) => ({ ...f, category: e.target.value }))} placeholder="Insurance, Solicitor, etc." />
            <Input label="Name" value={editForm.name || ''} onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))} />
            <Input label="Company" value={editForm.company || ''} onChange={e => setEditForm((f: any) => ({ ...f, company: e.target.value }))} />
            <Input label="Email" type="email" value={editForm.email || ''} onChange={e => setEditForm((f: any) => ({ ...f, email: e.target.value }))} />
            <Input label="Phone" type="tel" value={editForm.phone || ''} onChange={e => setEditForm((f: any) => ({ ...f, phone: e.target.value }))} />
            <Textarea label="Notes" value={editForm.notes || ''} onChange={e => setEditForm((f: any) => ({ ...f, notes: e.target.value }))} />
            <Button
              onClick={() => saveProperty({
                keyContacts: [...(property?.keyContacts || []), { id: Date.now().toString(), ...editForm }]
              })}
              disabled={saving}
              className="w-full"
            >
              {saving ? 'Saving…' : 'Add Contact'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function SectionRow({
  title, section, expanded, onToggle, onEdit, editLabel = 'Edit', children
}: {
  title: string;
  section: Section;
  expanded: Section[];
  onToggle: (s: Section) => void;
  onEdit?: () => void;
  editLabel?: string;
  children: React.ReactNode;
}) {
  const isOpen = expanded.includes(section);
  return (
    <Card className="p-0 overflow-hidden">
      <button
        onClick={() => onToggle(section)}
        className="flex items-center justify-between w-full px-4 py-3.5"
      >
        <span className="font-medium text-sm">{title}</span>
        <div className="flex items-center gap-2">
          {onEdit && (
            <span
              onClick={e => { e.stopPropagation(); onEdit(); }}
              className="text-xs text-[#1A3A5C] px-2 py-1 rounded-lg hover:bg-[#1A1916]/10"
            >
              {editLabel}
            </span>
          )}
          {isOpen ? <ChevronUp size={16} className="text-[#A09D98]" /> : <ChevronDown size={16} className="text-[#A09D98]" />}
        </div>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-[#E2DDD4]">
          <div className="pt-3">{children}</div>
        </div>
      )}
    </Card>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#A09D98]">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

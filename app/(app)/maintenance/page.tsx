'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2, Pencil } from 'lucide-react';
import {
  PageHeader, Card, Modal, Input, Select, Textarea, Button, Badge,
  Spinner, EmptyState, SectionHeader, fmt
} from '@/components/ui';
import { MaintenanceIssue, Property } from '@/types';

const emptyForm = {
  propertyId: '', issue: '', dateRaised: format(new Date(), 'yyyy-MM-dd'),
  dateResolved: '', description: '', resolution: '', costToResolve: '',
};

export default function MaintenancePage() {
  const { data: session } = useSession();
  const [issues, setIssues] = useState<MaintenanceIssue[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editIssue, setEditIssue] = useState<MaintenanceIssue | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'Open' | 'Closed'>('all');

  useEffect(() => {
    if (!session) return;
    Promise.all([
      fetch('/api/maintenance').then(r => r.json()),
      fetch('/api/properties').then(r => r.json()),
    ]).then(([m, p]) => {
      setIssues(m.data || []);
      setProperties(p.data || []);
      setLoading(false);
    });
  }, [session]);

  // Group by property, then status, then date
  const grouped = useMemo(() => {
    const statusFiltered = filterStatus === 'all' ? issues : issues.filter(i => i.status === filterStatus);
    const map: Record<string, { property: Property; open: MaintenanceIssue[]; closed: MaintenanceIssue[] }> = {};

    statusFiltered.forEach(issue => {
      if (!map[issue.propertyId]) {
        const prop = properties.find(p => p.id === issue.propertyId);
        if (!prop) return;
        map[issue.propertyId] = { property: prop, open: [], closed: [] };
      }
      if (issue.status === 'Open') map[issue.propertyId].open.push(issue);
      else map[issue.propertyId].closed.push(issue);
    });

    // Sort each group by dateRaised descending
    Object.values(map).forEach(g => {
      g.open.sort((a, b) => b.dateRaised.localeCompare(a.dateRaised));
      g.closed.sort((a, b) => b.dateRaised.localeCompare(a.dateRaised));
    });

    return Object.values(map).sort((a, b) => a.property.address.localeCompare(b.property.address));
  }, [issues, properties, filterStatus]);

  async function handleSave() {
    setSaving(true);
    const propertyAddress = properties.find(p => p.id === form.propertyId)?.address || '';
    const body = {
      ...form,
      propertyAddress,
      costToResolve: form.costToResolve ? Number(form.costToResolve) : undefined,
      dateResolved: form.dateResolved || undefined,
    };

    if (editIssue) {
      const res = await fetch('/api/maintenance', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editIssue.id, ...body }) });
      const { data } = await res.json();
      setIssues(is => is.map(i => i.id === editIssue.id ? data : i));
    } else {
      const res = await fetch('/api/maintenance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const { data } = await res.json();
      setIssues(is => [...is, data]);
    }

    setShowModal(false);
    setEditIssue(null);
    setForm(emptyForm);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await fetch('/api/maintenance', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setIssues(is => is.filter(i => i.id !== id));
  }

  function openEdit(issue: MaintenanceIssue) {
    setEditIssue(issue);
    setForm({
      propertyId: issue.propertyId,
      issue: issue.issue,
      dateRaised: issue.dateRaised,
      dateResolved: issue.dateResolved || '',
      description: issue.description || '',
      resolution: issue.resolution || '',
      costToResolve: issue.costToResolve ? String(issue.costToResolve) : '',
    });
    setShowModal(true);
  }

  const totalOpenCost = issues.filter(i => i.status === 'Open' && i.costToResolve).reduce((s, i) => s + (i.costToResolve || 0), 0);
  const openCount = issues.filter(i => i.status === 'Open').length;

  if (loading) return <div className="bg-[#0f1117] min-h-screen"><PageHeader title="Maintenance" /><Spinner /></div>;

  return (
    <div className="bg-[#0f1117] min-h-screen">
      <PageHeader
        title="Maintenance"
        action={
          <button
            onClick={() => { setEditIssue(null); setForm(emptyForm); setShowModal(true); }}
            className="flex items-center gap-1.5 bg-[#6c63ff] text-white text-sm font-medium px-3 py-1.5 rounded-xl"
          >
            <Plus size={16} /> Add
          </button>
        }
      />

      <div className="px-4 py-3 space-y-4">
        {/* Summary */}
        {openCount > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-400">{openCount} open {openCount === 1 ? 'issue' : 'issues'}</p>
              {totalOpenCost > 0 && <p className="text-xs text-amber-400/70">Est. cost: {fmt(totalOpenCost)}</p>}
            </div>
          </div>
        )}

        {/* Status filter */}
        <div className="flex gap-2">
          {(['all', 'Open', 'Closed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`flex-1 text-xs font-medium py-2 rounded-xl transition-all ${
                filterStatus === s ? 'bg-[#6c63ff] text-white' : 'bg-[#16181f] text-[#8b8fa8] border border-[#1e2130]'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>

        {grouped.length === 0 ? (
          <EmptyState message="No maintenance issues recorded" />
        ) : (
          grouped.map(({ property, open, closed }) => (
            <div key={property.id} className="space-y-2">
              <SectionHeader title={property.address} />

              {open.length > 0 && (
                <div className="space-y-2">
                  {open.map(issue => <IssueCard key={issue.id} issue={issue} onEdit={openEdit} onDelete={handleDelete} />)}
                </div>
              )}
              {closed.length > 0 && filterStatus !== 'Open' && (
                <div className="space-y-2">
                  {closed.map(issue => <IssueCard key={issue.id} issue={issue} onEdit={openEdit} onDelete={handleDelete} />)}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <Modal title={editIssue ? 'Edit Issue' : 'New Maintenance Issue'} onClose={() => { setShowModal(false); setEditIssue(null); }}>
          <div className="space-y-4">
            <Select label="Property" value={form.propertyId} onChange={e => setForm(f => ({ ...f, propertyId: e.target.value }))}>
              <option value="">Select property…</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
            </Select>

            <Input label="Issue" value={form.issue} onChange={e => setForm(f => ({ ...f, issue: e.target.value }))} placeholder="e.g. Boiler not working" />
            <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

            <div className="grid grid-cols-2 gap-3">
              <Input label="Date Raised" type="date" value={form.dateRaised} onChange={e => setForm(f => ({ ...f, dateRaised: e.target.value }))} />
              <Input label="Date Resolved" type="date" value={form.dateResolved} onChange={e => setForm(f => ({ ...f, dateResolved: e.target.value }))} />
            </div>

            <Textarea label="Resolution" value={form.resolution} onChange={e => setForm(f => ({ ...f, resolution: e.target.value }))} />
            <Input label="Cost to Resolve (£)" type="number" value={form.costToResolve} onChange={e => setForm(f => ({ ...f, costToResolve: e.target.value }))} placeholder="0.00" />

            <Button onClick={handleSave} disabled={saving || !form.propertyId || !form.issue} className="w-full">
              {saving ? 'Saving…' : editIssue ? 'Update' : 'Add Issue'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function IssueCard({ issue, onEdit, onDelete }: {
  issue: MaintenanceIssue;
  onEdit: (i: MaintenanceIssue) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{issue.issue}</p>
            <Badge label={issue.status} />
          </div>
          {issue.description && <p className="text-xs text-[#555870] mt-1 line-clamp-2">{issue.description}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button onClick={() => onEdit(issue)} className="p-1.5 text-[#555870] hover:text-[#6c63ff] rounded-lg">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(issue.id)} className="p-1.5 text-[#555870] hover:text-red-400 rounded-lg">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-[#555870]">
        <span>Raised: {format(parseISO(issue.dateRaised), 'd MMM yyyy')}</span>
        {issue.dateResolved && <span>Resolved: {format(parseISO(issue.dateResolved), 'd MMM yyyy')}</span>}
        {issue.costToResolve && <span className="text-red-400">{fmt(issue.costToResolve)}</span>}
      </div>
    </Card>
  );
}

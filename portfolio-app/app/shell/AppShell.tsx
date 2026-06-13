'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { format, parseISO, differenceInDays } from 'date-fns';
import PropertyModal from './modals/PropertyModal';
import TransactionModal from './modals/TransactionModal';
import MaintenanceModal from './modals/MaintenanceModal';
import DocumentModal from './modals/DocumentModal';
import { TenantModal, AgentModal, RentHistoryModal, ContactModal, RenovationModal, ApplianceModal } from './modals/PropertyDetailModals';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Owner { id: string; name: string; email: string; percentage: number; }
interface Tenant { id: string; name: string; email: string; phone: string; leaseStart: string; leaseEnd?: string; deposit: number; rentPcm: number; }
interface Property { id: string; address: string; reference?: string; purchasePrice?: number; purchaseDate?: string; currentValue?: number; renovations?: any[]; appliances?: any[]; owners: Owner[]; tenant?: Tenant; lettingAgent?: any; rentHistory: any[]; keyContacts: any[]; archived?: boolean; archivedDate?: string; }
interface Transaction { id: string; propertyId: string; propertyAddress: string; type: 'income' | 'expense'; category: string; dateStart: string; dateEnd?: string; amount: number; description?: string; supplier?: string; }
interface MaintenanceIssue { id: string; propertyId: string; propertyAddress: string; issue: string; dateRaised: string; dateResolved?: string; status: 'Open' | 'Closed'; description?: string; resolution?: string; costToResolve?: number; }
interface Document { id: string; propertyId: string; propertyAddress: string; category: string; documentDate: string; description: string; driveViewLink: string; driveFileName: string; certificateType?: string; expiryDate?: string; issueDate?: string; epcRating?: string; applianceName?: string; applianceMake?: string; applianceModel?: string; applianceSerial?: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) { return '£' + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'd MMM yy'); } catch { return '—'; }
}
function daysUntil(d?: string) { if (!d) return null; try { return differenceInDays(parseISO(d), new Date()); } catch { return null; } }
function certStatus(expiry?: string) { const d = daysUntil(expiry); if (d === null) return 'grey'; if (d < 0) return 'red'; if (d < 60) return 'amber'; return 'green'; }
function certLabel(expiry?: string) { const d = daysUntil(expiry); if (d === null) return 'Missing'; if (d < 0) return 'Expired'; if (d < 60) return `${d}d`; return fmtDate(expiry); }
function certBadgeStyle(status: string): React.CSSProperties {
  const map: Record<string, [string, string]> = { green: ['var(--green-bg)', 'var(--green)'], amber: ['var(--amber-bg)', 'var(--amber)'], red: ['var(--red-bg)', 'var(--red)'], grey: ['var(--surface2)', 'var(--text3)'] };
  const [bg, color] = map[status] || map.grey;
  return { display: 'inline-block', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: bg, color };
}

function taxYearStart(now = new Date()) {
  const m = now.getMonth(); const d = now.getDate();
  const y = (m > 3 || (m === 3 && d >= 6)) ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(y, 3, 6);
}
function taxQStart(now = new Date()) {
  const s = taxYearStart(now);
  const quarters = [0, 3, 6, 9].map(m => { const d = new Date(s); d.setMonth(d.getMonth() + m); return d; });
  return [...quarters].reverse().find(q => q <= now) || quarters[0];
}
function taxQEnd(qStart: Date) { const e = new Date(qStart); e.setMonth(e.getMonth() + 3); e.setDate(e.getDate() - 1); e.setHours(23, 59, 59); return e; }
function getPeriod(period: string, customFrom?: string, customTo?: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  if (period === 'ytd')      { const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999); return { start: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0), end: endToday, label: `YTD ${now.getFullYear()}` }; }
  if (period === 'tytd')     { const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999); return { start: taxYearStart(now), end: endToday, label: 'Tax YTD' }; }
  if (period === 'curtaxq')  { const qs = taxQStart(now); const qe = new Date(qs); qe.setMonth(qe.getMonth()+3); qe.setDate(qe.getDate()-1); qe.setHours(23,59,59,999); return { start: qs, end: qe, label: 'Tax Quarter' }; }
  if (period === 'alltime')  { const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999); return { start: new Date(2000, 0, 1), end: endToday, label: 'All time' }; }
  if (period === 'custom' && customFrom && customTo) return { start: new Date(customFrom + 'T00:00:00'), end: new Date(customTo + 'T23:59:59'), label: `${fmtDate(customFrom)} – ${fmtDate(customTo)}` };
  return { start: new Date(now.getFullYear(), 0, 1), end: now, label: `YTD ${now.getFullYear()}` };
}
function apportionAmount(tx: Transaction, start: Date, end: Date): number {
  const txStart = new Date(tx.dateStart + 'T00:00:00');
  const txEnd = tx.dateEnd
    ? new Date(tx.dateEnd + 'T00:00:00')
    : new Date(tx.dateStart + 'T00:00:00');

  // Strip time from range bounds — work in pure calendar days throughout
  const rangeFrom = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const rangeTo   = new Date(end.getFullYear(),   end.getMonth(),   end.getDate());

  if (txEnd < rangeFrom || txStart > rangeTo) return 0;

  if (!tx.dateEnd || tx.dateStart === tx.dateEnd) {
    return (txStart >= rangeFrom && txStart <= rangeTo) ? tx.amount : 0;
  }

  const totalDays   = Math.round((txEnd.getTime() - txStart.getTime()) / 86400000) + 1;
  const os = txStart < rangeFrom ? rangeFrom : txStart;
  const oe = txEnd   > rangeTo   ? rangeTo   : txEnd;
  if (os > oe) return 0;

  const overlapDays = Math.round((oe.getTime() - os.getTime()) / 86400000) + 1;
  return (tx.amount * overlapDays) / totalDays;
}
function txInRange(tx: Transaction, start: Date, end: Date) {
  // Use T00:00:00 consistently — matches apportionAmount which also uses T00:00:00
  const txStart = new Date(tx.dateStart + 'T00:00:00');
  const txEnd = tx.dateEnd ? new Date(tx.dateEnd + 'T00:00:00') : new Date(tx.dateStart + 'T00:00:00');
  // Strip time from range bounds for pure calendar comparison
  const rangeFrom = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const rangeTo   = new Date(end.getFullYear(),   end.getMonth(),   end.getDate());
  return txStart <= rangeTo && txEnd >= rangeFrom;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 10 };
const sectionLabel: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '20px 0 8px' };
const infoRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 0', borderBottom: '1px solid var(--border)', gap: 12 };
const pillBtn = (active: boolean): React.CSSProperties => ({ fontSize: 13, fontWeight: 500, padding: '7px 14px', border: '1px solid var(--border)', borderRadius: 20, background: active ? 'var(--text)' : 'transparent', color: active ? 'var(--bg)' : 'var(--text2)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit' });
const btnSm: React.CSSProperties = { fontSize: 12, padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 20, background: 'var(--surface2)', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text2)' };
const iconBtn: React.CSSProperties = { width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface2)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'inherit' };
const btnFull: React.CSSProperties = { width: '100%', padding: 13, borderRadius: 'var(--radius-sm)', fontFamily: 'inherit', fontSize: 15, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'var(--text)', color: 'var(--bg)', marginTop: 4 };
const btnFullSec: React.CSSProperties = { ...btnFull, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' };

type ModalType =
  | { type: 'addProperty' }
  | { type: 'editProperty'; property: Property }
  | { type: 'addTransaction' }
  | { type: 'addMaintenance' }
  | { type: 'editMaintenance'; issue: MaintenanceIssue }
  | { type: 'uploadDocument' }
  | { type: 'editTenant'; property: Property }
  | { type: 'editAgent'; property: Property }
  | { type: 'addRentHistory'; property: Property }
  | { type: 'addContact'; property: Property }
  | { type: 'addRenovation'; property: Property }
  | { type: 'addAppliance'; property: Property }
  | { type: 'editAppliance'; property: Property; appliance: any }
  | null;

// ─── Main component ───────────────────────────────────────────────────────────
export default function AppShell() {
  const { data: session } = useSession();

  // Data
  const [properties, setProperties] = useState<Property[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceIssue[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);
  const [tokenError, setTokenError] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  function showToast(msg: string, type: 'error' | 'success' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // UI state
  const [screen, setScreen] = useState('dashboard');
  const [period, setPeriod] = useState('ytd');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [filterPropId, setFilterPropId] = useState('');
  const [filterOwnerId, setFilterOwnerId] = useState('');
  const [modal, setModal] = useState<ModalType>(null);
  const [detailPropId, setDetailPropId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState('tenant');
  const [finTab, setFinTab] = useState<'all' | 'income' | 'expense'>('all');
  const [maintFilter, setMaintFilter] = useState<'Open' | 'Closed' | 'All'>('Open');

  useEffect(() => {
    if (!session) return;

    // If token refresh failed, show persistent re-auth prompt
    if ((session as any).error === 'RefreshAccessTokenError') {
      setLoading(false);
      setTokenError(true);
      return;
    }

    // Use single init endpoint to avoid parallel race condition
    // that caused duplicate 'data' folders in Google Drive
    fetch('/api/init')
      .then(r => r.json())
      .then(res => {
        if (res.error) {
          showToast(`Drive error: ${res.error}`, 'error');
          setLoading(false);
          return;
        }
        const { properties, transactions, maintenance, documents } = res.data;
        setProperties(properties || []);
        setTransactions(transactions || []);
        setMaintenance(maintenance || []);
        setDocuments(documents || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        showToast('Failed to load data — check your connection', 'error');
      });
  }, [session]);

  const { start, end, label } = getPeriod(period, customFrom, customTo);
  const fps = filterPropId ? properties.filter(p => p.id === filterPropId) : properties;

  // Build unique owner list from all properties
  const allOwners = (() => {
    // Deduplicate by name (case-insensitive) — same person may have different IDs across properties
    const byName = new Map<string, { id: string; name: string }>();
    properties.forEach(p => p.owners.forEach(o => {
      if (!o.name) return;
      const key = o.name.trim().toLowerCase();
      if (!byName.has(key)) byName.set(key, { id: o.id, name: o.name.trim() });
    }));
    return Array.from(byName.values());
  })();

  // Total invested cost = purchase price + all renovations
  function totalInvested(p: Property): number {
    const purchase = p.purchasePrice || 0;
    const renos = (p.renovations || []).reduce((s: number, r: any) => s + (r.cost || 0), 0);
    return purchase + renos;
  }

  // Get ownership % for a property given the selected owner filter
  function getOwnershipPct(property: Property): number {
    if (!filterOwnerId) {
      return property.owners.reduce((s, o) => s + o.percentage, 0) || 100;
    }
    const ownerEntry = property.owners.find(o => o.id === filterOwnerId);
    return ownerEntry ? ownerEntry.percentage : 0;
  }
  // For archived properties, cap transactions at archivedDate
  function getPropertyEnd(prop: Property): Date {
    if (prop.archived && prop.archivedDate) {
      return new Date(prop.archivedDate + 'T00:00:00');
    }
    return end;
  }

  const filteredTxns = transactions.filter(tx => {
    if (filterPropId && tx.propertyId !== filterPropId) return false;
    const prop = properties.find(p => p.id === tx.propertyId);
    if (!prop) return false;
    const propEnd = getPropertyEnd(prop);
    const effectiveEnd = propEnd < end ? propEnd : end;
    return txInRange(tx, start, effectiveEnd);
  });
  const totalIncome = filteredTxns.filter(t => t.type === 'income').reduce((s, t) => s + apportionAmount(t, start, end), 0);
  const totalExpense = filteredTxns.filter(t => t.type === 'expense').reduce((s, t) => s + apportionAmount(t, start, end), 0);
  const totalNet = totalIncome - totalExpense;
  const detailProp = properties.find(p => p.id === detailPropId);

  // ─── API ──────────────────────────────────────────────────────────────────────
  async function saveProperty(data: any) {
    const isNew = !data.id;
    // Optimistic update — apply immediately, roll back on failure
    const optimisticId = data.id || `temp-${Date.now()}`;
    const optimisticData = { ...data, id: optimisticId };
    const prevProperties = properties;
    if (isNew) {
      setProperties(ps => [...ps, optimisticData]);
    } else {
      setProperties(ps => ps.map(p => p.id === data.id ? { ...p, ...data } : p));
    }
    try {
      const res = await fetch(isNew ? '/api/properties' : `/api/properties/${data.id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const saved = json.data;
      // Replace optimistic with confirmed data
      if (saved) setProperties(ps => isNew ? ps.map(p => p.id === optimisticId ? saved : p) : ps.map(p => p.id === saved.id ? saved : p));
      showToast(isNew ? 'Property added' : 'Saved');
      return saved || optimisticData;
    } catch (e: any) {
      // Roll back optimistic update
      setProperties(prevProperties);
      if (e.message && !e.message.includes('unmount')) showToast(`Save failed: ${e.message}`, 'error');
      throw e;
    }
  }

  async function savePropertyPatch(propId: string, patch: Partial<Property>) {
    const prop = properties.find(p => p.id === propId);
    if (!prop) return;
    // Ensure array fields always present to avoid API validation errors
    const safeBase = {
      ...prop,
      renovations: prop.renovations || [],
      appliances: prop.appliances || [],
      rentHistory: prop.rentHistory || [],
      keyContacts: prop.keyContacts || [],
      owners: prop.owners || [],
    };
    try {
      await saveProperty({ ...safeBase, ...patch });
    } catch {
      // error already shown via saveProperty's catch block
    }
  }

  async function archiveProperty(propId: string) {
    const today = new Date().toISOString().slice(0, 10);
    await savePropertyPatch(propId, { archived: true, archivedDate: today });
    showToast('Property archived');
  }

  async function unarchiveProperty(propId: string) {
    await savePropertyPatch(propId, { archived: false, archivedDate: undefined });
    showToast('Property restored');
  }

  async function deleteProperty(propId: string) {
    const prev = properties;
    setProperties(ps => ps.filter(p => p.id !== propId));
    try {
      const res = await fetch(`/api/properties/${propId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      showToast('Property deleted');
    } catch (e: any) {
      setProperties(prev);
      showToast(`Delete failed: ${e.message}`, 'error');
    }
  }

  async function saveTxn(data: any) {
    const isNew = !data.id;
    const tempId = data.id || `temp-${Date.now()}`;
    const optimistic = { ...data, id: tempId };
    const prev = transactions;
    if (isNew) setTransactions(ts => [...ts, optimistic]);
    else setTransactions(ts => ts.map(t => t.id === data.id ? { ...t, ...data } : t));
    try {
      const res = await fetch('/api/finance', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const saved = json.data;
      if (saved) setTransactions(ts => isNew ? ts.map(t => t.id === tempId ? saved : t) : ts.map(t => t.id === saved.id ? saved : t));
      showToast('Saved');
    } catch (e: any) {
      setTransactions(prev);
      showToast(`Save failed: ${e.message}`, 'error');
      throw e;
    }
  }

  async function deleteTxn(id: string) {
    await fetch('/api/finance', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setTransactions(ts => ts.filter(t => t.id !== id));
  }

  async function saveMaint(data: any) {
    const isNew = !data.id;
    const tempId = data.id || `temp-${Date.now()}`;
    const optimistic = { ...data, id: tempId, status: data.dateResolved ? 'Closed' : 'Open' };
    const prev = maintenance;
    if (isNew) setMaintenance(ms => [...ms, optimistic]);
    else setMaintenance(ms => ms.map(m => m.id === data.id ? { ...m, ...optimistic } : m));
    try {
      const res = await fetch('/api/maintenance', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isNew ? data : { id: data.id, ...data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const saved = json.data;
      if (saved) setMaintenance(ms => isNew ? ms.map(m => m.id === tempId ? saved : m) : ms.map(m => m.id === saved.id ? saved : m));
      showToast('Saved');
    } catch (e: any) {
      setMaintenance(prev);
      if (e.message && !e.message.includes('unmount')) showToast(`Save failed: ${e.message}`, 'error');
      throw e;
    }
  }

  async function deleteMaint(id: string) {
    await fetch('/api/maintenance', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setMaintenance(ms => ms.filter(m => m.id !== id));
  }

  async function uploadDoc(formData: FormData) {
    try {
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      if (json.error && !json.data) throw new Error(json.error);
      if (json.data) setDocuments(ds => [...ds, json.data]);
      showToast('Document uploaded');
    } catch (e: any) {
      showToast(`Upload failed: ${e.message}`, 'error');
      throw e;
    }
  }

  async function deleteDoc(id: string) {
    await fetch('/api/documents', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setDocuments(ds => ds.filter(d => d.id !== id));
  }

  // ─── Period bar ───────────────────────────────────────────────────────────────
  function PeriodBar() {
    const btns = [{ v: 'ytd', l: 'YTD' }, { v: 'tytd', l: 'Tax YTD' }, { v: 'curtaxq', l: 'Tax Q' }, { v: 'alltime', l: 'All' }, { v: 'custom', l: 'Custom' }];
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: period === 'custom' ? 8 : 0 }}>
          {btns.map(b => <button key={b.v} onClick={() => setPeriod(b.v)} style={pillBtn(period === b.v)}>{b.l}</button>)}
        </div>
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ flex: 1, padding: '6px 8px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', outline: 'none' }} />
            <span style={{ color: 'var(--text2)', fontSize: 13 }}>to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ flex: 1, padding: '6px 8px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', outline: 'none' }} />
          </div>
        )}
      </div>
    );
  }

  function Metric({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.02em', marginBottom: sub ? 3 : 0, color: color || 'var(--text)' }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text2)' }}>{sub}</div>}
      </div>
    );
  }

  function IR({ label, value }: { label: string; value?: string | null }) {
    return (
      <div style={infoRow}>
        <span style={{ fontSize: 13, color: 'var(--text2)', flexShrink: 0 }}>{label}</span>
        <span style={{ fontSize: 14, textAlign: 'right' }}>{value || '—'}</span>
      </div>
    );
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────────
  function Dashboard() {
    // Apply ownership % to rent PCM and yield — respects owner filter
    const totalRentPcm = fps.filter(p => p.tenant).reduce((s, p) => {
      const pct = getOwnershipPct(p) / 100;
      return s + (p.tenant?.rentPcm || 0) * pct;
    }, 0);

    // Totals for selected owner (owner filter adjusts % per property)
    const ownerIncome = fps.reduce((s, p) => {
      const pct = getOwnershipPct(p);
      const propEnd = getPropertyEnd(p);
      const effEnd = propEnd < end ? propEnd : end;
      const ptxns = transactions.filter(t => t.propertyId === p.id && txInRange(t, start, effEnd));
      return s + ptxns.filter(t => t.type === 'income').reduce((ss, t) => ss + apportionAmount(t, start, effEnd) * pct / 100, 0);
    }, 0);
    const ownerExpense = fps.reduce((s, p) => {
      const pct = getOwnershipPct(p);
      const propEnd = getPropertyEnd(p);
      const effEnd = propEnd < end ? propEnd : end;
      const ptxns = transactions.filter(t => t.propertyId === p.id && txInRange(t, start, effEnd));
      return s + ptxns.filter(t => t.type === 'expense').reduce((ss, t) => ss + apportionAmount(t, start, effEnd) * pct / 100, 0);
    }, 0);
    const ownerNet = ownerIncome - ownerExpense;

    // Use owner-adjusted totals when filtering by owner, raw totals otherwise
    const displayIncome  = filterOwnerId ? ownerIncome  : totalIncome;
    const displayExpense = filterOwnerId ? ownerExpense : totalExpense;
    const displayNet     = filterOwnerId ? ownerNet     : totalNet;

    // Net % = (income - agent fees) / income  — income less managing agent fees only
    const agentFees = fps.reduce((s, p) => {
      const propEnd = getPropertyEnd(p);
      const effEnd = propEnd < end ? propEnd : end;
      const ptxns = transactions.filter(t => t.propertyId === p.id && txInRange(t, start, effEnd));
      const pct = getOwnershipPct(p);
      return s + ptxns.filter(t => t.type === 'expense' && t.category === 'Managing Agent fees')
        .reduce((ss, t) => ss + apportionAmount(t, start, effEnd) * pct / 100, 0);
    }, 0);
    const netPct = displayIncome > 0 ? (((displayIncome - agentFees) / displayIncome) * 100).toFixed(1) : '—';
    const profitPct = displayIncome > 0 ? ((displayNet / displayIncome) * 100).toFixed(1) : '—';
    const yieldProps = fps.filter(p => (p.currentValue || totalInvested(p) > 0) && p.tenant && getOwnershipPct(p) > 0);
    const avgYield = yieldProps.length > 0
      ? (yieldProps.reduce((s, p) => {
          const basis = p.currentValue || totalInvested(p);
          return s + (basis > 0 ? ((p.tenant!.rentPcm * 12) / basis) * 100 : 0);
        }, 0) / yieldProps.length).toFixed(1)
      : '—';
    const expiredCerts = documents.filter(d => d.category === 'Certificates' && (daysUntil(d.expiryDate) ?? 1) < 0);
    const warnCerts = documents.filter(d => d.category === 'Certificates' && (daysUntil(d.expiryDate) ?? 999) >= 0 && (daysUntil(d.expiryDate) ?? 999) < 60);
    const openMaint = maintenance.filter(m => m.status === 'Open');

    return (
      <div style={{ padding: 16 }}>
        <PeriodBar />
        {expiredCerts.length > 0 && <div style={{ background: 'var(--red-bg)', border: '1px solid #E8A0A0', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 8, fontSize: 13, color: 'var(--red)' }}>⚠ {expiredCerts.length} certificate{expiredCerts.length > 1 ? 's' : ''} expired</div>}
        {warnCerts.length > 0 && <div style={{ background: 'var(--amber-bg)', border: '1px solid #E8C878', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 8, fontSize: 13, color: 'var(--amber)' }}>⏱ {warnCerts.length} expiring within 60 days</div>}
        {openMaint.length > 0 && <div style={{ background: 'var(--amber-bg)', border: '1px solid #E8C878', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 8, fontSize: 13, color: 'var(--amber)' }}>🔧 {openMaint.length} open maintenance issue{openMaint.length > 1 ? 's' : ''}</div>}

        {filterOwnerId && (
          <div style={{ background: 'var(--blue-bg)', border: '1px solid #B5D4F4', borderRadius: 'var(--radius-sm)', padding: '8px 12px', marginBottom: 8, fontSize: 13, color: 'var(--blue)' }}>
            Showing {allOwners.find(o => o.id === filterOwnerId)?.name}'s share
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
          <Metric label="Income" value={fmt(displayIncome)} color="var(--green)" sub={label} />
          <Metric label="Expenses" value={fmt(displayExpense)} color="var(--red)" />
          <Metric label="Net" value={fmt(displayNet)} color={displayNet >= 0 ? 'var(--green)' : 'var(--red)'} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          <Metric label="Rent PCM" value={fmt(totalRentPcm)} sub={`${fps.filter(p => p.tenant && getOwnershipPct(p) > 0).length} let`} />
          <Metric label="Net %" value={netPct === '—' ? '—' : `${netPct}%`} color={netPct !== '—' && parseFloat(netPct) >= 0 ? 'var(--green)' : 'var(--red)'} />
          <Metric label="Profit %" value={profitPct === '—' ? '—' : `${profitPct}%`} />
          <Metric label="Avg Yield" value={avgYield === '—' ? '—' : `${avgYield}%`} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 8px' }}>
          <div style={sectionLabel as React.CSSProperties}>Properties ({fps.filter(p => (!filterOwnerId || getOwnershipPct(p) > 0) && !p.archived).length})</div>
          {fps.some(p => p.archived) && (
            <button onClick={() => setShowArchived(sa => !sa)} style={{ fontSize: 12, color: 'var(--text2)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              {showArchived ? 'Hide archived' : `Show archived (${fps.filter(p => p.archived).length})`}
            </button>
          )}
        </div>
        {fps.filter(p => (!filterOwnerId || getOwnershipPct(p) > 0) && (showArchived || !p.archived)).length === 0
          ? <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text2)', fontSize: 14 }}>{filterOwnerId ? 'No properties for this owner' : 'Add a property to get started'}</div>
          : fps.filter(p => showArchived || !p.archived).map(p => {
            const pct = getOwnershipPct(p);
            // Skip properties where owner has no stake when filtering by owner
            if (filterOwnerId && pct === 0) return null;
            const propEnd = getPropertyEnd(p);
            const effectiveEnd = propEnd < end ? propEnd : end;
            const ptxns = transactions.filter(t => t.propertyId === p.id && txInRange(t, start, effectiveEnd));
            const pInc = ptxns.filter(t => t.type === 'income').reduce((s, t) => s + apportionAmount(t, start, effectiveEnd) * pct / 100, 0);
            const pExp = ptxns.filter(t => t.type === 'expense').reduce((s, t) => s + apportionAmount(t, start, effectiveEnd) * pct / 100, 0);
            const pNet = pInc - pExp;
            const propCertDocs = documents.filter(d => d.propertyId === p.id && d.category === 'Certificates');
            function CertCell({ type, label }: { type: string; label: string }) {
              const cert = propCertDocs.find(d => d.certificateType === type);
              const st = certStatus(cert?.expiryDate);
              // For EPC: show "Band X · expiry" or just "Band X" if no expiry
              // For others: show expiry date or status
              const displayText = type === 'EPC' && cert?.epcRating
                ? cert.expiryDate
                  ? `Band ${cert.epcRating} · ${fmtDate(cert.expiryDate)}`
                  : `Band ${cert.epcRating}`
                : certLabel(cert?.expiryDate);
              return (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{label}</div>
                  <span style={{ ...certBadgeStyle(st), fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', display: 'inline-block', maxWidth: '100%', textOverflow: 'ellipsis' }}>{displayText}</span>
                </div>
              );
            }
            return (
              <div key={p.id} style={{ ...card, cursor: 'pointer' }} onClick={() => { setDetailPropId(p.id); setDetailTab('tenant'); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>{p.address}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>
                    {fmt((p.tenant?.rentPcm || 0) * getOwnershipPct(p) / 100)}/mo
                    {filterOwnerId
                      ? <span style={{ color: 'var(--blue)', marginLeft: 4 }}>{getOwnershipPct(p)}% share</span>
                      : <span style={{ marginLeft: 4 }}>{p.owners.length > 1 ? p.owners.map(o => `${o.name} ${o.percentage}%`).join(', ') : `${p.owners[0]?.percentage || 100}%`}</span>
                    }
                  </div>
                  </div>
                  {p.archived
                    ? <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: 'var(--surface2)', color: 'var(--text2)' }}>Archived</span>
                    : <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: p.tenant ? 'var(--green-bg)' : 'var(--amber-bg)', color: p.tenant ? 'var(--green)' : 'var(--amber)' }}>{p.tenant ? 'Let' : 'Vacant'}</span>
                  }
                  <span style={{ fontSize: 18, color: 'var(--text3)' }}>›</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '10px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 10 }}>
                  {[{ l: 'Income', v: pInc, c: 'var(--green)' }, { l: 'Expenses', v: pExp, c: 'var(--red)' }, { l: 'Net', v: pNet, c: pNet >= 0 ? 'var(--green)' : 'var(--red)' }].map(({ l, v, c }) => (
                    <div key={l}>
                      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{l}</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: c }}>{fmt(v)}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                  <CertCell type="Gas Safety" label="Gas" />
                  <CertCell type="EPC" label="EPC" />
                  <CertCell type="EICR" label="EICR" />
                  <CertCell type="Insurance" label="Ins." />
                </div>
              </div>
            );
          })
        }
      </div>
    );
  }

  // ─── Properties ───────────────────────────────────────────────────────────────
  function Properties() {
    return (
      <div style={{ padding: 16 }}>
        <PeriodBar />
        {properties.filter(p => showArchived || !p.archived).map(p => {
          const propEnd = getPropertyEnd(p);
          const effectiveEnd = propEnd < end ? propEnd : end;
          const ptxns = transactions.filter(t => t.propertyId === p.id && txInRange(t, start, effectiveEnd));
          const pInc = ptxns.filter(t => t.type === 'income').reduce((s, t) => s + apportionAmount(t, start, effectiveEnd), 0);
          const pExp = ptxns.filter(t => t.type === 'expense').reduce((s, t) => s + apportionAmount(t, start, effectiveEnd), 0);
          const basis = p.currentValue || totalInvested(p); const yld = basis > 0 && p.tenant ? ((p.tenant.rentPcm * 12 / basis) * 100).toFixed(1) : '—';
          return (
            <div key={p.id} style={{ ...card, cursor: 'pointer', opacity: p.archived ? 0.7 : 1 }} onClick={() => { setDetailPropId(p.id); setDetailTab('tenant'); }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{p.address}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>{p.reference || ''}</div>
                </div>
                {p.archived
                  ? <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: 'var(--surface2)', color: 'var(--text2)' }}>Archived</span>
                  : <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: p.tenant ? 'var(--green-bg)' : 'var(--amber-bg)', color: p.tenant ? 'var(--green)' : 'var(--amber)' }}>{p.tenant ? 'Let' : 'Vacant'}</span>
                }
                <span style={{ fontSize: 18, color: 'var(--text3)' }}>›</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                {[{ l: 'Rent PCM', v: fmt(p.tenant?.rentPcm || 0), c: '' }, { l: 'Yield', v: yld === '—' ? '—' : `${yld}%`, c: '' }, { l: 'Income', v: fmt(pInc), c: 'var(--green)' }, { l: 'Net', v: fmt(pInc - pExp), c: pInc - pExp >= 0 ? 'var(--green)' : 'var(--red)' }].map(({ l, v, c }) => (
                  <div key={l}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{l}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: c || 'var(--text)' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {properties.some(p => p.archived) && (
          <button onClick={() => setShowArchived(sa => !sa)} style={{ ...btnFullSec, marginBottom: 8 }}>
            {showArchived ? 'Hide archived properties' : `Show archived (${properties.filter(p => p.archived).length})`}
          </button>
        )}
        <button onClick={() => setModal({ type: 'addProperty' })} style={btnFullSec}>+ Add property</button>
      </div>
    );
  }

  // ─── Property detail ──────────────────────────────────────────────────────────
  function Detail() {
    if (!detailProp) return null;
    const p = detailProp;
    const propDocs = documents.filter(d => d.propertyId === p.id);
    const propMaint = maintenance.filter(m => m.propertyId === p.id).sort((a, b) => b.dateRaised.localeCompare(a.dateRaised));
    const propTxns = transactions.filter(t => t.propertyId === p.id).sort((a, b) => b.dateStart.localeCompare(a.dateStart));
    const tabs = [
      { key: 'tenant', label: 'Tenant' },
      { key: 'certs', label: 'Certs & Appliances' },
      { key: 'maintenance', label: 'Maintenance' },
      { key: 'contacts', label: 'Contacts' },
      { key: 'finance log', label: 'Finance Log' },
      { key: 'documents', label: 'Documents' },
      { key: 'financials', label: 'Financials' },
    ];

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 'var(--header-h)', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, flexShrink: 0 }}>
          <button onClick={() => setDetailPropId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit', padding: 0 }}>← Back</button>
          <div style={{ flex: 1, fontWeight: 500, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.address}</div>
          <button onClick={() => setModal({ type: 'editProperty', property: p })} style={btnSm}>Edit</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none', padding: '12px 16px 0' }}>
            {tabs.map(t => <button key={t.key} onClick={() => setDetailTab(t.key)} style={pillBtn(detailTab === t.key)}>{t.label}</button>)}
          </div>
          <div style={{ padding: 16 }}>

            {detailTab === 'tenant' && (
              <>
                <div style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tenant</div>
                    <button onClick={() => setModal({ type: 'editTenant', property: p })} style={btnSm}>Edit</button>
                  </div>
                  <IR label="Name" value={p.tenant?.name} />
                  <IR label="Email" value={p.tenant?.email} />
                  <IR label="Phone" value={p.tenant?.phone} />
                  <IR label="Rent PCM" value={p.tenant ? fmt(p.tenant.rentPcm) : undefined} />
                  <IR label="Deposit" value={p.tenant ? fmt(p.tenant.deposit) : undefined} />
                  <IR label="Lease Start" value={fmtDate(p.tenant?.leaseStart)} />
                  <IR label="Lease End" value={fmtDate(p.tenant?.leaseEnd)} />
                </div>
                <div style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Letting Agent</div>
                    <button onClick={() => setModal({ type: 'editAgent', property: p })} style={btnSm}>Edit</button>
                  </div>
                  <IR label="Name" value={p.lettingAgent?.name} />
                  <IR label="Company" value={p.lettingAgent?.company} />
                  <IR label="Contact" value={p.lettingAgent?.contact} />
                  <IR label="Email" value={p.lettingAgent?.email} />
                  <IR label="Phone" value={p.lettingAgent?.phone} />
                </div>
                {p.rentHistory.length > 0 && (
                  <div style={card}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Rent History</div>
                    {[...p.rentHistory].sort((a: any, b: any) => (b.dateFrom || '').localeCompare(a.dateFrom || '')).map((r: any) => (
                      <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', alignItems: 'baseline', padding: '8px 0', borderBottom: '1px solid var(--border)', gap: 8, fontSize: 13 }}>
                        <span style={{ fontWeight: 500 }}>{fmt(r.amount)}</span>
                        <span style={{ color: 'var(--text2)' }}>{fmtDate(r.dateFrom)} → {r.dateTo ? fmtDate(r.dateTo) : 'Present'}</span>
                        {r.notes
                          ? <span style={{ color: 'var(--text3)', fontSize: 12, textAlign: 'left' }}>{r.notes}</span>
                          : <span />
                        }
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => setModal({ type: 'addRentHistory', property: p })} style={btnFullSec}>+ Add rent record</button>
              </>
            )}

            {detailTab === 'financials' && (
              <div>
                <div style={card}>
                  <IR label="Purchase Price" value={p.purchasePrice ? fmt(p.purchasePrice) : undefined} />
                  <IR label="Purchase Date" value={fmtDate(p.purchaseDate)} />
                  {(p.renovations || []).length > 0 && (
                    <IR label="Total Renovations" value={fmt((p.renovations || []).reduce((s: number, r: any) => s + r.cost, 0))} />
                  )}
                  <IR label="Total Invested" value={totalInvested(p) > 0 ? fmt(totalInvested(p)) : undefined} />
                  <IR label="Current Value" value={p.currentValue ? fmt(p.currentValue) : undefined} />
                  <IR label="Gross Yield" value={p.tenant && (p.currentValue || totalInvested(p) > 0) ? `${((p.tenant.rentPcm * 12 / (p.currentValue || totalInvested(p))) * 100).toFixed(1)}%` : undefined} />
                  {p.archived && p.archivedDate && <IR label="Archived" value={fmtDate(p.archivedDate)} />}
                  <div style={{ paddingTop: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Ownership</div>
                    {p.owners.map(o => (
                      <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                        <span>{o.name || 'Owner'}</span>
                        <span style={{ fontWeight: 500 }}>{o.percentage}%</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setModal({ type: 'editProperty', property: p })} style={{ ...btnFullSec, marginTop: 16 }}>Edit property details</button>
                </div>

                {/* Renovations */}
                <div style={{ ...card }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Renovations</div>
                    <button onClick={() => setModal({ type: 'addRenovation', property: p })} style={{ fontSize: 13, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add</button>
                  </div>
                  {(p.renovations || []).length === 0
                    ? <div style={{ fontSize: 13, color: 'var(--text3)' }}>No renovations recorded</div>
                    : [...(p.renovations || [])].sort((a: any, b: any) => b.date.localeCompare(a.date)).map((r: any) => (
                      <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto auto', alignItems: 'baseline', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                        <span style={{ fontWeight: 500, color: 'var(--red)' }}>{fmt(r.cost)}</span>
                        <span>{r.description}</span>
                        <span style={{ color: 'var(--text3)', fontSize: 12 }}>{fmtDate(r.date)}</span>
                        <button onClick={() => savePropertyPatch(p.id, { renovations: (p.renovations || []).filter((x: any) => x.id !== r.id) })}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14, padding: '0 2px' }}>✕</button>
                      </div>
                    ))
                  }
                </div>
                {/* Archive / Restore / Delete */}
                {!p.archived
                  ? <button onClick={() => { if (confirm(`Archive ${p.address}? Transactions after today will be excluded from calculations.`)) { archiveProperty(p.id); setDetailPropId(null); } }}
                      style={{ ...btnFullSec, color: 'var(--amber)', borderColor: '#E8C878', background: 'var(--amber-bg)', marginTop: 4 }}>
                      Archive property
                    </button>
                  : <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { unarchiveProperty(p.id); setDetailPropId(null); }}
                        style={{ ...btnFullSec, flex: 1, marginTop: 0 }}>Restore property</button>
                      <button onClick={() => { if (confirm(`Permanently delete ${p.address}? This cannot be undone.`)) { deleteProperty(p.id); setDetailPropId(null); } }}
                        style={{ ...btnFullSec, flex: 1, marginTop: 0, background: 'var(--red-bg)', color: 'var(--red)', borderColor: '#E8A0A0' }}>
                        Delete permanently
                      </button>
                    </div>
                }
              </div>
            )}

            {detailTab === 'certs' && (
              <>
                <div style={sectionLabel}>Certificates</div>
                {propDocs.filter(d => d.category === 'Certificates').map(d => (
                  <div key={d.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>
                        {d.certificateType}
                        {d.certificateType === 'EPC' && d.epcRating && (
                          <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, padding: '1px 7px', borderRadius: 20, background: 'var(--blue-bg)', color: 'var(--blue)' }}>Band {d.epcRating}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                        Issued {fmtDate(d.issueDate)} · Expires {fmtDate(d.expiryDate)}
                      </div>
                    </div>
                    <span style={certBadgeStyle(certStatus(d.expiryDate))}>{certLabel(d.expiryDate)}</span>
                    <a href={d.driveViewLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', fontSize: 18, textDecoration: 'none' }}>↗</a>
                  </div>
                ))}
                {propDocs.filter(d => d.category === 'Certificates').length === 0 && <div style={{ color: 'var(--text2)', fontSize: 14, padding: '12px 0' }}>No certificates — upload via Documents tab</div>}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 500, color: 'var(--text2)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '20px 0 8px' }}>
                  <span>Appliances</span>
                  <button onClick={() => setModal({ type: 'addAppliance', property: p })} style={{ fontSize: 13, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add</button>
                </div>
                {/* Property-level appliances (no document required) */}
                {(p.appliances || []).map((a: any) => (
                  <div key={a.id} style={{ ...card, marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{a.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{[a.make, a.model, a.serialNumber && `S/N: ${a.serialNumber}`].filter(Boolean).join(' · ')}</div>
                        {a.supplier && <div style={{ fontSize: 12, color: 'var(--text2)' }}>Supplier: {a.supplier}</div>}
                        {a.purchaseDate && <div style={{ fontSize: 12, color: 'var(--text2)' }}>Purchased: {fmtDate(a.purchaseDate)}</div>}
                        {a.notes && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{a.notes}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setModal({ type: 'editAppliance', property: p, appliance: a })} style={{ ...iconBtn, fontSize: 12 }}>✎</button>
                        <button onClick={() => { if (confirm('Delete this appliance?')) savePropertyPatch(p.id, { appliances: (p.appliances || []).filter((x: any) => x.id !== a.id) }); }} style={iconBtn}>✕</button>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Document-linked appliances */}
                {propDocs.filter(d => d.category === 'Appliances').map(d => (
                  <div key={d.id} style={{ ...card, marginBottom: 8, opacity: 0.8 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{d.applianceName} <span style={{ fontSize: 11, color: 'var(--text3)' }}>(from document)</span></div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{[d.applianceMake, d.applianceModel, d.applianceSerial && `S/N: ${d.applianceSerial}`].filter(Boolean).join(' · ')}</div>
                  </div>
                ))}
                {(p.appliances || []).length === 0 && propDocs.filter(d => d.category === 'Appliances').length === 0 && (
                  <div style={{ color: 'var(--text2)', fontSize: 14, padding: '12px 0' }}>No appliances recorded</div>
                )}
              </>
            )}

            {detailTab === 'maintenance' && (
              <>
                {propMaint.map(m => (
                  <div key={m.id} style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, flex: 1, paddingRight: 8 }}>{m.issue}</div>
                      <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: m.status === 'Open' ? 'var(--amber-bg)' : 'var(--green-bg)', color: m.status === 'Open' ? 'var(--amber)' : 'var(--green)', flexShrink: 0 }}>{m.status}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>{fmtDate(m.dateRaised)}{m.costToResolve ? ` · ${fmt(m.costToResolve)}` : ''}</div>
                    {m.resolution && <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>✓ {m.resolution}</div>}
                  </div>
                ))}
                {propMaint.length === 0 && <div style={{ color: 'var(--text2)', fontSize: 14, padding: '12px 0' }}>No maintenance issues</div>}
              </>
            )}

            {detailTab === 'contacts' && (
              <>
                {p.keyContacts.length === 0 ? <div style={{ color: 'var(--text2)', fontSize: 14, padding: '12px 0' }}>No key contacts</div>
                  : p.keyContacts.map((c: any) => (
                    <div key={c.id} style={{ ...card }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{c.category}{c.company ? ` · ${c.company}` : ''}</div>
                      {c.email && <div style={{ fontSize: 12, color: 'var(--blue)', marginTop: 2 }}>{c.email}</div>}
                      {c.phone && <div style={{ fontSize: 12, color: 'var(--blue)' }}>{c.phone}</div>}
                    </div>
                  ))
                }
                <button onClick={() => setModal({ type: 'addContact', property: p })} style={btnFullSec}>+ Add contact</button>
              </>
            )}

            {detailTab === 'finance log' && (
              <>
                {propTxns.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: t.type === 'income' ? 'var(--green-bg)' : 'var(--red-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{t.type === 'income' ? '↓' : '↑'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description || t.category}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>{fmtDate(t.dateStart)}{t.dateEnd ? ` → ${fmtDate(t.dateEnd)}` : ''}</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: t.type === 'income' ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>{t.type === 'expense' ? '-' : ''}{fmt(t.amount)}</div>
                    <button onClick={() => deleteTxn(t.id)} style={iconBtn}>✕</button>
                  </div>
                ))}
                {propTxns.length === 0 && <div style={{ color: 'var(--text2)', fontSize: 14, padding: '12px 0' }}>No transactions</div>}
              </>
            )}

            {detailTab === 'documents' && (
              <>
                {propDocs.map(d => (
                  <div key={d.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                    onClick={() => window.open(d.driveViewLink, '_blank', 'noopener,noreferrer')}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.description}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{d.category}{d.certificateType ? ` · ${d.certificateType}` : ''}{d.epcRating ? ` · Band ${d.epcRating}` : ''} · {fmtDate(d.documentDate)}</div>
                      {d.expiryDate && <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 2 }}>Expires {fmtDate(d.expiryDate)}</div>}
                    </div>
                    <button onClick={e => { e.stopPropagation(); if (confirm('Delete this document?')) deleteDoc(d.id); }} style={iconBtn}>✕</button>
                  </div>
                ))}
                {propDocs.length === 0 && <div style={{ color: 'var(--text2)', fontSize: 14, padding: '12px 0' }}>No documents</div>}
                <button onClick={() => { setDetailPropId(null); setScreen('documents'); setModal({ type: 'uploadDocument' }); }} style={btnFullSec}>+ Upload document</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Finance ──────────────────────────────────────────────────────────────────
  function Finance() {
    const shown = filteredTxns.filter(t => finTab === 'all' || t.type === finTab).sort((a, b) => b.dateStart.localeCompare(a.dateStart));
    return (
      <div style={{ padding: 16 }}>
        <PeriodBar />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          <Metric label="Income"   value={fmt(totalIncome)}  color="var(--green)" sub={`${filteredTxns.filter(t => t.type === 'income').length} entries`} />
          <Metric label="Expenses" value={fmt(totalExpense)} color="var(--red)" />
          <Metric label="Net"      value={fmt(totalNet)}     color={totalNet >= 0 ? 'var(--green)' : 'var(--red)'} sub={label} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={() => setModal({ type: 'addTransaction' })} style={{ ...btnFullSec, flex: 1, marginTop: 0 }}>+ Add transaction</button>
          <button onClick={() => { const p = new URLSearchParams({ filter: period }); if (customFrom) p.set('from', customFrom); if (customTo) p.set('to', customTo); window.open(`/api/finance/export?${p}`, '_blank'); }} style={{ ...btnFull, flex: 1, marginTop: 0 }}>Export transactions</button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['all', 'income', 'expense'] as const).map(t => <button key={t} onClick={() => setFinTab(t)} style={pillBtn(finTab === t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
        </div>
        <div style={card}>
          {shown.length === 0
            ? <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text2)', fontSize: 14 }}>No transactions for this period</div>
            : shown.map(t => {
              const prorated = apportionAmount(t, start, end);
              const isProrated = Math.abs(prorated - t.amount) > 0.5;
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: t.type === 'income' ? 'var(--green-bg)' : 'var(--red-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{t.type === 'income' ? '↓' : '↑'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description || t.category}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>{fmtDate(t.dateStart)}{t.dateEnd ? ` → ${fmtDate(t.dateEnd)}` : ''} · {t.propertyAddress.split(',')[0]}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: t.type === 'income' ? 'var(--green)' : 'var(--red)' }}>{t.type === 'expense' ? '-' : ''}{fmt(prorated)}</div>
                    {isProrated && <div style={{ fontSize: 11, color: 'var(--text3)' }}>apportioned · {fmt(t.amount)} total</div>}
                  </div>
                  <button onClick={() => deleteTxn(t.id)} style={iconBtn}>✕</button>
                </div>
              );
            })
          }
        </div>
      </div>
    );
  }

  // ─── Maintenance ──────────────────────────────────────────────────────────────
  function Maintenance() {
    const shown = maintenance
      .filter(m => (!filterPropId || m.propertyId === filterPropId) && (maintFilter === 'All' || m.status === maintFilter))
      .sort((a, b) => b.dateRaised.localeCompare(a.dateRaised));
    const openCount = maintenance.filter(m => m.status === 'Open').length;

    return (
      <div style={{ padding: 16 }}>
        {openCount > 0 && <div style={{ background: 'var(--amber-bg)', border: '1px solid #E8C878', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 10, fontSize: 13, color: 'var(--amber)' }}>🔧 {openCount} open issue{openCount > 1 ? 's' : ''}</div>}
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setModal({ type: 'addMaintenance' })} style={{ ...btnFull, marginTop: 0 }}>+ Log issue</button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['Open', 'Closed', 'All'] as const).map(s => <button key={s} onClick={() => setMaintFilter(s)} style={pillBtn(maintFilter === s)}>{s}</button>)}
        </div>
        {shown.map(m => (
          <div key={m.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 500, flex: 1, paddingRight: 8 }}>{m.issue}</div>
              <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: m.status === 'Open' ? 'var(--amber-bg)' : 'var(--green-bg)', color: m.status === 'Open' ? 'var(--amber)' : 'var(--green)', flexShrink: 0 }}>{m.status}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{m.propertyAddress.split(',')[0]} · {fmtDate(m.dateRaised)}{m.costToResolve ? ` · ${fmt(m.costToResolve)}` : ''}</div>
            {m.description && <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>{m.description}</div>}
            {m.resolution && <div style={{ fontSize: 12, color: 'var(--green)', marginBottom: 8 }}>✓ Resolved {fmtDate(m.dateResolved)}: {m.resolution}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => setModal({ type: 'editMaintenance', issue: m })} style={{ ...btnFullSec, flex: 1, marginTop: 0, padding: 9 }}>Edit</button>
              <button onClick={() => deleteMaint(m.id)} style={{ ...btnFullSec, flex: 1, marginTop: 0, padding: 9, background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid #E8A0A0' }}>Delete</button>
            </div>
          </div>
        ))}
        {shown.length === 0 && <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text2)', fontSize: 14 }}>No issues</div>}
      </div>
    );
  }

  // ─── Documents ────────────────────────────────────────────────────────────────
  function Documents() {
    const shownDocs = (filterPropId ? documents.filter(d => d.propertyId === filterPropId) : documents)
      .sort((a, b) => b.documentDate.localeCompare(a.documentDate));
    const grouped: Record<string, Document[]> = {};
    shownDocs.forEach(d => { if (!grouped[d.propertyId]) grouped[d.propertyId] = []; grouped[d.propertyId].push(d); });

    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => setModal({ type: 'uploadDocument' })} style={{ ...btnFull, marginTop: 0, marginBottom: 16 }}>+ Upload document</button>
        {Object.entries(grouped).map(([propId, docs]) => {
          const prop = properties.find(p => p.id === propId);
          return (
            <div key={propId}>
              <div style={sectionLabel}>{prop?.address || propId}</div>
              {docs.map(d => (
                <div key={d.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '12px 14px' }}
                  onClick={() => window.open(d.driveViewLink, '_blank', 'noopener,noreferrer')}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.description || d.driveFileName.replace(/_/g,' ').replace(/\.[^.]+$/,'')}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{d.category}{d.certificateType ? ` · ${d.certificateType}` : ''}{d.epcRating ? ` · Band ${d.epcRating}` : ''} · {fmtDate(d.documentDate)}</div>
                    {d.expiryDate && <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 2 }}>Expires {fmtDate(d.expiryDate)}</div>}
                  </div>
                  <button onClick={e => { e.stopPropagation(); if (confirm('Delete this document?')) deleteDoc(d.id); }} style={iconBtn}>✕</button>
                </div>
              ))}
            </div>
          );
        })}
        {shownDocs.length === 0 && <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text2)', fontSize: 14 }}>No documents yet</div>}
      </div>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────────────────
  // Token refresh failed — show re-login screen
  if (tokenError) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'var(--bg)', padding: 32, textAlign: 'center' }}>
      <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24, marginBottom: 12 }}>Session expired</div>
      <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 32, maxWidth: 280 }}>Your Google session has expired. Sign in again to continue — your data is safe.</p>
      <button
        onClick={() => { window.location.href = '/api/auth/signin?callbackUrl=/shell'; }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', cursor: 'pointer', fontSize: 15, fontWeight: 500, fontFamily: 'inherit' }}>
        <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Sign in again
      </button>
    </div>
  );

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24, marginBottom: 16 }}>Property Portfolio</div>
        <div style={{ width: 20, height: 20, border: '2px solid var(--border2)', borderTopColor: 'var(--text2)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  const nav = [
    { key: 'dashboard',   icon: '⌂', label: 'Overview' },
    { key: 'properties',  icon: '⊞', label: 'Properties' },
    { key: 'finance',     icon: '£', label: 'Finance' },
    { key: 'maintenance', icon: '🔧', label: 'Maintenance' },
    { key: 'documents',   icon: '📄', label: 'Documents' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ height: 'var(--header-h)', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, flexShrink: 0, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 18, flex: 1 }}>Portfolio</div>
        <select value={filterPropId} onChange={e => setFilterPropId(e.target.value)} style={{ fontSize: 12, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 20, background: 'var(--surface2)', fontFamily: 'inherit', outline: 'none', maxWidth: 120, color: 'var(--text)' }}>
          <option value="">All properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.address.split(',')[0]}</option>)}
        </select>
        {allOwners.length > 1 && (
          <select value={filterOwnerId} onChange={e => setFilterOwnerId(e.target.value)} style={{ fontSize: 12, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 20, background: filterOwnerId ? 'var(--blue-bg)' : 'var(--surface2)', fontFamily: 'inherit', outline: 'none', maxWidth: 110, color: filterOwnerId ? 'var(--blue)' : 'var(--text)' }}>
            <option value="">All owners</option>
            {allOwners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as any, paddingBottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom))' }}>
        {screen === 'dashboard'   && <Dashboard />}
        {screen === 'properties'  && <Properties />}
        {screen === 'finance'     && <Finance />}
        {screen === 'maintenance' && <Maintenance />}
        {screen === 'documents'   && <Documents />}
      </div>

      {/* Property detail overlay */}
      {detailPropId && <Detail />}

      {/* Modals */}
      {modal?.type === 'addProperty' && <PropertyModal onSave={saveProperty} onClose={() => setModal(null)} />}
      {modal?.type === 'editProperty' && <PropertyModal property={modal.property} onSave={saveProperty} onClose={() => setModal(null)} />}
      {modal?.type === 'addTransaction' && <TransactionModal properties={properties} defaultPropertyId={filterPropId} onSave={saveTxn} onClose={() => setModal(null)} />}
      {modal?.type === 'addMaintenance' && <MaintenanceModal properties={properties} defaultPropertyId={filterPropId} onSave={saveMaint} onClose={() => setModal(null)} />}
      {modal?.type === 'editMaintenance' && <MaintenanceModal properties={properties} issue={modal.issue} onSave={saveMaint} onClose={() => setModal(null)} />}
      {modal?.type === 'uploadDocument' && <DocumentModal properties={properties} defaultPropertyId={filterPropId} onUpload={uploadDoc} onClose={() => setModal(null)} />}
      {modal?.type === 'editTenant' && <TenantModal property={modal.property} onSave={patch => savePropertyPatch(modal.property.id, patch)} onClose={() => setModal(null)} />}
      {modal?.type === 'editAgent' && <AgentModal property={modal.property} onSave={patch => savePropertyPatch(modal.property.id, patch)} onClose={() => setModal(null)} />}
      {modal?.type === 'addRentHistory' && <RentHistoryModal property={modal.property} onSave={patch => savePropertyPatch(modal.property.id, patch)} onClose={() => setModal(null)} />}
      {modal?.type === 'addContact' && <ContactModal property={modal.property} onSave={patch => savePropertyPatch(modal.property.id, patch)} onClose={() => setModal(null)} />}
      {modal?.type === 'addRenovation' && <RenovationModal property={modal.property} onSave={patch => savePropertyPatch(modal.property.id, patch)} onClose={() => setModal(null)} />}
      {modal?.type === 'addAppliance' && <ApplianceModal property={modal.property} onSave={patch => savePropertyPatch(modal.property.id, patch)} onClose={() => setModal(null)} />}
      {modal?.type === 'editAppliance' && <ApplianceModal property={modal.property} appliance={modal.appliance} onSave={patch => savePropertyPatch(modal.property.id, patch)} onClose={() => setModal(null)} />}

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 'calc(var(--nav-h) + 12px)', left: '50%',
          transform: 'translateX(-50%)', zIndex: 500,
          background: toast.type === 'error' ? 'var(--red-bg)' : 'var(--surface)',
          color: toast.type === 'error' ? 'var(--red)' : 'var(--text2)',
          border: `1px solid ${toast.type === 'error' ? '#E8A0A0' : 'var(--border)'}`,
          borderRadius: 20, padding: '8px 16px', fontSize: 13, fontWeight: 500,
          boxShadow: '0 2px 12px rgba(0,0,0,0.1)', whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Bottom nav */}
      <nav style={{ height: 'var(--nav-h)', background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {nav.map(({ key, icon, label }) => (
          <button key={key} onClick={() => setScreen(key)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, border: 'none', background: 'none', cursor: 'pointer', color: screen === key ? 'var(--text)' : 'var(--text3)', padding: '8px 4px', fontFamily: 'inherit', transition: 'color 0.15s' }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
            <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.02em' }}>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

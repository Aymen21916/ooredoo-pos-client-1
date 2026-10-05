import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import {
  Landmark, Plus, RefreshCw, AlertCircle, CheckCircle2, X, Ban, FilterX,
  ChevronLeft, ChevronRight, ArrowDownToLine, ArrowUpFromLine, Wallet,
} from 'lucide-react';

const PAGE_SIZE = 10;
const EMPTY_FILTERS = { store_id: '', user_id: '', from: '', to: '', status1: 'all', status2: 'all' };
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

export const formatDZD = (n) =>
  new Intl.NumberFormat('fr-DZ', {
    style: 'currency', currency: 'DZD', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Number(n) || 0);

const formatDateTime = (s) =>
  s
    ? new Date(s).toLocaleString('en-GB', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '—';

const selectCls = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:ring-red-500';

// ─── Summary ─────────────────────────────────────────────────────────────────
export function SummaryCards({ summary }) {
  const remaining = Number(summary.remaining) || 0;
  return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 flex items-center gap-4">
            <div className="h-11 w-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center"><ArrowDownToLine size={22} /></div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Total money collected</div>
              <div className="text-2xl font-extrabold text-emerald-700" data-testid="collected">{formatDZD(summary.collected)}</div>
            </div>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 flex items-center gap-4">
            <div className="h-11 w-11 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center"><ArrowUpFromLine size={22} /></div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Total taken by admin</div>
                <div className="text-2xl font-extrabold text-amber-700" data-testid="taken">{formatDZD(summary.taken)}</div>
              </div>
            </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 flex items-center gap-4">
            <div className="h-11 w-11 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center"><Wallet size={22} /></div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Still in the register (not taken)</div>
                <div className={`text-2xl font-extrabold ${remaining < 0 ? 'text-red-600' : 'text-sky-700'}`} data-testid="remaining">{formatDZD(remaining)}</div>
              </div>
            </div>
          </div>
  );
}

// ─── Table ───────────────────────────────────────────────────────────────────
export function LedgerTable({ items, offset, loading, onVoid }) {
  const th = 'px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap';

  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className={`${th} text-left`}>#</th>
            <th className={`${th} text-left`}>Store</th>
            <th className={`${th} text-left`}>User</th>
            <th className={`${th} text-left`}>Description</th>
            <th className={`${th} text-right`}>Total amount</th>
            <th className={`${th} text-right`}>SIM</th>
            <th className={`${th} text-right`}>Storm</th>
            <th className={`${th} text-right`}>Products</th>
            <th className={`${th} text-left`}>Void status</th>
            <th className={`${th} text-left`}>In/Out</th>
            <th className={`${th} text-left`}>Created at</th>
            <th className={`${th} text-right`}>Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading ? (
            <tr><td colSpan="12" className="px-4 py-10 text-center"><RefreshCw className="inline animate-spin text-red-600" /></td></tr>
          ) : items.length === 0 ? (
            <tr><td colSpan="12" className="px-4 py-10 text-center text-gray-500">No entries match these filters.</td></tr>
          ) : (
            items.map((r, i) => {
              const isIn = r.direction === 'in';
              const manual = r.source === 'manual';
              const parts = Number(r.sim_amount) + Number(r.storm_amount) + Number(r.product_amount);
              const deducted = manual ? 0 : parts - Number(r.total_amount);
              const muted = r.is_voided ? 'text-gray-400' : '';
              const money = (v) => (manual ? '—' : formatDZD(v));

              return (
                <tr key={r.id} className={`${r.is_voided ? 'bg-gray-50' : 'hover:bg-gray-50'}`} data-testid="ledger-row">
                  <td className="px-3 py-3 text-gray-500">{offset + i + 1}</td>
                  <td className={`px-3 py-3 whitespace-nowrap font-medium ${r.is_voided ? 'text-gray-400' : 'text-gray-900'}`}>{r.store_name}</td>
                  <td className={`px-3 py-3 whitespace-nowrap ${r.is_voided ? 'text-gray-400' : 'text-gray-700'}`}>{r.user_name}</td>
                  <td className={`px-3 py-3 min-w-[220px] ${r.is_voided ? 'text-gray-400' : 'text-gray-700'}`}>
                    <div>{r.description}</div>
                    {manual && <div className="text-xs text-gray-400">Manual entry</div>}
                    {deducted > 0.005 && (
                      <div className="text-xs text-gray-400">
                        After deducting {formatDZD(deducted)} (debts {formatDZD(r.debts_amount)} · expenses {formatDZD(r.expenses_amount)})
                      </div>
                    )}
                    {r.is_voided && r.void_reason && (
                      <div className="text-xs text-red-400">Voided{r.voided_by_name ? ` by ${r.voided_by_name}` : ''}: {r.void_reason}</div>
                    )}
                  </td>
                  <td className={`px-3 py-3 text-right whitespace-nowrap font-bold ${r.is_voided ? 'text-gray-400 line-through' : (isIn ? (Number(r.total_amount) < 0 ? 'text-red-600' : 'text-emerald-700') : 'text-amber-700')}`}>
                    {isIn ? '' : '−'}{formatDZD(r.total_amount)}
                  </td>
                  <td className={`px-3 py-3 text-right whitespace-nowrap ${muted}`}>{money(r.sim_amount)}</td>
                  <td className={`px-3 py-3 text-right whitespace-nowrap ${muted}`}>{money(r.storm_amount)}</td>
                  <td className={`px-3 py-3 text-right whitespace-nowrap ${muted}`}>{money(r.product_amount)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {r.is_voided
                      ? <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-600">Void</span>
                      : <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">Active</span>}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {isIn
                      ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">In</span>
                      : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">Out</span>}
                  </td>
                  <td className={`px-3 py-3 whitespace-nowrap ${r.is_voided ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div>{formatDateTime(r.created_at)}</div>
                    <div className="text-xs text-gray-400">Day: {r.entry_date}</div>
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    {!r.is_voided && (
                      <button
                        onClick={() => onVoid(r)}
                        className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
                      >
                        <Ban size={14} /> Void
                      </button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Manual entry modal (add money / take money) ─────────────────────────────
export function ManualEntryModal({ stores, defaultStoreId, onClose, onSaved }) {
  const [direction, setDirection] = useState('in');
  const [storeId, setStoreId] = useState(defaultStoreId || (stores[0] ? String(stores[0].id) : ''));
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const store = stores.find((s) => String(s.id) === String(storeId));
  const available = store ? Number(store.balance) : 0;

  const submit = async (e) => {
    e.preventDefault();
    const raw = String(amount).trim();
    if (!storeId) { setError('Choose a store.'); return; }
    if (!AMOUNT_RE.test(raw) || Number(raw) <= 0) { setError('Enter an amount greater than 0 (up to 2 decimals).'); return; }
    if (direction === 'out' && Number(raw) > available) {
      setError(`Only ${formatDZD(available)} is available in this register.`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/register-ledger/manual', {
        store_id: Number(storeId),
        direction,
        amount: Number(raw),
        description: description.trim() || undefined,
      });
      onSaved(res.data?.message || 'Entry recorded.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save the entry.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900"><Landmark size={20} className="text-red-600" /> Manual register entry</h3>
          <button onClick={() => !saving && onClose()} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-6">
          {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button" onClick={() => setDirection('in')}
              className={`flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-3 text-sm font-bold transition-colors ${
                direction === 'in' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ArrowDownToLine size={16} /> Add money
            </button>
            <button
              type="button" onClick={() => setDirection('out')}
              className={`flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-3 text-sm font-bold transition-colors ${
                direction === 'out' ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ArrowUpFromLine size={16} /> Take money
            </button>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Store <span className="text-red-600">*</span></label>
            <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className={selectCls}>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {store && (
              <p className="mt-1 text-xs text-gray-500">In the register now: <b>{formatDZD(available)}</b></p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Amount (DZD) <span className="text-red-600">*</span></label>
            <input
              type="number" min="0" step="0.01" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-bold focus:border-red-500 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description <span className="text-xs text-gray-400">(optional)</span></label>
            <input
              type="text" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder={direction === 'in' ? 'e.g. Float added by the owner' : 'e.g. Collected by the owner'}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-red-500"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              <CheckCircle2 size={16} /> {saving ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Void modal ──────────────────────────────────────────────────────────────
export function VoidModal({ entry, onClose, onVoided }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) { setError('A reason is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post(`/register-ledger/${entry.id}/void`, { reason: reason.trim() });
      onVoided('Entry voided.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to void the entry.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900"><Ban size={20} className="text-red-600" /> Void entry</h3>
          <button onClick={() => !saving && onClose()} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-6">
          {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
            <div className="font-semibold text-gray-900">{entry.description}</div>
            <div className="mt-1 text-gray-600">
              {entry.store_name} · {entry.direction === 'in' ? 'In' : 'Out'}{' '}
              <b>{formatDZD(entry.total_amount)}</b>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            A voided entry stays in the history but no longer counts in the totals.
            {entry.direction === 'in' && ' If part of this money was already taken, void that withdrawal first.'}
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Reason <span className="text-red-600">*</span></label>
            <textarea
              rows={3} maxLength={500} autoFocus value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-red-500"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              <Ban size={16} /> {saving ? 'Voiding...' : 'Void entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function RegisterLedger() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ items: [], total: 0, summary: { collected: 0, taken: 0, remaining: 0 } });
  const [options, setOptions] = useState({ stores: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [voidTarget, setVoidTarget] = useState(null);

  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to);
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  const fetchOptions = useCallback(async () => {
    try {
      const r = await api.get('/register-ledger/filters');
      setOptions(r.data.data || { stores: [], users: [] });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load the filters.');
    }
  }, []);

  const fetchLedger = useCallback(async () => {
    if (invalidRange) return;
    setLoading(true);
    setError('');
    try {
      const params = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
      Object.entries(filters).forEach(([k, v]) => { if (v && v !== 'all') params[k] = v; });
      const r = await api.get('/register-ledger', { params });
      setData(r.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load the register ledger.');
    } finally {
      setLoading(false);
    }
  }, [filters, page, invalidRange]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);
  useEffect(() => { fetchOptions(); }, [fetchOptions]);

  const setFilter = (key, value) => { setFilters((f) => ({ ...f, [key]: value })); setPage(0); };
  const clearFilters = () => { setFilters(EMPTY_FILTERS); setPage(0); };

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };
  const afterChange = (msg) => {
    setShowManual(false);
    setVoidTarget(null);
    flash(msg);
    fetchLedger();
    fetchOptions();
  };

  const from = data.total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, data.total);
  const hasNext = (page + 1) * PAGE_SIZE < data.total;

  return (
    <div className="space-y-6 pb-12 text-start">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Landmark className="text-red-600" /> Register Ledger
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchLedger(); fetchOptions(); }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            onClick={() => setShowManual(true)}
            disabled={options.stores.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            <Plus size={16} /> Add / take money
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" /><span>{success}</span>
        </div>
      )}

      <SummaryCards summary={data.summary} />
      <p className="-mt-3 text-xs text-gray-500">
        These totals follow the Store, User and date filters (active entries only, whatever the status filters say).
        {hasFilters ? ' Clear the filters to see the real amount still in the registers.' : ''}
      </p>

      {/* Filters */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">Store</label>
            <select value={filters.store_id} onChange={(e) => setFilter('store_id', e.target.value)} className={selectCls}>
              <option value="">All stores</option>
              {options.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">User</label>
            <select value={filters.user_id} onChange={(e) => setFilter('user_id', e.target.value)} className={selectCls}>
              <option value="">All users</option>
              {options.users.map((u) => <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">From</label>
            <input type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} className={selectCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">To</label>
            <input type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} className={selectCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">Void Status</label>
            <select value={filters.status1} onChange={(e) => setFilter('status1', e.target.value)} className={selectCls}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="void">Void</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">In/Out</label>
            <select value={filters.status2} onChange={(e) => setFilter('status2', e.target.value)} className={selectCls}>
              <option value="all">All</option>
              <option value="in">In (collected)</option>
              <option value="out">Out (taken)</option>
            </select>
          </div>
        </div>

        {invalidRange && <p className="mt-3 text-sm font-medium text-amber-700">“From” must be on or before “To”.</p>}
        {hasFilters && (
          <button onClick={clearFilters} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-gray-600 hover:text-red-600">
            <FilterX size={16} /> Clear filters
          </button>
        )}
      </div>

      <LedgerTable items={data.items} offset={page * PAGE_SIZE} loading={loading} onVoid={setVoidTarget} />

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {data.total === 0 ? 'No entries' : `Showing ${from}–${to} of ${data.total}`}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)} disabled={!hasNext || loading}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {showManual && (
        <ManualEntryModal
          stores={options.stores}
          defaultStoreId={filters.store_id}
          onClose={() => setShowManual(false)}
          onSaved={afterChange}
        />
      )}
      {voidTarget && (
        <VoidModal entry={voidTarget} onClose={() => setVoidTarget(null)} onVoided={afterChange} />
      )}
    </div>
  );
}
import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { notifyCorrectionsChanged } from '../../hooks/useCorrectionAlerts';
import {
  UserCheck, Search, RefreshCw, AlertCircle, CheckCircle2, X, Pencil, ChevronLeft, ChevronRight,
  MessageSquareWarning, Phone, MapPin, Briefcase, User,
} from 'lucide-react';

const PAGE_SIZE = 50;

const FILTER_OPTIONS = [
  ['all', 'All customers'],
  ['valid', 'Valid'],
  ['invalid', 'Not valid'],
  ['unreviewed', 'Not reviewed yet'],
  ['pending', 'Has corrections to review'],
];

const formatDateTime = (s) =>
  s
    ? new Date(s).toLocaleString('en-GB', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '—';

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500';

// ─── Header counters (click one to filter) ───────────────────────────────────
export function CountChips({ counts, active, onPick }) {
  const chips = [
    { key: 'all', label: 'Customers', value: counts.total, cls: 'text-gray-900' },
    { key: 'valid', label: 'Valid', value: counts.valid, cls: 'text-emerald-700' },
    { key: 'invalid', label: 'Not valid', value: counts.invalid, cls: 'text-red-600' },
    { key: 'unreviewed', label: 'Not reviewed', value: counts.unreviewed, cls: 'text-gray-600' },
    { key: 'pending', label: 'Corrections to review', value: counts.customers_with_pending, cls: 'text-amber-600' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onPick(c.key)}
          className={`rounded-xl bg-white p-4 text-start shadow-sm ring-1 transition-colors hover:bg-gray-50 ${
            active === c.key ? 'ring-2 ring-red-500' : 'ring-gray-200'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{c.label}</div>
          <div className={`text-2xl font-extrabold ${c.cls}`} data-testid={`count-${c.key}`}>{Number(c.value) || 0}</div>
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'valid') return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Valid</span>;
  if (status === 'invalid') return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">Not valid</span>;
  return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500">Not reviewed</span>;
}

// ─── Table ───────────────────────────────────────────────────────────────────
export function ValidationTable({ items, offset, loading, busyId, onToggle, onReview }) {
  const th = 'px-3 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap';

  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className={`${th} text-start`}>#</th>
            <th className={`${th} text-start`}>Customer</th>
            <th className={`${th} text-start`}>Address / profession</th>
            <th className={`${th} text-start`}>Created by</th>
            <th className={`${th} text-start`}>Status</th>
            <th className={`${th} text-center text-emerald-700`}>Valid</th>
            <th className={`${th} text-center text-red-600`}>Not valid</th>
            <th className={`${th} text-start`}>Cashier corrections</th>
            <th className={`${th} text-end`}>Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading ? (
            <tr><td colSpan="9" className="px-4 py-10 text-center"><RefreshCw className="inline animate-spin text-red-600" /></td></tr>
          ) : items.length === 0 ? (
            <tr><td colSpan="9" className="px-4 py-10 text-center text-gray-500">No customers match these filters.</td></tr>
          ) : (
            items.map((c, i) => {
              const pending = c.pending_corrections || [];
              const isValid = c.validation_status === 'valid';
              const isInvalid = c.validation_status === 'invalid';
              const busy = busyId === c.id;
              return (
                <tr key={c.id} className={pending.length ? 'bg-amber-50/50' : 'hover:bg-gray-50'} data-testid="validation-row">
                  <td className="px-3 py-3 text-gray-400">{offset + i + 1}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="font-bold text-gray-900">{c.first_name} {c.last_name}</div>
                    <div className="font-mono text-xs text-gray-500">{c.phone_number}</div>
                  </td>
                  <td className="min-w-[200px] px-3 py-3 text-gray-700">
                    <div>{c.address || '—'}</div>
                    <div className="text-xs text-gray-400">{c.profession || '—'}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-gray-600">{c.created_by_name || '—'}</td>
                  <td className="min-w-[160px] px-3 py-3">
                    <StatusBadge status={c.validation_status} />
                    {isInvalid && c.review_note && <div className="mt-1 text-xs text-red-500">Note: {c.review_note}</div>}
                    {c.validation_status && c.reviewed_at && (
                      <div className="mt-1 text-xs text-gray-400">
                        {formatDateTime(c.reviewed_at)}{c.reviewed_by_name ? ` · ${c.reviewed_by_name}` : ''}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox" aria-label="Valid" checked={isValid} disabled={busy}
                      onChange={(e) => onToggle(c, 'valid', e.target.checked)}
                      className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox" aria-label="Not valid" checked={isInvalid} disabled={busy}
                      onChange={(e) => onToggle(c, 'invalid', e.target.checked)}
                      className="h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                  </td>
                  <td className="min-w-[240px] px-3 py-3">
                    {pending.length === 0 ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : (
                      <div className="space-y-1.5">
                        {pending.slice(0, 2).map((p) => (
                          <div key={p.id} className="rounded-md bg-white px-2 py-1.5 text-xs ring-1 ring-amber-200">
                            <div className="line-clamp-2 text-gray-800">{p.description}</div>
                            <div className="mt-0.5 text-[11px] text-gray-400">{p.submitted_by || 'Unknown'} · {formatDateTime(p.created_at)}</div>
                          </div>
                        ))}
                        {pending.length > 2 && <div className="text-xs font-bold text-amber-700">+{pending.length - 2} more</div>}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-end">
                    <button
                      onClick={() => onReview(c)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                    >
                      <Pencil size={14} /> Review & edit
                    </button>
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

// ─── "Not valid" → optional note for the cashier ─────────────────────────────
export function InvalidNoteModal({ customer, onClose, onSave }) {
  const [note, setNote] = useState(customer.review_note || '');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(note.trim());
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-red-50 p-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-red-800"><MessageSquareWarning size={20} /> Mark as not valid</h3>
          <button type="button" onClick={onClose} className="text-red-400 hover:text-red-600"><X size={20} /></button>
        </div>
        <div className="space-y-4 p-6">
          <div className="text-sm text-gray-700">
            <b>{customer.first_name} {customer.last_name}</b> <span className="font-mono text-gray-500">({customer.phone_number})</span>
            <p className="mt-1 text-gray-500">The cashier who created this customer will be notified and can send the correct information.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-600">
              What is wrong? <span className="font-normal normal-case text-gray-400">(optional — shown to the cashier)</span>
            </label>
            <textarea
              rows={3} maxLength={500} autoFocus value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Address is incomplete, phone number looks wrong"
              className={inputCls}
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Mark as not valid'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ─── Review modal: read the cashier's text, edit the customer, mark valid ────
const FIELDS = [
  ['phone_number', 'Phone', Phone],
  ['first_name', 'First name', User],
  ['last_name', 'Last name', User],
  ['address', 'Address', MapPin],
  ['profession', 'Profession', Briefcase],
];

export function ReviewModal({ customer, onClose, onSaved, onChanged }) {
  const [form, setForm] = useState({
    phone_number: customer.phone_number || '',
    first_name: customer.first_name || '',
    last_name: customer.last_name || '',
    address: customer.address || '',
    profession: customer.profession || '',
  });
  const [corrections, setCorrections] = useState(customer.pending_corrections || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const changed = FIELDS.some(([k]) => form[k].trim() !== String(customer[k] ?? '').trim());

  const dismiss = async (id) => {
    setError('');
    try {
      await api.post(`/customer-validation/corrections/${id}/resolve`, { action: 'dismissed' });
      setCorrections((list) => list.filter((x) => x.id !== id));
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not dismiss this correction.');
    }
  };

  const save = async (markValid) => {
    if (FIELDS.some(([k]) => !form[k].trim())) { setError('All fields are required.'); return; }
    setSaving(true);
    setError('');
    try {
      if (changed) {
        const body = {};
        FIELDS.forEach(([k]) => { body[k] = form[k].trim(); });
        await api.patch(`/customers/${customer.id}`, body);
      }
      if (markValid) await api.put(`/customer-validation/${customer.id}`, { status: 'valid' });
      onSaved(markValid ? 'Customer updated and marked valid.' : 'Customer updated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900"><UserCheck size={20} className="text-red-600" /> Review customer</h3>
          <button onClick={() => !saving && onClose()} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="space-y-5 overflow-y-auto p-6">
          {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {customer.validation_status === 'invalid' && customer.review_note && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"><b>Your note:</b> {customer.review_note}</div>
          )}

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-700">
              Corrections sent by cashiers ({corrections.length})
            </div>
            {corrections.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 p-3 text-sm text-gray-400">Nothing waiting for this customer.</div>
            ) : (
              <div className="space-y-2" data-testid="corrections-list">
                {corrections.map((p) => (
                  <div key={p.id} className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="min-w-0">
                      <div className="whitespace-pre-wrap break-words text-sm text-gray-900">{p.description}</div>
                      <div className="mt-1 text-xs text-gray-500">{p.submitted_by || 'Unknown'} · {formatDateTime(p.created_at)}</div>
                    </div>
                    <button
                      type="button" onClick={() => dismiss(p.id)}
                      className="shrink-0 rounded-md bg-white px-2.5 py-1 text-xs font-bold text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
                    >
                      Dismiss
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-600">Customer information</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {FIELDS.map(([key, label, Icon]) => (
                <div key={key} className={key === 'address' ? 'sm:col-span-2' : ''}>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-600">
                    <Icon size={13} /> {label}
                  </label>
                  <input
                    type="text" value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 bg-gray-50 p-4">
          <button onClick={onClose} disabled={saving} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700">Cancel</button>
          <button
            onClick={() => save(false)} disabled={saving || !changed}
            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-40"
          >
            Save changes
          </button>
          <button
            onClick={() => save(true)} disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <CheckCircle2 size={16} /> {saving ? 'Saving...' : 'Save & mark valid'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function CustomerValidation() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ items: [], total: 0, counts: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [noteTarget, setNoteTarget] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
      if (search.trim()) params.q = search.trim();
      if (filter !== 'all') params.validation = filter;
      const r = await api.get('/customer-validation', { params });
      setData(r.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, [search, filter, page]);

  useEffect(() => {
    const timer = setTimeout(fetchList, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchList, search]);

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };

  const putStatus = async (id, status, note) => {
    setBusyId(id);
    setError('');
    try {
      const r = await api.put(`/customer-validation/${id}`, { status, note: note || undefined });
      const closed = r.data?.data?.closed_corrections || 0;
      flash(closed > 0 ? `Marked valid — ${closed} cashier correction(s) closed.` : 'Validation updated.');
      await fetchList();
      notifyCorrectionsChanged();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the validation.');
    } finally {
      setBusyId(null);
    }
  };

  const onToggle = (c, which, checked) => {
    if (!checked) return putStatus(c.id, 'unreviewed');                 // unticking = back to "not reviewed"
    if (which === 'invalid') { setNoteTarget(c); return undefined; }    // ask for the optional note first
    const n = (c.pending_corrections || []).length;
    if (n > 0 && !window.confirm(`This customer has ${n} correction(s) from cashiers waiting for review.\nMarking it valid will close them. Continue?`)) {
      return undefined;
    }
    return putStatus(c.id, 'valid');
  };

  const afterReview = (msg) => {
    setReviewTarget(null);
    flash(msg);
    fetchList();
    notifyCorrectionsChanged();
  };

  const pickFilter = (key) => { setFilter(key); setPage(0); };

  const from = data.total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, data.total);
  const hasNext = (page + 1) * PAGE_SIZE < data.total;

  return (
    <div className="space-y-6 pb-12 text-start">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <UserCheck className="text-red-600" /> Customer Validation
        </h1>
        <button
          onClick={fetchList}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={16} /> Refresh
        </button>
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

      <CountChips counts={data.counts || {}} active={filter} onPick={pickFilter} />

      <div className="grid grid-cols-1 gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">Search</label>
          <div className="relative">
            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={search} placeholder="Name or phone…"
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full rounded-md border border-gray-300 py-2 pe-3 ps-9 text-sm outline-none focus:border-red-500"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">Validation</label>
          <select
            value={filter} onChange={(e) => pickFilter(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500"
          >
            {FILTER_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>

      <ValidationTable
        items={data.items} offset={page * PAGE_SIZE} loading={loading} busyId={busyId}
        onToggle={onToggle} onReview={setReviewTarget}
      />

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{data.total === 0 ? 'No customers' : `Showing ${from}–${to} of ${data.total}`}</span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft size={16} className="rtl:rotate-180" /> Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)} disabled={!hasNext || loading}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            Next <ChevronRight size={16} className="rtl:rotate-180" />
          </button>
        </div>
      </div>

      {noteTarget && (
        <InvalidNoteModal
          customer={noteTarget}
          onClose={() => setNoteTarget(null)}
          onSave={async (note) => { const id = noteTarget.id; setNoteTarget(null); await putStatus(id, 'invalid', note); }}
        />
      )}
      {reviewTarget && (
        <ReviewModal
          customer={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSaved={afterReview}
          onChanged={() => { fetchList(); notifyCorrectionsChanged(); }}
        />
      )}
    </div>
  );
}
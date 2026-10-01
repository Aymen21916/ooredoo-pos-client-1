import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useLanguage } from '../context/LanguageContext';
import { Search, RefreshCw, Bell, ChevronLeft, ChevronRight, UsersRound, Eye } from 'lucide-react';

const PAGE_SIZE = 25;

const formatDZD = (n) =>
  new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 2 }).format(n || 0);

// Hides the "LEGACY-UNKNOWN" placeholder customer (no real phone number).
const looksLikePhone = (p) => /\d{6,}/.test(p || '');

export default function CustomerBrowser({ onSelect }) {
  const { t } = useLanguage();
  const [q, setQ] = useState('');
  const [popOnly, setPopOnly] = useState(false);
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const params = { limit: PAGE_SIZE, offset, sort: 'name' };
        if (q.trim()) params.q = q.trim();
        if (popOnly) params.pop = 'true';
        const r = await api.get('/customers', { params });
        if (!cancelled) setRows(r.data.data || []);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load customers.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, q ? 400 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [q, popOnly, offset]);

  const visible = rows.filter((r) => looksLikePhone(r.phone_number));
  const hasNext = rows.length === PAGE_SIZE;
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const th = 'py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden text-start">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-gray-100 bg-gray-50/70">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <UsersRound size={20} className="text-red-600" /> All customers
          <span className="text-[10px] font-black uppercase tracking-wider bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Read only</span>
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <label className="flex items-center gap-2 text-sm font-bold text-amber-700 cursor-pointer select-none">
            <input type="checkbox" checked={popOnly}
              onChange={(e) => { setPopOnly(e.target.checked); setOffset(0); }}
              className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
            <Bell size={10} /> POP{c.pop_cycle ? ` · C${c.pop_cycle}` : ''} POP customers only
          </label>
          <div className="relative">
            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={q} placeholder="Name or phone…"
              onChange={(e) => { setQ(e.target.value); setOffset(0); }}
              className="w-full sm:w-64 rounded-lg border border-gray-200 ps-9 pe-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-red-500" />
          </div>
        </div>
      </div>

      {error && <div className="m-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm font-bold text-red-700">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-start">
          <thead>
            <tr className="border-b border-gray-100">
              <th className={`${th} text-start`}>{t('modal.name')}</th>
              <th className={`${th} text-start`}>{t('modal.phone')}</th>
              <th className={`${th} text-start`}>Tier</th>
              <th className={`${th} text-end`}>{t('crm.available_points')}</th>
              <th className={`${th} text-end`}>{t('crm.total_sims')}</th>
              <th className={`${th} text-end`}>{t('crm.total_spent')}</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="py-10 text-center"><RefreshCw size={22} className="inline animate-spin text-red-600" /></td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-sm italic font-medium text-gray-500">{t('crm.no_records')}</td></tr>
            ) : (
              visible.map((c) => (
                <tr key={c.id} onClick={() => onSelect?.(c.phone_number)}
                  className="cursor-pointer hover:bg-gray-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-gray-900">
                    {c.first_name} {c.last_name}
                    {c.is_pop && (
                      <span className="ms-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700">
                        <Bell size={10} /> POP{c.pop_cycle ? ` · C${c.pop_cycle}` : ''} POP
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-gray-600">{c.phone_number}</td>
                  <td className="py-3 px-4 text-xs font-bold text-gray-600">{c.tier || '—'}</td>
                  <td className="py-3 px-4 text-end font-black text-indigo-700">{Math.floor(c.available_points || 0)}</td>
                  <td className="py-3 px-4 text-end font-bold text-gray-900">{c.sim_count || 0}</td>
                  <td className="py-3 px-4 text-end font-black text-gray-900 whitespace-nowrap">{formatDZD(c.total_spent)}</td>
                  <td className="py-3 px-4 text-end text-gray-400"><Eye size={16} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50">
        <button onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} disabled={offset === 0 || loading}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
          <ChevronLeft size={16} className="rtl:rotate-180" /> Previous
        </button>
        <span className="text-xs font-bold text-gray-500">Page {page}</span>
        <button onClick={() => setOffset(offset + PAGE_SIZE)} disabled={!hasNext || loading}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
          Next <ChevronRight size={16} className="rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
}
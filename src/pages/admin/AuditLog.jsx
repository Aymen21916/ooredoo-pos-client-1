import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import {
  Search, RefreshCw, Filter, ChevronLeft, ChevronRight,
  AlertCircle, ChevronDown, ChevronRight as ChevronRightSm, Activity,
  Database, Calendar, User, FileCode2, Info
} from 'lucide-react';

const PAGE_SIZE = 50;

const ACTION_OPTIONS = [
  { value: '',                 label: 'All actions' },
  { value: 'INSERT',           label: 'Insert' },
  { value: 'UPDATE',           label: 'Update' },
  { value: 'DELETE',           label: 'Delete' },
  { value: 'VOID',             label: 'Void' },
  { value: 'LOGIN',            label: 'Login' },
  { value: 'LOGOUT',           label: 'Logout' },
  { value: 'SESSION_OPEN',     label: 'Session open' },
  { value: 'SESSION_CLOSE',    label: 'Session close' },
  { value: 'STOCK_ASSIGN',     label: 'Stock assign' },
  { value: 'REPORT_GENERATE',  label: 'Report generate' },
];

const ACTION_COLOR = {
  INSERT:          'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  UPDATE:          'bg-blue-50  text-blue-700 ring-blue-600/20',
  DELETE:          'bg-red-50   text-red-700 ring-red-600/20',
  VOID:            'bg-orange-50 text-orange-700 ring-orange-600/20',
  LOGIN:           'bg-gray-50  text-gray-700 ring-gray-600/20',
  LOGOUT:          'bg-gray-50  text-gray-700 ring-gray-600/20',
  SESSION_OPEN:    'bg-purple-50 text-purple-700 ring-purple-600/20',
  SESSION_CLOSE:   'bg-purple-50 text-purple-700 ring-purple-600/20',
  STOCK_ASSIGN:    'bg-amber-50 text-amber-700 ring-amber-600/20',
  REPORT_GENERATE: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
};

const formatDateTime = (s) =>
  s ? new Date(s).toLocaleString('en-GB', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) : '—';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function AuditLog() {
  const [filters, setFilters] = useState({
    user_id: '', action: '', table: '', record_id: '',
    from: '', to: '', search: '',
  });
  const [users, setUsers]       = useState([]);
  const [items, setItems]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [offset, setOffset]     = useState(0);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [expanded, setExpanded] = useState(new Set());

  // Populate the user filter dropdown once.
  useEffect(() => {
    api.get('/users')
      .then((r) => setUsers(r.data.data || []))
      .catch(() => setUsers([]));
  }, []);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: PAGE_SIZE, offset };
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== '' && v != null) params[k] = v;
      });
      const r = await api.get('/reports/audit', { params });
      setItems(r.data.data?.items || []);
      setTotal(r.data.data?.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit log.');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters, offset]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  const updateFilter = (patch) => {
    setOffset(0);
    setFilters((f) => ({ ...f, ...patch }));
  };

  const clearFilters = () => {
    setOffset(0);
    setFilters({ user_id: '', action: '', table: '', record_id: '', from: '', to: '', search: '' });
  };

  const toggleRow = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasNext = offset + items.length < total;
  const hasPrev = offset > 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="text-red-600" /> System Audit Log
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Immutable chronological record of system events, logins, and data modifications.
          </p>
        </div>
        <button
          onClick={fetchPage}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh Logs
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3 shadow-sm">
          <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Premium Filters Console ─────────────────────────────────────── */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Filter size={16} /> Search & Filter Parameters
            </div>
            {Object.values(filters).some(v => v !== '') && (
              <button
                onClick={clearFilters}
                className="text-xs font-bold text-red-600 hover:text-red-800 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Primary Search */}
            <div className="sm:col-span-2 lg:col-span-4 relative">
              <Search size={18} className="absolute left-4 top-3 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => updateFilter({ search: e.target.value })}
                placeholder="Search descriptions, usernames, or IP addresses..."
                className="block w-full rounded-xl border-0 py-2.5 pl-11 pr-4 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all shadow-sm"
              />
            </div>

            {/* User */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5"><User size={12}/> User Account</label>
              <select
                value={filters.user_id}
                onChange={(e) => updateFilter({ user_id: e.target.value })}
                className="block w-full rounded-xl border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 bg-white"
              >
                <option value="">All users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    @{u.username} — {u.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Action */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5"><Activity size={12}/> Event Type</label>
              <select
                value={filters.action}
                onChange={(e) => updateFilter({ action: e.target.value })}
                className="block w-full rounded-xl border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 bg-white"
              >
                {ACTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5"><Calendar size={12}/> From Date</label>
              <input
                type="date"
                value={filters.from}
                max={filters.to || todayStr()}
                onChange={(e) => updateFilter({ from: e.target.value })}
                className="block w-full rounded-xl border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5"><Calendar size={12}/> To Date</label>
              <input
                type="date"
                value={filters.to}
                min={filters.from || undefined}
                max={todayStr()}
                onChange={(e) => updateFilter({ to: e.target.value })}
                className="block w-full rounded-xl border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6"
              />
            </div>

            {/* Database Technicals */}
            <div className="sm:col-span-2 flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5"><Database size={12}/> DB Table</label>
                <input
                  type="text"
                  value={filters.table}
                  onChange={(e) => updateFilter({ table: e.target.value })}
                  placeholder="e.g. session_sim_sales"
                  className="block w-full rounded-xl border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5"><FileCode2 size={12}/> Record ID</label>
                <input
                  type="number"
                  value={filters.record_id}
                  onChange={(e) => updateFilter({ record_id: e.target.value })}
                  placeholder="42"
                  className="block w-full rounded-xl border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Results Grid ────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-600 flex items-center gap-2">
            <Info size={16} className="text-gray-400" />
            {loading ? 'Fetching logs...' : `Showing ${items.length === 0 ? 0 : offset + 1}–${Math.min(offset + items.length, total)} of ${total} entries`}
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th className="px-3 py-3 w-10"></th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Event Action</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Target Table</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Record ID</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr><td colSpan="8" className="px-4 py-16 text-center"><RefreshCw className="inline animate-spin text-red-600" size={28} /></td></tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="p-4 bg-gray-50 rounded-full mb-3 text-gray-400"><Search size={32}/></div>
                      <span className="text-sm font-bold text-gray-900">No logs found</span>
                      <span className="text-sm text-gray-500 mt-1">Try adjusting your filters or date range.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const isOpen = expanded.has(row.id);
                  const hasDiff = row.old_values || row.new_values;
                  return (
                    <div key={row.id} className="contents group">
                      <tr className={`transition-colors hover:bg-gray-50/80 ${isOpen ? 'bg-gray-50/50' : ''}`}>
                        <td className="px-3 py-3 align-middle text-center">
                          {hasDiff ? (
                            <button
                              onClick={() => toggleRow(row.id)}
                              className={`p-1.5 rounded-md transition-all ${isOpen ? 'bg-gray-200 text-gray-900' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`}
                              aria-label="Toggle diff"
                            >
                              <ChevronRightSm size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                            </button>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-600">{formatDateTime(row.created_at)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{row.username ? `@${row.username}` : 'System'}</span>
                            {row.role && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">{row.role}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wider ring-1 ring-inset ${ACTION_COLOR[row.action] || 'bg-gray-100 text-gray-700 ring-gray-500/20'}`}>
                            {row.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-500">{row.table_name || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-mono font-medium text-gray-600">{row.record_id ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-[250px] truncate" title={row.description || ''}>{row.description || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400 font-mono">{row.ip_address || '—'}</td>
                      </tr>
                      {/* Diff Drawer */}
                      {isOpen && hasDiff && (
                        <tr>
                          <td colSpan="8" className="p-0 border-b border-gray-100 bg-gray-50/50 shadow-inner">
                            <div className="px-14 py-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <DiffPanel label="Previous State" data={row.old_values} color="red" />
                              <DiffPanel label="New Values Applied" data={row.new_values} color="green" />
                            </div>
                          </td>
                        </tr>
                      )}
                    </div>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 border-t border-gray-100 bg-white gap-4">
          <div className="text-sm font-medium text-gray-500">
            Page <span className="font-bold text-gray-900">{Math.floor(offset / PAGE_SIZE) + 1}</span> of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              disabled={!hasPrev || loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              disabled={!hasNext || loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Premium Diff Viewer ────────────────────────────────────────────────────

function DiffPanel({ label, data, color }) {
  const isRed = color === 'red';
  const headerBg = isRed ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700';
  const dotColor = isRed ? 'bg-red-400' : 'bg-emerald-400';

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className={`px-4 py-2.5 border-b flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${headerBg}`}>
        <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
        {label}
      </div>
      <div className="p-4 bg-[#f8fafc] overflow-x-auto custom-scrollbar">
        {data ? (
          <pre className="text-[13px] leading-relaxed text-gray-800 font-mono whitespace-pre-wrap break-all">
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          <div className="text-sm font-medium text-gray-400 italic flex items-center justify-center h-full min-h-[40px]">
            No data payload recorded
          </div>
        )}
      </div>
    </div>
  );
}
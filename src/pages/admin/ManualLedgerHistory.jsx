import { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import DateRangePicker from '../../components/DateRangePicker';
import { History, RefreshCw, Coins, Gift, AlertCircle, FileEdit } from 'lucide-react';

const formatDZD = (n) =>
  new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 2 }).format(n || 0);

const formatDateTime = (s) =>
  s
    ? new Date(s).toLocaleString('en-GB', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '—';

export default function ManualLedgerHistory({ range, onRangeChange }) {
  const [data, setData] = useState({ items: [], totals: { recharges: 0, rewards: 0, count: 0 }, truncated: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [type, setType] = useState('ALL'); // ALL | RECHARGE | REWARD

  const invalidRange = !range.from || !range.to || range.from > range.to;

  useEffect(() => {
    if (invalidRange) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const r = await api.get('/finances/manual-ledger', { params: { from: range.from, to: range.to } });
        if (!cancelled) setData(r.data.data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load the manual ledger history.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [range.from, range.to, invalidRange]);

  const items = useMemo(
    () => (type === 'ALL' ? data.items : data.items.filter((i) => i.type === type)),
    [data, type]
  );

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mt-8">
      <div className="bg-gray-900 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-white font-bold flex items-center gap-2">
          <History size={20} className="text-blue-400" /> Manual Side-Ledger History
        </h3>
        <span className="text-xs font-mono text-gray-400">Recharges feed the Prélèvement base</span>
      </div>

      <div className="p-6 space-y-5">
        <DateRangePicker range={range} onRangeChange={onRangeChange} />

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Totals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="text-[10px] uppercase font-bold text-gray-500">Total recharges</div>
            <div className="text-xl font-black text-blue-700">
              {data.totals.recharges > 0 ? '+' : ''}{formatDZD(data.totals.recharges)}
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
            <div className="text-[10px] uppercase font-bold text-gray-500">Total rewards</div>
            <div className="text-xl font-black text-purple-700">
              {data.totals.rewards > 0 ? '+' : ''}{data.totals.rewards} pts
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-[10px] uppercase font-bold text-gray-500">Entries in period</div>
            <div className="text-xl font-black text-gray-900">{data.totals.count}</div>
          </div>
        </div>

        {/* Type filter */}
        <div className="flex gap-2">
          {[['ALL', 'All'], ['RECHARGE', 'Recharges'], ['REWARD', 'Rewards']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setType(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                type === key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr><td colSpan="5" className="px-4 py-8 text-center"><RefreshCw className="inline animate-spin text-red-600" /></td></tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500 italic">
                    <FileEdit size={16} className="inline mr-1" /> No manual entries in this period.
                  </td>
                </tr>
              ) : (
                items.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatDateTime(i.created_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {i.type === 'RECHARGE' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
                          <Coins size={12} /> Recharge
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800">
                          <Gift size={12} /> Reward
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-right font-mono font-bold ${
                      i.type === 'RECHARGE' ? (i.amount < 0 ? 'text-red-600' : 'text-blue-700') : 'text-purple-700'
                    }`}>
                      {i.type === 'RECHARGE'
                        ? `${i.amount > 0 ? '+' : ''}${formatDZD(i.amount)}`
                        : `${i.amount > 0 ? '+' : ''}${i.amount} pts`}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{i.note || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{i.added_by || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data.truncated && (
          <p className="text-xs text-amber-700">
            Showing the latest 1000 entries. The totals above include all {data.totals.count} entries.
          </p>
        )}
      </div>
    </div>
  );
}
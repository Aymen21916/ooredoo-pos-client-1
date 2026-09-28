import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import {
  User, RefreshCw, Calendar, AlertCircle, History, Coins, Smartphone,
  Zap, CreditCard, AlertTriangle, Building2, TrendingUp, Award, Wallet, Clock, Info
} from 'lucide-react';

const formatDZD = (n) =>
  new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 2 })
    .format(Number(n) || 0);

const formatNumber = (n) =>
  new Intl.NumberFormat('fr-DZ').format(Number(n) || 0);

const formatDateShort = (s) =>
  s ? new Date(s).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' }) : '—';

const formatDateTime = (s) =>
  s ? new Date(s).toLocaleString('en-GB', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }) : '—';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const monthsAgoStr = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatMonth = (yyyymm) => {
  const [y, m] = yyyymm.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
};

const VOID_TYPE_BADGE = {
  sim:       'bg-red-50 text-red-700 ring-red-600/20',
  storm:     'bg-orange-50 text-orange-700 ring-orange-600/20',
  accessory: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  debt:      'bg-amber-50 text-amber-700 ring-amber-600/20',
};

export default function CashierHistory() {
  const [cashiers, setCashiers] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [from, setFrom] = useState(monthsAgoStr(3));
  const [to,   setTo]   = useState(todayStr());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load active cashiers for the picker.
  useEffect(() => {
    api.get('/users')
      .then((r) => {
        const list = (r.data.data || []).filter((u) => u.role === 'cashier');
        setCashiers(list);
        if (list.length > 0 && !selectedId) setSelectedId(String(list[0].id));
      })
      .catch(() => setCashiers([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    setError('');
    try {
      const r = await api.get(`/reports/cashier/${selectedId}`, { params: { from, to } });
      setData(r.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load cashier history.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedId, from, to]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const totals = data?.totals;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <History className="text-red-600" /> Cashier Performance History
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Deep dive into individual cashier sessions, profit contributions, and voids.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3 shadow-sm">
          <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Modern Filter Bar ─────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-4 sm:p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 pointer-events-none"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1.5">
              <User size={14} /> Cashier
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="block w-full rounded-xl border-0 py-2.5 px-4 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all bg-white"
            >
              <option value="">— Select Cashier —</option>
              {cashiers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} {c.is_active === false ? '(Inactive)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1.5">
              <Calendar size={14} /> Date From
            </label>
            <input
              type="date"
              value={from}
              max={to || todayStr()}
              onChange={(e) => setFrom(e.target.value)}
              className="block w-full rounded-xl border-0 py-2.5 px-4 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1.5">
              <Calendar size={14} /> Date To
            </label>
            <input
              type="date"
              value={to}
              min={from || undefined}
              max={todayStr()}
              onChange={(e) => setTo(e.target.value)}
              className="block w-full rounded-xl border-0 py-2.5 px-4 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all"
            />
          </div>
        </div>
      </section>

      {/* ─── Results ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <RefreshCw className="animate-spin text-red-600" size={32} />
          <p className="text-sm text-gray-500 font-medium animate-pulse">Loading cashier records...</p>
        </div>
      ) : !data ? (
        <EmptyState 
          icon={User} 
          title="Select a Cashier" 
          message="Pick a cashier from the dropdown menu to load their complete transaction history and metrics." 
        />
      ) : (
        <div className="space-y-6">
          {/* Identity Card */}
          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
            <div className="flex items-center gap-5 z-10 w-full md:w-auto">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                <span className="text-xl font-black text-red-600">
                  {data.cashier.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-gray-900 tracking-tight">{data.cashier.full_name}</div>
                <div className="text-sm text-gray-500 font-medium flex items-center gap-2 mt-0.5">
                  @{data.cashier.username} <span className="text-gray-300">•</span> <Building2 size={14} className="text-gray-400"/> {data.cashier.store_name || 'No assigned store'}
                </div>
              </div>
            </div>
            
            <div className={`w-full md:w-auto rounded-xl p-4 flex items-center justify-between md:justify-end gap-6 z-10 ${data.outstanding_advance_balance > 0 ? 'bg-red-50 border border-red-100' : 'bg-gray-50 border border-gray-100'}`}>
              <div className="text-left md:text-right">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Lifetime Outstanding Advance</div>
                <div className={`text-2xl font-black tracking-tight ${data.outstanding_advance_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatDZD(data.outstanding_advance_balance)}
                </div>
              </div>
              <Wallet size={32} className={`opacity-20 ${data.outstanding_advance_balance > 0 ? 'text-red-900' : 'text-green-900'}`} />
            </div>
          </section>

          {/* Loyalty ROI */}
          <section className="rounded-2xl border border-indigo-100 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-sm">
            <div className="text-sm font-bold uppercase tracking-wider text-indigo-800 mb-4 flex items-center gap-1.5">
              <Award size={18} /> Loyalty Program ROI
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Kpi label="Discounts Given" value={`− ${formatDZD(totals.loyalty_discount_dzd)}`} color="red" />
              <Kpi label="Loyalty Revenue" value={formatDZD(totals.loyalty_driven_revenue)} color="green" />
              <Kpi label="Net Impact" value={formatDZD((totals.loyalty_driven_revenue || 0) - (totals.loyalty_discount_dzd || 0))} color="blue" />
            </div>
          </section>

          {/* Range totals */}
          <section className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-4">
            <Kpi icon={<Coins size={18} />} label="Total Revenue" value={formatDZD(totals.total_revenue)} sub={`SIM ${formatDZD(totals.sim_revenue)}`} />
            <Kpi 
              icon={<TrendingUp size={18} />} 
              label="Range Profit" 
              value={formatDZD(totals.gross_profit)} 
              color={totals.gross_profit >= 0 ? 'green' : 'red'} 
              sub="After COGS & Comm." 
            />
            <Kpi icon={<Zap size={18} />} label="Prélevement" value={formatDZD(totals.prelevement)} color="blue" />
            <Kpi icon={<Award size={18} />} label="Commissions Earned" value={formatDZD(totals.commissions)} color="green" />

            <Kpi icon={<Smartphone size={18} />} label="SIM Units" value={formatNumber(totals.sim_units)} />
            <Kpi icon={<Zap size={18} />} label="Storm Revenue" value={formatDZD(totals.storm_revenue)} />
            <Kpi icon={<CreditCard size={18} />} label="Accessories" value={formatDZD(totals.accessories_revenue)} sub={`Cost ${formatDZD(totals.accessories_cost)}`} />
            <Kpi icon={<AlertTriangle size={18} />} label="Voided Items" value={formatNumber(data.voided_count)} color={data.voided_count > 0 ? 'red' : 'gray'} />
          </section>

          {/* Monthly rollup */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Calendar size={20} className="text-gray-400" /> Monthly Rollup
            </h2>
            {data.monthly.length === 0 ? (
              <EmptyState message="No monthly activity found in this date range." icon={Calendar} />
            ) : (
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-x-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50/80 backdrop-blur-sm">
                    <tr>
                      <Th>Month</Th>
                      <Th align="right">Sessions</Th>
                      <Th align="right">SIM Units</Th>
                      <Th align="right">SIM Revenue</Th>
                      <Th align="right">Storm</Th>
                      <Th align="right">Accessories</Th>
                      <Th align="right">Debts</Th>
                      <Th align="right">Commissions</Th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {data.monthly.map((m) => (
                      <tr key={m.month} className="hover:bg-gray-50 transition-colors">
                        <Td className="font-bold text-gray-900">{formatMonth(m.month)}</Td>
                        <Td align="right" className="font-medium text-gray-600">{formatNumber(m.sessions_count)}</Td>
                        <Td align="right" className="font-medium text-gray-600">{formatNumber(m.sim_units)}</Td>
                        <Td align="right" className="font-medium text-gray-900">{formatDZD(m.sim_revenue)}</Td>
                        <Td align="right" className="font-medium text-gray-900">{formatDZD(m.storm_revenue)}</Td>
                        <Td align="right" className="font-medium text-gray-900">{formatDZD(m.accessories_revenue)}</Td>
                        <Td align="right" className="text-red-600 font-bold">{formatDZD(m.debts)}</Td>
                        <Td align="right" className="text-emerald-600 font-bold">{formatDZD(m.commissions)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Sessions */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Clock size={20} className="text-gray-400" /> Individual Sessions <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-sm ml-1">{data.sessions.length}</span>
            </h2>
            {data.sessions.length === 0 ? (
              <EmptyState message="No recorded sessions in this date range." icon={History} />
            ) : (
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-x-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50/80 backdrop-blur-sm">
                    <tr>
                      <Th>Date</Th>
                      <Th>Store</Th>
                      <Th>Status</Th>
                      <Th align="right">Opening Cash</Th>
                      <Th align="right">SIM Units</Th>
                      <Th align="right">Total Revenue</Th>
                      <Th align="right">Commissions</Th>
                      <Th align="right">Debts</Th>
                      <Th align="right">Expected Register</Th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {data.sessions.map((s) => {
                      const revenue = (Number(s.sim_total_selling_price) || 0)
                                    + (Number(s.storm_total) || 0)
                                    + (Number(s.accessories_total) || 0);
                      return (
                        <tr key={s.session_id} className="hover:bg-gray-50 transition-colors">
                          <Td className="whitespace-nowrap font-medium text-gray-700">{formatDateShort(s.session_date)}</Td>
                          <Td className="text-gray-600 flex items-center gap-1.5 mt-1"><Building2 size={12}/> {s.store_name}</Td>
                          <Td>
                            <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${s.status === 'open' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-gray-50 text-gray-600 ring-gray-500/20'}`}>
                              {s.status === 'open' ? 'Active' : 'Closed'}
                            </span>
                          </Td>
                          <Td align="right" className="font-medium text-gray-500">{formatDZD(s.opening_cash)}</Td>
                          <Td align="right" className="font-medium text-gray-700">{formatNumber(s.sim_units_sold)}</Td>
                          <Td align="right" className="font-bold text-gray-900">{formatDZD(revenue)}</Td>
                          <Td align="right" className="font-bold text-emerald-600">{formatDZD(s.total_cashier_benefit)}</Td>
                          <Td align="right" className="font-bold text-red-600">{formatDZD(s.debt_total)}</Td>
                          <Td align="right" className="font-black tracking-tight">{formatDZD(s.expected_register_cash)}</Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Voided transactions */}
          {data.voided_transactions.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <AlertTriangle size={20} className="text-red-500" /> Voided Transactions
              </h2>
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-x-auto custom-scrollbar border-l-4 border-l-red-500">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50/80 backdrop-blur-sm">
                    <tr>
                      <Th>Voided At</Th>
                      <Th>Category</Th>
                      <Th>Item Details</Th>
                      <Th align="right">Amount Voided</Th>
                      <Th>Reason Provided</Th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {data.voided_transactions.map((v) => (
                      <tr key={`${v.type}-${v.id}`} className="hover:bg-gray-50 transition-colors">
                        <Td className="whitespace-nowrap text-gray-500 font-medium text-xs">{formatDateTime(v.voided_at)}</Td>
                        <Td>
                          <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ring-1 ring-inset ${VOID_TYPE_BADGE[v.type] || 'bg-gray-50 text-gray-600 ring-gray-500/20'}`}>
                            {v.type}
                          </span>
                        </Td>
                        <Td className="font-medium text-gray-900 max-w-[200px] truncate" title={v.detail || v.note || v.product_name_snapshot}>{v.detail || v.note || v.product_name_snapshot || '—'}</Td>
                        <Td align="right" className="text-red-500 font-bold line-through opacity-80">{formatDZD(v.amount || v.price_snapshot)}</Td>
                        <Td className="text-gray-600 italic max-w-xs truncate" title={v.void_reason}>{v.void_reason || 'No reason provided'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Advance ledger summary info block */}
          <section className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900 flex items-start gap-3 shadow-sm">
            <Info size={20} className="mt-0.5 flex-shrink-0 text-blue-500" />
            <div>
              <div className="font-bold text-base">Advance Repayments</div>
              <div className="mt-0.5 opacity-90">
                To collect cash and record a repayment against this cashier's outstanding balance, please navigate to the dedicated <strong>Advances</strong> ledger page in the admin menu.
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────────────────────────

function Kpi({ icon, label, value, sub, color = 'gray' }) {
  const colors = { 
    gray: 'text-gray-900', 
    green: 'text-emerald-600', 
    red: 'text-red-600',
    blue: 'text-blue-600'
  };
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
        {icon && <span className="text-gray-400">{icon}</span>} {label}
      </div>
      <div className={`text-2xl lg:text-3xl font-black tracking-tight ${colors[color]}`}>{value}</div>
      {sub && <div className="text-[10px] font-medium text-gray-500 mt-2 bg-gray-50 inline-block px-2 py-1 rounded-md">{sub}</div>}
    </div>
  );
}

function Th({ children, align = 'left' }) {
  const alignCls = align === 'right' ? 'text-right' : 'text-left';
  return (
    <th className={`px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider ${alignCls}`}>
      {children}
    </th>
  );
}

function Td({ children, align = 'left', className = '' }) {
  const alignCls = align === 'right' ? 'text-right' : 'text-left';
  return (
    <td className={`px-5 py-4 ${alignCls} ${className}`}>
      {children}
    </td>
  );
}

function EmptyState({ message, icon: Icon, title }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50">
      <div className="bg-white p-4 rounded-full shadow-sm mb-4 text-gray-400">
        <Icon size={32} />
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm font-medium text-gray-500 max-w-sm">{message}</p>
    </div>
  );
}
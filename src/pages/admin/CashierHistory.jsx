import { useState, useEffect, useCallback, Fragment } from 'react';
import api from '../../api/axios';
import DateRangePicker from '../../components/Daterangepicker';
import {
  User, RefreshCw, Calendar, AlertCircle, History, Coins, Smartphone,
  Zap, CreditCard, AlertTriangle, Building2, TrendingUp, Award, Wallet, Clock, Info
} from 'lucide-react';
import { AlertCircle as RxAlertCircle, ChevronDown as RxChevronDown, ChevronLeft as RxChevronLeft, ChevronRight as RxChevronRight, Filter as RxFilter, RefreshCw as RxRefreshCw, Search as RxSearch, ShieldCheck as RxShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

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
    if (!selectedId || !from || !to || from > to) return;
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
        <div className="flex flex-wrap items-end gap-4 relative z-10">
          <div className="w-full sm:w-64">
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

          <DateRangePicker
            range={{ from, to }}
            onRangeChange={(r) => { setFrom(r.from); setTo(r.to); }}
          />
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
      {/*<RxAuditTrail />*/}
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

// ═════════════════════════════════════════════════════════════════════════════
// Backend-linked sections (added)
// ═════════════════════════════════════════════════════════════════════════════

const rxUseT = () => {
  const { t } = useLanguage();
  return (key, fallback) => {
    const v = t(key);
    return v && v !== key ? v : fallback ?? key;
  };
};

// ─── Formatters ──────────────────────────────────────────────────────────────

const rxFormatDateTime = (ts) =>
  ts ? new Date(ts).toLocaleString('en-GB', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

// ─── Layout blocks ───────────────────────────────────────────────────────────

const RxPageHeader = ({ icon: Icon, title, subtitle, right }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="h-11 w-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center ring-1 ring-red-100">
          <Icon size={22} />
        </div>
      )}
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
    </div>
    {right}
  </div>
);

const RxCard = ({ title, icon: Icon, right, children, className = '' }) => (
  <section className={`bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 ${className}`}>
    {(title || right) && (
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-gray-100">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
          {Icon && <Icon size={15} className="text-red-500" />} {title}
        </h2>
        {right}
      </div>
    )}
    <div className="p-5">{children}</div>
  </section>
);

const RxErrorBanner = ({ message }) =>
  message ? (
    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2 shadow-sm">
      <RxAlertCircle size={18} className="mt-0.5 flex-shrink-0 text-red-600" />
      <span className="font-medium">{message}</span>
    </div>
  ) : null;

const RxSpinner = () => (
  <div className="flex items-center justify-center py-20"><RxRefreshCw className="animate-spin text-red-600" size={32} /></div>
);

const RxEmpty = ({ children }) => <div className="py-10 text-center text-sm text-gray-400">{children}</div>;

// ─── Form controls ───────────────────────────────────────────────────────────

const rxInputCls =
  'block w-full rounded-xl border-0 py-2.5 px-4 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all bg-white';

const RxField = ({ label, children }) => (
  <label className="block">
    <span className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">{label}</span>
    {children}
  </label>
);

const RxTextInput = (props) => <input {...props} className={`${rxInputCls} ${props.className || ''}`} />;

const RxSelect = ({ children, ...props }) => <select {...props} className={`${rxInputCls} ${props.className || ''}`}>{children}</select>;

const RxPrimaryButton = ({ loading, icon: Icon, children, className = '', ...props }) => (
  <button
    {...props}
    disabled={props.disabled || loading}
    className={`inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${className}`}
  >
    {loading ? <RxRefreshCw size={16} className="animate-spin" /> : Icon ? <Icon size={16} /> : null}
    {children}
  </button>
);

const RxSecondaryButton = ({ loading, icon: Icon, children, className = '', ...props }) => (
  <button
    {...props}
    disabled={props.disabled || loading}
    className={`inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${className}`}
  >
    {loading ? <RxRefreshCw size={16} className="animate-spin" /> : Icon ? <Icon size={16} /> : null}
    {children}
  </button>
);

/** From / To date pickers + submit button. */

const RxTable = ({ children }) => (
  <div className="overflow-x-auto rounded-xl ring-1 ring-gray-200">
    <table className="min-w-full divide-y divide-gray-200 text-sm">{children}</table>
  </div>
);

const RxTh = ({ children, align = 'start' }) => (
  <th className={`px-4 py-2.5 text-${align} text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-50 whitespace-nowrap`}>{children}</th>
);

const RxTd = ({ children, align = 'start', className = '' }) => (
  <td className={`px-4 py-2.5 text-${align} text-gray-700 whitespace-nowrap ${className}`}>{children}</td>
);

/** Horizontal bar for quick in-table visuals. */

const rxErrMsg = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

const rxUnwrap = (r) => r.data?.data;

const rxReportsApi = {
  // ── Cashier-or-admin ──────────────────────────────────────────────────────
  /** GET /api/reports/range?from&to */
  range: (from, to) => api.get('/reports/range', { params: { from, to } }).then(rxUnwrap),

  // ── Admin only ────────────────────────────────────────────────────────────
  /** GET /api/reports/preview?date */
  preview: (date) => api.get('/reports/preview', { params: { date } }).then(rxUnwrap),

  /** POST /api/reports/generate { date, force_close_open_sessions? } */
  generate: (date, forceCloseOpenSessions = false) =>
    api
      .post('/reports/generate', {
        date,
        ...(forceCloseOpenSessions ? { force_close_open_sessions: true } : {}),
      })
      .then(rxUnwrap),

  /** GET /api/reports?limit */
  list: (params = { limit: 100 }) => api.get('/reports', { params }).then(rxUnwrap),

  /** GET /api/reports/:id */
  byId: (id) => api.get(`/reports/${id}`).then(rxUnwrap),

  /** GET /api/reports/:id/export.csv  -> Blob */
  exportCsv: (id) => api.get(`/reports/${id}/export.csv`, { responseType: 'blob' }).then((r) => r.data),

  /** GET /api/reports/monthly?from&to&store_id */
  monthly: (params) => api.get('/reports/monthly', { params }).then(rxUnwrap),

  /** GET /api/reports/top?from&to&limit */
  top: (params) => api.get('/reports/top', { params }).then(rxUnwrap),

  /** GET /api/reports/cashier/:id?from&to */
  cashierHistory: (id, params) => api.get(`/reports/cashier/${id}`, { params }).then(rxUnwrap),

  /** GET /api/reports/stats?from&to&store_id */
  statistics: (params) => api.get('/reports/stats', { params }).then(rxUnwrap),

  /** GET /api/reports/cashiers/ranking?by&metric&order&from&to&store_id&limit */
  cashierRanking: (params) => api.get('/reports/cashiers/ranking', { params }).then(rxUnwrap),

  /** GET /api/reports/audit?user_id&action&table&record_id&from&to&search&limit&offset */
  audit: (params) => api.get('/reports/audit', { params }).then(rxUnwrap),
};

/** Triggers a browser download for a Blob. */

const rxCleanParams = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined));

const RX_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'VOID'];

const RX_PAGE_SIZE = 50;

const RX_ACTION_STYLE = {
  CREATE: 'bg-green-50 text-green-700 ring-green-600/20',
  UPDATE: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  DELETE: 'bg-red-50 text-red-700 ring-red-600/20',
  VOID: 'bg-amber-50 text-amber-700 ring-amber-600/20',
};

const RxJsonBlock = ({ label, value }) =>
  value ? (
    <div className="min-w-0 flex-1">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</div>
      <pre className="max-h-64 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700 ring-1 ring-gray-200">{JSON.stringify(value, null, 2)}</pre>
    </div>
  ) : null;

/**
 * GET /api/reports/audit?user_id&action&table&record_id&from&to&search&limit&offset
 * Server-side pagination: { items, total, limit, offset }.
 */

function RxAuditTrail() {
  const t = rxUseT();
  const [filters, setFilters] = useState({ user_id: '', action: '', table: '', record_id: '', from: '', to: '', search: '' });
  const [applied, setApplied] = useState(filters);
  const [offset, setOffset] = useState(0);
  const [users, setUsers] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    api.get('/users').then((r) => {
      const d = r.data?.data;
      setUsers(Array.isArray(d) ? d : d?.items || d?.users || []);
    }).catch(() => setUsers([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      setData(await rxReportsApi.audit(rxCleanParams({ ...applied, limit: RX_PAGE_SIZE, offset })));
    } catch (err) {
      setError(rxErrMsg(err, t('common.action_failed', 'Action failed.')));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [applied, offset, t]);

  useEffect(() => { load(); }, [load]);

  const apply = () => { setOffset(0); setApplied(filters); };
  const reset = () => {
    const empty = { user_id: '', action: '', table: '', record_id: '', from: '', to: '', search: '' };
    setFilters(empty); setApplied(empty); setOffset(0);
  };

  const total = data?.total ?? 0;
  const page = Math.floor(offset / RX_PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(total / RX_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <RxPageHeader icon={RxShieldCheck} title={t('audit.title', 'Audit log')} subtitle={t('audit.subtitle', 'Every create / update / delete made in the system')} />

      <RxCard>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <RxField label={t('audit.search', 'Search')}>
            <RxTextInput placeholder={t('audit.search_ph', 'Description or username')} value={filters.search} onChange={set('search')}
              onKeyDown={(e) => e.key === 'Enter' && apply()} />
          </RxField>
          <RxField label={t('audit.user', 'User')}>
            <RxSelect value={filters.user_id} onChange={set('user_id')}>
              <option value="">{t('audit.all', 'All')}</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.username}</option>)}
            </RxSelect>
          </RxField>
          <RxField label={t('audit.action', 'Action')}>
            <RxSelect value={filters.action} onChange={set('action')}>
              <option value="">{t('audit.all', 'All')}</option>
              {RX_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </RxSelect>
          </RxField>
          <RxField label={t('audit.table', 'Table')}>
            <RxTextInput placeholder="register_expenses" value={filters.table} onChange={set('table')} />
          </RxField>
          <RxField label={t('audit.record_id', 'Record ID')}>
            <RxTextInput type="number" min="1" value={filters.record_id} onChange={set('record_id')} />
          </RxField>
          <div className="col-span-2">
            <DateRangePicker
              allowEmpty
              range={{ from: filters.from, to: filters.to }}
              onRangeChange={(r) => setFilters((f) => ({ ...f, ...r }))}
              labels={{ from: t('range.date_from', 'From'), to: t('range.date_to', 'To') }}
            />
          </div>
          <div className="flex items-end gap-2">
            <RxPrimaryButton onClick={apply} icon={RxFilter} loading={loading} className="flex-1">{t('audit.apply', 'Apply')}</RxPrimaryButton>
            <RxSecondaryButton onClick={reset}>{t('audit.reset', 'Reset')}</RxSecondaryButton>
          </div>
        </div>
      </RxCard>

      <RxErrorBanner message={error} />
      {loading && !data && <RxSpinner />}

      {data && (
        <RxCard title={`${total} ${t('audit.entries', 'entries')}`} icon={RxSearch}
          right={
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <RxSecondaryButton className="!px-2.5 !py-1.5" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - RX_PAGE_SIZE))}><RxChevronLeft size={14} /></RxSecondaryButton>
              <span>{page} / {pages}</span>
              <RxSecondaryButton className="!px-2.5 !py-1.5" disabled={offset + RX_PAGE_SIZE >= total || loading} onClick={() => setOffset(offset + RX_PAGE_SIZE)}><RxChevronRight size={14} /></RxSecondaryButton>
            </div>
          }>
          {data.items.length === 0 ? <RxEmpty>{t('common.no_data', 'No data.')}</RxEmpty> : (
            <RxTable>
              <thead><tr><RxTh>&nbsp;</RxTh><RxTh>{t('audit.when', 'When')}</RxTh><RxTh>{t('audit.user', 'User')}</RxTh><RxTh>{t('audit.action', 'Action')}</RxTh><RxTh>{t('audit.table', 'Table')}</RxTh><RxTh>#</RxTh><RxTh>{t('audit.description', 'Description')}</RxTh><RxTh>IP</RxTh></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((row) => {
                  const open = openId === row.id;
                  const hasDiff = row.old_values || row.new_values;
                  return (
                    <Fragment key={row.id}>
                      <tr className={hasDiff ? 'cursor-pointer hover:bg-gray-50' : ''} onClick={() => hasDiff && setOpenId(open ? null : row.id)}>
                        <RxTd>{hasDiff && (open ? <RxChevronDown size={14} /> : <RxChevronRight size={14} />)}</RxTd>
                        <RxTd>{rxFormatDateTime(row.created_at)}</RxTd>
                        <RxTd className="font-medium">{row.user_full_name || row.username || '—'}{row.role && <span className="ms-1 text-xs text-gray-400">({row.role})</span>}</RxTd>
                        <RxTd><span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${RX_ACTION_STYLE[row.action] || 'bg-gray-50 text-gray-700 ring-gray-300'}`}>{row.action}</span></RxTd>
                        <RxTd>{row.table_name}</RxTd>
                        <RxTd>{row.record_id ?? '—'}</RxTd>
                        <RxTd className="max-w-md truncate" title={row.description}>{row.description || '—'}</RxTd>
                        <RxTd className="text-xs text-gray-400">{row.ip_address || '—'}</RxTd>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={8} className="bg-gray-50/60 px-4 py-3">
                            <div className="flex flex-col md:flex-row gap-4">
                              <RxJsonBlock label={t('audit.old', 'Old values')} value={row.old_values} />
                              <RxJsonBlock label={t('audit.new', 'New values')} value={row.new_values} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </RxTable>
          )}
        </RxCard>
      )}
    </div>
  );
}
import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../api/axios';
import DateRangePicker from '../../components/DateRangePicker';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import {
  Calendar, RefreshCw, AlertCircle, CheckCircle2,
  TrendingUp, Coins, Smartphone, Zap, CreditCard, Receipt,
  AlertTriangle, ArrowDownCircle, ArrowUpCircle, Wallet,
  FileText, Award
} from 'lucide-react';
import { AlertCircle as RxAlertCircle, Filter as RxFilter, Medal as RxMedal, RefreshCw as RxRefreshCw, Trophy as RxTrophy } from 'lucide-react';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDZD = (amount) =>
  new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 2 }).format(amount || 0);

const formatNumber = (n) => new Intl.NumberFormat('fr-DZ').format(n || 0);

const formatDateShort = (dateString) =>
  new Date(dateString).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });

const formatDateTime = (ts) =>
  ts ? new Date(ts).toLocaleString('en-GB', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

const daysBetweenInclusive = (from, to) => {
  if (!from || !to) return 0;
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.floor((b - a) / 86_400_000) + 1;
};

export default function CashierDateRangeReport() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const today = todayStr();

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate]     = useState(today);
  const [report, setReport]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const dayCount = useMemo(() => daysBetweenInclusive(fromDate, toDate), [fromDate, toDate]);

  const clientHint = useMemo(() => {
    if (!fromDate || !toDate) return t('reports.pick_dates_hint');
    if (toDate < fromDate)    return t('reports.error_invalid_range');
    if (toDate > today || fromDate > today) return t('reports.error_future_date');
    if (dayCount > 366)       return t('reports.error_range_too_large');
    return null;
  }, [fromDate, toDate, today, dayCount, t]);

  const fetchReport = useCallback(async () => {
    setLoading(true); setError(''); setReport(null);
    try {
      const r = await api.get('/reports/range', { params: { from: fromDate, to: toDate } });
      setReport(r.data.data);
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'INVALID_DATE_RANGE') setError(t('reports.error_invalid_range'));
      else if (code === 'RANGE_TOO_LARGE') setError(t('reports.error_range_too_large'));
      else if (code === 'FUTURE_DATE') setError(t('reports.error_future_date'));
      else setError(err.response?.data?.message || t('reports.failed_to_load'));
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, t]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (clientHint) { setError(clientHint); return; }
    fetchReport();
  };

  return (
    <div className="space-y-6 text-start">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="text-red-600" /> {t('reports.my_date_range_report')}
        </h1>
      </div>

      <section className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <DateRangePicker
            hideWarning
            range={{ from: fromDate, to: toDate }}
            onRangeChange={(r) => { setFromDate(r.from); setToDate(r.to); }}
            labels={{ from: t('reports.from'), to: t('reports.to') }}
            hint={dayCount > 0 ? `${dayCount} ${t('reports.days_selected')}` : undefined}
          />

          <button type="submit" disabled={loading || !!clientHint} className="inline-flex items-center gap-2 rounded-md bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {loading ? t('common.loading') : t('reports.run_report')}
          </button>
        </form>

        {clientHint && !error && !loading && (
          <p className="mt-3 text-xs text-amber-700 flex items-center gap-1"><AlertTriangle size={12} /> {clientHint}</p>
        )}
      </section>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" /><span>{error}</span>
        </div>
      )}

      {loading && !report && (
        <div className="flex justify-center py-12"><RefreshCw className="animate-spin text-red-600" size={28} /></div>
      )}

      {report && <ReportBody report={report} cashierId={user?.id} t={t} />}

      <RxCashierRanking />
    </div>
  );
}

function ReportBody({ report, cashierId, t }) {
  const totals = report.totals || {};
  const myCashierRow = useMemo(() => (report.per_cashier || []).find((r) => r.cashier_id === cashierId) || null, [report.per_cashier, cashierId]);
  const myDebts = useMemo(() => (report.debts || []), [report.debts]);
  const myAdvanceRow = useMemo(() => (report.advances || []).find((a) => a.cashier_id === cashierId) || null, [report.advances, cashierId]);
  const expensesByCategory = report.expenses_by_category || { utility: 0, inventory: 0, other: 0 };

  const isEmpty = !myCashierRow && myDebts.length === 0 && !myAdvanceRow && (totals.register_expense_total || 0) === 0;

  return (
    <div className="space-y-6 text-start">
      <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-1 font-medium">
          <Calendar size={14} className="text-gray-500" />
          {formatDateShort(report.from)} → {formatDateShort(report.to)}
        </span>
        {typeof report.elapsed_ms === 'number' && (
          <span className="text-xs text-gray-500">{t('reports.generated_in')} {report.elapsed_ms} ms</span>
        )}
      </div>

      {isEmpty ? (
        <div className="rounded-md border border-gray-200 bg-white p-10 text-center text-gray-500">{t('reports.no_activity')}</div>
      ) : (
        <>
          <TotalsSection totals={totals} expensesByCategory={expensesByCategory} t={t} />
          <MySectionCard cashierRow={myCashierRow} advanceRow={myAdvanceRow} t={t} />
          {myDebts.length > 0 && <DebtsTable debts={myDebts} t={t} />}
        </>
      )}
    </div>
  );
}

function TotalsSection({ totals, expensesByCategory, t }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><TrendingUp size={20} className="text-gray-600" /> {t('reports.totals')}</h2>

      <div className="rounded-2xl border border-indigo-100 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-sm mb-4">
        <div className="text-sm font-bold uppercase tracking-wider text-indigo-800 mb-4 flex items-center gap-1.5"><Award size={18} /> {t('reports.loyalty_roi')}</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Kpi label={t('reports.discounts_given')} value={`− ${formatDZD(totals.loyalty_discount_dzd)}`} color="red" />
          <Kpi label={t('reports.loyalty_revenue')} value={formatDZD(totals.loyalty_driven_revenue)} color="green" />
          <Kpi label={t('reports.net_impact')} value={formatDZD((totals.loyalty_driven_revenue || 0) - (totals.loyalty_discount_dzd || 0))} color="blue" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi icon={<Smartphone size={18} />} label={t('reports.sim_units')} value={formatNumber(totals.sim_units_sold)} />
        <Kpi icon={<TrendingUp size={18} />} label={t('reports.sim_revenue')} value={formatDZD(totals.sim_total_selling_price)} sub={`${t('reports.cost')} ${formatDZD(totals.sim_total_real_price)}`} />
        <Kpi icon={<Zap size={18} />} label={t('reports.storm_bundle')} value={formatDZD(totals.storm_total)} />
        <Kpi icon={<CreditCard size={18} />} label={t('reports.accessories')} value={formatDZD(totals.accessories_total_selling)} sub={`${t('reports.cost')} ${formatDZD(totals.accessories_total_real)}`} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi icon={<Coins size={18} />} label={t('reports.sim_profit')} value={formatDZD(totals.sim_profit)} color={(totals.sim_profit || 0) >= 0 ? 'green' : 'red'} sub={`${formatNumber(totals.sim_total_points)} ${t('ledger.pts')}`} />
        <Kpi icon={<Coins size={18} />} label={t('reports.accessory_profit')} value={formatDZD(totals.accessory_profit)} color={(totals.accessory_profit || 0) >= 0 ? 'green' : 'red'} />
        <Kpi icon={<Wallet size={18} />} label={t('reports.gross_profit')} value={formatDZD(totals.gross_profit)} color={(totals.gross_profit || 0) >= 0 ? 'green' : 'red'} />
        <Kpi icon={<AlertTriangle size={18} />} label={t('reports.debts')} value={formatDZD(totals.debt_total)} color="red" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi icon={<CheckCircle2 size={18} />} label={t('reports.my_commissions')} value={formatDZD((totals.sim_total_commission || 0) + (totals.accessories_total_commission || 0))} color="green" sub={`SIM ${formatDZD(totals.sim_total_commission)} + Acc ${formatDZD(totals.accessories_total_commission)}`} />
        <Kpi icon={<ArrowUpCircle size={18} />} label={t('reports.advances_taken')} value={formatDZD(totals.cashier_advance_total)} />
        <Kpi icon={<ArrowDownCircle size={18} />} label={t('reports.repayments')} value={formatDZD(totals.cashier_repayment_total)} color="green" />
        <Kpi icon={<Receipt size={18} />} label={t('reports.register_expenses')} value={formatDZD(totals.register_expense_total)} color="red" sub={`Util ${formatDZD(expensesByCategory.utility)} • Inv ${formatDZD(expensesByCategory.inventory)} • Other ${formatDZD(expensesByCategory.other)}`} />
      </div>
    </section>
  );
}

function MySectionCard({ cashierRow, advanceRow, t }) {
  if (!cashierRow && !advanceRow) return null;
  const row = cashierRow || {};
  const adv = advanceRow || { advance_total: 0, repayment_total: 0, outstanding_balance: 0 };

  return (
    <section className="space-y-3 text-start">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Receipt size={20} className="text-gray-600" /> {t('reports.my_activity')}</h2>
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <div><div className="text-sm text-gray-500">{t('reports.cashier')}</div><div className="font-bold text-gray-900">{row.cashier_full_name || '—'}</div></div>
          <div className="text-end"><div className="text-sm text-gray-500">{t('reports.store')}</div><div className="font-medium text-gray-700">{row.store_name || '—'}</div></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <KvRow label={t('reports.sim_units')} value={formatNumber(row.sim_units_sold)} />
          <KvRow label={t('reports.sim_revenue')} value={formatDZD(row.sim_total_selling_price)} sub={`${t('reports.cost')} ${formatDZD(row.sim_total_real_price)}`} />
          <KvRow label={t('reports.sim_points')} value={formatNumber(row.sim_total_points)} />
          <KvRow label={t('reports.sim_commission')} value={formatDZD(row.sim_total_commission)} color="green" />
          <KvRow label={t('reports.storm_bundle')} value={formatDZD(row.storm_total)} />
          <KvRow label={t('reports.accessories')} value={formatDZD(row.accessories_total_selling)} sub={`${t('reports.cost')} ${formatDZD(row.accessories_total_real)}`} />
          <KvRow label={t('reports.accessory_commission')} value={formatDZD(row.accessories_total_commission)} color="green" />
          <KvRow label={t('reports.debts')} value={formatDZD(row.debt_total)} color="red" />
          <KvRow label={t('reports.sim_profit')} value={formatDZD(row.sim_profit)} color={(row.sim_profit || 0) >= 0 ? 'green' : 'red'} />
          <KvRow label={t('reports.accessory_profit')} value={formatDZD(row.accessory_profit)} color={(row.accessory_profit || 0) >= 0 ? 'green' : 'red'} />
          <KvRow label={t('reports.gross_profit')} value={formatDZD(row.gross_profit)} color={(row.gross_profit || 0) >= 0 ? 'green' : 'red'} />
          <KvRow label={t('reports.register_expenses')} value={formatDZD(row.register_expense_total)} color="red" />
        </div>
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{t('reports.advances_ledger')}</div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <KvRow label={t('reports.advances_taken')} value={formatDZD(adv.advance_total)} />
            <KvRow label={t('reports.repayments')} value={formatDZD(adv.repayment_total)} color="green" />
            <KvRow label={t('reports.outstanding_balance')} value={formatDZD(adv.outstanding_balance)} color={(adv.outstanding_balance || 0) > 0 ? 'red' : 'gray'} />
          </div>
        </div>
      </div>
    </section>
  );
}

function DebtsTable({ debts, t }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><AlertTriangle size={20} className="text-red-600" /> {t('reports.my_debts')} ({debts.length})</h2>
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('reports.when')}</th>
              <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('reports.customer')}</th>
              <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('reports.phone')}</th>
              <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('reports.profession')}</th>
              <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('reports.description')}</th>
              <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase tracking-wider">{t('reports.amount')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {debts.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{formatDateTime(d.created_at)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{d.customer?.full_name || '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-mono">{d.customer?.phone_number || '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{d.customer?.profession || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{d.description || '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-end font-semibold text-red-600">{formatDZD(d.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Kpi({ icon, label, value, sub, color = 'gray' }) {
  const colors = { gray: 'text-gray-900', green: 'text-green-600', red: 'text-red-600', blue: 'text-blue-600' };
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-start">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{icon} {label}</div>
      <div className={`mt-1 text-xl font-bold ${colors[color]}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function KvRow({ label, value, sub, color = 'gray' }) {
  const colors = { gray: 'text-gray-900', green: 'text-green-600', red: 'text-red-600' };
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`font-semibold ${colors[color]}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
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

const rxPad = (n) => String(n).padStart(2, '0');

const rxToDateStr = (d) => `${d.getFullYear()}-${rxPad(d.getMonth() + 1)}-${rxPad(d.getDate())}`;

const rxTodayStr = () => rxToDateStr(new Date());

const rxMonthStartStr = () => `${rxTodayStr().slice(0, 7)}-01`;

const rxFormatDZD = (n, digits = 2) =>
  new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: digits }).format(Number(n) || 0);

const rxFormatNumber = (n) => new Intl.NumberFormat('fr-DZ').format(Number(n) || 0);

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

const RxDateRangeBar = ({ from, to, setFrom, setTo, onSubmit, loading, submitLabel, children }) => {
  const t = rxUseT();
  const today = rxTodayStr();
  const invalid = !from || !to || to < from;
  return (
    <RxCard>
      <div className="flex flex-col md:flex-row md:items-end gap-4">
        <DateRangePicker
          hideWarning
          className="flex-1"
          range={{ from, to }}
          onRangeChange={(r) => { setFrom(r.from); setTo(r.to); }}
          labels={{ from: t('range.date_from', 'From'), to: t('range.date_to', 'To') }}
        />
        {children}
        <RxPrimaryButton onClick={onSubmit} loading={loading} icon={RxFilter} disabled={invalid}>
          {submitLabel || t('range.generate_btn', 'Generate')}
        </RxPrimaryButton>
      </div>
      {to && from && to < from && (
        <p className="mt-3 text-sm font-medium text-amber-700">{t('reports.error_invalid_range', 'The end date must be on or after the start date.')}</p>
      )}
    </RxCard>
  );
};

// ─── Tables ──────────────────────────────────────────────────────────────────

const rxErrMsg = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

const rxUnwrap = (r) => r.data?.data;

const rxReportsApi = {
  /** GET /api/reports/cashiers/ranking */
  cashierRanking: (params) => api.get('/reports/cashiers/ranking', { params }).then(rxUnwrap),
};

const rxCleanParams = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined));

const RX_FINANCES_PATHS = {
  registers: '/finances/registers', // GET getRegisters
};

const rxFinancesApi = {
  /** getRegisters -> [{ id, name, location, current_cash }] */
  getRegisters: () => api.get(RX_FINANCES_PATHS.registers).then((r) => r.data?.data || []),
};

const RX_DEFAULT_METRIC = { product: 'count', sim: 'count', storm: 'amount', app_installation: 'count' };

const RX_WORK_TYPES = ['sim', 'product', 'storm', 'app_installation'];

const RX_MEDAL = ['text-amber-500', 'text-gray-400', 'text-orange-600'];

/**
 * GET /api/reports/cashiers/ranking?by&metric&order&from&to&store_id&limit
 * `rank` = rank for the chosen sort, `ranks` = rank in each of the 4 work types.
 */

const RX_GRID_BG = {
  backgroundImage: 'repeating-linear-gradient(to right, transparent 0, transparent calc(25% - 1px), #e5e7eb calc(25% - 1px), #e5e7eb 25%)',
};

/** Row frame for the ranking chart: label | bar track with grid lines | value. */
const RxChartRow = ({ label, sub, value, children }) => (
  <div className="flex items-center gap-3 py-1.5">
    <div className="w-28 sm:w-44 shrink-0 min-w-0">{label}{sub && <div className="truncate text-[11px] text-gray-400">{sub}</div>}</div>
    <div className="relative h-6 flex-1 rounded bg-gray-50" style={RX_GRID_BG}>{children}</div>
    <div className="w-24 sm:w-28 shrink-0 text-end text-xs font-bold text-gray-800 whitespace-nowrap">{value}</div>
  </div>
);

const RxAxis = ({ max, format }) => (
  <div className="flex items-center gap-3">
    <div className="w-28 sm:w-44 shrink-0" />
    <div className="flex flex-1 justify-between text-[10px] text-gray-400"><span>0</span><span>{format(max / 2)}</span><span>{format(max)}</span></div>
    <div className="w-24 sm:w-28 shrink-0" />
  </div>
);

/** Horizontal bar chart: one bar per cashier, in ranking order. rows: [{ id, name, sub, value, rank, inactive, chips }] */
const RxRankChart = ({ rows, format, barColor = 'bg-red-500' }) => {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <div>
      {rows.map((r) => (
        <RxChartRow key={r.id} value={format(r.value)} sub={r.sub}
          label={
            <span className={`flex items-center gap-1.5 text-sm font-semibold text-gray-800 ${r.inactive ? 'opacity-60' : ''}`}>
              {r.rank <= 3 ? <RxMedal size={16} className={RX_MEDAL[r.rank - 1]} /> : <span className="w-4 text-center text-xs text-gray-400">{r.rank}</span>}
              <span className="truncate">{r.name}</span>
            </span>
          }>
          <div className={`h-full rounded transition-all ${r.value < 0 ? 'bg-gray-400' : r.rank === 1 ? 'bg-amber-500' : barColor}`}
            style={{ width: `${(Math.abs(r.value) / max) * 100}%` }} title={`${r.name}: ${format(r.value)}`} />
          {r.chips && <span className="absolute inset-y-0 end-1 hidden md:flex items-center rounded bg-white/70 px-1 text-[10px] font-semibold text-gray-500">{r.chips}</span>}
        </RxChartRow>
      ))}
      <RxAxis max={max} format={format} />
    </div>
  );
};

function RxCashierRanking() {
  const t = rxUseT();
  const [from, setFrom] = useState(rxMonthStartStr());
  const [to, setTo] = useState(rxTodayStr());
  const [by, setBy] = useState('sim');
  const [metric, setMetric] = useState('');
  const [order, setOrder] = useState('desc');
  const [storeId, setStoreId] = useState('');
  const [limit, setLimit] = useState('');
  const [stores, setStores] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const labels = {
    sim: 'SIM', product: t('stats.products', 'Products'), storm: 'Storm', app_installation: t('stats.app_install', 'App installations'),
  };
  const metricLabels = { count: t('rank.count', 'Count'), amount: t('rank.amount', 'Amount'), profit: t('rank.profit', 'Profit') };
  const effectiveMetric = metric || RX_DEFAULT_METRIC[by];

  useEffect(() => { rxFinancesApi.getRegisters().then(setStores).catch(() => setStores([])); }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      setData(await rxReportsApi.cashierRanking(rxCleanParams({ from, to, by, metric, order, store_id: storeId, limit })));
    } catch (err) {
      setError(rxErrMsg(err, t('common.action_failed', 'Action failed.')));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, by, metric, order, storeId, limit, t]);

  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [by, metric, order]);

  // Inactive cashiers are not shown; re-number so ranks have no gaps.
  const items = data ? data.items.filter((c) => c.is_active !== false) : [];

  const fmtValue = (v) => (effectiveMetric === 'count' ? rxFormatNumber(v) : rxFormatDZD(v, 0));

  return (
    <div className="space-y-6">
      <RxPageHeader icon={RxTrophy} title={t('rank.title', 'Cashier ranking')} subtitle={t('rank.subtitle', 'Sort cashiers by the work they do')} />

      <RxDateRangeBar from={from} to={to} setFrom={setFrom} setTo={setTo} onSubmit={load} loading={loading}>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 flex-[2]">
          <RxField label={t('rank.work_type', 'Work type')}>
            <RxSelect value={by} onChange={(e) => { setBy(e.target.value); setMetric(''); }}>
              {RX_WORK_TYPES.map((w) => <option key={w} value={w}>{labels[w]}</option>)}
            </RxSelect>
          </RxField>
          <RxField label={t('rank.metric', 'Metric')}>
            <RxSelect value={metric} onChange={(e) => setMetric(e.target.value)}>
              <option value="">{t('rank.default', 'Default')} ({metricLabels[RX_DEFAULT_METRIC[by]]})</option>
              {Object.entries(metricLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </RxSelect>
          </RxField>
          <RxField label={t('rank.order', 'Order')}>
            <RxSelect value={order} onChange={(e) => setOrder(e.target.value)}>
              <option value="desc">{t('rank.best_first', 'Best first')}</option>
              <option value="asc">{t('rank.worst_first', 'Worst first')}</option>
            </RxSelect>
          </RxField>
          <RxField label={t('stats.store', 'Store')}>
            <RxSelect value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              <option value="">{t('stats.all_stores', 'All stores')}</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </RxSelect>
          </RxField>
          <RxField label={t('rank.limit', 'Limit')}>
            <RxTextInput type="number" min="1" max="500" placeholder="∞" value={limit} onChange={(e) => setLimit(e.target.value)} />
          </RxField>
        </div>
      </RxDateRangeBar>

      <RxErrorBanner message={error} />
      {loading && <RxSpinner />}

      {!loading && data && (
        items.length === 0 ? (
          <RxCard><RxEmpty>{t('common.no_data', 'No data for this period.')}</RxEmpty></RxCard>
        ) : (
          <RxCard title={`${labels[data.by]} · ${metricLabels[data.metric]}`} icon={RxTrophy}
              right={<span className="text-xs text-gray-500">{items.length} {t('stats.cashier', 'cashier')}(s)</span>}>
              <RxRankChart format={fmtValue}
                rows={items.map((c, i) => ({
                  id: c.cashier_id, name: c.cashier_full_name, sub: c.store_name, value: c.sorted_by.value, rank: i + 1,
                  chips: RX_WORK_TYPES.map((w) => `${labels[w].slice(0, 3)} #${c.ranks[w]}`).join(' · '),
                }))} />
          </RxCard>
        )
      )}
    </div>
  );
}
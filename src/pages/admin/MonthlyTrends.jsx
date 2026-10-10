import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../api/axios';
import DateRangePicker from '../../components/DateRangePicker';
import { useLanguage } from '../../context/LanguageContext';
import {
  BarChart3, RefreshCw, Calendar, AlertCircle, TrendingUp, Coins,
  Smartphone, CreditCard, Trophy, Building2, Award, ChevronRight,
  TrendingDown, Minus
} from 'lucide-react';
import { AlertCircle as RxAlertCircle, Calendar as RxCalendar, Filter as RxFilter, Medal as RxMedal, RefreshCw as RxRefreshCw, Trophy as RxTrophy } from 'lucide-react';

const formatDZD = (n) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(Number(n) || 0);
const formatNumber = (n) => new Intl.NumberFormat('fr-DZ').format(Number(n) || 0);

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const monthsAgoStr = (n) => {
  const d = new Date(); d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const formatMonthLabel = (yyyymmdd) => {
  const d = new Date(yyyymmdd); return d.toLocaleDateString('en-GB', { year: '2-digit', month: 'short' });
};

export default function MonthlyTrends() {
  const { t } = useLanguage();
  const today = todayStr();

  const [from, setFrom] = useState(monthsAgoStr(11));
  const [to, setTo]     = useState(today);
  const [storeId, setStoreId] = useState('');

  const [stores, setStores]     = useState([]);
  const [monthly, setMonthly]   = useState([]);
  const [top, setTop]           = useState({ top_offers: [], top_products: [], leaderboard: [] });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    api.get('/finances/registers').then((r) => setStores(r.data.data || [])).catch(() => setStores([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      try {
        const monthlyParams = { from, to };
        if (storeId) monthlyParams.store_id = storeId;
        const [m, topData] = await Promise.all([
          api.get('/reports/monthly', { params: monthlyParams }),
          api.get('/reports/top',     { params: { from, to, limit: 5 } }),
        ]);
        if (cancelled) return;
        setMonthly(m.data?.data || []);
        setTop(topData.data?.data || { top_offers: [], top_products: [], leaderboard: [] });
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || t('common.action_failed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (from && to && from <= to) load();
    return () => { cancelled = true; };
  }, [from, to, storeId, t]);

  const monthlyAgg = useMemo(() => {
    const map = new Map();
    for (const r of monthly) {
      if (!r || !r.month) continue;
      const key = String(r.month).slice(0, 10);
      if (!map.has(key)) map.set(key, { month: key, revenue: 0, profit: 0, sim_units: 0, debts: 0, commissions: 0, loyalty_driven_revenue: 0, loyalty_discount_dzd: 0 });
      const e = map.get(key);
      e.revenue += Number(r.total_revenue) || 0; e.profit += Number(r.gross_profit) || 0;
      e.sim_units += Number(r.total_sim_units) || 0; e.debts += Number(r.total_debts) || 0;
      e.commissions += Number(r.total_commissions) || 0; e.loyalty_driven_revenue += Number(r.loyalty_driven_revenue) || 0;
      e.loyalty_discount_dzd += Number(r.loyalty_discount_dzd) || 0;
    }
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [monthly]);

  const mom = useMemo(() => {
    if (monthlyAgg.length < 1) return null;
    const current = monthlyAgg[monthlyAgg.length - 1]; const previous = monthlyAgg[monthlyAgg.length - 2];
    const delta = (cur, prev) => { if (!prev) return null; if (prev === 0) return cur === 0 ? 0 : 100; return ((cur - prev) / Math.abs(prev)) * 100; };
    return { current, previous, revenue_delta: delta(current.revenue, previous?.revenue), profit_delta: delta(current.profit, previous?.profit), sim_units_delta: delta(current.sim_units, previous?.sim_units), debts_delta: delta(current.debts, previous?.debts) };
  }, [monthlyAgg]);

  return (
    <div className="space-y-8 pb-12 text-start">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><BarChart3 className="text-red-600" /> {t('trends.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('trends.subtitle')}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3 shadow-sm"><AlertCircle size={20} className="mt-0.5 flex-shrink-0" /><span>{error}</span></div>
      )}

      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-4 sm:p-5">
        <DateRangePicker
          range={{ from, to }}
          onRangeChange={(r) => { setFrom(r.from); setTo(r.to); }}
        >
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t('stats.store', 'Store')}</label>
            <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:ring-red-500">
              <option value="">{t('trends.all_stores')}</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </DateRangePicker>
      </section>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4"><RefreshCw className="animate-spin text-red-600" size={32} /></div>
      ) : (
        <>
          {mom && (
            <>
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <DeltaKpi label={t('daily.total_revenue')} value={formatDZD(mom.current.revenue)} delta={mom.revenue_delta} positiveIsGood />
                <DeltaKpi label={t('daily.gross_profit')} value={formatDZD(mom.current.profit)} delta={mom.profit_delta} positiveIsGood />
                <DeltaKpi label={t('trends.sim_sales_vol')} value={formatNumber(mom.current.sim_units)} delta={mom.sim_units_delta} positiveIsGood />
                <DeltaKpi label={t('daily.debts_issued')} value={formatDZD(mom.current.debts)} delta={mom.debts_delta} positiveIsGood={false} />
              </section>

              <section className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-6 shadow-sm">
                <div className="text-sm font-bold uppercase tracking-wider text-indigo-800 mb-4 flex items-center gap-1.5"><Award size={18} /> {t('reports.loyalty_roi')}</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-indigo-50"><div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{t('reports.discounts_given')}</div><div className="text-2xl font-black text-red-600">− {formatDZD(mom.current.loyalty_discount_dzd)}</div></div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-indigo-50"><div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{t('reports.loyalty_revenue')}</div><div className="text-2xl font-black text-green-600">{formatDZD(mom.current.loyalty_driven_revenue)}</div></div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-indigo-50"><div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{t('reports.net_impact')}</div><div className="text-2xl font-black text-blue-600">{formatDZD(mom.current.loyalty_driven_revenue - mom.current.loyalty_discount_dzd)}</div></div>
                </div>
              </section>
            </>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6 flex flex-col xl:col-span-2">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2"><Coins size={20} className="text-gray-400" /> {t('trends.rev_profit_traj')}</h2>
              <div className="flex-1 flex items-end min-h-[300px]">
                {monthlyAgg.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 w-full">{t('reports.no_activity')}</div>
                ) : (
                  <BarChart rows={monthlyAgg} series={[{ key: 'revenue', label: t('daily.total_revenue'), color: '#fca5a5', hoverColor: '#ef4444' }, { key: 'profit', label: t('daily.gross_profit'), color: '#34d399', hoverColor: '#10b981' }]} xKey="month" xFormat={formatMonthLabel} valueFormat={formatDZD} className="pl-8 sm:pl-10" />
                )}
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6 flex flex-col">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2"><Smartphone size={20} className="text-gray-400" /> {t('trends.sim_sales_vol')}</h2>
              <div className="flex-1 flex items-end min-h-[250px]">
                {monthlyAgg.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 w-full">{t('reports.no_activity')}</div>
                ) : (
                  <BarChart rows={monthlyAgg} series={[{ key: 'sim_units', label: t('admin.units'), color: '#818cf8', hoverColor: '#6366f1' }]} xKey="month" xFormat={formatMonthLabel} valueFormat={formatNumber} />
                )}
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6 flex flex-col">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2"><Trophy size={20} className="text-yellow-500" /> {t('trends.cashier_leaderboard')}</h2>
              <div className="flex-1">
                {top.leaderboard.length === 0 ? <div className="p-8 text-center text-gray-500">{t('reports.no_activity')}</div> : <Leaderboard rows={top.leaderboard} />}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2"><Award size={20} className="text-red-500" /> {t('trends.top_offers')}</h2>
              {top.top_offers.length === 0 ? <div className="p-8 text-center text-gray-500">{t('reports.no_activity')}</div> : <RankedList gradient="from-red-500 to-rose-400" rows={top.top_offers.map((o) => ({ primary: o.offer_name, units: o.units_sold, revenue: o.total_revenue, profit: o.total_profit }))} />}
            </section>

            <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2"><CreditCard size={20} className="text-blue-500" /> {t('trends.top_accessories')}</h2>
              {top.top_products.length === 0 ? <div className="p-8 text-center text-gray-500">{t('reports.no_activity')}</div> : <RankedList gradient="from-blue-500 to-indigo-400" rows={top.top_products.map((p) => ({ primary: p.product_name, secondary: p.category_name, units: p.units_sold, revenue: p.total_revenue, profit: p.total_profit }))} />}
            </section>
          </div>
        </>
      )}
      <RxCashierRanking />
    </div>
  );
}

function BarChart({ rows, series, xKey, xFormat, valueFormat }) {
  const max = Math.max(1, ...rows.flatMap((r) => series.map((s) => Number(r[s.key]) || 0)));
  const groupWidth = 64; const barGap = 6; const barWidth = 16;
  const innerWidth = series.length * (barWidth + barGap); const padding = (groupWidth - innerWidth) / 2;
  const chartHeight = 240; const chartWidth = Math.max(rows.length, 1) * groupWidth + 60;

  return (
    <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
      <div className="flex items-center gap-6 mb-6 px-2">
        {series.map((s) => <div key={s.key} className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full shadow-sm" style={{ background: s.color }} /><span className="text-sm font-medium text-gray-600">{s.label}</span></div>)}
      </div>
      <svg width={chartWidth} height={chartHeight + 40} role="img" className="overflow-visible" dir="ltr">
        {[0, 0.25, 0.5, 0.75, 1].map((p) => {
          const y = chartHeight - p * chartHeight + 10;
          return (
            <g key={p}><line x1={50} x2={chartWidth} y1={y} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" /><text x={40} y={y + 4} fontSize="11" fill="#9ca3af" textAnchor="end" className="font-medium">{valueFormat ? valueFormat(p * max) : Math.round(p * max)}</text></g>
          );
        })}
        {rows.map((r, idx) => {
          const xBase = 50 + idx * groupWidth + padding;
          return (
            <g key={r[xKey] || idx} className="group">
              <rect x={xBase - padding} y={10} width={groupWidth} height={chartHeight} fill="#f9fafb" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg" />
              {series.map((s, sIdx) => {
                const v = Number(r[s.key]) || 0; const h = (v / max) * chartHeight;
                const x = xBase + sIdx * (barWidth + barGap); const y = chartHeight - h + 10;
                return (<g key={s.key} className="cursor-pointer"><rect x={x} y={y} width={barWidth} height={Math.max(h, 0)} fill={s.color} rx="4" ry="4" className="transition-all duration-700 ease-out hover:brightness-110" style={{ transformOrigin: 'bottom' }}><title>{`${xFormat(r[xKey])}\n${s.label}: ${valueFormat ? valueFormat(v) : v}`}</title></rect></g>);
              })}
              <text x={xBase + innerWidth / 2} y={chartHeight + 30} fontSize="12" fill="#6b7280" textAnchor="middle" className="font-medium group-hover:fill-gray-900 transition-colors">{xFormat(r[xKey])}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DeltaKpi({ label, value, delta, positiveIsGood = true }) {
  const isUp = delta != null && delta > 0; const isDown = delta != null && delta < 0;
  const good = positiveIsGood ? isUp : isDown; const bad = positiveIsGood ? isDown : isUp;
  const cardBg = good ? 'bg-green-50/50' : bad ? 'bg-red-50/50' : 'bg-white';
  const colorText = good ? 'text-green-700' : bad ? 'text-red-700' : 'text-gray-500';
  const colorBg = good ? 'bg-green-100' : bad ? 'bg-red-100' : 'bg-gray-100';
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-gray-200 ${cardBg} p-5 shadow-sm transition-all hover:shadow-md text-start`}>
      <div className="text-sm font-semibold text-gray-500 mb-2">{label}</div>
      <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{value}</div>
      <div className="mt-4 flex items-center gap-2">
        <div className={`flex items-center justify-center p-1 rounded-full ${colorBg} ${colorText}`}><Icon size={14} strokeWidth={3} /></div>
        <span className={`text-sm font-semibold ${colorText}`}>{delta == null ? '' : <>{Math.abs(delta).toFixed(1)}%</>}</span>
      </div>
    </div>
  );
}

function RankedList({ rows, gradient = "from-red-500 to-red-400" }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.revenue) || 0));
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="space-y-4">
      {rows.map((r, idx) => {
        const w = mounted ? ((Number(r.revenue) || 0) / max) * 100 : 0;
        return (
          <div key={`${r.primary}-${idx}`} className="group flex flex-col gap-1.5 text-start">
            <div className="flex justify-between items-end text-sm">
              <div className="flex items-center gap-3 truncate pr-4"><span className="text-xs font-bold text-gray-400 w-4">#{idx + 1}</span><div><div className="font-bold text-gray-900 group-hover:text-red-600 transition-colors truncate">{r.primary}</div>{r.secondary && <div className="text-xs text-gray-500 font-medium">{r.secondary}</div>}</div></div>
              <div className="text-end shrink-0"><div className="font-bold text-gray-900">{formatDZD(r.revenue)}</div><div className="text-xs text-gray-500 font-medium">{formatNumber(r.units)} units</div></div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden" dir="ltr"><div className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${w}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function Leaderboard({ rows }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.total_commission) || 0));
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="space-y-5 text-start">
      {rows.map((r, idx) => {
        const w = mounted ? ((Number(r.total_commission) || 0) / max) * 100 : 0;
        return (
          <div key={r.cashier_id} className="group flex flex-col gap-1.5">
            <div className="flex justify-between items-end text-sm">
              <div className="flex items-center gap-3 truncate pr-4">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-200 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-500'}`}>{idx + 1}</div>
                <div><div className="font-bold text-gray-900 truncate">{r.cashier_name}</div><div className="text-xs text-gray-500 font-medium">{r.store_name || 'No Store'}</div></div>
              </div>
              <div className="text-end shrink-0"><div className="font-bold text-green-600">{formatDZD(r.total_commission)}</div><div className="text-xs text-gray-500 font-medium">{formatNumber(r.sim_units)} SIMs</div></div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden" dir="ltr"><div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${w}%` }}></div></div>
          </div>
        );
      })}
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

const RX_SEGMENT_COLORS = { sim: 'bg-red-500', product: 'bg-blue-500', storm: 'bg-amber-400' };

const RX_GRID_BG = {
  backgroundImage: 'repeating-linear-gradient(to right, transparent 0, transparent calc(25% - 1px), #e5e7eb calc(25% - 1px), #e5e7eb 25%)',
};

/** Row frame shared by both charts: label | bar track with grid lines | value. */
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

/** Stacked horizontal bars. rows: [{ id, name, sub, parts: { key: number } }]  segments: [{ key, label }] */
const RxStackedChart = ({ rows, segments, format }) => {
  const totals = rows.map((r) => segments.reduce((s, g) => s + Math.max(0, r.parts[g.key] || 0), 0));
  const max = Math.max(1, ...totals);
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-gray-600">
        {segments.map((g) => <span key={g.key} className="inline-flex items-center gap-1.5"><i className={`inline-block h-2.5 w-2.5 rounded-sm ${RX_SEGMENT_COLORS[g.key]}`} />{g.label}</span>)}
      </div>
      {rows.map((r, i) => (
        <RxChartRow key={r.id} value={format(totals[i])} sub={r.sub}
          label={<span className="block truncate text-sm font-semibold text-gray-800">{r.name}</span>}>
          <div className="flex h-full overflow-hidden rounded" style={{ width: `${(totals[i] / max) * 100}%` }}>
            {segments.map((g) => {
              const v = Math.max(0, r.parts[g.key] || 0);
              return v > 0 ? <div key={g.key} className={`h-full ${RX_SEGMENT_COLORS[g.key]}`} style={{ width: `${(v / totals[i]) * 100}%` }} title={`${g.label}: ${format(v)}`} /> : null;
            })}
          </div>
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
        data.items.length === 0 ? (
          <RxCard><RxEmpty>{t('common.no_data', 'No data for this period.')}</RxEmpty></RxCard>
        ) : (
          <>
            <RxCard title={`${labels[data.by]} · ${metricLabels[data.metric]}`} icon={RxTrophy}
              right={<span className="text-xs text-gray-500">{data.count} {t('stats.cashier', 'cashier')}(s)</span>}>
              <RxRankChart format={fmtValue}
                rows={data.items.map((c) => ({
                  id: c.cashier_id, name: c.cashier_full_name, sub: c.store_name, value: c.sorted_by.value, rank: c.rank, inactive: !c.is_active,
                  chips: RX_WORK_TYPES.map((w) => `${labels[w].slice(0, 3)} #${c.ranks[w]}`).join(' · '),
                }))} />
            </RxCard>

            <RxCard title={t('rank.revenue_mix', 'Revenue by work type')} icon={RxTrophy}>
              <RxStackedChart format={(v) => rxFormatDZD(v, 0)}
                segments={[{ key: 'sim', label: 'SIM' }, { key: 'product', label: labels.product }, { key: 'storm', label: 'Storm' }]}
                rows={data.items.map((c) => ({
                  id: c.cashier_id, name: c.cashier_full_name, sub: c.store_name,
                  parts: { sim: c.sim_revenue, product: c.product_revenue, storm: c.storm_amount },
                }))} />
            </RxCard>

            <RxCard title={t('rank.profit_mix', 'Gross profit by work type')} icon={RxTrophy}>
              <RxStackedChart format={(v) => rxFormatDZD(v, 0)}
                segments={[{ key: 'sim', label: 'SIM' }, { key: 'product', label: labels.product }]}
                rows={data.items.map((c) => ({
                  id: c.cashier_id, name: c.cashier_full_name, sub: c.store_name,
                  parts: { sim: c.sim_profit, product: c.product_profit },
                }))} />
            </RxCard>
          </>
        )
      )}
    </div>
  );
}
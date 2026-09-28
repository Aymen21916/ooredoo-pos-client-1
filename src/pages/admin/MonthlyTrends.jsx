import { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import { useLanguage } from '../../context/LanguageContext';
import {
  BarChart3, RefreshCw, Calendar, AlertCircle, TrendingUp, Coins,
  Smartphone, CreditCard, Trophy, Building2, Award, ChevronRight,
  TrendingDown, Minus
} from 'lucide-react';

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
    load();
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

      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-2 sm:p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 start-0 pl-3 flex items-center pointer-events-none"><Calendar size={16} className="text-gray-400 mx-3" /></div>
            <input type="date" value={from} max={to || today} onChange={(e) => setFrom(e.target.value)} className="block w-full rounded-xl border-0 py-2.5 px-10 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all" />
          </div>
          <div className="hidden sm:flex items-center text-gray-400"><ChevronRight size={16} className="rtl:rotate-180" /></div>
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 start-0 pl-3 flex items-center pointer-events-none"><Calendar size={16} className="text-gray-400 mx-3" /></div>
            <input type="date" value={to} min={from || undefined} max={today} onChange={(e) => setTo(e.target.value)} className="block w-full rounded-xl border-0 py-2.5 px-10 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all" />
          </div>
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 start-0 pl-3 flex items-center pointer-events-none"><Building2 size={16} className="text-gray-400 mx-3" /></div>
            <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className="block w-full rounded-xl border-0 py-2.5 px-10 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all appearance-none bg-white">
              <option value="">{t('trends.all_stores')}</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
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
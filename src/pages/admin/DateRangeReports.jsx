import { useState, useMemo } from 'react';
import api from '../../api/axios';
import { useLanguage } from '../../context/LanguageContext';
import {
  Calendar, RefreshCw, AlertCircle, AlertTriangle, TrendingUp, Coins,
  Users, Building2, Receipt, Smartphone, Zap, CreditCard, Wallet,
  FileText, BarChart3, Filter, CheckCircle2, ArrowRight, Award
} from 'lucide-react';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDZD = (amount) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 2 }).format(Number(amount) || 0);
const formatNumber = (n) => new Intl.NumberFormat('fr-DZ').format(Number(n) || 0);
const formatDateShort = (dateString) => new Date(dateString).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
const formatDateTime = (ts) => ts ? new Date(ts).toLocaleString('en-GB', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const daysBetween = (from, to) => {
  if (!from || !to) return null;
  const a = new Date(`${from}T00:00:00`); const b = new Date(`${to}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1;
};

export default function DateRangeReports() {
  const { t } = useLanguage();
  const today = todayStr();
  const defaultFrom = (() => { const d = new Date(); d.setDate(d.getDate() - 29); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo]     = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('totals');

  const span = daysBetween(from, to);

  const clientHint = useMemo(() => {
    if (!from || !to) return '';
    if (to < from)            return t('reports.error_invalid_range');
    if (span && span > 366)   return t('reports.error_range_too_large');
    if (from > today || to > today) return t('reports.error_future_date');
    return '';
  }, [from, to, span, today, t]);

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      const r = await api.get('/reports/range', { params: { from, to } });
      setData(r.data.data);
    } catch (err) {
      setError(err.response?.data?.message || t('common.action_failed'));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = data?.scope === 'admin';

  const TABS = [
    { id: 'totals',   label: t('range.consolidated_totals'), icon: BarChart3 },
    { id: 'cashier',  label: t('range.per_cashier'),         icon: Users },
    { id: 'store',    label: t('range.per_store'),           icon: Building2, adminOnly: true },
    { id: 'debts',    label: t('range.client_debts'),        icon: AlertCircle },
    { id: 'advances', label: t('range.advances_repays'),     icon: Wallet },
    { id: 'expenses', label: t('range.register_expenses'),   icon: Receipt },
  ];

  return (
    <div className="space-y-6 pb-12 text-start">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-red-600" /> {t('range.title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t('range.subtitle')}</p>
        </div>
      </div>

      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-4 sm:p-5 relative overflow-hidden">
        <div className="absolute top-0 end-0 w-64 h-64 bg-red-50 rounded-full blur-3xl -me-32 -mt-32 opacity-50 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1.5"><Calendar size={14} /> {t('range.date_from')}</label>
              <input type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)} className="block w-full rounded-xl border-0 py-2.5 px-4 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1.5"><Calendar size={14} /> {t('range.date_to')}</label>
              <input type="date" value={to} max={today} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="block w-full rounded-xl border-0 py-2.5 px-4 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 transition-all" />
            </div>
          </div>
          <button onClick={submit} disabled={loading || !!clientHint || !from || !to} className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            {loading ? <RefreshCw size={18} className="animate-spin" /> : <Filter size={18} />}
            {loading ? t('common.loading') : t('range.generate_btn')}
          </button>
        </div>

        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-3 text-sm">
          {span != null && (
            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md font-medium"><Calendar size={14}/> {span} {t('reports.days_selected')}</span>
          )}
          {data && (
            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-md font-medium border border-green-200 shadow-sm">
              <CheckCircle2 size={14}/> {formatDateShort(data.from)} <ArrowRight size={12}/> {formatDateShort(data.to)}
              <span className="opacity-70 text-xs mx-1">• {data.elapsed_ms}ms</span>
            </span>
          )}
        </div>

        <div className="relative z-10 mt-4 space-y-2">
          {clientHint && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2 shadow-sm"><AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-amber-600" /><span className="font-medium">{clientHint}</span></div>}
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2 shadow-sm"><AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-red-600" /><span className="font-medium">{error}</span></div>}
        </div>
      </section>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4"><RefreshCw className="animate-spin text-red-600" size={32} /></div>
      ) : data ? (
        <section className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar border-b border-gray-100 bg-gray-50/50">
              <nav className="flex px-2 py-2 gap-1">
                {TABS.filter((t) => !t.adminOnly || isAdmin).map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-all ${active ? 'bg-white text-red-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/80'}`}>
                      <Icon size={16} className={active ? "text-red-500" : "text-gray-400"} /> {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
            <div className="p-4 sm:p-6 bg-white min-h-[400px]">
              {activeTab === 'totals'   && <TotalsTab    data={data} t={t} />}
              {activeTab === 'cashier'  && <PerCashierTab data={data} t={t} />}
              {activeTab === 'store'    && isAdmin && <PerStoreTab data={data} t={t} />}
              {activeTab === 'debts'    && <DebtsTab     data={data} t={t} />}
              {activeTab === 'advances' && <AdvancesTab  data={data} t={t} />}
              {activeTab === 'expenses' && <ExpensesTab  data={data} t={t} />}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function TotalsTab({ data, t }) {
  const tot = data.totals;
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-100 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-sm xl:col-span-3">
        <div className="text-sm font-bold uppercase tracking-wider text-indigo-800 mb-4 flex items-center gap-1.5"><Award size={18} /> {t('reports.loyalty_roi')}</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KvCard label={t('reports.discounts_given')} value={`− ${formatDZD(tot.loyalty_discount_dzd)}`} sub={`${formatNumber(tot.loyalty_points_redeemed)} ${t('ledger.pts')}`} color="red" bg="bg-white" />
          <KvCard label={t('reports.loyalty_revenue')} value={formatDZD(tot.loyalty_driven_revenue)} color="green" bg="bg-white" />
          <KvCard label={t('reports.net_impact')} value={formatDZD((tot.loyalty_driven_revenue || 0) - (tot.loyalty_discount_dzd || 0))} color="blue" bg="bg-white" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={<TrendingUp size={18} />} label={t('reports.gross_profit')} value={formatDZD(tot.gross_profit)} color={tot.gross_profit >= 0 ? 'green' : 'red'} />
        <Kpi icon={<Smartphone size={18} />} label={t('reports.sim_units')} value={formatNumber(tot.sim_units_sold)} sub={`${t('reports.sim_revenue')} ${formatDZD(tot.sim_total_selling_price)}`} />
        <Kpi icon={<Zap size={18} />} label={t('reports.storm_bundle')} value={formatDZD(tot.storm_total)} />
        <Kpi icon={<CreditCard size={18} />} label={t('reports.accessories')} value={formatDZD(tot.accessories_total_selling)} sub={`${t('reports.cost')} ${formatDZD(tot.accessories_total_real)}`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-1.5"><Coins size={16} className="text-gray-500" /> {t('range.profit_decomp')}</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <KvCard label={t('range.sim_profit')}       value={formatDZD(tot.sim_profit)} />
            <KvCard label={t('range.acc_profit')} value={formatDZD(tot.accessory_profit)} />
            <KvCard label={t('range.prelevement')}      value={formatDZD(tot.prelevement)} />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 p-5 bg-white shadow-sm">
          <div className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-1.5"><Wallet size={16} className="text-blue-500" /> {t('range.live_cash_flow')}</div>
          <div className="grid grid-cols-2 gap-4">
            <KvCard label={t('daily.debts_issued')}   value={formatDZD(tot.debt_total)} color="red" bg="bg-red-50/30" />
            <KvCard label={t('range.advances')}       value={formatDZD(tot.cashier_advance_total)} color="red" bg="bg-red-50/30" />
            <KvCard label={t('range.repayments')}     value={formatDZD(tot.cashier_repayment_total)} color="green" bg="bg-emerald-50/30" />
            <KvCard label={t('range.expenses_out')}   value={`− ${formatDZD(tot.register_expense_total)}`} color="red" bg="bg-red-50/30" />
          </div>
        </div>
      </div>
      
      <div className="rounded-2xl border border-gray-200 p-5 bg-white shadow-sm">
        <div className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-1.5"><Smartphone size={16} className="text-indigo-500" /> {t('range.sim_cost_breakdown')}</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KvCard label={t('range.real_cost')} value={formatDZD(tot.sim_total_real_price)} />
          <KvCard label={t('range.selling_price')}  value={formatDZD(tot.sim_total_selling_price)} />
          <KvCard label={t('range.points_earned')}  value={formatNumber(tot.sim_total_points)} />
          <KvCard label={t('range.commissions_paid')} value={formatDZD(tot.sim_total_commission)} color="blue" />
        </div>
      </div>
    </div>
  );
}

function PerCashierTab({ data, t }) {
  const rows = data.per_cashier || [];
  if (rows.length === 0) return <div className="p-8 text-center text-gray-500">{t('reports.no_activity')}</div>;
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm custom-scrollbar text-start">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50/80 backdrop-blur-sm">
          <tr>
            <Th align="start">{t('reports.cashier')}</Th>
            <Th align="start">{t('reports.store')}</Th>
            <Th align="end">{t('reports.sim_units')}</Th>
            <Th align="end">{t('reports.sim_revenue')}</Th>
            <Th align="end">{t('daily.storm_revenue')}</Th>
            <Th align="end">{t('range.prelevement')}</Th>
            <Th align="end">{t('reports.accessories')}</Th>
            <Th align="end">{t('reports.debts')}</Th>
            <Th align="end">{t('range.advances')}</Th>
            <Th align="end">{t('range.net_profit')}</Th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.cashier_id} className="hover:bg-gray-50 transition-colors">
              <Td className="font-bold text-gray-900" align="start">{r.cashier_full_name || `#${r.cashier_id}`}</Td>
              <Td className="text-gray-500 font-medium" align="start">{r.store_name || '—'}</Td>
              <Td align="end" className="font-medium text-gray-700">{formatNumber(r.sim_units_sold)}</Td>
              <Td align="end" className="font-medium text-gray-700">{formatDZD(r.sim_total_selling_price)}</Td>
              <Td align="end" className="font-medium text-gray-700">{formatDZD(r.storm_total)}</Td>
              <Td align="end" className="font-medium text-blue-600">{formatDZD(r.prelevement)}</Td>
              <Td align="end" className="font-medium text-gray-700">{formatDZD(r.accessories_total_selling)}</Td>
              <Td align="end" className="text-red-600 font-medium">{formatDZD(r.debt_total)}</Td>
              <Td align="end" className="text-red-600 font-medium">{formatDZD(r.cashier_advance_total)}</Td>
              <Td align="end" className={`font-black tracking-tight ${r.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatDZD(r.gross_profit)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PerStoreTab({ data, t }) {
  const rows = data.per_store || [];
  if (rows.length === 0) return <div className="p-8 text-center text-gray-500">{t('reports.no_activity')}</div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 text-start">
      {rows.map((s) => (
        <div key={s.store_id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
            <div className="font-bold text-gray-900 flex items-center gap-2 text-lg"><Building2 size={20} className="text-red-600" /> {s.store_name}</div>
            <div className="text-end">
               <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('range.store_profit')}</div>
               <div className={`text-xl font-black tracking-tight ${s.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatDZD(s.gross_profit)}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm flex-1">
            <KvCard label={t('reports.sim_units')}    value={formatNumber(s.sim_units_sold)} bg="bg-gray-50/50" border={false}/>
            <KvCard label={t('reports.sim_revenue')}  value={formatDZD(s.sim_total_selling_price)} bg="bg-gray-50/50" border={false}/>
            <KvCard label={t('daily.storm_revenue')}   value={formatDZD(s.storm_total)} bg="bg-gray-50/50" border={false}/>
            <KvCard label={t('range.prelevement')}  value={formatDZD(s.prelevement)} bg="bg-blue-50/50" color="blue" border={false}/>
            <div className="col-span-2 grid grid-cols-2 gap-3 mt-1">
              <KvCard label={t('reports.accessories')}  value={formatDZD(s.accessories_total_selling)} bg="bg-gray-50/50" border={false}/>
              <KvCard label={t('daily.debts_issued')} value={formatDZD(s.debt_total)} color="red" bg="bg-red-50/30" border={false}/>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DebtsTab({ data, t }) {
  const rows = data.debts || [];
  const total = rows.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  if (rows.length === 0) return <div className="p-8 text-center text-gray-500">{t('reports.no_activity')}</div>;
  return (
    <div className="space-y-4 text-start">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-red-100 rounded-full text-red-600"><AlertCircle size={20}/></div>
           <div><div className="font-bold text-red-900">{t('range.unpaid_debts')}</div><div className="text-sm font-medium text-red-700">{rows.length} {t('range.debts_recorded')}</div></div>
        </div>
        <div className="text-2xl font-black text-red-700 tracking-tight">{formatDZD(total)}</div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50/80 backdrop-blur-sm">
            <tr>
              <Th align="start">{t('reports.when')}</Th>
              <Th align="start">{t('reports.customer')}</Th>
              <Th align="start">{t('reports.phone')}</Th>
              <Th align="start">{t('reports.profession')}</Th>
              <Th align="start">{t('reports.description')}</Th>
              <Th align="end">{t('range.amount_owed')}</Th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {rows.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                <Td className="text-gray-500 whitespace-nowrap font-medium text-xs" align="start">{formatDateTime(d.created_at)}</Td>
                <Td className="font-bold text-gray-900" align="start">{d.customer?.full_name || '—'}</Td>
                <Td className="text-gray-600 font-mono text-xs font-medium" align="start">{d.customer?.phone_number || '—'}</Td>
                <Td className="text-gray-500" align="start">{d.customer?.profession || '—'}</Td>
                <Td className="text-gray-700 max-w-xs truncate" title={d.description} align="start">{d.description || '—'}</Td>
                <Td align="end" className="text-red-600 font-bold">{formatDZD(d.amount)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdvancesTab({ data, t }) {
  const rows = data.advances || [];
  if (rows.length === 0) return <div className="p-8 text-center text-gray-500">{t('reports.no_activity')}</div>;
  const totals = rows.reduce((acc, r) => ({ adv: acc.adv + (Number(r.advance_total) || 0), rep: acc.rep + (Number(r.repayment_total) || 0), out: acc.out + (Number(r.outstanding_balance) || 0) }), { adv: 0, rep: 0, out: 0 });
  return (
    <div className="space-y-6 text-start">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi label={t('range.total_advances')} value={formatDZD(totals.adv)} color="red" icon={<Wallet size={16}/>} />
        <Kpi label={t('range.total_repayments')}   value={formatDZD(totals.rep)} color="green" icon={<CheckCircle2 size={16}/>}/>
        <Kpi label={t('range.net_outstanding')} value={formatDZD(totals.out)} icon={<TrendingUp size={16}/>}/>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50/80 backdrop-blur-sm">
            <tr>
              <Th align="start">{t('reports.cashier')}</Th>
              <Th align="end">{t('range.advances_taken')}</Th>
              <Th align="end">{t('range.repayments_made')}</Th>
              <Th align="end">{t('range.outstanding_from_range')}</Th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.cashier_id} className="hover:bg-gray-50 transition-colors">
                <Td className="font-bold text-gray-900" align="start">{r.cashier_full_name || `#${r.cashier_id}`}</Td>
                <Td align="end" className="text-red-600 font-medium">{formatDZD(r.advance_total)}</Td>
                <Td align="end" className="text-emerald-600 font-medium">{formatDZD(r.repayment_total)}</Td>
                <Td align="end" className="font-black tracking-tight">{formatDZD(r.outstanding_balance)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExpensesTab({ data, t }) {
  const cat = data.expenses_by_category || { utility: 0, inventory: 0, other: 0 };
  const total = (Number(cat.utility) || 0) + (Number(cat.inventory) || 0) + (Number(cat.other) || 0);

  if (total === 0) return <div className="p-8 text-center text-gray-500">{t('reports.no_activity')}</div>;
  const pct = (n) => (total > 0 ? Math.round((Number(n) / total) * 100) : 0);

  const rows = [
    { key: 'utility',   label: t('range.util_bills'),   amount: cat.utility,   color: 'from-orange-500 to-amber-400' },
    { key: 'inventory', label: t('range.store_inv'), amount: cat.inventory, color: 'from-blue-500 to-indigo-400' },
    { key: 'other',     label: t('range.other_exp'),  amount: cat.other,     color: 'from-gray-500 to-gray-400' },
  ];

  return (
    <div className="space-y-6 text-start">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-full text-red-600"><Receipt size={24}/></div>
          <div>
            <div className="text-sm font-bold text-red-900 uppercase tracking-wider">{t('range.total_expenses')}</div>
            <div className="text-sm font-medium text-red-700 mt-0.5">{t('range.money_removed')}</div>
          </div>
        </div>
        <span className="text-3xl font-black text-red-700 tracking-tight">{formatDZD(total)}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {rows.map((r) => (
            <div key={r.key} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{r.label}</div>
              <div className="text-2xl font-black text-gray-900">{formatDZD(r.amount)}</div>
              <div className="mt-4 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${r.color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${pct(r.amount)}%` }} />
              </div>
              <div className="mt-2 text-xs font-semibold text-gray-500 text-end">{pct(r.amount)}%</div>
            </div>
        ))}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub, color = 'gray' }) {
  const colors = { gray: 'text-gray-900', green: 'text-green-600', red: 'text-red-600', blue: 'text-blue-600' };
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between text-start">
      <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-2">{icon && <span className="text-gray-400">{icon}</span>} {label}</div>
      <div className={`text-2xl sm:text-3xl font-black tracking-tight ${colors[color]}`}>{value}</div>
      {sub && <div className="text-xs font-medium text-gray-500 mt-2 bg-gray-50 inline-block px-2 py-1 rounded-md w-max">{sub}</div>}
    </div>
  );
}

function KvCard({ label, value, sub, color = 'gray', bg = 'bg-gray-50', border = true }) {
  const colors = { gray: 'text-gray-900', green: 'text-green-700', red: 'text-red-700', blue: 'text-blue-700' };
  return (
    <div className={`p-3 rounded-xl ${bg} ${border ? 'border border-gray-100' : ''} text-start`}>
      <div className="text-xs font-semibold text-gray-500 mb-1">{label}</div>
      <div className={`text-lg font-bold tracking-tight ${colors[color]}`}>{value}</div>
      {sub && <div className="text-[10px] font-medium text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function Th({ children, align = 'left' }) {
  const alignCls = align === 'end' || align === 'right' ? 'text-end' : 'text-start';
  return <th className={`px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider ${alignCls}`}>{children}</th>;
}

function Td({ children, align = 'left', className = '' }) {
  const alignCls = align === 'end' || align === 'right' ? 'text-end' : 'text-start';
  return <td className={`px-5 py-4 whitespace-nowrap ${alignCls} ${className}`}>{children}</td>;
}
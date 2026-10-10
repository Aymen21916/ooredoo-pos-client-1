import { useState, useMemo, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import DateRangePicker from '../../components/DateRangePicker';
import { useLanguage } from '../../context/LanguageContext';
import {
  Calendar, RefreshCw, AlertCircle, AlertTriangle, TrendingUp, Coins,
  Users, Building2, Receipt, Smartphone, Zap, CreditCard, Wallet,
  FileText, BarChart3, Filter, CheckCircle2, ArrowRight, Award
} from 'lucide-react';
import { AlertCircle as RxAlertCircle, BarChart3 as RxBarChart3, Building2 as RxBuilding2, Calendar as RxCalendar, Coins as RxCoins, CreditCard as RxCreditCard, Filter as RxFilter, Minus as RxMinus, Percent as RxPercent, Receipt as RxReceipt, RefreshCw as RxRefreshCw, Smartphone as RxSmartphone, TrendingDown as RxTrendingDown, TrendingUp as RxTrendingUp, Trophy as RxTrophy, Users as RxUsers, Wallet as RxWallet, Zap as RxZap } from 'lucide-react';

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
  const [ledgerRange, setLedgerRange] = useState(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return { from: `${today.slice(0, 7)}-01`, to: today };
  });
  
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
          <DateRangePicker
            hideWarning
            className="flex-1 w-full"
            range={{ from, to }}
            onRangeChange={(r) => { setFrom(r.from); setTo(r.to); }}
            labels={{ from: t('range.date_from', 'From'), to: t('range.date_to', 'To') }}
          />
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
      <RxStatistics />
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

const rxFormatPct = (n) => (n === null || n === undefined ? '—' : `${Number(n).toFixed(1)} %`);

const rxFormatDateShort = (s) =>
  s ? new Date(s).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' }) : '—';

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

const RX_COLORS = {
  gray: 'text-gray-900', red: 'text-red-600', green: 'text-green-600', blue: 'text-blue-600', amber: 'text-amber-600',
};

const RxKvCard = ({ label, value, sub, color = 'gray', icon: Icon, delta }) => (
  <div className="bg-white rounded-2xl p-4 ring-1 ring-gray-200 shadow-sm">
    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400">
      <span>{label}</span>
      {Icon && <Icon size={15} />}
    </div>
    <div className={`mt-1.5 text-xl font-extrabold ${RX_COLORS[color] || RX_COLORS.gray}`}>{value}</div>
    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
      {delta !== undefined && <RxDelta value={delta} />}
      {sub && <span>{sub}</span>}
    </div>
  </div>
);

/** Period-over-period % change badge (null = no previous data). */

const RxDelta = ({ value }) => {
  if (value === null || value === undefined) return <span className="inline-flex items-center gap-0.5 text-gray-400"><RxMinus size={12} /> n/a</span>;
  const up = value > 0;
  const flat = value === 0;
  const Icon = flat ? RxMinus : up ? RxTrendingUp : RxTrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${flat ? 'text-gray-500' : up ? 'text-green-600' : 'text-red-600'}`}>
      <Icon size={12} /> {Math.abs(value).toFixed(1)} %
    </span>
  );
};

const RxErrorBanner = ({ message }) =>
  message ? (
    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2 shadow-sm">
      <RxAlertCircle size={18} className="mt-0.5 flex-shrink-0 text-red-600" />
      <span className="font-medium">{message}</span>
    </div>
  ) : null;

const RxNotice = ({ children, tone = 'amber' }) => (
  <div className={`rounded-xl border p-3 text-sm flex items-start gap-2 ${
    tone === 'green' ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'
  }`}>
    <span className="font-medium">{children}</span>
  </div>
);

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

const RxBar = ({ value, max, color = 'bg-red-500' }) => {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full min-w-[80px] rounded-full bg-gray-100 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const rxErrMsg = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

const rxUnwrap = (r) => r.data?.data;

const rxReportsApi = {
  /** GET /api/reports/stats */
  statistics: (params) => api.get('/reports/stats', { params }).then(rxUnwrap),
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

function RxStatistics() {
  const t = rxUseT();
  const [from, setFrom] = useState(rxMonthStartStr());
  const [to, setTo] = useState(rxTodayStr());
  const [storeId, setStoreId] = useState('');
  const [stores, setStores] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    rxFinancesApi.getRegisters().then(setStores).catch(() => setStores([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      setData(await rxReportsApi.statistics(rxCleanParams({ from, to, store_id: storeId })));
    } catch (err) {
      setError(rxErrMsg(err, t('common.action_failed', 'Action failed.')));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, storeId, t]);

  useEffect(() => { load(); /* first load */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxDaily = data ? Math.max(0, ...data.daily.map((d) => d.total_revenue)) : 0;

  return (
    <div className="space-y-6">
      <RxPageHeader icon={RxBarChart3} title={t('stats.title', 'Statistics')} subtitle={t('stats.subtitle', 'Sales, profit, cashiers, expenses and advances')} />

      <RxDateRangeBar from={from} to={to} setFrom={setFrom} setTo={setTo} onSubmit={load} loading={loading}>
        <div className="md:w-56">
          <RxField label={t('stats.store', 'Store')}>
            <RxSelect value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              <option value="">{t('stats.all_stores', 'All stores')}</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </RxSelect>
          </RxField>
        </div>
      </RxDateRangeBar>

      <RxErrorBanner message={error} />
      {loading && <RxSpinner />}

      {!loading && data && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <RxKvCard icon={RxCoins} label={t('stats.total_revenue', 'Total revenue')} value={rxFormatDZD(data.sales.total_revenue, 0)}
              delta={data.previous_period.change_pct.total_revenue} sub={t('stats.vs_previous', 'vs previous period')} />
            <RxKvCard icon={RxTrendingUp} color="green" label={t('stats.gross_profit', 'Gross profit')} value={rxFormatDZD(data.profit.gross_profit, 0)}
              delta={data.previous_period.change_pct.gross_profit} sub={`${t('stats.margin', 'Margin')} ${rxFormatPct(data.profit.margin_pct)}`} />
            <RxKvCard icon={RxPercent} color="blue" label={t('range.prelevement', 'Prélèvement')} value={rxFormatDZD(data.profit.prelevement, 0)}
              sub={data.profit.prelevement_included ? `${rxFormatDZD(data.profit.manual_recharges, 0)} ${t('stats.manual_recharges', 'manual recharges')}` : t('stats.not_in_store_view', 'Global only — excluded in a store view')} />
            <RxKvCard icon={RxReceipt} color="red" label={t('stats.expenses', 'Expenses')} value={rxFormatDZD(data.profit.expenses, 0)} />
            <RxKvCard icon={RxWallet} color={data.profit.net_profit >= 0 ? 'green' : 'red'} label={t('stats.net_profit', 'Net profit')} value={rxFormatDZD(data.profit.net_profit, 0)}
              sub={t('stats.net_rule', 'gross + prélèvement − expenses')} />
          </div>

          <p className="text-xs text-gray-400">
            {rxFormatDateShort(data.from)} → {rxFormatDateShort(data.to)} · {data.days} {t('reports.days_selected', 'days')} ·{' '}
            {t('stats.previous', 'Previous')}: {rxFormatDateShort(data.previous_period.from)} → {rxFormatDateShort(data.previous_period.to)}
          </p>

          {/* Sales breakdown */}
          <RxCard title={t('stats.sales_breakdown', 'Sales breakdown')} icon={RxCreditCard}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <RxKvCard icon={RxSmartphone} label="SIM" value={rxFormatDZD(data.sales.sim.revenue, 0)}
                sub={`${rxFormatNumber(data.sales.sim.units)} ${t('stats.units', 'units')} · ${t('stats.profit', 'profit')} ${rxFormatDZD(data.sales.sim.profit, 0)}`} />
              <RxKvCard icon={RxCreditCard} label={t('stats.products', 'Products')} value={rxFormatDZD(data.sales.product.revenue, 0)}
                sub={`${rxFormatNumber(data.sales.product.units)} ${t('stats.units', 'units')} · ${t('stats.profit', 'profit')} ${rxFormatDZD(data.sales.product.profit, 0)}`} />
              <RxKvCard icon={RxZap} label="Storm" value={rxFormatDZD(data.sales.storm.amount, 0)}
                sub={`${rxFormatNumber(data.sales.storm.entries)} ${t('stats.entries', 'entries')}`} />
              <RxKvCard icon={RxSmartphone} label={t('stats.app_install', 'App installations')} value={rxFormatNumber(data.sales.app_installation.count)}
                sub={`${t('stats.commission', 'Commission')} ${rxFormatDZD(data.sales.app_installation.commission, 0)}`} />
            </div>
            <p className="mt-3 text-xs text-gray-400">{data.profit.rule}</p>
          </RxCard>

          {/* Daily series */}
          <RxCard title={t('stats.daily', 'Daily revenue & profit')} icon={RxBarChart3}>
            {data.daily.length === 0 ? <RxEmpty>{t('common.no_data', 'No data for this period.')}</RxEmpty> : (
              <RxTable>
                <thead><tr><RxTh>{t('stats.date', 'Date')}</RxTh><RxTh align="end">SIM</RxTh><RxTh align="end">{t('stats.products', 'Products')}</RxTh><RxTh align="end">Storm</RxTh><RxTh align="end">{t('stats.total_revenue', 'Total revenue')}</RxTh><RxTh align="end">{t('stats.gross_profit', 'Gross profit')}</RxTh><RxTh>&nbsp;</RxTh></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {data.daily.map((d) => (
                    <tr key={d.date}>
                      <RxTd>{rxFormatDateShort(d.date)}</RxTd>
                      <RxTd align="end">{rxFormatDZD(d.sim_revenue, 0)}</RxTd>
                      <RxTd align="end">{rxFormatDZD(d.product_revenue, 0)}</RxTd>
                      <RxTd align="end">{rxFormatDZD(d.storm_amount, 0)}</RxTd>
                      <RxTd align="end" className="font-semibold">{rxFormatDZD(d.total_revenue, 0)}</RxTd>
                      <RxTd align="end" className="font-semibold text-green-600">{rxFormatDZD(d.gross_profit, 0)}</RxTd>
                      <RxTd className="w-40"><RxBar value={d.total_revenue} max={maxDaily} /></RxTd>
                    </tr>
                  ))}
                </tbody>
              </RxTable>
            )}
          </RxCard>

          {/* Per store */}
          {data.per_store.length > 0 && (
            <RxCard title={t('range.per_store', 'Per store')} icon={RxBuilding2}>
              <RxTable>
                <thead><tr><RxTh>{t('stats.store', 'Store')}</RxTh><RxTh align="end">{t('stats.total_revenue', 'Total revenue')}</RxTh><RxTh align="end">{t('stats.gross_profit', 'Gross profit')}</RxTh><RxTh align="end">{t('stats.margin', 'Margin')}</RxTh><RxTh align="end">{t('stats.expenses', 'Expenses')}</RxTh><RxTh align="end">{t('stats.after_expenses', 'After expenses')}</RxTh></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {data.per_store.map((s) => (
                    <tr key={s.store_id}>
                      <RxTd className="font-medium">{s.store_name || `#${s.store_id}`}</RxTd>
                      <RxTd align="end">{rxFormatDZD(s.total_revenue, 0)}</RxTd>
                      <RxTd align="end" className="text-green-600 font-semibold">{rxFormatDZD(s.gross_profit, 0)}</RxTd>
                      <RxTd align="end">{rxFormatPct(s.margin_pct)}</RxTd>
                      <RxTd align="end" className="text-red-600">{rxFormatDZD(s.expenses, 0)}</RxTd>
                      <RxTd align="end" className={`font-semibold ${s.profit_after_expenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>{rxFormatDZD(s.profit_after_expenses, 0)}</RxTd>
                    </tr>
                  ))}
                </tbody>
              </RxTable>
            </RxCard>
          )}

          {/* Cashiers */}
          <RxCard title={t('stats.cashiers', 'Cashiers')} icon={RxUsers}
            right={<span className="text-xs text-gray-500">{data.cashiers.with_sales_count}/{data.cashiers.active_count} {t('stats.with_sales', 'with sales')}</span>}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              {[['sim', 'SIM', rxFormatNumber], ['product', t('stats.products', 'Products'), rxFormatNumber], ['storm', 'Storm', (v) => rxFormatDZD(v, 0)], ['app_installation', t('stats.app_install', 'App installations'), rxFormatNumber]].map(([key, label, fmt]) => {
                const top = data.cashiers.top[key];
                return (
                  <RxKvCard key={key} icon={RxTrophy} color="amber" label={`${t('stats.top', 'Top')} ${label}`}
                    value={top ? top.cashier_full_name : '—'} sub={top ? fmt(top.value) : t('stats.no_activity', 'No activity')} />
                );
              })}
            </div>
            <RxTable>
              <thead><tr><RxTh>#</RxTh><RxTh>{t('stats.cashier', 'Cashier')}</RxTh><RxTh>{t('stats.store', 'Store')}</RxTh><RxTh align="end">{t('stats.total_revenue', 'Total revenue')}</RxTh><RxTh align="end">{t('stats.gross_profit', 'Gross profit')}</RxTh></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {data.cashiers.top_by_profit.map((c, i) => (
                  <tr key={c.cashier_id}>
                    <RxTd>{i + 1}</RxTd><RxTd className="font-medium">{c.cashier_full_name}</RxTd><RxTd>{c.store_name || '—'}</RxTd>
                    <RxTd align="end">{rxFormatDZD(c.total_revenue, 0)}</RxTd>
                    <RxTd align="end" className="font-semibold text-green-600">{rxFormatDZD(c.gross_profit, 0)}</RxTd>
                  </tr>
                ))}
              </tbody>
            </RxTable>
          </RxCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expenses */}
            <RxCard title={t('stats.expenses', 'Expenses')} icon={RxReceipt}>
              <div className="space-y-2 text-sm">
                {Object.entries(data.expenses.by_category).map(([cat, amount]) => (
                  <div key={cat} className="flex items-center justify-between gap-3">
                    <span className="capitalize text-gray-600">{cat}</span>
                    <div className="flex-1"><RxBar value={amount} max={data.expenses.total} color="bg-red-400" /></div>
                    <span className="font-semibold">{rxFormatDZD(amount, 0)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-gray-100 font-bold"><span>Total</span><span>{rxFormatDZD(data.expenses.total, 0)}</span></div>
              </div>
              {data.expenses.cash_collected_not_counted > 0 && (
                <div className="mt-4"><RxNotice tone="green">
                  {t('stats.cash_collected', 'Cash collected (nightly sweep, not counted as an expense)')}: {rxFormatDZD(data.expenses.cash_collected_not_counted, 0)}
                </RxNotice></div>
              )}
            </RxCard>

            {/* Advances & debts */}
            <RxCard title={t('stats.advances_debts', 'Advances & debts')} icon={RxWallet}>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <RxKvCard label={t('stats.advanced', 'Advanced')} value={rxFormatDZD(data.advances.advanced, 0)} />
                <RxKvCard label={t('stats.repaid', 'Repaid')} value={rxFormatDZD(data.advances.repaid, 0)} color="green" />
                <RxKvCard label={t('stats.net_period', 'Net')} value={rxFormatDZD(data.advances.net_period, 0)} color="amber" />
              </div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span>{t('stats.outstanding', 'Outstanding advances')}</span><span className="text-red-600">{rxFormatDZD(data.advances.outstanding_total, 0)}</span>
              </div>
              {data.advances.outstanding_by_cashier.length === 0 ? <RxEmpty>{t('stats.none_outstanding', 'No outstanding advance.')}</RxEmpty> : (
                <ul className="divide-y divide-gray-100 text-sm">
                  {data.advances.outstanding_by_cashier.map((a) => (
                    <li key={a.cashier_id} className="flex justify-between py-1.5"><span>{a.cashier_full_name}</span><span className="font-medium">{rxFormatDZD(a.outstanding, 0)}</span></li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                <RxAlertCircle size={16} className="text-amber-500" />
                {t('range.client_debts', 'Client debts')}: <b>{rxFormatDZD(data.debts.total, 0)}</b> ({data.debts.count})
              </div>
            </RxCard>
          </div>

          {/* Prélèvement by month */}
          <RxCard title={t('stats.prelevement_month', 'Prélèvement by month')} icon={RxPercent}>
            {data.prelevement_by_month.length === 0 ? <RxEmpty>{t('stats.no_prelevement', 'No manual recharge in this period.')}</RxEmpty> : (
              <RxTable>
                <thead><tr><RxTh>{t('stats.month', 'Month')}</RxTh><RxTh align="end">{t('stats.manual_recharges', 'Manual recharges')}</RxTh><RxTh align="end">{t('range.prelevement', 'Prélèvement')}</RxTh></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {data.prelevement_by_month.map((m) => (
                    <tr key={m.month}><RxTd>{m.month}</RxTd><RxTd align="end">{rxFormatDZD(m.manual_recharges, 0)}</RxTd><RxTd align="end" className="font-semibold text-blue-600">{rxFormatDZD(m.prelevement, 0)}</RxTd></tr>
                  ))}
                </tbody>
              </RxTable>
            )}
          </RxCard>
        </>
      )}
    </div>
  );
}
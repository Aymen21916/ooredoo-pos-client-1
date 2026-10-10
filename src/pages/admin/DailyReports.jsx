import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import DateRangePicker, { SingleDatePicker } from '../../components/Daterangepicker';
import { useLanguage } from '../../context/LanguageContext';
import {
  FileText, Calendar, Eye, X, RefreshCw, AlertTriangle,
  CheckCircle2, Building2, Wallet, TrendingUp, AlertCircle, Lock,
  Smartphone, Zap, CreditCard, Receipt, Coins, Download, ChevronDown, Award
} from 'lucide-react';
import { AlertCircle as RxAlertCircle, AlertTriangle as RxAlertTriangle, CheckCircle2 as RxCheckCircle2, Coins as RxCoins, Gift as RxGift, MapPin as RxMapPin, Minus as RxMinus, Plus as RxPlus, PlusCircle as RxPlusCircle, RefreshCw as RxRefreshCw, Repeat as RxRepeat, Scale as RxScale, Store as RxStore, TrendingDown as RxTrendingDown, TrendingUp as RxTrendingUp, Wallet as RxWallet } from 'lucide-react';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDZD = (amount) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 2 }).format(amount || 0);

const formatDateLong = (dateString) => new Date(dateString).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const formatDateShort = (dateString) => new Date(dateString).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
const formatTime = (ts) => (ts ? new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—');

export default function DailyReports() {
  const { t } = useLanguage();
  const today = todayStr();

  const [selectedDate, setSelectedDate] = useState(today);
  const [preview, setPreview]           = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [reports, setReports]           = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [generating, setGenerating]     = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  const [openReport, setOpenReport] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadPreview = useCallback(async (date) => {
    setPreviewLoading(true); setError('');
    try {
      const r = await api.get('/reports/preview', { params: { date } });
      setPreview(r.data.data);
    } catch (err) {
      setPreview(null); setError(err.response?.data?.message || t('common.action_failed'));
    } finally {
      setPreviewLoading(false);
    }
  }, [t]);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const r = await api.get('/reports', { params: { limit: 100 } });
      setReports(r.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);
  useEffect(() => { if (selectedDate) loadPreview(selectedDate); }, [selectedDate, loadPreview]);

  const handleGenerate = async () => {
    if (!preview?.can_generate) return;

    const summary = preview.stores_summary
      .filter((s) => !s.already_generated && s.sessions_included > 0)
      .map((s) => `• ${s.store_name}: ${s.sessions_included} session(s), revenue ${formatDZD(s.total_revenue)}`)
      .join('\n');

    if (!window.confirm(`Generate end-of-day report(s) for ${selectedDate}?\n\n${summary}\n\nThis is permanent.`)) {
      return;
    }

    setGenerating(true); setError(''); setSuccess('');
    try {
      const r = await api.post('/reports/generate', { date: selectedDate });
      const generatedCount = r.data.data.generated.length;
      setSuccess(`Generated ${generatedCount} report(s) for ${selectedDate}.`);
      await Promise.all([loadPreview(selectedDate), loadReports()]);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      if (err.response?.data?.code === 'OPEN_SESSIONS_BLOCKING') {
        const force = window.confirm(`${err.response.data.message}\n\nForce-close those sessions now and continue?`);
        if (force) {
          try {
            const r = await api.post('/reports/generate', { date: selectedDate, force_close_open_sessions: true });
            setSuccess(`Generated ${r.data.data.generated.length} report(s) for ${selectedDate} (force-closed open sessions).`);
            await Promise.all([loadPreview(selectedDate), loadReports()]);
            setTimeout(() => setSuccess(''), 5000);
          } catch (err2) { setError(err2.response?.data?.message || t('common.action_failed')); }
        }
      } else {
        setError(err.response?.data?.message || t('common.action_failed'));
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadCsv = async (report) => {
    try {
      const r = await api.get(`/reports/${report.id}/export.csv`, { responseType: 'blob' });
      const filename = `report_${report.report_date}_${(report.store_name || 'store').replace(/\W+/g, '-')}.csv`;
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (err) {
      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try { const json = JSON.parse(text); setError(`Backend Error: ${json.message}`); } catch (e) { setError('Server crashed.'); }
      } else { setError(err.response?.data?.message || 'Failed to download CSV.'); }
    }
  };

  const openDetail = async (report) => {
    setDetailLoading(true); setOpenReport({ ...report, snapshot: null }); 
    try {
      const r = await api.get(`/reports/${report.id}`);
      setOpenReport(r.data.data);
    } catch (err) { console.error(err); setOpenReport(null); } 
    finally { setDetailLoading(false); }
  };

  return (
    <div className="space-y-6 pb-12 text-start">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-red-600" /> {t('daily.title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t('daily.subtitle')}</p>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3 shadow-sm"><AlertCircle size={20} className="mt-0.5 flex-shrink-0" /><span>{error}</span></div>}
      {success && <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 flex items-start gap-3 shadow-sm"><CheckCircle2 size={20} className="mt-0.5 flex-shrink-0" /><span>{success}</span></div>}

      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 end-0 w-64 h-64 bg-red-50 rounded-full blur-3xl -me-32 -mt-32 opacity-50 pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 relative z-10">
          <SingleDatePicker
            label={t('daily.report_date')}
            value={selectedDate}
            onChange={setSelectedDate}
            hint={selectedDate ? (selectedDate === today ? t('daily.target_today') : `${t('daily.target_history')} ${formatDateShort(selectedDate)}.`) : undefined}
          />

          <button onClick={handleGenerate} disabled={generating || previewLoading || !preview?.can_generate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            {generating ? <RefreshCw size={18} className="animate-spin" /> : <Lock size={18} />}
            {generating ? t('common.loading') : t('daily.generate_btn')}
          </button>
        </div>

        <div className="relative z-10 border-t border-gray-100 pt-6">
          {previewLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3"><RefreshCw className="animate-spin text-red-600" size={24} /></div>
          ) : preview ? (
            <PreviewPanel preview={preview} t={t} />
          ) : null}
        </div>
      </section>

      <section className="space-y-4 pt-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <FileText size={20} className="text-gray-400" /> {t('daily.archive')}
        </h2>

        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-x-auto custom-scrollbar">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80 backdrop-blur-sm">
              <tr>
                <th className="px-5 py-3.5 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('daily.date')}</th>
                <th className="px-5 py-3.5 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('daily.store')}</th>
                <th className="px-5 py-3.5 text-end text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('daily.sim_units')}</th>
                <th className="px-5 py-3.5 text-end text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('daily.revenue')}</th>
                <th className="px-5 py-3.5 text-end text-xs font-semibold text-indigo-500 uppercase tracking-wider">{t('daily.loyalty_disc')}</th>
                <th className="px-5 py-3.5 text-end text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('daily.profit')}</th>
                <th className="px-5 py-3.5 text-end text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('daily.margin')}</th>
                <th className="px-5 py-3.5 text-end text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('daily.debts')}</th>
                <th className="px-5 py-3.5 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('daily.generated_by')}</th>
                <th className="px-5 py-3.5 text-end text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('daily.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {reportsLoading ? (
                <tr><td colSpan="10" className="px-5 py-12 text-center"><RefreshCw className="inline animate-spin text-red-600" size={24} /></td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan="10" className="px-5 py-12 text-center text-gray-500 font-medium">{t('daily.no_reports')}</td></tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-start">{formatDateShort(r.report_date)}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700 flex items-center gap-1.5"><Building2 size={14} className="text-gray-400"/> {r.store_name}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-end text-gray-600 font-medium">{r.total_sim_units}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-end font-bold text-gray-900">{formatDZD(r.total_revenue)}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-end font-medium text-indigo-600 bg-indigo-50/10">−{formatDZD(r.loyalty_discount_dzd || 0)}</td>
                    <td className={`px-5 py-4 whitespace-nowrap text-sm text-end font-bold ${r.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatDZD(r.gross_profit)}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-end font-medium text-gray-500"><span className="bg-gray-100 px-2 py-0.5 rounded-full">{r.margin_pct.toFixed(1)}%</span></td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-end font-medium text-red-600">{formatDZD(r.total_debts)}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 text-start">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">{r.generated_by.charAt(0).toUpperCase()}</div>
                        @{r.generated_by}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-end">
                      <div className="inline-flex items-center gap-2">
                        <button onClick={() => handleDownloadCsv(r)} className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"><Download size={18} /></button>
                        <button onClick={() => openDetail(r)} className="inline-flex items-center justify-center p-2 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"><Eye size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {openReport && <DetailModal report={openReport} loading={detailLoading} onClose={() => setOpenReport(null)} t={t} />}
      <RxPoolManager />
      <RxDailyReconciliation />
      <RxRegistersManager />
    </div>
  );
}

function PreviewPanel({ preview, t }) {
  const totals = preview.stores_summary.reduce(
    (acc, s) => {
      if (!s.already_generated) { acc.revenue += s.total_revenue; acc.profit += s.gross_profit; acc.sim += s.total_sim_units; }
      return acc;
    }, { revenue: 0, profit: 0, sim: 0 }
  );

  return (
    <div className="space-y-5">
      {preview.blocking_open_sessions > 0 && (
        <div className="rounded-xl bg-orange-50 border border-orange-200 p-4 flex items-start gap-3 text-sm text-orange-900 shadow-sm">
          <AlertTriangle size={20} className="mt-0.5 flex-shrink-0 text-orange-600" />
          <div>
            <div className="font-bold text-orange-800 text-base">{preview.blocking_open_sessions} {t('daily.open_sessions_warning')}</div>
            <p className="mt-1 opacity-90">{t('daily.open_sessions_hint')}</p>
            <ul className="mt-2 space-y-1">
              {preview.open_sessions.map((s) => (
                <li key={s.session_id} className="flex items-center gap-2 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" />{s.cashier_name} <span className="opacity-75 font-normal">({s.store_name})</span></li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiTile icon={<Receipt size={18} />} label={t('daily.closed_sessions')} value={preview.closed_sessions} />
        <KpiTile icon={<Smartphone size={18} />} label={t('daily.sim_units')} value={totals.sim} />
        <KpiTile icon={<TrendingUp size={18} />} label={t('daily.projected_revenue')} value={formatDZD(totals.revenue)} />
        <KpiTile icon={<Coins size={18} />} label={t('daily.projected_profit')} value={formatDZD(totals.profit)} color={totals.profit >= 0 ? 'green' : 'red'} />
      </div>

      {preview.stores_summary.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-sm font-medium text-gray-500 text-center">{t('daily.no_closed_sessions')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {preview.stores_summary.map((s) => <StorePreviewCard key={s.store_id} store={s} t={t} />)}
        </div>
      )}
    </div>
  );
}

function KpiTile({ icon, label, value, color = 'gray' }) {
  const colors = { gray: 'text-gray-900 bg-gray-50 border-gray-200', green: 'text-green-700 bg-green-50 border-green-200', red: 'text-red-700 bg-red-50 border-red-200' };
  return (
    <div className={`rounded-xl border p-4 transition-shadow hover:shadow-sm ${colors[color]}`}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 opacity-80 mb-2">{icon} {label}</div>
      <div className="text-xl sm:text-2xl font-black tracking-tight text-start">{value}</div>
    </div>
  );
}

function StorePreviewCard({ store, t }) {
  return (
    <div className={`rounded-xl border p-5 transition-all text-start ${store.already_generated ? 'bg-gray-50/80 border-gray-200 opacity-80' : 'bg-white border-gray-200 shadow-sm hover:shadow-md'}`}>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
        <div className="font-bold text-gray-900 flex items-center gap-2 text-lg"><Building2 size={18} className={store.already_generated ? 'text-gray-400' : 'text-red-500'} /> {store.store_name}</div>
        {store.already_generated ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-200 px-2.5 py-1 text-xs font-bold text-gray-600"><Lock size={12} /> {t('daily.generated')}</span>
        ) : store.sessions_included === 0 ? (
          <span className="inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-800">No closed sessions</span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800"><CheckCircle2 size={12} /> {t('daily.ready')}</span>
        )}
      </div>
      
      {store.sessions_included > 0 && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="flex justify-between items-center bg-gray-50 rounded-lg p-2"><span className="text-gray-500 font-medium">Sessions</span><span className="font-bold text-gray-900">{store.sessions_included}</span></div>
          <div className="flex justify-between items-center bg-gray-50 rounded-lg p-2"><span className="text-gray-500 font-medium">SIM Units</span><span className="font-bold text-gray-900">{store.total_sim_units}</span></div>
          <div className="flex justify-between items-center bg-gray-50 rounded-lg p-2"><span className="text-gray-500 font-medium">Revenue</span><span className="font-bold text-gray-900">{formatDZD(store.total_revenue)}</span></div>
          <div className="flex justify-between items-center bg-gray-50 rounded-lg p-2"><span className="text-gray-500 font-medium">Profit</span><span className={`font-black ${store.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatDZD(store.gross_profit)}</span></div>
          <div className="col-span-2 flex justify-between items-center bg-indigo-50/50 rounded-lg p-2 border border-indigo-100/50 mt-1"><span className="text-indigo-600 font-bold text-xs uppercase flex items-center gap-1"><Award size={12}/> Loyalty Disc.</span><span className="font-bold text-indigo-700">−{formatDZD(store.loyalty_discount_dzd || 0)}</span></div>
        </div>
      )}
    </div>
  );
}

function DetailModal({ report, loading, onClose, t }) {
  const snapshot = report?.snapshot || {};
  const sessions = snapshot.sessions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 sm:p-6 transition-opacity text-start">
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden ring-1 ring-white/10">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-white z-10 shrink-0">
          <div>
            <h3 className="font-black text-xl text-gray-900 flex items-center gap-2.5 tracking-tight"><div className="p-2 bg-red-100 text-red-600 rounded-lg"><FileText size={20} /></div>{report.store_name} — {formatDateLong(report.report_date)}</h3>
            <p className="text-sm text-gray-500 font-medium mt-1.5 flex items-center gap-1.5"><Lock size={14} className="text-gray-400" />Snapshot captured by @{report.generated_by} on {formatDateShort(report.created_at)} at {formatTime(report.created_at)}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-8">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-20 space-y-4"><RefreshCw className="animate-spin text-red-600" size={32} /></div>
          ) : (
            <>
              <div>
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">{t('daily.fin_summary')}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Kpi label={t('daily.total_revenue')} value={formatDZD(report.total_revenue)} icon={<TrendingUp size={16}/>} />
                  <Kpi label={t('daily.total_cogs')}    value={formatDZD(report.total_real_price)} icon={<Coins size={16}/>} />
                  <Kpi label={t('daily.gross_profit')} value={formatDZD(report.gross_profit)} color={report.gross_profit >= 0 ? 'green' : 'red'} sub={`${(report.margin_pct ?? 0).toFixed(1)}% margin`} icon={<Wallet size={16}/>} />
                  <Kpi label={t('daily.cashier_comms')} value={formatDZD(report.total_commissions)} icon={<Award size={16}/>} />
                  <Kpi label={t('daily.loyalty_disc')} value={`−${formatDZD(report.loyalty_discount_dzd || 0)}`} color="red" icon={<Award size={16}/>}/>
                  <Kpi label={t('daily.loyalty_rev')}  value={formatDZD(report.loyalty_driven_revenue || 0)} color="green" icon={<Award size={16}/>}/>
                  <Kpi label={t('daily.accessories')}   value={formatDZD(report.total_accessories)} icon={<CreditCard size={16}/>}/>
                  <Kpi label={t('daily.debts_issued')}  value={formatDZD(report.total_debts)} color="red" icon={<AlertCircle size={16}/>}/>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200 p-5 bg-white shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-1.5"><Wallet size={16} className="text-blue-500" /> {t('daily.global_pool')}</div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs font-medium text-gray-500 mb-1">Balance</div><div className="font-bold text-gray-900">{formatDZD(snapshot.global_pool?.available_balance)}</div></div>
                    <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs font-medium text-gray-500 mb-1">Bonus</div><div className="font-bold text-gray-900">{formatDZD(snapshot.global_pool?.available_bonus)}</div></div>
                    <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs font-medium text-gray-500 mb-1">Points</div><div className="font-bold text-gray-900">{(snapshot.global_pool?.available_points || 0).toLocaleString()}</div></div>
                  </div>
                </div>
                
                <div className="rounded-2xl border border-gray-200 p-5 bg-white shadow-sm flex flex-col justify-center">
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5"><Building2 size={16} className="text-emerald-500" /> {t('daily.expected_cash')}</div>
                  <div className="text-3xl font-black text-gray-900 tracking-tight">{formatDZD(snapshot.register?.cash_amount ?? snapshot.register_cash?.cash_amount)}</div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-1 flex items-center justify-between"><span>{t('daily.session_breakdowns')} ({sessions.length})</span></h4>
                <div className="space-y-3">
                  {sessions.map((s) => <SessionCard key={s.session_id} session={s} t={t} />)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, color = 'gray', icon }) {
  const colors = { gray: 'text-gray-900', green: 'text-green-600', red: 'text-red-600' };
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-2">{icon && <span className="text-gray-400">{icon}</span>}{label}</div>
      <div className={`text-xl font-black tracking-tight ${colors[color]}`}>{value}</div>
      {sub && <div className="text-xs font-medium text-gray-500 mt-1 bg-gray-50 inline-block px-2 py-0.5 rounded-md w-max">{sub}</div>}
    </div>
  );
}

function SessionCard({ session, t }) {
  const [expanded, setExpanded] = useState(false);
  const sim = session.sim_sales || [];
  const storm = session.storm_entries || [];
  const acc = session.accessory_sales || [];
  const debts = session.debts || [];
  const voidedCount = sim.filter((x) => x.is_voided).length + storm.filter((x) => x.is_voided).length + acc.filter((x) => x.is_voided).length + debts.filter((x) => x.is_voided).length;

  return (
    <div className={`border transition-all duration-200 rounded-xl overflow-hidden ${expanded ? 'border-red-200 shadow-md ring-1 ring-red-100' : 'border-gray-200 bg-white shadow-sm hover:border-gray-300'}`}>
      <button onClick={() => setExpanded(!expanded)} className={`w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 text-start transition-colors ${expanded ? 'bg-red-50/30' : 'hover:bg-gray-50'}`}>
        <div className="flex items-center gap-3 mb-3 sm:mb-0">
          <div className={`p-2 rounded-full flex items-center justify-center transition-transform duration-300 ${expanded ? 'bg-red-100 text-red-600 rotate-180' : 'bg-gray-100 text-gray-500'}`}><ChevronDown size={18} /></div>
          <div><div className="font-bold text-gray-900 text-base">{session.cashier_name}</div><div className="text-xs font-medium text-gray-500 flex items-center gap-1"><Building2 size={12}/> {session.store_name}</div></div>
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <SmallStat label="SIM Units" value={`${session.sim_units_sold}`} />
          <SmallStat label="Revenue" value={formatDZD(session.sim_total_selling_price + session.storm_total + session.accessories_total)} />
          <SmallStat label="Cash Exp." value={formatDZD(session.expected_register_cash)} />
          {voidedCount > 0 && <div className="bg-red-50 border border-red-100 px-3 py-1 rounded-lg text-end"><div className="text-[10px] font-bold uppercase text-red-400 tracking-wider">Voids</div><div className="font-bold text-red-600 text-sm">{voidedCount} items</div></div>}
        </div>
      </button>

      <div className={`transition-all duration-300 ease-in-out origin-top ${expanded ? 'block opacity-100' : 'hidden opacity-0'}`}>
        <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <KvRow label={t('daily.opening_cash')} value={formatDZD(session.opening_cash)} />
            <KvRow label={t('daily.sim_revenue')} value={formatDZD(session.sim_total_selling_price)} sub={`Cost ${formatDZD(session.sim_total_real_price)}`} />
            <KvRow label={t('daily.storm_revenue')} value={formatDZD(session.storm_total)} />
            <KvRow label={t('daily.accessories')} value={formatDZD(session.accessories_total)} />
            <KvRow label={t('daily.debts_issued')} value={formatDZD(session.debt_total)} color="red" />
            <KvRow label={t('daily.commissions')} value={formatDZD(session.total_cashier_benefit)} color="green" />
            <KvRow label={t('daily.points_generated')} value={(session.sim_total_points || 0).toLocaleString()} />
            <div className="bg-gray-50 p-2 rounded-lg -m-2"><KvRow label={t('daily.expected_cash')} value={formatDZD(session.expected_register_cash)} color="green" /></div>
          </div>
          <div className="space-y-4">
            {sim.length > 0   && <LineItemList icon={<Smartphone size={16} />} title={t('crm.sim_history')} items={sim} columns={['serial_number_snapshot', 'offer_name_snapshot', 'selling_price_snapshot']} headers={[t('crm.serial'), t('crm.offer'), t('crm.amount_paid')]} t={t} />}
            {storm.length > 0 && <LineItemList icon={<Zap size={16} />}        title={t('crm.storm_history')} items={storm} columns={['note', 'amount']} headers={[t('crm.note'), t('crm.amount_paid')]} t={t} />}
            {acc.length > 0   && <LineItemList icon={<CreditCard size={16} />} title={t('crm.accessories')} items={acc} columns={['product_name_snapshot', 'category_name_snapshot', 'price_snapshot']} headers={[t('crm.product'), t('crm.category'), t('crm.amount_paid')]} t={t} />}
            {debts.length > 0 && <LineItemList icon={<AlertCircle size={16} />} title={t('daily.debts_issued')} items={debts} columns={['description', 'amount']} headers={[t('crm.item_description'), t('crm.amount_dzd')]} t={t} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function SmallStat({ label, value }) {
  return (
    <div className="text-start sm:text-end">
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</div>
      <div className="font-bold text-gray-900 text-sm">{value}</div>
    </div>
  );
}

function KvRow({ label, value, sub, color = 'gray' }) {
  const colors = { gray: 'text-gray-900', green: 'text-green-600', red: 'text-red-600' };
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500 mb-0.5">{label}</div>
      <div className={`font-bold ${colors[color]}`}>{value}</div>
      {sub && <div className="text-[10px] font-medium text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function LineItemList({ icon, title, items, columns, headers, t }) {
  const isMoneyCol = (key) => /price|amount|snapshot/.test(key) && !/serial|name|category/.test(key);
  const renderCell = (item, key) => {
    const val = item[key];
    if (val == null) return '—';
    if (isMoneyCol(key) && typeof val === 'number') return formatDZD(val);
    if (key === 'amount' || key === 'price_snapshot' || key === 'selling_price_snapshot') return formatDZD(val);
    return String(val);
  };
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
        <span className="text-gray-400">{icon}</span> {title} <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-md mx-1">{items.length}</span>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-start">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                {headers.map((h, i) => <th key={i} className={`px-4 py-2.5 text-start text-xs font-semibold text-gray-500 ${i === headers.length - 1 ? 'text-end' : ''}`}>{h}</th>)}
                <th className="px-4 py-2.5 text-end text-xs font-semibold text-gray-500">Time</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className={`transition-colors hover:bg-gray-50/50 ${item.is_voided ? 'bg-red-50/30' : ''}`}>
                  {columns.map((col, i) => (
                    <td key={i} className={`px-4 py-3 ${i === columns.length - 1 ? 'text-end font-bold text-gray-900' : 'text-gray-700 font-medium'} ${item.is_voided ? 'line-through opacity-60' : ''}`}>
                      {renderCell(item, col)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-end text-gray-500 font-mono text-xs">{formatTime(item.sold_at || item.entered_at)}</td>
                  <td className="px-4 py-3 text-center">
                    {item.is_voided ? <span className="inline-flex rounded-md bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 ring-1 ring-inset ring-red-600/20">{t('ledger.voided')}</span> : <span className="inline-flex rounded-md bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700 ring-1 ring-inset ring-green-600/20">OK</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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

const rxFormatDZD = (n, digits = 2) =>
  new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: digits }).format(Number(n) || 0);

const rxFormatNumber = (n) => new Intl.NumberFormat('fr-DZ').format(Number(n) || 0);

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

const RX_FINANCES_PATHS = {
  pool: '/finances/pool',                        // GET  getPool           | POST updatePool
  poolSync: '/finances/pool/sync',               // POST syncPoolWithOoredoo
  poolConvert: '/finances/pool/convert-points',  // POST autoConvertPoints
  reconciliation: '/finances/reconciliation',    // GET  getDailyReconciliation
  registers: '/finances/registers',              // GET  getRegisters
  register: (id) => `/finances/registers/${id}`, // PUT  updateRegister
  manualLedger: '/finances/manual-ledger',       // GET  getManualLedger
};

const rxFinancesApi = {
  /** getPool -> { balance, bonus, points } */
  getPool: () => api.get(RX_FINANCES_PATHS.pool).then(rxUnwrap),

  /** syncPoolWithOoredoo -> { balance, bonus, points } (USSD *BalancePDV) */
  syncPool: () => api.post(RX_FINANCES_PATHS.poolSync).then(rxUnwrap),

  /** autoConvertPoints -> { balance, bonus, points, pointsConverted, dzdAdded } (USSD *582#) */
  convertPoints: () => api.post(RX_FINANCES_PATHS.poolConvert).then(rxUnwrap),

  /**
   * updatePool — logs a manual Side-Ledger entry.
   * actionType: 'RECHARGE' | 'REWARD'   amount: non-zero number (negatives allowed)
   */
  updatePool: ({ amount, actionType, note }) =>
    api.post(RX_FINANCES_PATHS.pool, { amount, actionType, note: note || '' }).then(rxUnwrap),

  /** getDailyReconciliation -> { timeline, opening, activity, audit } */
  getDailyReconciliation: () => api.get(RX_FINANCES_PATHS.reconciliation).then(rxUnwrap),

  /** getRegisters -> [{ id, name, location, current_cash }] */
  getRegisters: () => api.get(RX_FINANCES_PATHS.registers).then((r) => r.data?.data || []),

  /** updateRegister — type: 'add' | 'subtract', amount > 0 */
  updateRegister: (storeId, { type, amount, note }) =>
    api.put(RX_FINANCES_PATHS.register(storeId), { type, amount, note: note || undefined }).then(rxUnwrap),

  /** getManualLedger ?from&to -> { from, to, totals, truncated, items } */
  getManualLedger: (from, to) => api.get(RX_FINANCES_PATHS.manualLedger, { params: { from, to } }).then(rxUnwrap),
};

function RxPoolManager({ onChanged }) {
  const t = rxUseT();
  const [pool, setPool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');           // '' | 'sync' | 'convert' | 'entry'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [entry, setEntry] = useState({ actionType: 'RECHARGE', amount: '', note: '' });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setPool(await rxFinancesApi.getPool()); }
    catch (err) { setError(rxErrMsg(err, t('common.action_failed', 'Action failed.'))); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const run = async (key, fn, okMessage) => {
    setBusy(key); setError(''); setSuccess('');
    try {
      const res = await fn();
      setSuccess(typeof okMessage === 'function' ? okMessage(res) : okMessage);
      await load();
      onChanged?.();
    } catch (err) {
      setError(rxErrMsg(err, t('common.action_failed', 'Action failed.')));
    } finally {
      setBusy('');
    }
  };

  const sync = () => run('sync', rxFinancesApi.syncPool, t('pool.synced', 'Pool synced with Ooredoo.'));

  const convert = () => {
    if (!window.confirm(t('pool.convert_confirm', 'Convert all loyalty points to balance now? This cannot be undone.'))) return;
    run('convert', rxFinancesApi.convertPoints,
      (r) => `${t('pool.converted', 'Converted')} ${rxFormatNumber(r.pointsConverted)} ${t('ledger.pts', 'pts')} → ${rxFormatDZD(r.dzdAdded)}`);
  };

  const amountNum = parseFloat(entry.amount);
  const entryInvalid = !Number.isFinite(amountNum) || amountNum === 0;

  const submitEntry = (e) => {
    e.preventDefault();
    if (entryInvalid) return;
    run('entry', async () => {
      const r = await rxFinancesApi.updatePool({ amount: amountNum, actionType: entry.actionType, note: entry.note });
      setEntry((s) => ({ ...s, amount: '', note: '' }));
      return r;
    }, t('pool.entry_saved', 'Manual entry logged.'));
  };

  return (
    <div className="space-y-6">
      <RxPageHeader icon={RxWallet} title={t('pool.title', 'Global pool')} subtitle={t('pool.subtitle', 'Ooredoo balance, bonus and loyalty points')}
        right={
          <div className="flex gap-2">
            <RxSecondaryButton icon={RxRefreshCw} onClick={load} loading={loading}>{t('common.refresh', 'Refresh')}</RxSecondaryButton>
            <RxPrimaryButton icon={RxRefreshCw} onClick={sync} loading={busy === 'sync'} disabled={!!busy}>{t('pool.sync', 'Sync with Ooredoo')}</RxPrimaryButton>
          </div>
        } />

      <RxErrorBanner message={error} />
      {success && <RxNotice tone="green">{success}</RxNotice>}
      {loading && !pool && <RxSpinner />}

      {pool && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <RxKvCard icon={RxCoins} color="blue" label={t('pool.balance', 'Balance')} value={rxFormatDZD(pool.balance)} />
          <RxKvCard icon={RxGift} color="green" label={t('pool.bonus', 'Bonus')} value={rxFormatDZD(pool.bonus)} />
          <RxKvCard icon={RxRepeat} color="amber" label={t('pool.points', 'Loyalty points')} value={rxFormatNumber(pool.points)} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RxCard title={t('pool.convert_title', 'Convert loyalty points')} icon={RxRepeat}>
          <p className="text-sm text-gray-600 mb-4">
            {t('pool.convert_help', 'Takes a snapshot, runs the *582# conversion on Ooredoo, re-syncs the pool and logs the result.')}
          </p>
          <RxPrimaryButton icon={RxRepeat} onClick={convert} loading={busy === 'convert'} disabled={!!busy || !pool || pool.points <= 0}>
            {t('pool.convert', 'Convert points to DZD')}
          </RxPrimaryButton>
          {pool && pool.points <= 0 && <p className="mt-2 text-xs text-gray-400">{t('pool.no_points', 'No loyalty points to convert.')}</p>}
        </RxCard>

        <RxCard title={t('pool.entry_title', 'Manual entry')} icon={RxPlusCircle}>
          <form onSubmit={submitEntry} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <RxField label={t('ledger.type', 'Type')}>
                <RxSelect value={entry.actionType} onChange={(e) => setEntry({ ...entry, actionType: e.target.value })}>
                  <option value="RECHARGE">RECHARGE ({t('pool.dzd', 'DZD')})</option>
                  <option value="REWARD">REWARD ({t('ledger.pts', 'pts')})</option>
                </RxSelect>
              </RxField>
              <RxField label={t('ledger.amount', 'Amount')}>
                <RxTextInput type="number" step="any" placeholder="0" value={entry.amount} onChange={(e) => setEntry({ ...entry, amount: e.target.value })} />
              </RxField>
            </div>
            <RxField label={t('ledger.note', 'Note')}>
              <RxTextInput value={entry.note} maxLength={500} onChange={(e) => setEntry({ ...entry, note: e.target.value })} />
            </RxField>
            <p className="text-xs text-gray-400">{t('pool.negative_ok', 'A negative amount corrects a previous entry. Zero is not allowed.')}</p>
            <RxPrimaryButton type="submit" icon={RxPlusCircle} loading={busy === 'entry'} disabled={!!busy || entryInvalid}>
              {t('pool.save_entry', 'Save entry')}
            </RxPrimaryButton>
          </form>
        </RxCard>
      </div>
    </div>
  );
}

const RX_EPSILON = 0.005;

const RxAuditRow = ({ label, expected, actual, discrepancy, fmt }) => {
  const ok = Math.abs(discrepancy) < RX_EPSILON;
  return (
    <tr>
      <RxTd className="font-medium">{label}</RxTd>
      <RxTd align="end">{fmt(expected)}</RxTd>
      <RxTd align="end">{fmt(actual)}</RxTd>
      <RxTd align="end" className={`font-bold ${ok ? 'text-green-600' : 'text-red-600'}`}>
        {discrepancy > 0 ? '+' : ''}{fmt(discrepancy)}
      </RxTd>
      <RxTd align="center">
        {ok ? <RxCheckCircle2 size={18} className="inline text-green-500" /> : <RxAlertTriangle size={18} className="inline text-red-500" />}
      </RxTd>
    </tr>
  );
};

/**
 * getDailyReconciliation — the "logical day" starts at 06:00.
 * expected = opening + activity;  discrepancy = actual − expected.
 */

function RxDailyReconciliation() {
  const t = rxUseT();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await rxFinancesApi.getDailyReconciliation()); }
    catch (err) { setError(rxErrMsg(err, t('common.action_failed', 'Action failed.'))); setData(null); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const a = data?.activity;

  return (
    <div className="space-y-6">
      <RxPageHeader icon={RxScale} title={t('recon.title', 'Daily reconciliation')}
        subtitle={data ? `${t('recon.since', 'Since')} ${rxFormatDateTime(data.timeline.start)}` : t('recon.subtitle', 'Expected vs actual pool since 06:00')}
        right={<RxSecondaryButton icon={RxRefreshCw} onClick={load} loading={loading}>{t('common.refresh', 'Refresh')}</RxSecondaryButton>} />

      <RxErrorBanner message={error} />
      {loading && !data && <RxSpinner />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <RxKvCard label={t('recon.opening_balance', 'Opening balance (balance + bonus)')} value={rxFormatDZD(data.opening.solde_total)} color="blue" />
            <RxKvCard label={t('recon.opening_points', 'Opening points')} value={rxFormatNumber(data.opening.points)} color="amber" />
          </div>

          <RxCard title={t('recon.activity', 'Activity since opening')}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <RxKvCard label={t('recon.sim_points', 'SIM points earned')} value={rxFormatNumber(a.sim_points_earned)} />
              <RxKvCard label={t('recon.sim_cost', 'SIM buying cost')} value={`− ${rxFormatDZD(a.sim_buying_cost)}`} color="red" />
              <RxKvCard label={t('recon.storm', 'Storm sold')} value={`− ${rxFormatDZD(a.storm_sold)}`} color="red" />
              <RxKvCard label={t('recon.manual_recharges', 'Manual recharges')} value={`+ ${rxFormatDZD(a.manual_recharges)}`} color="green" />
              <RxKvCard label={t('recon.manual_rewards', 'Manual rewards (pts)')} value={`+ ${rxFormatNumber(a.manual_rewards)}`} color="green" />
              <RxKvCard label={t('recon.points_converted', 'Points converted')} value={`− ${rxFormatNumber(a.points_converted)}`} color="amber" />
              <RxKvCard label={t('recon.dzd_converted', 'DZD from conversion')} value={`+ ${rxFormatDZD(a.dzd_converted)}`} color="green" />
            </div>
          </RxCard>

          <RxCard title={t('recon.audit', 'Audit: expected vs actual')} icon={RxScale}>
            <RxTable>
              <thead><tr><RxTh>&nbsp;</RxTh><RxTh align="end">{t('recon.expected', 'Expected')}</RxTh><RxTh align="end">{t('recon.actual', 'Actual')}</RxTh><RxTh align="end">{t('recon.discrepancy', 'Discrepancy')}</RxTh><RxTh align="center">&nbsp;</RxTh></tr></thead>
              <tbody className="divide-y divide-gray-100">
                <RxAuditRow label={t('pool.balance', 'Balance')} fmt={rxFormatDZD} {...data.audit.balance} />
                <RxAuditRow label={t('pool.points', 'Loyalty points')} fmt={rxFormatNumber} {...data.audit.points} />
              </tbody>
            </RxTable>
            <p className="mt-3 text-xs text-gray-400">
              {t('recon.formula', 'Expected balance = opening + manual recharges + conversion − SIM cost − Storm. Expected points = opening + SIM points + rewards − converted.')}
            </p>
          </RxCard>
        </>
      )}
    </div>
  );
}

const RxRegisterCard = ({ store, onSaved, t }) => {
  const [type, setType] = useState('add');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const value = parseFloat(amount);
  const invalid = !Number.isFinite(value) || value <= 0 || (type === 'subtract' && value > store.current_cash);

  const submit = async (e) => {
    e.preventDefault();
    if (invalid) return;
    setSaving(true); setError('');
    try {
      await rxFinancesApi.updateRegister(store.id, { type, amount: value, note });
      setAmount(''); setNote('');
      onSaved(store);
    } catch (err) {
      setError(rxErrMsg(err, t('common.action_failed', 'Action failed.')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <RxCard className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900">{store.name}</h3>
          {store.location && <p className="flex items-center gap-1 text-xs text-gray-400"><RxMapPin size={12} /> {store.location}</p>}
        </div>
        <div className="text-end">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{t('registers.current_cash', 'Cash in register')}</div>
          <div className="text-xl font-extrabold text-gray-900">{rxFormatDZD(store.current_cash)}</div>
        </div>
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setType('add')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-inset ${type === 'add' ? 'bg-green-50 text-green-700 ring-green-300' : 'bg-white text-gray-500 ring-gray-200'}`}>
            <RxPlus size={14} /> {t('registers.add', 'Add')}
          </button>
          <button type="button" onClick={() => setType('subtract')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-inset ${type === 'subtract' ? 'bg-red-50 text-red-700 ring-red-300' : 'bg-white text-gray-500 ring-gray-200'}`}>
            <RxMinus size={14} /> {t('registers.subtract', 'Subtract')}
          </button>
        </div>
        <RxField label={t('ledger.amount', 'Amount')}>
          <RxTextInput type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </RxField>
        <RxField label={t('ledger.note', 'Note')}>
          <RxTextInput value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        </RxField>
        {type === 'subtract' && value > store.current_cash && (
          <p className="text-xs font-medium text-red-600">{t('registers.negative', 'This adjustment would make the register negative.')}</p>
        )}
        <RxErrorBanner message={error} />
        <RxPrimaryButton type="submit" loading={saving} disabled={invalid} className="w-full">{t('registers.apply', 'Apply adjustment')}</RxPrimaryButton>
      </form>
    </RxCard>
  );
};

/** getRegisters (list) + updateRegister (add / subtract cash for one store). */

function RxRegistersManager() {
  const t = rxUseT();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setStores(await rxFinancesApi.getRegisters()); }
    catch (err) { setError(rxErrMsg(err, t('common.action_failed', 'Action failed.'))); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const saved = async (store) => {
    setSuccess(`${store.name}: ${t('registers.updated', 'register updated.')}`);
    await load();
  };

  return (
    <div className="space-y-6">
      <RxPageHeader icon={RxStore} title={t('registers.title', 'Cash registers')} subtitle={t('registers.subtitle', 'Physical cash per store')}
        right={<RxSecondaryButton icon={RxRefreshCw} onClick={load} loading={loading}>{t('common.refresh', 'Refresh')}</RxSecondaryButton>} />
      <RxErrorBanner message={error} />
      {success && <RxNotice tone="green">{success}</RxNotice>}
      {loading && stores.length === 0 && <RxSpinner />}
      {!loading && stores.length === 0 && !error && <RxEmpty>{t('common.no_data', 'No store.')}</RxEmpty>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {stores.map((s) => <RxRegisterCard key={s.id} store={s} onSaved={saved} t={t} />)}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useLanguage } from '../../context/LanguageContext';
import { Wallet, Coins, Gift, Building2, PlusCircle, RefreshCw, X, CheckCircle2, ArrowRightLeft, ShieldCheck, AlertTriangle, FileEdit } from 'lucide-react';
import ManualLedgerHistory from './ManualLedgerHistory';

export default function CashManagement() {
  const { t } = useLanguage();
  const [globalPool, setGlobalPool] = useState({ balance: 0, bonus: 0, points: 0 });
  const [registers, setRegisters] = useState([]);
  const [auditData, setAuditData] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  
  const [activeModal, setActiveModal] = useState(null); 
  const [formData, setFormData] = useState({ amount: '', actionType: 'RECHARGE', note: '' });
  const [ledgerRange, setLedgerRange] = useState(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return { from: `${today.slice(0, 7)}-01`, to: today };
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchFinancials(); }, []);

  const fetchFinancials = async () => {
    try {
      setIsLoading(true);
      const [poolRes, registersRes, auditRes] = await Promise.all([
        api.get('/finances/pool').catch(() => ({ data: { data: { balance: 0, bonus: 0, points: 0 } } })),
        api.get('/finances/registers').catch(() => ({ data: { data: [] } })),
        api.get('/finances/reconciliation/today').catch(() => ({ data: { data: null } }))
      ]);
      setGlobalPool(poolRes.data.data);
      setRegisters(registersRes.data.data);
      setAuditData(auditRes.data.data);
    } catch (err) { console.error(err); } 
    finally { setIsLoading(false); }
  };

  const handleSyncOoredoo = async () => {
    setIsSyncing(true);
    try {
      await api.post('/finances/pool/sync');
      fetchFinancials();
    } catch (err) { alert(err.response?.data?.message || t('common.action_failed')); } 
    finally { setIsSyncing(false); }
  };

  const handleAutoConvert = async () => {
    if (!window.confirm("Execute *582# Conversion via Ooredoo USSD?")) return;
    setIsConverting(true);
    try {
      const res = await api.post('/finances/pool/convert/ussd');
      alert(`Success! ${res.data.data.pointsConverted} points were converted into ${res.data.data.dzdAdded} DZD.`);
      fetchFinancials();
    } catch (err) { alert(err.response?.data?.message || t('common.action_failed')); } 
    finally { setIsConverting(false); }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (activeModal === 'pool') {
        await api.put('/finances/pool', {
          amount: Number(formData.amount), actionType: formData.actionType, note: formData.note
        });
      } else if (activeModal === 'register') {
        await api.put(`/finances/registers/${selectedRegister.id}`, {
            amount: Number(formData.amount),
            type: formData.actionType === 'DEPOSIT' ? 'add' : 'subtract',
            note: formData.note
        });
      }
      setActiveModal(null);
      fetchFinancials();
    } catch (err) { alert(err.response?.data?.message || t('common.action_failed')); } 
    finally { setIsSubmitting(false); }
  };

  const formatDZD = (amount) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 2 }).format(amount || 0);

  if (isLoading) return <div className="p-6 flex justify-center"><RefreshCw className="animate-spin text-red-600" /></div>;

  return (
    <div className="space-y-8 relative pb-12 text-start">
      
      {activeModal === 'pool' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">{t('finance.record_manual_activity')}</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">{t('finance.action_type')}</label>
                <select value={formData.actionType} onChange={(e) => setFormData({...formData, actionType: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 font-medium focus:border-red-500 focus:ring-red-500">
                  <option value="RECHARGE">{t('finance.manual_recharge')}</option>
                  <option value="REWARD">{t('finance.ooredoo_gift')}</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">{t('finance.securely_logged_hint')}</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">{t('advances.amount_dzd')}</label>
                <input required type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="-6000 or 1500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">{t('advances.note_optional')}</label>
                <input type="text" value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="E.g., Ooredoo Penalty Correction" />
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-md">{t('common.cancel')}</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-md flex items-center gap-2">
                  <CheckCircle2 size={16} /> {isSubmitting ? t('common.loading') : t('common.confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Building2 className="text-red-600" /> {t('finance.true_balances')}</h2>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={handleSyncOoredoo} disabled={isSyncing} className="flex items-center gap-2 text-sm font-bold text-white bg-gray-900 px-4 py-2 rounded-lg hover:bg-black shadow-sm">
              <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} /> {isSyncing ? t('common.loading') : t('finance.sync_ooredoo')}
            </button>
            <button onClick={() => { setFormData({ amount: '', actionType: 'RECHARGE', note: '' }); setActiveModal('pool'); }} className="flex items-center gap-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 shadow-sm">
              <PlusCircle size={16} className="text-blue-600" /> {t('finance.add_recharge')}
            </button>
            <button onClick={handleAutoConvert} disabled={isConverting} className="flex items-center gap-2 text-sm font-bold text-purple-700 bg-purple-50 border border-purple-200 px-4 py-2 rounded-lg hover:bg-purple-100 shadow-sm">
              <ArrowRightLeft size={16} className={isConverting ? "animate-pulse" : ""} /> {isConverting ? t('common.loading') : t('finance.convert_ussd')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-s-4 border-s-blue-500">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('finance.main_balance')}</p>
            <p className="mt-1 text-3xl font-black text-gray-900">{formatDZD(globalPool.balance)}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-s-4 border-s-orange-500">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('finance.bonus_balance')}</p>
            <p className="mt-1 text-3xl font-black text-gray-900">{formatDZD(globalPool.bonus)}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-s-4 border-s-purple-500">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('finance.loyalty_points')}</p>
            <p className="mt-1 text-3xl font-black text-gray-900">{globalPool.points}</p>
          </div>
        </div>
      </div>

      {!auditData ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mt-8 text-sm font-medium">
          {t('common.action_failed')}
        </div>
      ) : (
        <>
          <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl shadow-sm mt-8">
            <h4 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <FileEdit size={16}/> {t('finance.manual_ledger')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                <span className="font-bold text-gray-700">{t('finance.total_recharges')}</span>
                <span className="font-black text-blue-700 text-xl">{auditData.activity.manual_recharges > 0 ? '+' : ''}{formatDZD(auditData.activity.manual_recharges)}</span>
              </div>
              <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                <span className="font-bold text-gray-700">{t('finance.total_rewards')}</span>
                <span className="font-black text-purple-700 text-xl">{auditData.activity.manual_rewards > 0 ? '+' : ''}{auditData.activity.manual_rewards} {t('ledger.pts')}</span>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-3 font-medium">
              {t('finance.not_fake_hint')}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mt-8">
            <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2"><ShieldCheck size={20} className="text-emerald-400"/> {t('finance.reconciliation_audit')}</h3>
              <span className="text-xs font-mono text-gray-400">{t('finance.shift_started')} 06:00</span>
            </div>
            
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              <div className="space-y-4">
                <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest border-b border-gray-200 pb-2">{t('finance.points_calculator')}</h4>
                <div className="space-y-2 text-sm font-medium text-gray-600">
                  <div className="flex justify-between"><span>{t('finance.opening_points')}</span> <span className="font-mono">{auditData.opening.points}</span></div>
                  <div className="flex justify-between text-green-600"><span>+ {t('finance.collected_sims')}</span> <span className="font-mono">+{auditData.activity.sim_points_earned}</span></div>
                  <div className="flex justify-between text-blue-600"><span>{t('finance.manual_rewards_deductions')}</span> <span className="font-mono">{auditData.activity.manual_rewards > 0 ? '+' : ''}{auditData.activity.manual_rewards}</span></div>
                  <div className="flex justify-between text-red-600"><span>- {t('finance.converted_ussd')}</span> <span className="font-mono">-{auditData.activity.points_converted}</span></div>
                </div>
                <div className="pt-3 border-t border-gray-200 grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="text-[10px] uppercase font-bold text-gray-500">{t('finance.expected_result')}</div>
                    <div className="text-xl font-black text-gray-900">{auditData.audit.points.expected}</div>
                  </div>
                  <div className={`p-3 rounded-lg text-center border-2 ${auditData.audit.points.discrepancy === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="text-[10px] uppercase font-bold text-gray-500">{t('finance.discrepancy')}</div>
                    <div className={`text-xl font-black ${auditData.audit.points.discrepancy === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {auditData.audit.points.discrepancy}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest border-b border-gray-200 pb-2">{t('finance.solde_calculator')}</h4>
                <div className="space-y-2 text-sm font-medium text-gray-600">
                  <div className="flex justify-between"><span>{t('finance.opening_solde')}</span> <span className="font-mono">{formatDZD(auditData.opening.solde_total)}</span></div>
                  <div className="flex justify-between text-blue-600"><span>{t('finance.manual_recharges_deductions')}</span> <span className="font-mono">{auditData.activity.manual_recharges > 0 ? '+' : ''}{formatDZD(auditData.activity.manual_recharges)}</span></div>
                  <div className="flex justify-between text-green-600"><span>+ {t('finance.solde_from_ussd')}</span> <span className="font-mono">+{formatDZD(auditData.activity.dzd_converted)}</span></div>
                  <div className="flex justify-between text-red-600"><span>- {t('finance.buying_price_sims')}</span> <span className="font-mono">-{formatDZD(auditData.activity.sim_buying_cost)}</span></div>
                  <div className="flex justify-between text-red-600"><span>- {t('finance.storm_sold')}</span> <span className="font-mono">-{formatDZD(auditData.activity.storm_sold)}</span></div>
                </div>
                <div className="pt-3 border-t border-gray-200 grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="text-[10px] uppercase font-bold text-gray-500">{t('finance.expected_result')}</div>
                    <div className="text-xl font-black text-gray-900">{formatDZD(auditData.audit.balance.expected)}</div>
                  </div>
                  <div className={`p-3 rounded-lg text-center border-2 ${Math.abs(auditData.audit.balance.discrepancy) < 1 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="text-[10px] uppercase font-bold text-gray-500">{t('finance.discrepancy')}</div>
                    <div className={`text-xl font-black flex items-center justify-center gap-1 ${Math.abs(auditData.audit.balance.discrepancy) < 1 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {Math.abs(auditData.audit.balance.discrepancy) >= 1 && <AlertTriangle size={16}/>}
                      {formatDZD(auditData.audit.balance.discrepancy)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <ManualLedgerHistory range={ledgerRange} onRangeChange={setLedgerRange} />
    </div>
  );
}
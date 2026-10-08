import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import {
  PlayCircle, StopCircle, Smartphone, Zap, CreditCard,
  AlertTriangle, Receipt, RefreshCw, X, CheckCircle2, Wallet, Bell
} from 'lucide-react';
import TransactionLedger from './TransactionLedger';
import SimSaleModal from '../../components/SimSaleModal';
import StormSaleModal from '../../components/StormSaleModal';
import AccessorySaleModal from '../../components/AccessorySaleModal';
import DebtModal from '../../components/DebtModal';
import RegisterExpenseModal from '../../components/RegisterExpenseModal';
import CashierAdvancePanel from '../../components/CashierAdvancePanel';
import UssdTerminalModal from '../..//components/UssdTerminalModal';
import ReceiptModal from '../../components/ReceiptModal';
import CardPaymentModal from '../../components/CardPaymentModal';

export default function POSDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [refreshLedger, setRefreshLedger] = useState(0);

  const [session, setSession] = useState(null);
  const [totals, setTotals] = useState(null);
  const [cardTotal, setCardTotal] = useState(0);
  const [catalog, setCatalog] = useState({ offers: [], categories: [], products: [] });

  const [isLoading, setIsLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState('');
  
  const [showStormOptions, setShowStormOptions] = useState(false);
  const [ussdServiceCode, setUssdServiceCode] = useState("");
  const [activeModal, setActiveModal] = useState(null);
  const [finishedSale, setFinishedSale] = useState(null); 

  const [isClosingShift, setIsClosingShift] = useState(false);
  const [manualCashCount, setManualCashCount] = useState('');

  // POP Reminders State
  const [popData, setPopData] = useState({ is_reminder_day: false, cycle_due: null, customers: [] });
  const [selectedCycleTab, setSelectedCycleTab] = useState(null);
  const [showPopModal, setShowPopModal] = useState(false);

  useEffect(() => {
    fetchCurrentSession();
  }, []);

  // Fetch POP Reminders
  useEffect(() => { 
    const fetchPopReminders = async () => {
      try { 
        const params = selectedCycleTab ? { cycle: selectedCycleTab } : {}; 
        const r = await api.get('/customers/pop-reminders', { params }); 
        setPopData(r.data.data); 
      } catch (err) {}
    };
    fetchPopReminders(); 
  }, [selectedCycleTab]);

  const fetchCatalog = async () => {
    try {
      const [offersRes, catsRes, prodRes] = await Promise.all([
        api.get('/offers'), api.get('/offers/categories'), api.get('/products')
      ]);
      setCatalog({
        offers: offersRes.data.data.filter(o => o.is_active),
        categories: catsRes.data.data,
        products: prodRes.data.data.filter(p => p.is_active !== false)
      });
    } catch (err) { console.error('Failed to load catalog into memory', err); }
  };

  const fetchCurrentSession = async () => {
    try {
      setIsLoading(true);
      await fetchCatalog();
      const response = await api.get('/sessions?status=open');
      const activeSession = response.data.data[0];
      if (activeSession) {
        setSession(activeSession);
        await fetchSessionDetails(activeSession.id);
      } else {
        setSession(null);
      }
    } catch (err) { console.error('Failed to fetch session', err); } 
    finally { setIsLoading(false); }
  };

  const fetchSessionDetails = async (sessionId) => {
  try {
    const totalsRes = await api.get(`/sessions/${sessionId}/totals`);
    setTotals(totalsRes.data.data);
  } catch (err) { console.error('Failed to fetch details', err); }
  try {
    const cardRes = await api.get('/card-payments/me');
    setCardTotal(cardRes.data.data?.total || 0);
  } catch (err) { setCardTotal(0); }
};

  const handleOpenSession = async () => {
    try {
      setActionStatus('pos.opening_session');
      const response = await api.post('/sessions', { cashier_id: user.id });
      setSession(response.data.data);
      await fetchSessionDetails(response.data.data.id);
    } catch (err) { alert(err.response?.data?.message || 'Failed to open session'); } 
    finally { setActionStatus(''); }
  };

  const handleConfirmCloseShift = async () => {
    if (manualCashCount === '') { alert(t('pos.enter_physical_cash_alert')); return; }
    
    try {
      setActionStatus('pos.closing_session');
      await api.post(`/sessions/${session.id}/close`, { 
        closing_cash: parseFloat(manualCashCount) 
      });
      setSession(null); 
      setTotals(null);
      setIsClosingShift(false);
      setManualCashCount('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close session');
    } finally {
      setActionStatus('');
    }
  };

  const openModal = (type, meta = null) => {
    setActiveModal(type);
    if (meta?.serviceCode) setUssdServiceCode(meta.serviceCode);
    setShowStormOptions(false); 
  };
  
  const closeModal = () => setActiveModal(null);

  const handleModalComplete = async (transactionData) => {
    setActiveModal(null);
    if (session) await fetchSessionDetails(session.id);
    setRefreshLedger((p) => p + 1);
    
    if (transactionData && transactionData.id) {
      setFinishedSale(transactionData);
    }
  };

  const formatDZD = (amount) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount || 0);

  if (isLoading) return <div className="p-6 flex justify-center"><RefreshCw className="animate-spin text-red-600" /></div>;

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="bg-white p-10 rounded-2xl shadow-sm ring-1 ring-gray-200 max-w-md w-full">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <PlayCircle className="text-red-600 w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('pos.ready_to_start')}</h2>
          <button onClick={handleOpenSession} disabled={actionStatus !== ''} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
            {actionStatus || t('pos.open_register')}
          </button>
        </div>
      </div>
    );
  }

  const noOpenSession = !session;
  const expectedCash = Math.max(0, (totals?.expected_register_cash || 0));
  const countedCash = parseFloat(manualCashCount) || 0;
  const discrepancy = countedCash - expectedCash;

  return (
    <div className="space-y-6 relative pb-10">

      {activeModal === 'sim' && <SimSaleModal sessionId={session.id} catalog={catalog} onClose={closeModal} onComplete={handleModalComplete} />}
      {activeModal === 'accessory' && <AccessorySaleModal sessionId={session.id} catalog={catalog} onClose={closeModal} onComplete={handleModalComplete} />}
      {activeModal === 'storm' && <StormSaleModal sessionId={session.id} onClose={closeModal} onComplete={handleModalComplete} />}
      {activeModal === 'debt' && <DebtModal sessionId={session.id} onClose={closeModal} onComplete={handleModalComplete} />}
      {activeModal === 'card' && <CardPaymentModal onClose={closeModal} onComplete={handleModalComplete} onChanged={() => fetchSessionDetails(session.id)} />}
      {activeModal === 'expense' && <RegisterExpenseModal mode="cashier" sessionId={session.id} onClose={closeModal} onComplete={handleModalComplete} />}
      {activeModal === 'ussd' && <UssdTerminalModal serviceCode={ussdServiceCode} posSessionId={session.id} onClose={closeModal} onTransactionSuccess={handleModalComplete} />}

      {finishedSale && (
        <ReceiptModal 
          transaction={finishedSale} 
          onClose={() => setFinishedSale(null)} 
        />
      )}

      {showPopModal && (
        <PopRemindersModal 
          popData={popData} 
          selectedCycleTab={selectedCycleTab} 
          setSelectedCycleTab={setSelectedCycleTab} 
          onClose={() => setShowPopModal(false)} 
        />
      )}

      {isClosingShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><Wallet className="text-gray-500" /> {t('pos.end_shift_reconciliation')}</h3>
              <button onClick={() => setIsClosingShift(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-blue-800 font-medium mb-1">{t('pos.expected_cash')}</p>
                <p className="text-3xl font-black text-blue-900">{formatDZD(expectedCash)}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t('pos.count_physical_cash')}</label>
                <div className="relative">
                  <input
                    type="number" step="0.01" min="0" autoFocus
                    value={manualCashCount} onChange={(e) => setManualCashCount(e.target.value)}
                    placeholder={t('pos.enter_amount')}
                    className="block w-full pl-4 pr-12 py-4 border-2 border-gray-200 rounded-xl text-xl font-bold text-gray-900 focus:ring-gray-900 focus:border-gray-900 outline-none transition-colors"
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400 font-bold">DZD</div>
                </div>
              </div>

              {manualCashCount !== '' && (
                <div className={`p-4 rounded-xl border ${discrepancy === 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  <p className="text-sm font-bold mb-1">{t('pos.discrepancy')}</p>
                  <p className="text-2xl font-black">{discrepancy > 0 ? '+' : ''}{formatDZD(discrepancy)}</p>
                  <p className="text-xs mt-1 opacity-80">
                    {discrepancy === 0 ? t('pos.perfect_match') : discrepancy > 0 ? t('pos.extra_cash') : t('pos.short_cash')}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setIsClosingShift(false)} className="px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">{t('common.cancel')}</button>
              <button onClick={handleConfirmCloseShift} disabled={manualCashCount === ''} className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gray-900 hover:bg-black rounded-lg transition-colors disabled:opacity-50">
                <CheckCircle2 size={18} /> {t('pos.confirm_close')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-gray-100 pb-4 gap-4">
              <h2 className="text-xl font-bold text-gray-900">{t('pos.title')}</h2>
              
              <div className="flex items-center gap-4 text-sm w-full sm:w-auto justify-between sm:justify-end">
                <button 
                  onClick={() => setShowPopModal(true)} 
                  className="flex items-center gap-2 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600 transition-colors"
                >
                  <Bell size={14} /> 
                  POP Reminders {popData.customers?.length > 0 && `(${popData.customers.length})`}
                </button>

                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-gray-600 font-medium">{t('pos.session_active')}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button onClick={() => openModal('sim')} className="flex flex-col items-center justify-center p-8 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl border border-red-200 transition-colors">
                <Smartphone size={32} className="mb-3" />
                <span className="font-bold text-lg">{t('pos.sell_sim')}</span>
              </button>
              
              {showStormOptions ? (
                <div className="flex flex-col gap-2 p-4 bg-orange-50 rounded-xl border border-orange-200 shadow-inner relative">
                  <button onClick={() => setShowStormOptions(false)} className="absolute top-2 right-2 p-1 text-orange-400 hover:text-orange-700 rounded-full transition-colors"><X size={18}/></button>
                  <div className="text-center text-sm font-bold text-orange-800 mb-2 uppercase tracking-wider">{t('pos.select_method')}</div>
                  <button onClick={() => openModal('ussd', { serviceCode: '*585#' })} className="py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold transition-colors shadow-sm">Ooredoo *585#</button>
                  <button onClick={() => openModal('ussd', { serviceCode: '*580#' })} className="py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold transition-colors shadow-sm">Ooredoo *580#</button>
                  <button onClick={() => openModal('storm')} className="py-2.5 bg-white hover:bg-gray-50 text-orange-700 border border-orange-300 rounded-lg font-bold transition-colors shadow-sm">{t('pos.manual_entry')}</button>
                </div>
              ) : (
                <button onClick={() => setShowStormOptions(true)} className="flex flex-col items-center justify-center p-8 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl border border-orange-200 transition-colors">
                  <Zap size={32} className="mb-3" />
                  <span className="font-bold text-lg">{t('pos.enter_storm')}</span>
                </button>
              )}

              <button onClick={() => openModal('accessory')} className="flex flex-col items-center justify-center p-8 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border border-blue-200 transition-colors">
                <CreditCard size={32} className="mb-3" />
                <span className="font-bold text-lg">{t('pos.sell_accessory')}</span>
              </button>
              <button onClick={() => openModal('debt')} disabled={noOpenSession} className="flex flex-col items-center justify-center p-8 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <AlertTriangle size={32} className="mb-3" />
                <span className="font-bold text-lg">{t('pos.record_debt')}</span>
              </button>
              <button onClick={() => openModal('card')} disabled={noOpenSession} className="flex flex-col items-center justify-center p-8 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <CreditCard size={32} className="mb-3" />
                <span className="font-bold text-lg">{t('pos.record_card')}</span>
              </button>
              <button onClick={() => openModal('expense')} disabled={noOpenSession} className="flex flex-col items-center justify-center p-8 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl border border-amber-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Receipt size={32} className="mb-3" />
                <span className="font-bold text-lg">{t('pos.record_expense')}</span>
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={() => { fetchSessionDetails(session.id); fetchCatalog(); }} className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">
              <RefreshCw size={18} /> {t('pos.refresh_totals')}
            </button>
            <button onClick={() => setIsClosingShift(true)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-lg hover:bg-black font-medium transition-colors">
              <StopCircle size={18} /> {t('pos.end_shift_btn')}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-6 border-t-4 border-t-green-500">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">{t('pos.live_register_cash')}</p>
            <p className="text-4xl font-extrabold text-gray-900">{formatDZD(expectedCash)}</p>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{t('pos.opening_cash')}</span>
                <span className="font-medium">{formatDZD(session.opening_cash)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>{t('pos.earned_commission')}</span>
                <span className="font-medium text-green-600">{formatDZD(totals?.total_cashier_benefit)}</span>
              </div>
            </div>
          </div>

          <CashierAdvancePanel sessionId={session.id} refreshKey={refreshLedger} onChange={() => fetchSessionDetails(session.id)} />
        </div>
      </div>

      <div className="w-full">
        <TransactionLedger
            sessionId={session.id}
            refreshTrigger={refreshLedger}
            onVoidSuccess={() => {
              fetchSessionDetails(session.id);
              setRefreshLedger(prev => prev + 1);
            }}
        />
      </div>

    </div>
  );
}

// Sub-component for the POP Reminders Modal
function PopRemindersModal({ popData, selectedCycleTab, setSelectedCycleTab, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-start">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-amber-50">
          <h3 className="font-bold text-lg text-amber-900 flex items-center gap-2"><Bell size={20}/> POP Renewals</h3>
          <button onClick={onClose} className="text-amber-500 hover:bg-amber-100 p-1 rounded-md transition-colors"><X size={20}/></button>
        </div>
        
        <div className="flex bg-gray-50 border-b border-gray-200">
          {[1, 8, 15, 22].map(cycle => (
            <button 
              key={cycle} 
              onClick={() => setSelectedCycleTab(cycle)}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${selectedCycleTab === cycle || (!selectedCycleTab && popData.cycle_due === cycle) ? 'border-amber-500 text-amber-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'}`}
            >
              Cycle {cycle}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-y-auto">
          {popData.customers && popData.customers.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2 text-gray-500 uppercase text-xs font-bold">Customer</th>
                  <th className="py-2 text-gray-500 uppercase text-xs font-bold">Phone</th>
                  <th className="py-2 text-gray-500 uppercase text-xs font-bold">pos.last_purchase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {popData.customers.map((c, i) => (
                  <tr key={i} className="hover:bg-amber-50/50 transition-colors">
                    <td className="py-3 font-bold text-gray-900">
  {c.first_name} {c.last_name}
  {c.source === 'storm' && (
    <span className="ms-2 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase text-orange-700">Storm</span>
  )}
</td>
                    <td className="py-3 font-mono text-gray-600">{c.phone_number}</td>
                    <td className="py-3 text-gray-500 text-xs font-medium">{new Date(c.sold_at).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-10 text-gray-500 font-medium">No POP renewals due for this cycle.</div>
          )}
        </div>
      </div>
    </div>
  );
}
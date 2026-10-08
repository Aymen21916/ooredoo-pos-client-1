import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useLanguage } from '../../context/LanguageContext';
import { Store, User, DollarSign, Activity, CreditCard, Smartphone, History, X } from 'lucide-react';

// Import the Ledger component directly from the cashier folder!
import TransactionLedger from '../cashier/TransactionLedger';

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State to track which cashier's ledger is currently open in the modal
  const [ledgerSession, setLedgerSession] = useState(null);

  useEffect(() => {
    fetchLiveSessions();
    const interval = setInterval(fetchLiveSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiveSessions = async () => {
    try {
      const response = await api.get('/sessions/live');
      setSessions(response.data.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch live sessions', err);
      setError(t('common.action_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const formatDZD = (amount) => {
    return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount || 0);
  };

  if (isLoading && sessions.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent"></div>
      </div>
    );
  }

  console.log('Live sessions:', sessions);

  return (
    <div className="space-y-6 text-start">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.live_overview')}</h1>
        <button onClick={fetchLiveSessions} className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
          {t('admin.refresh_now')}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}

      {sessions.length === 0 && !isLoading && !error ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
          <Store className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">{t('admin.no_active_sessions')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('admin.no_open_shift')}</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <div key={session.session_id} className="flex flex-col justify-between overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 hover:shadow-md transition-shadow">
              
              <div>
                <div className="border-b border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <Store size={18} className="text-red-600" />
                      {session.store_name}
                    </div>
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      Live
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                    <User size={16} />
                    {session.cashier_name}
                  </div>
                </div>

                <div className="p-4 space-y-4 text-start">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.expected_register_cash')}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <DollarSign size={24} className="text-green-500" />
                      {formatDZD(session.expected_register_cash)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                    <div>
                      <p className="text-xs text-gray-500 flex items-center gap-1"><Smartphone size={14}/> {t('admin.sim_sales')}</p>
                      <p className="font-semibold text-gray-900">{formatDZD(session.sim_total_selling_price)}</p>
                      <p className="text-xs text-gray-400">{session.sim_units_sold} {t('admin.units')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 flex items-center gap-1"><Activity size={14}/> {t('admin.storm')}</p>
                      <p className="font-semibold text-gray-900">{formatDZD(session.storm_total)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 flex items-center gap-1"><CreditCard size={14}/> {t('admin.accessories')}</p>
                      <p className="font-semibold text-gray-900">{formatDZD(session.accessories_total)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 text-red-600">{t('admin.debts')}</p>
                      <p className="font-semibold text-gray-900">{formatDZD(session.debt_total)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 text-indigo-600">{t('expense.card_today')}</p>
                      <p className="font-semibold text-gray-900">{formatDZD(session.card_total)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 text-amber-600">{t('expense.expenses_today')}</p>
                      <p className="font-semibold text-gray-900">{formatDZD(session.expense_total)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* View Ledger Button */}
              <div className="p-4 pt-0">
                <button 
                  onClick={() => setLedgerSession(session)} 
                  className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm"
                >
                  <History size={18} /> {t('admin.view_ledger')}
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* LIVE LEDGER MODAL FOR ADMIN */}
      {ledgerSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-start">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
              <div>
                <h3 className="font-black text-xl text-gray-900">{t('admin.live_ledger_for')} {ledgerSession.cashier_name}</h3>
                <p className="text-sm font-medium text-gray-500 mt-1"><Store size={14} className="inline mr-1"/> {ledgerSession.store_name}</p>
              </div>
              <button 
                onClick={() => setLedgerSession(null)} 
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body - Injects the exact same Ledger the Cashier sees! */}
            <div className="p-6 overflow-y-auto flex-1 bg-gray-100/50 custom-scrollbar">
              <TransactionLedger sessionId={ledgerSession.session_id} />
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
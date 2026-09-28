import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useLanguage } from '../../context/LanguageContext';
import { Clock, Ban, RefreshCw, Smartphone, Zap, CreditCard, AlertTriangle, XCircle } from 'lucide-react';

export default function TransactionLedger({ sessionId, refreshTrigger, onVoidSuccess }) {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguage();

  const [errorDialog, setErrorDialog] = useState({ isOpen: false, message: '' });
  const [voidDialog, setVoidDialog] = useState({ isOpen: false, type: '', id: '', description: '', amount: 0 });
  const [voidReason, setVoidReason] = useState('');

  const closeError = () => setErrorDialog({ isOpen: false, message: '' });
  const showError = (msg) => setErrorDialog({ isOpen: true, message: msg });
  const closeVoidModal = () => {
    setVoidDialog({ isOpen: false, type: '', id: '', description: '', amount: 0 });
    setVoidReason('');
  };

  useEffect(() => {
    if (sessionId) fetchHistory();
  }, [sessionId, refreshTrigger]);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/sessions/${sessionId}/history`);
      setTransactions(response.data.data);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setIsLoading(false);
    }
  };

  const promptVoid = (transaction) => {
    setVoidDialog({
      isOpen: true, type: transaction.type, id: transaction.id,
      description: transaction.description, amount: transaction.amount
    });
    setVoidReason('');
  };

  const executeVoid = async () => {
    if (!voidReason.trim()) { showError(t('ledger.provide_void_reason')); return; }
    try {
      await api.post(`/sales/${voidDialog.type}/${voidDialog.id}/void`, { reason: voidReason });
      fetchHistory();
      if (onVoidSuccess) onVoidSuccess();
      closeVoidModal();
    } catch (err) {
      closeVoidModal();
      showError(err.response?.data?.message || 'Failed to void transaction');
    }
  };

  const formatDZD = (amount) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount || 0);

  const getIcon = (type) => {
    switch(type) {
      case 'sim': return <Smartphone size={16} className="text-red-500" />;
      case 'storm': return <Zap size={16} className="text-orange-500" />;
      case 'accessory': return <CreditCard size={16} className="text-blue-500" />;
      case 'debt': return <AlertTriangle size={16} className="text-gray-500" />;
      default: return <Clock size={16} />;
    }
  };

  const simTransactions = transactions.filter(t => t.type === 'sim');
  const stormTransactions = transactions.filter(t => t.type === 'storm');
  const otherTransactions = transactions.filter(t => t.type === 'accessory' || t.type === 'debt');

  const renderTransactionCard = (txn) => (
    <div key={`${txn.type}-${txn.id}`} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${txn.is_voided ? 'bg-red-50/50 border-red-100 opacity-75' : 'bg-white border-gray-100 hover:border-gray-300 shadow-sm'}`}>
      <div className="flex items-center gap-3 overflow-hidden">
        <div className={`p-2 rounded-full shrink-0 ${txn.is_voided ? 'bg-red-100' : 'bg-gray-50'}`}>
          {txn.is_voided ? <Ban size={16} className="text-red-500" /> : getIcon(txn.type)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-bold truncate ${txn.is_voided ? 'text-gray-500 line-through' : 'text-gray-900'}`} title={txn.description}>
              {txn.description}
            </p>
            {txn.points_redeemed > 0 && !txn.is_voided && (
              <span className="bg-purple-100 text-purple-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap">
                {t('ledger.discounted')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-gray-400 font-medium">
              {new Date(txn.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
            {txn.points_earned > 0 && !txn.is_voided && (
              <span className="text-[10px] font-bold text-green-600 flex items-center gap-0.5">
                +{Math.floor(txn.points_earned)} {t('ledger.pts')}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col items-end shrink-0 ml-2">
        <span className={`text-sm font-black tracking-tight ${txn.is_voided ? 'text-gray-400 line-through' : (txn.type === 'debt' ? 'text-red-600' : 'text-green-600')}`}>
          {txn.type === 'debt' ? '-' : '+'}{formatDZD(txn.amount)}
        </span>
        
        {!txn.is_voided ? (
          <button onClick={() => promptVoid(txn)} className="text-[10px] font-bold text-red-600 hover:text-white border border-red-200 hover:bg-red-600 px-2 py-0.5 rounded mt-1 transition-colors">
            {t('ledger.void')}
          </button>
        ) : (
          <span className="text-[10px] font-bold text-red-500 px-2 py-0.5 bg-red-50 rounded mt-1">
            {t('ledger.voided')}
          </span>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return <div className="p-6 flex justify-center"><RefreshCw className="animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center rounded-t-xl">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Clock size={18} className="text-gray-500" /> {t('ledger.title')}
        </h3>
        <button onClick={fetchHistory} className="text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1 text-sm font-medium">
          <RefreshCw size={14} /> {t('common.refresh')}
        </button>
      </div>
      
      <div className="p-6">
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">{t('ledger.no_transactions')}</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-100 text-red-800 font-bold py-2.5 px-4 rounded-xl flex justify-between items-center">
                <span className="flex items-center gap-2"><Smartphone size={16}/> {t('ledger.sim_cards')}</span>
                <span className="bg-white text-red-600 px-2.5 py-0.5 rounded-full text-xs shadow-sm">{simTransactions.length}</span>
              </div>
              <div className="space-y-2">
                {simTransactions.length === 0 ? <p className="text-xs text-gray-400 text-center py-4">{t('ledger.no_sim_sales')}</p> : simTransactions.map(renderTransactionCard)}
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-orange-50 border border-orange-100 text-orange-800 font-bold py-2.5 px-4 rounded-xl flex justify-between items-center">
                <span className="flex items-center gap-2"><Zap size={16}/> {t('ledger.storm_bundles')}</span>
                <span className="bg-white text-orange-600 px-2.5 py-0.5 rounded-full text-xs shadow-sm">{stormTransactions.length}</span>
              </div>
              <div className="space-y-2">
                {stormTransactions.length === 0 ? <p className="text-xs text-gray-400 text-center py-4">{t('ledger.no_storm_sales')}</p> : stormTransactions.map(renderTransactionCard)}
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-100 text-blue-800 font-bold py-2.5 px-4 rounded-xl flex justify-between items-center">
                <span className="flex items-center gap-2"><CreditCard size={16}/> {t('ledger.products')}</span>
                <span className="bg-white text-blue-600 px-2.5 py-0.5 rounded-full text-xs shadow-sm">{otherTransactions.length}</span>
              </div>
              <div className="space-y-2">
                {otherTransactions.length === 0 ? <p className="text-xs text-gray-400 text-center py-4">{t('ledger.no_other_sales')}</p> : otherTransactions.map(renderTransactionCard)}
              </div>
            </div>

          </div>
        )}
      </div>

      {errorDialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl ring-1 ring-gray-200 text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">{t('common.action_failed')}</h3>
            <p className="mt-2 text-sm text-gray-600">{errorDialog.message}</p>
            <div className="mt-6">
              <button type="button" onClick={closeError} className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-colors">{t('common.dismiss')}</button>
            </div>
          </div>
        </div>
      )}

      {voidDialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl ring-1 ring-gray-200">
            <div className="flex items-start gap-4">
              <div className="flex shrink-0 items-center justify-center rounded-full bg-red-100 p-3">
                <Ban className="h-6 w-6 text-red-600" />
              </div>
              <div className="mt-1 w-full">
                <h3 className="text-lg font-semibold text-gray-900">{t('ledger.void_transaction_title')}</h3>
                <p className="mt-2 text-sm text-gray-600">
                  {t('ledger.void_prompt')}
                </p>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{voidDialog.description}</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{formatDZD(voidDialog.amount)}</p>
                </div>
                <div className="mt-4">
                  <label htmlFor="voidReason" className="block text-sm font-medium text-gray-700 mb-1">{t('ledger.void_reason_label')} <span className="text-red-500">*</span></label>
                  <input id="voidReason" type="text" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder={t('ledger.void_reason_placeholder')} className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" autoFocus />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeVoidModal} className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors">{t('common.cancel')}</button>
              <button type="button" onClick={executeVoid} className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-colors">{t('ledger.confirm_void')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
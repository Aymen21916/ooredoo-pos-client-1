import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { useLanguage } from '../context/LanguageContext';
import { X, Receipt, CheckCircle2, AlertTriangle, AlertCircle, Building2, Tag, Calendar, RefreshCw, Wallet } from 'lucide-react';

const formatDZD = (n) =>
  new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 2 }).format(n || 0);

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const AMOUNT_MIN = 0.01;
const AMOUNT_MAX = 9_999_999.99;
const DESC_MIN   = 1;
const DESC_MAX   = 500;

export default function RegisterExpenseModal({ mode = 'cashier', sessionId, storeId, onClose, onComplete }) {
  const { t } = useLanguage();
  const [amount, setAmount]           = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory]       = useState('utility');
  const [expenseDate, setExpenseDate] = useState(todayStr());
  const [selectedStore, setSelectedStore] = useState(storeId ? String(storeId) : '');

  const [stores, setStores]           = useState([]);
  const [storesLoading, setStoresLoading] = useState(mode === 'admin');

  const [submitting, setSubmitting]                       = useState(false);
  const [error, setError]                                 = useState('');
  const [insufficientBalance, setInsufficientBalance]     = useState(null);

  // Cashier: live cash of the register (today's sales + what is already in the store register)
  const [cash, setCash] = useState(null);

  const CATEGORY_OPTIONS = [
    { value: 'utility',   label: t('expense.cat_utility') },
    { value: 'inventory', label: t('expense.cat_inventory') },
    { value: 'other',     label: t('expense.cat_other') },
  ];

  // Admin: stores with the balance of their REGISTER LEDGER
  useEffect(() => {
    if (mode !== 'admin') return;
    let cancelled = false;
    api.get('/register-ledger/filters').then((r) => {
        if (cancelled) return;
        const list = (r.data.data?.stores || []).map((st) => ({
          id: st.id, name: st.name, location: '', current_cash: Number(st.balance) || 0,
        }));
        setStores(list);
        if (!storeId && list.length > 0) setSelectedStore(String(list[0].id));
      }).catch(() => { if (!cancelled) setStores([]); }).finally(() => { if (!cancelled) setStoresLoading(false); });
    return () => { cancelled = true; };
  }, [mode, storeId]);

  // Cashier: how much cash is in the register right now
  const loadCash = () => {
    if (mode !== 'cashier') return Promise.resolve();
    return api.get('/finances/expenses/register-cash')
      .then((r) => setCash(r.data.data || null))
      .catch(() => setCash(null));
  };
  useEffect(() => { loadCash(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mode]);

  const validationError = useMemo(() => {
    const trimmedDesc = description.trim();
    const num = Number(amount);
    if (amount === '' || Number.isNaN(num)) return 'validation.amount_required';
    if (!Number.isFinite(num) || num < AMOUNT_MIN || num > AMOUNT_MAX) return 'Amount invalid.';
    if (!/^-?\d+(\.\d{1,2})?$/.test(String(amount).trim())) return 'Amount can have at most two decimal places.';
    if (trimmedDesc.length < DESC_MIN || trimmedDesc.length > DESC_MAX) return 'Description invalid.';
    if (!['utility', 'inventory', 'other'].includes(category)) return 'Category invalid.';
    if (mode === 'admin') {
      if (!selectedStore) return 'Please choose a store.';
      if (!expenseDate)   return 'Please choose an expense date.';
      if (expenseDate > todayStr()) return 'Expense date cannot be in the future.';
    }
    return '';
  }, [amount, description, category, mode, selectedStore, expenseDate]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError(''); setInsufficientBalance(null);
    if (validationError) { setError(validationError); return; }

    const payload = { amount: Number(amount), description: description.trim(), category };
    if (mode === 'admin') {
      payload.store_id = parseInt(selectedStore, 10);
      if (expenseDate) payload.expense_date = expenseDate;
    }

    setSubmitting(true);
    try {
      const r = await api.post('/finances/expenses', payload);
      onComplete?.(r.data.data || r.data);
    } catch (err) {
      const data = err.response?.data || {};
      const code = data.code;
      if (code === 'INSUFFICIENT_REGISTER_CASH') {
        setInsufficientBalance(typeof data.current_balance === 'number' ? data.current_balance : Number(data.current_balance) || 0);
        loadCash();
      } else {
        setError(data.message || t('common.action_failed'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-start">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><Receipt size={20} className="text-red-600" /> {t('expense.title')}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {insufficientBalance !== null && (
          <div className="mx-4 mt-3 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold">{t('expense.not_enough_cash')}</div>
              <div className="mt-0.5">{t('expense.current_balance')} <span className="font-mono font-semibold">{formatDZD(insufficientBalance)}</span>. {t('expense.reduce_amount')}</div>
            </div>
          </div>
        )}

        {mode === 'cashier' && cash && (
          <div className="mx-4 mt-3 rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-900">
            <div className="flex items-center gap-2 font-semibold"><Wallet size={16} /> {t('expense.register_today')}</div>
            <div className="mt-1 text-2xl font-mono font-bold">{formatDZD(cash.session_net)}</div>
            <div className="mt-1 text-xs text-emerald-800 space-y-0.5">
              <div className="flex justify-between"><span>{t('expense.sales_today')}</span><span className="font-mono">{formatDZD(cash.session_sales)}</span></div>
              {cash.session_debts > 0 && <div className="flex justify-between"><span>− {t('expense.debts_today')}</span><span className="font-mono">{formatDZD(cash.session_debts)}</span></div>}
              {cash.session_expenses > 0 && <div className="flex justify-between"><span>− {t('expense.expenses_today')}</span><span className="font-mono">{formatDZD(cash.session_expenses)}</span></div>}
              <div className="flex justify-between"><span>{t('expense.previous_balance')}</span><span className="font-mono">{formatDZD(cash.store_balance)}</span></div>
              <div className="flex justify-between font-semibold border-t border-emerald-200 pt-0.5 mt-0.5"><span>{t('expense.available')}</span><span className="font-mono">{formatDZD(cash.available)}</span></div>
            </div>
          </div>
        )}

        {error && <div className="mx-4 mt-3 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-start gap-2"><AlertCircle size={16} className="mt-0.5 flex-shrink-0" /><span>{error}</span></div>}

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {mode === 'admin' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1"><Building2 size={12} className="inline mx-1 -mt-0.5" />{t('expense.store')}</label>
              {storesLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-2"><RefreshCw size={14} className="animate-spin" /> {t('expense.loading_stores')}</div>
              ) : (
                <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-red-500" required>
                  <option value="" disabled>{t('expense.select_store')}</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}{s.location ? ` — ${s.location}` : ''} {typeof s.current_cash === 'number' ? ` (${formatDZD(s.current_cash)})` : ''}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {mode === 'admin' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1"><Calendar size={12} className="inline mx-1 -mt-0.5" />{t('expense.expense_date')}</label>
              <input type="date" value={expenseDate} max={todayStr()} onChange={(e) => setExpenseDate(e.target.value)} className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-red-500" required />
              <p className="mt-1 text-xs text-gray-500">{t('expense.no_future_date')}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{t('expense.amount_dzd')}</label>
            <input type="number" inputMode="decimal" step="0.01" min={AMOUNT_MIN} max={AMOUNT_MAX} value={amount} onChange={(e) => { setAmount(e.target.value); setInsufficientBalance(null); }} placeholder="0.00" className="block w-full rounded-md border border-gray-300 px-3 py-2 text-base font-mono focus:border-red-500 focus:ring-red-500" required />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1"><Tag size={12} className="inline mx-1 -mt-0.5" />{t('expense.category')}</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-red-500" required>
              {CATEGORY_OPTIONS.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{t('expense.description')}</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={DESC_MAX} placeholder={t('expense.desc_placeholder')} className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-red-500" required />
          </div>

          {mode === 'cashier' && <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">{t('expense.cashier_hint')}</div>}
        </div>

        <div className="flex justify-between gap-3 border-t border-gray-100 p-4 bg-gray-50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">{t('common.cancel')}</button>
          <button type="submit" disabled={submitting || !!validationError} className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50">
            <CheckCircle2 size={16} /> {submitting ? t('expense.recording') : t('expense.record_btn')}
          </button>
        </div>
      </form>
    </div>
  );
}
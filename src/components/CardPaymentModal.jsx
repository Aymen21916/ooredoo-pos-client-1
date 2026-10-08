import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useLanguage } from '../context/LanguageContext';
import { X, CreditCard, CheckCircle2, AlertCircle, RefreshCw, Undo2 } from 'lucide-react';

const formatDZD = (n) =>
  new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 2 }).format(n || 0);

const AMOUNT_MIN = 0.01;
const AMOUNT_MAX = 9_999_999.99;
const NOTE_MAX = 500;

export default function CardPaymentModal({ onClose, onComplete, onChanged }) {
  const { t } = useLanguage();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get('/card-payments/me');
      setItems(r.data.data?.items || []);
      setTotal(r.data.data?.total || 0);
    } catch {
      setItems([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const amountOk = /^\d+(\.\d{1,2})?$/.test(String(amount).trim())
    && Number(amount) >= AMOUNT_MIN && Number(amount) <= AMOUNT_MAX;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError('');
    if (!amountOk) { setError(t('cardpay.amount_invalid')); return; }
    setSubmitting(true);
    try {
      await api.post('/card-payments', { amount: Number(amount), note: note.trim() || undefined });
      onComplete?.();
    } catch (err) {
      setError(err.response?.data?.message || t('common.action_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoid = async (item) => {
    const reason = window.prompt(t('cardpay.void_reason_prompt'));
    if (!reason || !reason.trim()) return;
    try {
      await api.post(`/card-payments/${item.id}/void`, { reason: reason.trim() });
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || t('common.action_failed'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-start">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
            <CreditCard size={20} className="text-indigo-600" /> {t('cardpay.title')}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /><span>{error}</span>
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="rounded-md bg-indigo-50 border border-indigo-200 p-3 text-xs text-indigo-800">{t('cardpay.hint')}</div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{t('cardpay.amount')}</label>
            <input
              type="number" inputMode="decimal" step="0.01" min={AMOUNT_MIN} max={AMOUNT_MAX}
              value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-base font-mono focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{t('cardpay.note')}</label>
            <input
              type="text" value={note} maxLength={NOTE_MAX} onChange={(e) => setNote(e.target.value)}
              placeholder={t('cardpay.note_placeholder')}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t('cardpay.today_total')}</span>
              <span className="font-mono font-bold text-gray-900">{formatDZD(total)}</span>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-2"><RefreshCw size={14} className="animate-spin" /> {t('common.loading')}</div>
            ) : (
              <ul className="divide-y divide-gray-100 text-sm">
                {items.map((it) => (
                  <li key={it.id} className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className={`font-mono font-semibold ${it.is_voided ? 'line-through text-gray-400' : 'text-gray-900'}`}>{formatDZD(it.amount)}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {new Date(it.entered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {it.note ? ` · ${it.note}` : ''}
                      </div>
                    </div>
                    {!it.is_voided && (
                      <button type="button" onClick={() => handleVoid(it)} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800">
                        <Undo2 size={14} /> {t('ledger.void')}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-between gap-3 border-t border-gray-100 p-4 bg-gray-50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">{t('common.cancel')}</button>
          <button type="submit" disabled={submitting || !amountOk} className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
            <CheckCircle2 size={16} /> {submitting ? t('cardpay.recording') : t('cardpay.record')}
          </button>
        </div>
      </form>
    </div>
  );
}

import { useState } from 'react';
import api from '../api/axios';
import { AlertTriangle, Send, CheckCircle2, RefreshCw } from 'lucide-react';

const MAX = 1000;

/**
 * Shown under a customer row ONLY when the admin marked that customer "not valid".
 * The cashier writes the correct information as free text; the admin applies it.
 */
export default function CustomerCorrectionForm({ customer, onSent }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const pending = Number(customer.pending_corrections) || 0;

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) { setError('Write the correct information first.'); return; }
    setSending(true);
    setError('');
    try {
      await api.post('/customer-validation/corrections', { customer_id: customer.id, description: text.trim() });
      setText('');
      onSent?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={send} className="mt-1 rounded-xl border border-amber-200 bg-white p-4 text-start" data-testid="correction-form">
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-800">
        <AlertTriangle size={16} /> This customer’s information is not valid — please send the correct information
      </div>

      {customer.validation_note && (
        <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span className="font-bold">Admin note:</span> {customer.validation_note}
        </div>
      )}

      {pending > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          <CheckCircle2 size={16} />
          {pending === 1 ? 'You sent 1 correction' : `You sent ${pending} corrections`} — waiting for the admin.
        </div>
      )}

      <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">Correct information</label>
      <textarea
        rows={2}
        maxLength={MAX}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. The correct address is 12 Rue Didouche Mourad, Chlef"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs text-gray-400">{text.length}/{MAX}</span>
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {sending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
          {sending ? 'Sending...' : pending > 0 ? 'Send another' : 'Send to admin'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
    </form>
  );
}
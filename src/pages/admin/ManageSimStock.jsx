import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useLanguage } from '../../context/LanguageContext';
import { Layers, Building2, RefreshCw, ArrowRightLeft, Shield, AlertCircle, CheckCircle2, X, PlusCircle } from 'lucide-react';

export default function ManageSimStock() {
  const { t } = useLanguage();
  const [balances, setBalances] = useState({ admin: 0, stores: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [transferType, setTransferType] = useState('admin_to_store'); 
  const [formData, setFormData] = useState({ store_id: '', quantity: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchBalances(); }, []);

  const fetchBalances = async () => {
    try { setLoading(true); const res = await api.get('/stock/balances'); setBalances(res.data.data); } 
    catch (err) { setError(t('common.action_failed')); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true); setError(''); setSuccess('');
    try {
      if (transferType === 'adjust_admin') {
        await api.post('/stock/admin/adjust', { quantity: parseInt(formData.quantity, 10) });
        setSuccess('Admin Vault updated successfully!');
      } else {
        const isToStore = transferType === 'admin_to_store';
        await api.post('/stock/transfer', { from_type: isToStore ? 'admin' : 'store', from_id: isToStore ? 1 : formData.store_id, to_type: isToStore ? 'store' : 'admin', to_id: isToStore ? formData.store_id : 1, quantity: parseInt(formData.quantity, 10) });
        setSuccess('SIMs transferred successfully!');
      }
      setShowModal(false); setFormData({ store_id: '', quantity: '' }); fetchBalances(); setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.response?.data?.message || t('common.action_failed')); } finally { setSubmitting(false); }
  };

  const openModal = (type, prefillStoreId = '') => { setTransferType(type); setFormData({ store_id: prefillStoreId, quantity: '' }); setShowModal(true); };

  if (loading) return <div className="flex justify-center p-12"><RefreshCw className="animate-spin text-red-600" size={32} /></div>;

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto text-start">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Layers className="text-red-600" /> {t('manage.stock_title')}</h1>
        <button onClick={fetchBalances} className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50"><RefreshCw size={16} /> {t('common.refresh')}</button>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 font-bold text-sm border border-red-200 rounded-xl flex items-center gap-2"><AlertCircle size={18}/> {error}</div>}
      {success && <div className="p-4 bg-green-50 text-green-700 font-bold text-sm border border-green-200 rounded-xl flex items-center gap-2"><CheckCircle2 size={18}/> {success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4"><h2 className="text-sm font-black uppercase tracking-wider text-gray-400 flex items-center gap-2"><Shield size={18} className="text-red-500"/> {t('manage.admin_vault')}</h2><button onClick={() => openModal('adjust_admin')} className="text-red-600 hover:text-red-800"><PlusCircle size={24} /></button></div>
            <div className="text-5xl font-black text-gray-900">{balances.admin.toLocaleString()} <span className="text-xl text-gray-400 font-bold">SIMs</span></div>
          </div>
          <button onClick={() => openModal('admin_to_store')} className="mt-8 w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-sm"><ArrowRightLeft size={16} /> {t('manage.send_store')}</button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-sm font-black uppercase tracking-wider text-gray-400 mb-6 flex items-center gap-2"><Building2 size={18} className="text-indigo-500"/> {t('manage.shared_inv')}</h2>
          <div className="space-y-4">
            {balances.stores.map(s => (
              <div key={s.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 flex items-center justify-between hover:border-indigo-300 group">
                <div><div className="font-bold text-gray-900 text-lg">{s.name}</div><div className={`text-sm font-black mt-1 ${s.quantity <= 10 ? 'text-red-600' : 'text-indigo-600'}`}>{s.quantity.toLocaleString()} {t('manage.sims_avail')}</div></div>
                <button onClick={() => openModal('store_to_admin', s.id)} className="bg-white border border-gray-300 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 p-2.5 rounded-lg"><ArrowRightLeft size={18} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-start">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50"><h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">{transferType === 'adjust_admin' ? <><Shield size={20} className="text-red-600" /> {t('manage.update_vault')}</> : <><ArrowRightLeft size={20} className="text-blue-600" /> {t('manage.transfer_sims')}</>}</h3><button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={22}/></button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {transferType !== 'adjust_admin' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">{t('manage.dest_store')}</label>
                  <select required value={formData.store_id} onChange={e => setFormData({...formData, store_id: e.target.value})} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none bg-white"><option value="">-- {t('common.all')} --</option>{balances.stores.map(s => <option key={s.id} value={s.id}>{s.name} ({s.quantity})</option>)}</select>
                </div>
              )}
              <div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">{t('manage.qty_transfer')}</label><input required type="number" min={transferType === 'adjust_admin' ? undefined : "1"} value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-lg font-bold outline-none" autoFocus /></div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100"><button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg">{t('common.cancel')}</button><button type="submit" disabled={submitting} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg disabled:opacity-50 flex items-center gap-2">{submitting && <RefreshCw size={16} className="animate-spin" />} {t('common.save')}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
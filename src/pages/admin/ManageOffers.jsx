import { useState, useMemo } from 'react';
import api from '../../api/axios';
import { useAdminData } from '../../context/AdminDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Tags, Plus, Trash2, Pencil, X, AlertTriangle, RefreshCw, RotateCcw, Award, Zap } from 'lucide-react';

export default function ManageOffers() {
  const { adminData, isPreloading, refreshAdminData } = useAdminData();
  const { t } = useLanguage();
  const offers = adminData.offers || [];
  const categories = adminData.offerCategories || [];

  const [showInactive, setShowInactive] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [formData, setFormData] = useState({ name: '', category_id: '', real_price: '', selling_price: '', commission_amount: '', commission_points: '', loyalty_points: '', low_stock_threshold: '5', sort_order: '0' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [categoryNameInput, setCategoryNameInput] = useState('');

  const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSaveCategory = async () => {
    if (!categoryNameInput.trim()) return;
    try {
      if (isAddingCategory) { const res = await api.post('/offers/categories', { name: categoryNameInput }); setFormData({ ...formData, category_id: res.data.data.id }); } 
      else if (isEditingCategory) { await api.put(`/offers/categories/${formData.category_id}`, { name: categoryNameInput }); }
      setIsAddingCategory(false); setIsEditingCategory(false); setCategoryNameInput(''); await refreshAdminData();
    } catch (err) { alert(err.response?.data?.message || t('common.action_failed')); }
  };

  const promptDeleteCategory = async () => {
    if(!window.confirm(`Delete category?`)) return;
    try { await api.delete(`/offers/categories/${formData.category_id}`); setFormData({ ...formData, category_id: '' }); await refreshAdminData(); } 
    catch (err) { alert(err.response?.data?.message || t('common.action_failed')); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      await api.post('/offers', { ...formData, category_id: Number(formData.category_id), real_price: Number(formData.real_price), selling_price: Number(formData.selling_price), commission_amount: Number(formData.commission_amount) || 0, commission_points: Number(formData.commission_points) || 0, loyalty_points: Number(formData.loyalty_points) || 0, low_stock_threshold: Number(formData.low_stock_threshold), sort_order: Number(formData.sort_order) });
      setFormData({ name: '', category_id: '', real_price: '', selling_price: '', commission_amount: '', commission_points: '', loyalty_points: '', low_stock_threshold: '5', sort_order: '0' });
      setIsAdding(false); await refreshAdminData();
    } catch (err) { alert(err.response?.data?.message || t('common.action_failed')); } finally { setIsSubmitting(false); }
  };

  const handleEditSubmit = async (e, updatedData) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      await api.patch(`/offers/${editingOffer.id}`, { ...updatedData, category_id: Number(updatedData.category_id), real_price: Number(updatedData.real_price), selling_price: Number(updatedData.selling_price), commission_amount: Number(updatedData.commission_amount) || 0, commission_points: Number(updatedData.commission_points) || 0, loyalty_points: Number(updatedData.loyalty_points) || 0, low_stock_threshold: Number(updatedData.low_stock_threshold), sort_order: Number(updatedData.sort_order) });
      setEditingOffer(null); await refreshAdminData();
    } catch (err) { alert(err.response?.data?.message || t('common.action_failed')); } finally { setIsSubmitting(false); }
  };

  const promptDeactivate = async (id) => { if(!window.confirm(`Deactivate?`)) return; try { await api.delete(`/offers/${id}`); await refreshAdminData(); } catch (err) { alert(t('common.action_failed')); } };
  const handleRestore = async (id) => { try { await api.post(`/offers/${id}/restore`); await refreshAdminData(); } catch (err) { alert(t('common.action_failed')); } };

  const formatDZD = (amount) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount || 0);
  const visibleOffers = useMemo(() => showInactive ? offers : offers.filter((o) => o.is_active), [offers, showInactive]);

  if (isPreloading) return <div className="p-6 flex justify-center"><RefreshCw className="animate-spin text-red-600" /></div>;

  return (
    <div className="space-y-6 pb-10 relative text-start">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Tags className="text-red-600"/> {t('manage.offers_title')}</h1>
        <button onClick={() => setIsAdding(!isAdding)} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 flex items-center gap-2 shadow-sm transition-colors">
          <Plus size={16}/> {isAdding ? t('common.cancel') : t('manage.add_offer')}
        </button>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none cursor-pointer font-medium">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
        {t('manage.show_inactive')}
      </label>

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
          <h2 className="text-lg font-black text-gray-900 mb-5 border-b pb-3">{t('manage.reg_new_offer')}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2"><label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">{t('common.name')}</label><input required name="name" value={formData.name} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none" /></div>
            <div>
              <div className="flex items-center justify-between mb-1.5"><label className="text-xs font-bold text-gray-700 uppercase tracking-wider">{t('common.category')}</label>{!isAddingCategory && !isEditingCategory && <button type="button" onClick={() => { setCategoryNameInput(''); setIsAddingCategory(true); }} className="text-red-600 hover:text-red-800 flex items-center gap-1 text-xs font-bold"><Plus size={14} strokeWidth={3}/> New</button>}</div>
              {isAddingCategory || isEditingCategory ? (
                <div className="flex items-center gap-2"><input type="text" value={categoryNameInput} onChange={(e) => setCategoryNameInput(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none" autoFocus /><button type="button" onClick={handleSaveCategory} className="bg-green-600 text-white px-3 py-2.5 rounded-lg font-bold text-sm">Save</button><button type="button" onClick={() => { setIsAddingCategory(false); setIsEditingCategory(false); }} className="bg-gray-100 text-gray-700 px-3 py-2.5 rounded-lg text-sm">Cancel</button></div>
              ) : (
                <div className="flex items-center gap-2"><select required name="category_id" value={formData.category_id} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none"><option value="">-- {t('common.all')} --</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{formData.category_id && <><button type="button" onClick={() => { const cat = categories.find(c => c.id === Number(formData.category_id)); setCategoryNameInput(cat?.name || ''); setIsEditingCategory(true); }} className="bg-blue-50 p-2.5 rounded-lg text-blue-600"><Pencil size={18}/></button><button type="button" onClick={promptDeleteCategory} className="bg-red-50 p-2.5 rounded-lg text-red-600"><Trash2 size={18}/></button></>}</div>
              )}
            </div>
            <div><label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">{t('manage.buying_price')}</label><input required type="number" step="0.01" name="real_price" value={formData.real_price} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none" /></div>
            <div><label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">{t('manage.selling_price')}</label><input required type="number" step="0.01" name="selling_price" value={formData.selling_price} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none" /></div>
            <div><label className="flex items-center gap-1.5 text-xs font-bold text-green-700 mb-1.5 uppercase tracking-wider">{t('manage.cashier_comm')}</label><input required type="number" step="0.01" name="commission_amount" value={formData.commission_amount} onChange={handleInputChange} className="w-full rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm outline-none" /></div>
            <div><label className="flex items-center gap-1.5 text-xs font-bold text-orange-700 mb-1.5 uppercase tracking-wider"><Zap size={14}/> {t('manage.commission')}</label><input type="number" name="commission_points" value={formData.commission_points} onChange={handleInputChange} className="w-full rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-sm outline-none" /></div>
            <div><label className="flex items-center gap-1.5 text-xs font-bold text-purple-700 mb-1.5 uppercase tracking-wider"><Award size={14}/> {t('manage.loyalty_pts')}</label><input type="number" name="loyalty_points" value={formData.loyalty_points} onChange={handleInputChange} className="w-full rounded-lg border border-purple-200 bg-purple-50 px-3 py-2.5 text-sm outline-none" /></div>
            <div className="md:col-span-3 flex justify-end mt-2 pt-5 border-t border-gray-100"><button type="submit" disabled={isSubmitting || isAddingCategory || isEditingCategory} className="bg-green-600 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50">{isSubmitting ? t('common.saving') : t('common.save')}</button></div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-start">
          <thead className="bg-gray-50">
            <tr><th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-start">{t('common.name')}</th><th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-start">{t('common.category')}</th><th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-end">{t('reports.cost')}</th><th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-end">{t('manage.selling_price')}</th><th className="p-4 text-xs font-bold text-green-700 uppercase tracking-wider text-end">{t('manage.cashier_comm')}</th><th className="p-4 text-xs font-bold text-orange-600 uppercase tracking-wider text-end">{t('manage.commission')}</th><th className="p-4 text-xs font-bold text-purple-600 uppercase tracking-wider text-end">{t('manage.loyalty_pts')}</th><th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">{t('common.status')}</th><th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-end">{t('common.actions')}</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleOffers.map(o => (
              <tr key={o.id} className={`${!o.is_active ? 'bg-gray-50 opacity-70' : 'hover:bg-gray-50'} transition-colors`}>
                <td className="p-4 font-bold text-sm text-gray-900 text-start">{o.name}</td>
                <td className="p-4 text-sm font-medium text-gray-600 text-start">{o.category_name || '—'}</td>
                <td className="p-4 text-sm font-medium text-gray-500 text-end">{formatDZD(o.real_price)}</td>
                <td className="p-4 text-sm font-black text-gray-900 text-end">{formatDZD(o.selling_price)}</td>
                <td className="p-4 text-sm font-bold text-green-700 text-end">{formatDZD(o.commission_amount)}</td>
                <td className="p-4 text-sm font-bold text-orange-600 text-end">{o.commission_points || 0}</td>
                <td className="p-4 text-sm font-bold text-purple-600 text-end">{o.loyalty_points || 0}</td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${o.is_active ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-200 text-gray-600 border border-gray-300'}`}>
                    {o.is_active ? t('common.active') : t('common.inactive')}
                  </span>
                </td>
                <td className="p-4 text-end space-x-3">
                  {o.is_active ? (
                    <><button onClick={() => setEditingOffer(o)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><Pencil size={18}/></button><button onClick={() => promptDeactivate(o.id)} className="text-orange-500 hover:bg-orange-50 p-1.5 rounded"><AlertTriangle size={18}/></button></>
                  ) : <button onClick={() => handleRestore(o.id)} className="text-green-600 hover:bg-green-50 p-1.5 rounded"><RotateCcw size={18}/></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingOffer && <EditOfferModal offer={editingOffer} categories={categories} onClose={() => setEditingOffer(null)} onSubmit={handleEditSubmit} submitting={isSubmitting} t={t} />}
    </div>
  );
}

function EditOfferModal({ offer, categories, onClose, onSubmit, submitting, t }) {
  const [formData, setFormData] = useState({ name: offer.name, category_id: offer.category_id, real_price: offer.real_price, selling_price: offer.selling_price, commission_amount: offer.commission_amount, commission_points: offer.commission_points, loyalty_points: offer.loyalty_points, low_stock_threshold: offer.low_stock_threshold, sort_order: offer.sort_order || '0' });
  const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm text-start">
      <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
        <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center"><h3 className="font-black text-lg text-gray-900 flex items-center gap-2"><Pencil size={20} className="text-blue-600"/> {t('common.edit')}</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={22}/></button></div>
        <form onSubmit={(e) => onSubmit(e, formData)} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">{t('common.name')}</label><input required name="name" value={formData.name} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none" /></div>
          <div><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">{t('common.category')}</label><select required name="category_id" value={formData.category_id} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none">{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">{t('manage.buying_price')}</label><input required type="number" step="0.01" name="real_price" value={formData.real_price} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none" /></div>
          <div><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">{t('manage.selling_price')}</label><input required type="number" step="0.01" name="selling_price" value={formData.selling_price} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none" /></div>
          <div><label className="block text-xs font-bold text-green-700 mb-1.5 uppercase">{t('manage.cashier_comm')}</label><input required type="number" step="0.01" name="commission_amount" value={formData.commission_amount} onChange={handleChange} className="w-full rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm outline-none" /></div>
          <div><label className="block text-xs font-bold text-orange-700 mb-1.5 uppercase">{t('manage.commission')}</label><input type="number" name="commission_points" value={formData.commission_points} onChange={handleChange} className="w-full rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-sm outline-none" /></div>
          <div><label className="block text-xs font-bold text-purple-700 mb-1.5 uppercase">{t('manage.loyalty_pts')}</label><input type="number" name="loyalty_points" value={formData.loyalty_points} onChange={handleChange} className="w-full rounded-lg border border-purple-200 bg-purple-50 px-3 py-2.5 text-sm outline-none" /></div>
          <div className="md:col-span-3 flex justify-end mt-2 pt-5 border-t border-gray-100 gap-3"><button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg">{t('common.cancel')}</button><button type="submit" disabled={submitting} className="px-8 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg disabled:opacity-50">{submitting ? t('common.saving') : t('common.save')}</button></div>
        </form>
      </div>
    </div>
  );
}
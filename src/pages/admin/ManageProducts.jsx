import { useState, useMemo, useRef } from 'react';
import api from '../../api/axios';
import { useAdminData } from '../../context/AdminDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Package, Plus, Trash2, Pencil, X, AlertTriangle, Barcode, RefreshCw, Award, Upload, FileSpreadsheet, Search } from 'lucide-react';

export default function ManageProducts() {
  const { adminData, isPreloading, refreshAdminData } = useAdminData();
  const { t } = useLanguage();
  const products = adminData.products || [];
  const categories = adminData.productCategories || [];

  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // NEW: Search state
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [formData, setFormData] = useState({ 
    name: '', category_id: '', price: '', real_price: '', commission_amount: '', 
    loyalty_points: '', low_stock_threshold: '5', barcode: '', stock_quantity: '0' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [categoryNameInput, setCategoryNameInput] = useState('');

  const fileInputRef = useRef(null);

  const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSaveCategory = async () => {
    if (!categoryNameInput.trim()) return;
    try {
      if (isAddingCategory) { const res = await api.post('/products/categories', { name: categoryNameInput }); setFormData({ ...formData, category_id: res.data.data.id }); } 
      else if (isEditingCategory) { await api.put(`/products/categories/${formData.category_id}`, { name: categoryNameInput }); }
      setIsAddingCategory(false); setIsEditingCategory(false); setCategoryNameInput(''); await refreshAdminData();
    } catch (err) { alert(err.response?.data?.message || t('common.action_failed')); }
  };

  const promptDeleteCategory = async () => {
    if(!window.confirm(`Delete category?`)) return;
    try { await api.delete(`/products/categories/${formData.category_id}`); setFormData({ ...formData, category_id: '' }); await refreshAdminData(); } 
    catch (err) { alert(err.response?.data?.message || t('common.action_failed')); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      await api.post('/products', { 
        ...formData, category_id: Number(formData.category_id), price: Number(formData.price), 
        real_price: Number(formData.real_price), commission_amount: Number(formData.commission_amount) || 0, 
        loyalty_points: Number(formData.loyalty_points) || 0, low_stock_threshold: Number(formData.low_stock_threshold),
        stock_quantity: Number(formData.stock_quantity) || 0 
      });
      setFormData({ name: '', category_id: '', price: '', real_price: '', commission_amount: '', loyalty_points: '', low_stock_threshold: '5', barcode: '', stock_quantity: '0' });
      setIsAdding(false); await refreshAdminData();
    } catch (err) { alert(err.response?.data?.message || t('common.action_failed')); } finally { setIsSubmitting(false); }
  };

  const handleEditSubmit = async (e, updatedData) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      await api.patch(`/products/${editingProduct.id}`, { 
        ...updatedData, category_id: Number(updatedData.category_id), price: Number(updatedData.price), 
        real_price: Number(updatedData.real_price), commission_amount: Number(updatedData.commission_amount) || 0, 
        loyalty_points: Number(updatedData.loyalty_points) || 0, low_stock_threshold: Number(updatedData.low_stock_threshold),
        stock_quantity: Number(updatedData.stock_quantity) || 0 
      });
      setEditingProduct(null); await refreshAdminData();
    } catch (err) { alert(err.response?.data?.message || t('common.action_failed')); } finally { setIsSubmitting(false); }
  };

  const promptDeactivate = async (id) => { if(!window.confirm(`Deactivate?`)) return; try { await api.delete(`/products/${id}`); await refreshAdminData(); } catch (err) { alert(t('common.action_failed')); } };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileData = new FormData();
    fileData.append('file', file);

    setIsUploading(true);
    try {
      await api.post('/products/bulk-upload', fileData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Products uploaded successfully!');
      await refreshAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload Excel file.');
    } finally {
      setIsUploading(false);
      e.target.value = null; 
    }
  };

  const formatDZD = (amount) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount || 0);
  
  // UPDATED SORTING LOGIC: Filters by search term AND lowest stock
  const visibleProducts = useMemo(() => {
    let list = showInactive ? products : products.filter((p) => p.is_active);
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(term) || 
        (p.barcode && p.barcode.toLowerCase().includes(term))
      );
    }

    return list.sort((a, b) => (Number(a.stock_quantity) || 0) - (Number(b.stock_quantity) || 0));
  }, [products, showInactive, searchTerm]);

  if (isPreloading) return <div className="p-6 flex justify-center"><RefreshCw className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6 pb-10 relative text-start">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-4 gap-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Package className="text-blue-600"/> {t('manage.products_title')}</h1>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex-1 sm:flex-none bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg font-bold hover:bg-emerald-100 flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
            {isUploading ? <RefreshCw size={16} className="animate-spin" /> : <FileSpreadsheet size={16}/>} 
            {isUploading ? t('manage.uploading') : t('manage.upload_excel')}
          </button>
          
          <button onClick={() => setIsAdding(!isAdding)} className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm transition-colors">
            <Plus size={16}/> {isAdding ? t('common.cancel') : t('manage.add_product')}
          </button>
        </div>
      </div>

      {/* NEW: Search Bar and Checkbox Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-80">
          <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center pl-3 rtl:pr-3">
            <Search size={16} className="text-gray-400" />
          </div>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('manage.search_product')}
            className="w-full rounded-lg border border-gray-300 pl-9 rtl:pr-9 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
          />
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none cursor-pointer font-medium">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          {t('manage.show_inactive')}
        </label>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
          <h2 className="text-lg font-black text-gray-900 mb-5 border-b pb-3">{t('manage.reg_new_product')}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">{t('common.name')}</label><input required name="name" value={formData.name} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none" /></div>
            <div>
              <div className="flex items-center justify-between mb-1.5"><label className="text-xs font-bold text-gray-700 uppercase tracking-wider">{t('common.category')}</label>{!isAddingCategory && !isEditingCategory && <button type="button" onClick={() => { setCategoryNameInput(''); setIsAddingCategory(true); }} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-[11px] font-bold"><Plus size={14} strokeWidth={3}/> New</button>}</div>
              {isAddingCategory || isEditingCategory ? (
                <div className="flex items-center gap-2"><input type="text" value={categoryNameInput} onChange={(e) => setCategoryNameInput(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none" autoFocus /><button type="button" onClick={handleSaveCategory} className="bg-green-600 text-white px-3 py-2.5 rounded-lg font-bold text-sm shrink-0">Save</button><button type="button" onClick={() => { setIsAddingCategory(false); setIsEditingCategory(false); }} className="bg-gray-100 text-gray-700 px-3 py-2.5 rounded-lg text-sm shrink-0">Cancel</button></div>
              ) : (
                <div className="flex items-center gap-2"><select required name="category_id" value={formData.category_id} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none truncate"><option value="">-- {t('common.all')} --</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{formData.category_id && <><button type="button" onClick={() => { const cat = categories.find(c => c.id === Number(formData.category_id)); setCategoryNameInput(cat?.name || ''); setIsEditingCategory(true); }} className="bg-blue-50 p-2.5 rounded-lg text-blue-600 shrink-0"><Pencil size={16}/></button><button type="button" onClick={promptDeleteCategory} className="bg-red-50 p-2.5 rounded-lg text-red-600 shrink-0"><Trash2 size={16}/></button></>}</div>
              )}
            </div>
            <div><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase"><Barcode size={14} className="inline mx-1"/> {t('manage.barcode')}</label><input name="barcode" value={formData.barcode} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-gray-50 font-mono outline-none" placeholder="Scan..." /></div>
            <div><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">{t('manage.buying_price')}</label><input required type="number" step="0.01" name="real_price" value={formData.real_price} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none" /></div>
            <div><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">{t('manage.selling_price')}</label><input required type="number" step="0.01" name="price" value={formData.price} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none" /></div>
            <div><label className="block text-xs font-bold text-green-700 mb-1.5 uppercase">{t('manage.cashier_comm')}</label><input required type="number" step="0.01" name="commission_amount" value={formData.commission_amount} onChange={handleInputChange} className="w-full rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm outline-none" /></div>
            <div><label className="block text-xs font-bold text-purple-700 mb-1.5 uppercase"><Award size={14} className="inline mx-1"/> {t('manage.loyalty_pts')}</label><input type="number" name="loyalty_points" value={formData.loyalty_points} onChange={handleInputChange} className="w-full rounded-lg border border-purple-200 bg-purple-50 px-3 py-2.5 text-sm outline-none" /></div>
            
            <div><label className="block text-xs font-bold text-indigo-700 mb-1.5 uppercase"><Package size={14} className="inline mx-1"/> {t('manage.stock')}</label><input required type="number" name="stock_quantity" value={formData.stock_quantity} onChange={handleInputChange} className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm font-bold text-indigo-900 outline-none" /></div>

            <div className="md:col-span-3 flex justify-end mt-2 pt-5 border-t border-gray-100 gap-3"><button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg">{t('common.cancel')}</button><button type="submit" disabled={isSubmitting || isAddingCategory || isEditingCategory} className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-bold disabled:opacity-50">{isSubmitting ? t('common.saving') : t('common.save')}</button></div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-start">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase text-start">{t('common.name')}</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase text-start">{t('common.category')}</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase text-start">{t('manage.barcode')}</th>
              <th className="p-4 text-xs font-bold text-indigo-600 uppercase text-center bg-indigo-50/50">{t('manage.stock')}</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase text-end">{t('reports.cost')}</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase text-end">{t('manage.selling_price')}</th>
              <th className="p-4 text-xs font-bold text-green-700 uppercase text-end">{t('manage.cashier_comm')}</th>
              <th className="p-4 text-xs font-bold text-purple-600 uppercase text-end">{t('manage.loyalty_pts')}</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">{t('common.status')}</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase text-end">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleProducts.map(p => {
              const qty = Number(p.stock_quantity) || 0;
              const threshold = Number(p.low_stock_threshold) || 5;
              const isLowStock = qty <= threshold;

              return (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-bold text-sm text-gray-900 truncate max-w-[200px]" title={p.name}>{p.name}</td>
                  <td className="p-4 text-sm font-medium text-gray-600 truncate max-w-[150px]">{p.category_name || '—'}</td>
                  <td className="p-4 text-xs text-gray-500 font-mono whitespace-nowrap">{p.barcode || '—'}</td>
                  <td className="p-4 text-center whitespace-nowrap bg-indigo-50/10">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black ${isLowStock ? 'bg-red-100 text-red-700' : 'text-indigo-700'}`}>
                      {qty}
                    </span>
                  </td>
                  <td className="p-4 text-sm font-medium text-gray-500 text-end whitespace-nowrap">{formatDZD(p.real_price)}</td>
                  <td className="p-4 text-sm font-black text-blue-700 text-end whitespace-nowrap">{formatDZD(p.price)}</td>
                  <td className="p-4 text-sm font-bold text-green-700 text-end whitespace-nowrap">{formatDZD(p.commission_amount)}</td>
                  <td className="p-4 text-sm font-bold text-purple-600 text-end whitespace-nowrap">{p.loyalty_points || 0}</td>
                  <td className="p-4 text-center whitespace-nowrap"><span className={`px-2 py-1 text-[10px] font-black uppercase rounded-full ${p.is_active ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>{p.is_active ? t('common.active') : t('common.inactive')}</span></td>
                  <td className="p-4 text-end whitespace-nowrap space-x-2"><button onClick={() => setEditingProduct(p)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><Pencil size={16}/></button>{p.is_active && <button onClick={() => promptDeactivate(p.id)} className="text-orange-500 hover:bg-orange-50 p-1.5 rounded"><AlertTriangle size={16}/></button>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editingProduct && <EditProductModal product={editingProduct} categories={categories} onClose={() => setEditingProduct(null)} onSubmit={handleEditSubmit} submitting={isSubmitting} t={t} />}
    </div>
  );
}

function EditProductModal({ product, categories, onClose, onSubmit, submitting, t }) {
  const [formData, setFormData] = useState({ 
    name: product.name, category_id: product.category_id, price: product.price, real_price: product.real_price, 
    commission_amount: product.commission_amount, loyalty_points: product.loyalty_points, low_stock_threshold: product.low_stock_threshold, 
    barcode: product.barcode || '', stock_quantity: product.stock_quantity || 0 
  });
  const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm text-start">
      <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
        <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center"><h3 className="font-black text-lg text-gray-900 flex items-center gap-2"><Pencil size={20} className="text-blue-600"/> {t('common.edit')}</h3><button onClick={onClose} className="text-gray-400"><X size={22}/></button></div>
        <form onSubmit={(e) => onSubmit(e, formData)} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">{t('common.name')}</label><input required name="name" value={formData.name} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none" /></div>
          <div><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">{t('common.category')}</label><select required name="category_id" value={formData.category_id} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none">{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase"><Barcode size={14} className="inline mx-1"/> {t('manage.barcode')}</label><input name="barcode" value={formData.barcode} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-gray-50 font-mono outline-none" /></div>
          <div><label className="block text-xs font-bold text-indigo-700 mb-1.5 uppercase"><Package size={14} className="inline mx-1"/> {t('manage.stock')}</label><input required type="number" name="stock_quantity" value={formData.stock_quantity} onChange={handleChange} className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm font-bold text-indigo-900 outline-none" /></div>
          <div><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">{t('manage.buying_price')}</label><input required type="number" step="0.01" name="real_price" value={formData.real_price} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none" /></div>
          <div><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">{t('manage.selling_price')}</label><input required type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none" /></div>
          <div><label className="block text-xs font-bold text-green-700 mb-1.5 uppercase">{t('manage.cashier_comm')}</label><input required type="number" step="0.01" name="commission_amount" value={formData.commission_amount} onChange={handleChange} className="w-full rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm outline-none" /></div>
          <div><label className="block text-xs font-bold text-purple-700 mb-1.5 uppercase"><Award size={14} className="inline mx-1"/> {t('manage.loyalty_pts')}</label><input type="number" name="loyalty_points" value={formData.loyalty_points} onChange={handleChange} className="w-full rounded-lg border border-purple-200 bg-purple-50 px-3 py-2.5 text-sm outline-none" /></div>
          <div className="md:col-span-3 flex justify-end mt-3 pt-5 border-t border-gray-100 gap-3"><button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg">{t('common.cancel')}</button><button type="submit" disabled={submitting} className="px-8 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg disabled:opacity-50">{submitting ? t('common.saving') : t('common.save')}</button></div>
        </form>
      </div>
    </div>
  );
}
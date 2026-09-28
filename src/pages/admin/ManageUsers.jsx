import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAdminData } from '../../context/AdminDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Users, Plus, Pencil, Trash2, X, RefreshCw, Eye, EyeOff, ShieldAlert } from 'lucide-react';

export default function ManageUsers() {
  const { adminData, isPreloading, refreshAdminData } = useAdminData();
  const { t } = useLanguage();
  const users = adminData.users || [];
  
  // FIX 1: Fetch stores directly if they are missing from adminData
  const [stores, setStores] = useState([]);
  useEffect(() => {
    if (adminData.stores && adminData.stores.length > 0) {
      setStores(adminData.stores);
    } else {
      api.get('/stores')
         .then(res => setStores(res.data.data || res.data || []))
         .catch(err => console.error('Failed to fetch stores', err));
    }
  }, [adminData.stores]);

  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({ 
    full_name: '', username: '', password: '', role: 'cashier', store_id: '' 
  });

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/users', {
        ...formData,
        store_id: formData.store_id ? Number(formData.store_id) : null
      });
      setFormData({ full_name: '', username: '', password: '', role: 'cashier', store_id: '' });
      setIsAdding(false);
      await refreshAdminData();
    } catch (err) {
      alert(err.response?.data?.message || t('common.action_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e, updatedData) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.patch(`/users/${editingUser.id}`, {
        full_name: updatedData.full_name,
        username: updatedData.username,
        store_id: updatedData.store_id ? Number(updatedData.store_id) : null,
        password: updatedData.password || undefined 
      });
      setEditingUser(null);
      await refreshAdminData();
    } catch (err) {
      alert(err.response?.data?.message || t('common.action_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const promptDeactivate = async (id) => {
    if(!window.confirm(`Deactivate user?`)) return;
    try {
      await api.delete(`/users/${id}`);
      await refreshAdminData();
    } catch (err) {
      alert(t('common.action_failed'));
    }
  };

  if (isPreloading) return <div className="p-6 flex justify-center"><RefreshCw className="animate-spin text-red-600" /></div>;

  return (
    <div className="space-y-6 text-start pb-10">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="text-red-600" /> {t('manage.staff_title')}
        </h1>
        <button 
          onClick={() => setIsAdding(!isAdding)} 
          className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus size={16}/> {isAdding ? t('common.cancel') : t('manage.add_user')}
        </button>
      </div>

      {isAdding && (
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 animate-in fade-in zoom-in-95">
           <h2 className="text-lg font-black text-gray-900 mb-5 border-b pb-3">{t('manage.create_account')}</h2>
           <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <div><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">{t('manage.full_name')}</label><input required name="full_name" value={formData.full_name} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none" /></div>
             <div><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">{t('manage.username')}</label><input required name="username" value={formData.username} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none" /></div>
             <div><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">{t('manage.password')}</label><input required type="password" name="password" value={formData.password} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none" /></div>
             
             <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">{t('manage.role')}</label>
                <select required name="role" value={formData.role} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-bold outline-none">
                  <option value="cashier">Cashier</option>
                  <option value="admin">System Administrator</option>
                </select>
             </div>

             <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">{t('manage.assigned_store')}</label>
                {/* FIX 2: Store is only required if the role is 'cashier' */}
                <select required={formData.role === 'cashier'} name="store_id" value={formData.store_id} onChange={handleInputChange} className="w-full md:w-1/2 rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none">
                  <option value="">-- Select Store --</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
             </div>
             
             <div className="md:col-span-2 flex justify-end gap-3 mt-2 border-t border-gray-100 pt-4">
               <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg">{t('common.cancel')}</button>
               <button type="submit" disabled={isSubmitting} className="bg-red-600 text-white px-8 py-2.5 rounded-lg font-bold">{isSubmitting ? t('common.saving') : t('common.save')}</button>
             </div>
           </form>
         </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-start">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('manage.full_name')}</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('manage.username')}</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('manage.role')}</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('manage.assigned_store')}</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">{t('common.status')}</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase text-end">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="p-4 text-sm font-bold text-gray-900">{u.full_name}</td>
                <td className="p-4 text-sm text-gray-600 font-mono">{u.username}</td>
                <td className="p-4"><span className={`px-2 py-1 text-[10px] font-black uppercase rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.role}</span></td>
                <td className="p-4 text-sm font-medium text-gray-700">{u.store_name || '—'}</td>
                <td className="p-4 text-center"><span className={`px-2 py-1 text-[10px] font-black uppercase rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.is_active ? t('common.active') : t('common.inactive')}</span></td>
                <td className="p-4 text-end space-x-2">
                  <button onClick={() => setEditingUser(u)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><Pencil size={16}/></button>
                  {u.is_active && u.role !== 'admin' && <button onClick={() => promptDeactivate(u.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && <EditUserModal user={editingUser} stores={stores} onClose={() => setEditingUser(null)} onSubmit={handleEditSubmit} submitting={isSubmitting} t={t} />}
    </div>
  );
}

function EditUserModal({ user, stores, onClose, onSubmit, submitting, t }) {
  const [formData, setFormData] = useState({ 
    full_name: user.full_name, username: user.username, store_id: user.store_id || '', password: '' 
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm text-start">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95">
        <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="font-black text-lg text-gray-900 flex items-center gap-2"><Pencil size={20} className="text-blue-600"/> {t('manage.edit_user')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900"><X size={22}/></button>
        </div>
        
        <form onSubmit={(e) => onSubmit(e, formData)} className="p-6 space-y-5">
          <div><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">{t('manage.full_name')}</label><input required name="full_name" value={formData.full_name} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none" /></div>
          <div><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">{t('manage.username')}</label><input required name="username" value={formData.username} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none font-mono" /></div>
          
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">{t('manage.assigned_store')}</label>
            {/* FIX 2: Store is only required if the role is 'cashier' */}
            <select required={user.role === 'cashier'} name="store_id" value={formData.store_id} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none">
              <option value="">-- Select Store --</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
            <label className="flex items-center gap-2 text-xs font-bold text-orange-800 mb-1.5 uppercase">
              <ShieldAlert size={14}/> {t('manage.reset_pwd')}
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                placeholder={t('manage.new_password_hint')}
                className="w-full rounded-lg border border-orange-200 px-3 py-2.5 text-sm outline-none pr-10" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-800"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg">{t('common.cancel')}</button>
            <button type="submit" disabled={submitting} className="px-8 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg disabled:opacity-50">{submitting ? t('common.saving') : t('common.save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
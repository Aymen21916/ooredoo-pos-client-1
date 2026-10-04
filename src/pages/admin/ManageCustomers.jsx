import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../api/axios';
import { useAdminData } from '../../context/AdminDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { UsersRound, Plus, Pencil, Trash2, X, Search, RefreshCw, Phone, MapPin, Briefcase, User,
   Smartphone, Zap, CreditCard, History, CheckCircle2, AlertCircle, Calendar, Trophy, Bell, Copy,
    Award, Crown, Star, Shield, SlidersHorizontal, Download, Upload } from 'lucide-react';

const emptyForm = { phone_number: '', first_name: '', last_name: '', address: '', profession: '', notes: '', referred_by_phone: '' };
const formatDZD = (n) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(n || 0);
const formatDate = (s) => s ? new Date(s).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' }) : '—';
const formatDateTime = (s) => s ? new Date(s).toLocaleString('en-GB', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

const TierBadge = ({ tier }) => {
  const config = { VVIP: { color: 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-md border-transparent', icon: <Crown size={14} className="text-yellow-300" /> }, VIP: { color: 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md border-transparent', icon: <Star size={14} className="text-violet-200" /> }, Gold: { color: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-900 shadow-sm border-amber-300', icon: <Shield size={14} className="text-amber-800" /> }, Silver: { color: 'bg-gradient-to-r from-slate-200 to-gray-300 text-gray-800 shadow-sm border-gray-400', icon: <Shield size={14} className="text-gray-600" /> }, Bronze: { color: 'bg-gradient-to-r from-orange-200 to-amber-300 text-orange-900 shadow-sm border-orange-400', icon: <Shield size={14} className="text-orange-800" /> }, Regular: { color: 'bg-gray-100 text-gray-500 border-gray-200', icon: null } };
  const { color, icon } = config[tier] || config.Regular;
  return <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${color}`}>{icon} {tier}</span>;
};

export default function ManageCustomers() {
  const { adminData } = useAdminData();
  const { t } = useLanguage();
  const offers = adminData?.offers || [];
  const cashiers = (adminData?.users || []).filter(u => u.role === 'cashier');

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const [search, setSearch]             = useState('');
  const [purchaseType, setPurchaseType] = useState('all');
  const [fromDate, setFromDate]         = useState('');
  const [toDate, setToDate]             = useState('');
  const [offerFilter, setOfferFilter]   = useState('');
  const [cashierFilter, setCashierFilter] = useState('');
  const [tierFilter, setTierFilter]     = useState('all');

  const [popData, setPopData]           = useState({ is_reminder_day: false, cycle_due: null, customers: [] });
  const [selectedCycleTab, setSelectedCycleTab] = useState(null);
  const [showPopModal, setShowPopModal] = useState(false);

  const [modal, setModal]           = useState(null);
  const [editing, setEditing]       = useState(null);
  const [formData, setFormData]     = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  
  const [details, setDetails]               = useState(null);
  const [historyTab, setHistoryTab]         = useState('sim');
  const [historyRows, setHistoryRows]       = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => { fetchPopReminders(); }, [selectedCycleTab]);
  useEffect(() => { const delayDebounce = setTimeout(() => { fetchCustomers(); }, 300); return () => clearTimeout(delayDebounce); }, [search, purchaseType, fromDate, toDate, offerFilter, cashierFilter]);

  const fetchPopReminders = async () => {
    try { const params = selectedCycleTab ? { cycle: selectedCycleTab } : {}; const r = await api.get('/customers/pop-reminders', { params }); setPopData(r.data.data); } catch (err) {}
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true); setError('');
      const params = { limit: 200 };
      if (search.trim()) params.q = search.trim();
      if (purchaseType !== 'all') params.type = purchaseType;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      if (offerFilter) params.offer_id = offerFilter;
      if (cashierFilter) params.created_by = cashierFilter;
      const r = await api.get('/customers', { params });
      setCustomers(r.data.data);
    } catch (err) { setError(err.response?.data?.message || t('common.action_failed')); } finally { setLoading(false); }
  };

  const filteredCustomers = useMemo(() => { if (tierFilter === 'all') return customers; return customers.filter(c => c.tier === tierFilter); }, [customers, tierFilter]);
  const maxStorm = useMemo(() => { if (filteredCustomers.length === 0) return 0; return Math.max(...filteredCustomers.map(c => c.storm_total || 0)); }, [filteredCustomers]);
  const kpis = useMemo(() => { return { total: filteredCustomers.length, totalSims: filteredCustomers.reduce((s, c) => s + (c.sim_count || 0), 0), totalStorm: filteredCustomers.reduce((s, c) => s + (c.storm_total || 0), 0), totalSpent: filteredCustomers.reduce((s, c) => s + (c.total_spent || 0), 0) }; }, [filteredCustomers]);

  const openCreate = () => { setFormData(emptyForm); setEditing(null); setModal('create'); };
  const openEdit = (customer) => { setFormData({ phone_number: customer.phone_number || '', first_name: customer.first_name || '', last_name: customer.last_name || '', address: customer.address || '', profession: customer.profession || '', notes: customer.notes || '', referred_by_phone: '' }); setEditing(customer.id); setModal('edit'); };

  const openView = async (customer, initialTab = 'sim') => {
    setEditing(customer.id); setDetails(null); setHistoryRows([]); setHistoryTab(initialTab); setModal('view');
    try { const r = await api.get(`/customers/${customer.id}`); setDetails(r.data.data); loadHistory(customer.id, initialTab); } 
    catch (err) { setError(t('common.action_failed')); setModal(null); }
  };

  const loadHistory = async (customerId, type) => {
    setHistoryLoading(true); setHistoryTab(type);
    try {
      if (type === 'loyalty') { const r = await api.get(`/customers/${customerId}/loyalty-ledger`); setHistoryRows(r.data.data); } 
      else { const r = await api.get(`/customers/${customerId}/purchases`, { params: { type } }); setHistoryRows(r.data.data); }
    } catch (err) { setError(t('common.action_failed')); } finally { setHistoryLoading(false); }
  };

  const closeModal = () => { setModal(null); setEditing(null); setFormData(emptyForm); setDetails(null); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true); setError('');
    try {
      if (modal === 'create') { await api.post('/customers', formData); setSuccess(`Customer created successfully.`); } 
      else if (modal === 'edit') { await api.patch(`/customers/${editing}`, formData); setSuccess(`Customer updated successfully.`); }
      setTimeout(() => setSuccess(''), 3500); closeModal(); fetchCustomers();
    } catch (err) { setError(err.response?.data?.message || 'Save failed.'); } finally { setSubmitting(false); }
  };

  const handleDelete = async (customer) => {
    if (!window.confirm(`Delete "${customer.first_name} ${customer.last_name}"?`)) return;
    try { const r = await api.delete(`/customers/${customer.id}`); setSuccess(r.data.message); setTimeout(() => setSuccess(''), 3500); fetchCustomers(); } 
    catch (err) { setError(err.response?.data?.message || 'Delete failed.'); }
  };

  const exportToExcel = () => {
    if (filteredCustomers.length === 0) return alert(t('common.no_data') || 'No customers to export.');

    const headers = [
      t('modal.first_name') || 'ussd.first_name', 
      t('modal.last_name') || 'ussd.last_name', 
      t('reports.phone') || 'Phone', 
      t('manage.customer_tier') || 'Tier', 
      t('modal.profession') || 'Profession',
      t('modal.address') || 'Address',
      'Notes',      // NEW
      'Cashier',    // NEW
      t('crm.total_sims') || 'Total SIMs', 
      t('crm.storm_volume') || 'Storm (DZD)', 
      t('crm.acc_profit') || 'Acc. Profit (DZD)', 
      t('crm.total_spent') || 'Total Spent (DZD)', 
      t('manage.points_balance') || 'Points'
    ];
    
    const separator = ';';

    const csvRows = filteredCustomers.map(c => {
      // Find the cashier name using the created_by ID
      const cashierMatch = cashiers.find(u => u.id === c.created_by);
      const cashierName = cashierMatch ? (cashierMatch.full_name || cashierMatch.username) : 'System';

      return [
        `"${(c.first_name || '').replace(/"/g, '""')}"`,
        `"${(c.last_name || '').replace(/"/g, '""')}"`,
        `"${c.phone_number || ''}"`, 
        `"${c.tier || 'Regular'}"`,
        `"${(c.profession || '').replace(/"/g, '""')}"`,
        `"${(c.address || '').replace(/"/g, '""')}"`,
        `"${(c.notes || '').replace(/"/g, '""')}"`, // Map Notes
        `"${cashierName}"`,                        // Map Cashier string
        c.sim_count || 0,
        c.storm_total || 0,
        c.accessory_profit || 0,
        c.total_spent || 0,
        Math.floor(c.available_points || 0)
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(separator), ...csvRows.map(row => row.join(separator))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Ooredoo_Customers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileData = new FormData();
    fileData.append('file', file);

    setLoading(true);
    try {
      const res = await api.post('/customers/bulk-upload', fileData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess(res.data.message || 'Customers imported successfully!');
      setTimeout(() => setSuccess(''), 3500);
      fetchCustomers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload Excel file.');
    } finally {
      setLoading(false);
      e.target.value = null; 
    }
  };

  return (
    <div className="space-y-6 pb-12 text-start">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><UsersRound className="text-red-600" /> {t('manage.customers_title')}</h1>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
            <Upload size={16} /> {t('manage.import_excel')}
          </button>
          <button onClick={exportToExcel} className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
            <Download size={16} /> {t('manage.export_excel')}
          </button>
          <button onClick={() => setShowPopModal(true)} className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600"><Bell size={16} /> {t('manage.pop_reminders')} {popData.customers?.length > 0 && `(${popData.customers.length})`}</button>
          <button onClick={openCreate} className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"><Plus size={16} /> {t('manage.add_customer')}</button>
        </div>
      </div>

      <div className="flex flex-col gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <div className="w-full sm:w-1/3">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">{t('crm.search_database')}</label>
            <div className="relative">
              <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder={t('crm.search_placeholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-gray-300 px-9 py-2 text-sm focus:border-red-500 outline-none" />
            </div>
          </div>
          <div className="w-full sm:w-1/4">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">{t('manage.filter_purchase')}</label>
            <select value={purchaseType} onChange={(e) => { setPurchaseType(e.target.value); setOfferFilter(''); }} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 bg-white outline-none">
              <option value="all">{t('common.all')}</option>
              <option value="sim">SIM</option>
              <option value="storm">Storm/Bundle</option>
              <option value="accessory">Accessories</option>
            </select>
          </div>
          <div className="w-full sm:w-1/6">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">{t('reports.from')}</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none" />
          </div>
          <div className="w-full sm:w-1/6">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">{t('reports.to')}</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-end gap-3 pt-3 border-t border-gray-100">
          <div className="w-full sm:w-1/3"><label className="block text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">{t('manage.filter_level')}</label><select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className="w-full rounded-md border border-purple-200 px-3 py-2 text-sm focus:border-purple-500 bg-purple-50 font-bold text-purple-900 outline-none"><option value="all">-- {t('common.all')} --</option><option value="VVIP">VVIP</option><option value="VIP">VIP</option><option value="Gold">Gold</option><option value="Silver">Silver</option><option value="Bronze">Bronze</option><option value="Regular">Regular</option></select></div>
          <div className="w-full sm:w-1/3"><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 text-red-600">{t('manage.target_offer')}</label><select disabled={purchaseType !== 'all' && purchaseType !== 'sim'} value={offerFilter} onChange={(e) => setOfferFilter(e.target.value)} className="w-full rounded-md border border-red-200 px-3 py-2 text-sm focus:border-red-500 bg-red-50 font-medium disabled:opacity-50 outline-none"><option value="">-- {t('common.all')} --</option>{offers.map(o => (<option key={o.id} value={o.id}>{o.name}</option>))}</select></div>
          <div className="w-full sm:w-1/3"><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 text-blue-600">{t('manage.created_by')}</label><select value={cashierFilter} onChange={(e) => setCashierFilter(e.target.value)} className="w-full rounded-md border border-blue-200 px-3 py-2 text-sm focus:border-blue-500 bg-blue-50 font-medium outline-none"><option value="">-- {t('common.all')} --</option>{cashiers.map(c => (<option key={c.id} value={c.id}>{c.full_name || c.username}</option>))}</select></div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr><th className="px-4 py-4 text-start text-xs font-bold text-gray-500 uppercase tracking-wider">{t('manage.customer_tier')}</th><th className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100/50">{t('crm.total_sims')}</th><th className="px-4 py-4 text-end text-xs font-bold text-orange-600 uppercase tracking-wider bg-orange-50/30">{t('crm.storm_volume')}</th><th className="px-4 py-4 text-end text-xs font-bold text-green-600 uppercase tracking-wider bg-green-50/30">{t('crm.acc_profit')}</th><th className="px-4 py-4 text-end text-xs font-bold text-gray-800 uppercase tracking-wider bg-gray-100/50">{t('crm.total_spent')}</th><th className="px-4 py-4 text-center text-xs font-bold text-indigo-500 uppercase tracking-wider bg-indigo-50/30">{t('manage.points_balance')}</th><th className="px-4 py-4 text-end text-xs font-bold text-gray-500 uppercase tracking-wider">{t('common.actions')}</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? <tr><td colSpan="7" className="px-4 py-12 text-center"><RefreshCw className="inline animate-spin text-red-600" /></td></tr> : filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap"><div className="flex items-center gap-3 mb-1.5"><span className="font-bold text-gray-900 text-base">{c.first_name} {c.last_name}</span><TierBadge tier={c.tier} /></div><div className="text-xs text-gray-500 font-mono tracking-wide">{c.phone_number} <span className="mx-2 text-gray-400 font-sans">• {c.profession}</span></div></td>
                    <td className="px-4 py-3 whitespace-nowrap text-base font-bold text-center bg-gray-50/30">{c.sim_count}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-end bg-orange-50/10"><div className="font-bold text-gray-900 text-base">{formatDZD(c.storm_total)}</div></td>
                    <td className="px-4 py-3 whitespace-nowrap text-end font-bold text-green-600 bg-green-50/10">{formatDZD(c.accessory_profit)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-end font-black text-gray-900 bg-gray-50/30">{formatDZD(c.total_spent)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center bg-indigo-50/10"><span className="font-black text-indigo-600 bg-white border border-indigo-100 px-3 py-1 rounded-full text-xs shadow-sm">{Math.floor(c.available_points || 0)}</span></td>
                    <td className="px-4 py-3 whitespace-nowrap text-end text-sm font-medium space-x-3"><button onClick={() => openView(c, 'sim')} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><History size={18} /></button><button onClick={() => openEdit(c)} className="text-gray-400 hover:text-gray-900 hover:bg-gray-100 p-1.5 rounded"><Pencil size={18} /></button><button onClick={() => handleDelete(c)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded"><Trash2 size={18} /></button></td>
                  </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(modal === 'create' || modal === 'edit') && <FormModal mode={modal} formData={formData} setFormData={setFormData} submitting={submitting} onSubmit={handleSubmit} onClose={closeModal} t={t} />}
      {/* Update this line to include users={adminData?.users || []} */}
      {modal === 'view' && <ViewModal customer={details} loading={!details} onClose={closeModal} onEdit={() => details && openEdit(details)} onAdjustPoints={() => setShowAdjustModal(true)} historyTab={historyTab} historyRows={historyRows} historyLoading={historyLoading} onChangeTab={(t) => details && loadHistory(details.id, t)} users={adminData?.users || []} t={t} />}
      {showAdjustModal && <AdjustPointsModal customer={details} onClose={() => setShowAdjustModal(false)} onSuccess={() => { setShowAdjustModal(false); openView(details, historyTab); fetchCustomers(); }} t={t} />}
      {showPopModal && <PopRemindersModal popData={popData} selectedCycleTab={selectedCycleTab} setSelectedCycleTab={setSelectedCycleTab} onClose={() => setShowPopModal(false)} t={t} />}
    </div>
  );
}

function FormModal({ mode, formData, setFormData, submitting, onSubmit, onClose, t }) {
  const setField = (name) => (e) => setFormData((f) => ({ ...f, [name]: e.target.value }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-start">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4"><h3 className="font-bold text-lg text-gray-900">{mode === 'create' ? t('manage.add_customer') : t('common.edit')}</h3><button onClick={onClose} className="text-gray-400 hover:bg-gray-200 rounded p-1"><X size={20} /></button></div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <Field icon={<Phone size={14} />} label={t('reports.phone')} required value={formData.phone_number} onChange={setField('phone_number')} placeholder="0555..." />
          <div className="grid grid-cols-2 gap-4">
            <Field icon={<User size={14} />} label={t('modal.first_name')} required value={formData.first_name} onChange={setField('first_name')} />
            <Field icon={<User size={14} />} label={t('modal.last_name')}  required value={formData.last_name}  onChange={setField('last_name')} />
          </div>
          <Field icon={<MapPin size={14} />} label={t('modal.address')} required value={formData.address} onChange={setField('address')} />
          <Field icon={<Briefcase size={14} />} label={t('modal.profession')} required value={formData.profession} onChange={setField('profession')} />
          {mode === 'create' && (
            <Field icon={<Phone size={14} />} label="Referred By (Phone)" required={false} value={formData.referred_by_phone || ''} onChange={setField('referred_by_phone')} placeholder="Optional: Enter veteran customer phone..." />
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100"><button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg">{t('common.cancel')}</button><button type="submit" disabled={submitting} className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 rounded-lg disabled:opacity-50">{submitting ? t('common.saving') : t('common.save')}</button></div>
        </form>
      </div>
    </div>
  );
}

function Field({ icon, label, required, value, onChange, placeholder }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">{icon} {label}</label>
      <input type="text" required={required} value={value} onChange={onChange} placeholder={placeholder} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500 outline-none transition-all" />
    </div>
  );
}

// Add 'users' to the destructured props here
function ViewModal({ customer, loading, onClose, onEdit, onAdjustPoints, historyTab, historyRows, historyLoading, onChangeTab, users, t }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-start">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><UsersRound className="text-red-500" size={22} /> {t('crm.customer_profile')}</h3>
          <div className="flex items-center gap-4">
            {customer && (
              <>
                <button onClick={onAdjustPoints} className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"><SlidersHorizontal size={14} strokeWidth={2.5} /> {t('manage.adjust_points')}</button>
                <button onClick={onEdit} className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors border-s pl-4 border-gray-200"><Pencil size={14} strokeWidth={2.5} /> {t('manage.edit_profile')}</button>
              </>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors border-s pl-4 border-gray-200"><X size={22} /></button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {loading || !customer ? (
            <div className="flex justify-center py-12"><RefreshCw className="animate-spin text-red-600" size={28} /></div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  
                  {/* UPDATE THIS BLOCK: Now displays Address, Profession, Notes, and Cashier */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2"><h2 className="text-[26px] font-black text-gray-900 tracking-tight">{customer.first_name} {customer.last_name}</h2><TierBadge tier={customer.tier || customer.stats?.tier} /></div>
                    <div className="text-sm font-medium text-gray-500 font-mono flex items-center gap-2"><Phone size={14}/> {customer.phone_number}</div>
                    <div className="text-sm font-medium text-gray-500 font-mono flex items-center gap-2"><User size={14}/> {customer.custCode}</div>

                    <div className="space-y-2 mt-4 text-sm bg-gray-50 rounded-xl p-4 border border-gray-100 max-w-lg">
                      {customer.profession && <div className="flex items-start gap-3"><Briefcase size={16} className="text-gray-400 mt-0.5 shrink-0"/><span className="font-medium text-gray-800">{customer.profession}</span></div>}
                      {customer.address && <div className="flex items-start gap-3"><MapPin size={16} className="text-gray-400 mt-0.5 shrink-0"/><span className="font-medium text-gray-800">{customer.address}</span></div>}
                      {customer.notes && <div className="flex items-start gap-3"><Copy size={16} className="text-gray-400 mt-0.5 shrink-0"/><span className="italic text-gray-700">{customer.notes}</span></div>}
                      {customer.created_by && <div className="flex items-start gap-3 pt-2 mt-2 border-t border-gray-200/60"><User size={16} className="text-gray-400 mt-0.5 shrink-0"/><span className="text-gray-500 text-xs uppercase font-bold tracking-wider">{t('manage.created_by') || 'Created By'}: {users?.find(u => u.id === customer.created_by)?.full_name || 'System'}</span></div>}
                    </div>
                  </div>

                  <div className="flex gap-3 text-end shrink-0">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 shadow-inner"><div className="text-[10px] font-black uppercase tracking-wider text-indigo-400 mb-1">{t('crm.available_points')}</div><div className="text-2xl font-black text-indigo-700 leading-none">{Math.floor(customer.available_points || 0)}</div></div>
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 shadow-inner"><div className="text-[10px] font-black uppercase tracking-wider text-purple-400 mb-1">{t('crm.lifetime_points')}</div><div className="text-2xl font-black text-purple-700 leading-none">{Math.floor(customer.lifetime_points || 0)}</div></div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <div className="flex gap-2 border-b border-gray-200 px-2 overflow-x-auto custom-scrollbar">
                  <TabBtn active={historyTab === 'sim'} onClick={() => onChangeTab('sim')} icon={<Smartphone size={16} strokeWidth={2}/>} label={t('crm.sim_history')} />
                  <TabBtn active={historyTab === 'storm'} onClick={() => onChangeTab('storm')} icon={<Zap size={16} strokeWidth={2}/>} label={t('crm.storm_history')} />
                  <TabBtn active={historyTab === 'accessory'} onClick={() => onChangeTab('accessory')} icon={<CreditCard size={16} strokeWidth={2}/>} label={t('crm.accessories')} />
                  <TabBtn active={historyTab === 'loyalty'} onClick={() => onChangeTab('loyalty')} icon={<Award size={16} strokeWidth={2}/>} label={t('crm.loyalty_ledger')} />
                </div>
                <div className="mt-4 pb-4">
                  {historyLoading ? <div className="flex justify-center py-8"><RefreshCw className="animate-spin text-red-600" /></div> : <HistoryTable type={historyTab} rows={historyRows} t={t} />}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }) {
  return <button onClick={onClick} className={`flex items-center gap-2 px-4 pb-3 pt-2 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${active ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{icon} {label}</button>;
}

function HistoryTable({ type, rows, t }) {
  if (type === 'loyalty') {
    return (
      <div className="overflow-x-auto text-start">
        <table className="w-full text-sm text-left">
          <thead><tr className="border-b border-gray-100"><th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-1/4">{t('reports.when')}</th><th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-1/3">{t('reports.description')}</th><th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-end">{t('crm.points')}</th></tr></thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r, idx) => (
                <tr key={`${r.id}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-2 text-xs font-medium text-gray-600 whitespace-nowrap">{formatDateTime(r.created_at || r.at)}</td>
                  <td className="py-4 px-2 text-gray-600 font-medium truncate max-w-[200px]">{r.description || r.label || r.product_name_snapshot || '—'}</td>
                  <td className="py-4 px-2 text-end font-black whitespace-nowrap">{Number(r.points_earned) > 0 && <div className="text-green-600">+{Math.floor(r.points_earned)}</div>}{Number(r.points_redeemed) > 0 && <div className="text-red-600">-{Math.floor(r.points_redeemed)}</div>}</td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto text-start">
      <table className="w-full text-sm text-left">
        <thead><tr className="border-b border-gray-100"><th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-1/4">{t('reports.when')}</th><th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-1/3">{type === 'sim' ? t('crm.serial') : type === 'storm' ? t('crm.note') : t('crm.product')}</th><th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-end">{t('reports.amount')}</th></tr></thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50/50"><td className="py-4 px-2 text-xs font-medium text-gray-600 whitespace-nowrap">{formatDateTime(r.at)}</td><td className="py-4 px-2 font-bold text-gray-900 truncate max-w-[200px]">{type === 'sim' ? r.serial : r.label || '—'}</td><td className="py-4 px-2 text-end font-black text-gray-900 whitespace-nowrap">{formatDZD(r.amount)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdjustPointsModal({ customer, onClose, onSuccess, t }) {
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await api.post(`/customers/${customer.id}/adjust-points`, { points, reason }); onSuccess(); } 
    catch (err) { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-start">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-indigo-50"><h3 className="font-bold text-lg text-indigo-900 flex items-center gap-2"><SlidersHorizontal size={20}/> {t('manage.adjust_points')}</h3><button onClick={onClose} className="text-indigo-400"><X size={20}/></button></div>
        <form onSubmit={submit} className="p-6 space-y-5">
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl flex justify-between items-center"><span className="text-xs font-bold text-gray-500 uppercase">{t('crm.available_points')}</span><span className="text-lg font-black text-gray-900">{Math.floor(customer.available_points || 0)} pts</span></div>
          <div><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">{t('reports.amount')}</label><input type="number" required value={points} onChange={(e) => setPoints(e.target.value)} className="w-full px-4 py-3 text-lg font-bold border-2 border-gray-200 rounded-xl outline-none" autoFocus /></div>
          <div><label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">{t('reports.description')}</label><input type="text" required value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl outline-none" /></div>
          <div className="pt-2"><button type="submit" disabled={loading} className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white font-bold py-3.5 rounded-xl disabled:opacity-50">{loading ? t('common.saving') : t('common.save')}</button></div>
        </form>
      </div>
    </div>
  );
}

function PopRemindersModal({ popData, selectedCycleTab, setSelectedCycleTab, onClose, t }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-start">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-amber-50">
          <h3 className="font-bold text-lg text-amber-900 flex items-center gap-2"><Bell size={20}/> {t('manage.pop_reminders')}</h3>
          <button onClick={onClose} className="text-amber-500 hover:text-amber-700"><X size={20}/></button>
        </div>
        
        <div className="flex bg-gray-50 border-b border-gray-200">
          {[1, 8, 15, 22].map(cycle => (
            <button 
              key={cycle} 
              onClick={() => setSelectedCycleTab(cycle)}
              className={`flex-1 py-3 text-sm font-bold border-b-2 ${selectedCycleTab === cycle || (!selectedCycleTab && popData.cycle_due === cycle) ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
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
                  <th className="py-2 text-gray-500 uppercase text-xs">Customer</th>
                  <th className="py-2 text-gray-500 uppercase text-xs">Phone</th>
                  <th className="py-2 text-gray-500 uppercase text-xs">pos.last_purchase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {popData.customers.map((c, i) => (
                  <tr key={i} className="hover:bg-amber-50/30">
                    <td className="py-3 font-bold text-gray-900">
  {c.first_name} {c.last_name}
  {c.source === 'storm' && (
    <span className="ms-2 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase text-orange-700">Storm</span>
  )}
</td>
                    <td className="py-3 font-mono text-gray-600">{c.phone_number}</td>
                    <td className="py-3 text-gray-500 text-xs">{formatDate(c.sold_at)}</td>
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
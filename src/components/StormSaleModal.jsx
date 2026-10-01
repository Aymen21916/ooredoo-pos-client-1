import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  X, CheckCircle2, RefreshCw, User, Phone, MapPin, Briefcase, Zap, Search, Award, UserPlus, Percent, Bell 
} from 'lucide-react';
import api from '../api/axios';

const formatDZD = (n) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 2 }).format(n || 0);

export default function StormSaleModal({ sessionId, onClose, onComplete }) {
  const { t } = useLanguage();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const [showDiscount, setShowDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');

  const [settings, setSettings] = useState(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  const [newCustomerData, setNewCustomerData] = useState({ first_name: '', last_name: '', address: '', profession: '', referred_by_phone: '' });
  const [isPopNumber, setIsPopNumber] = useState(false);
  const [popCycle, setPopCycle] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/settings/loyalty').then(res => setSettings(res.data.data)).catch(console.error);
  }, []);

  useEffect(() => {
    const searchCustomer = async () => {
      if (phoneNumber.length < 9) {
        setSelectedCustomer(null); setPointsToRedeem(0); setIsPopNumber(false); setPopCycle(null); return;
      }
      setIsSearching(true);
      try {
        const { data } = await api.get(`/customers/lookup?phone=${phoneNumber}`);
        setSelectedCustomer(data.data || null);
        if (data.data?.is_pop) { setIsPopNumber(true); setPopCycle(data.data.pop_cycle || null); }
        setPointsToRedeem(0);
      } catch (err) {
        setSelectedCustomer(null);
      } finally {
        setIsSearching(false);
      }
    };
    const delayDebounce = setTimeout(searchCustomer, 500);
    return () => clearTimeout(delayDebounce);
  }, [phoneNumber]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');

if (isPopNumber && phoneNumber.length >= 9 && !popCycle) {
  setError('Please choose a POP cycle.');
  setLoading(false);
  return;
}
    
    try {
      let finalCustomerId = selectedCustomer?.id || null;

      if (!selectedCustomer && phoneNumber.length >= 9) {
        if (!newCustomerData.first_name || !newCustomerData.last_name) {
          setError(t('common.action_failed'));
          setLoading(false); return;
        }
        
        const res = await api.post('/customers', {
          phone_number: phoneNumber, 
          first_name: newCustomerData.first_name,
          last_name: newCustomerData.last_name, 
          address: newCustomerData.address.trim() || 'Store Walk-in', 
          profession: newCustomerData.profession.trim() || 'Client',
          referred_by_phone: newCustomerData.referred_by_phone.trim() || null
        });
        finalCustomerId = res.data.data.id;
      }

      const finalAmount = parseFloat(amount);
      if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) {
        setError(t('common.action_failed')); setLoading(false); return;
      }

      const res = await api.post('/sales/storm', {
        session_id: sessionId,
        amount: finalAmount,
        customer_id: finalCustomerId,
        note: note.trim() || '',
        points_redeemed: parseFloat(pointsToRedeem || 0),
        is_pop_number: phoneNumber.length >= 9 && isPopNumber,
pop_cycle: phoneNumber.length >= 9 && isPopNumber ? popCycle : null,
        discount_amount: showDiscount ? (parseFloat(discountAmount) || 0) : 0
      });

      onComplete(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || t('common.action_failed'));
      setLoading(false);
    }
  };

  const pointValueDZD = settings?.point_to_dzd_value || 1;
  const minPointsRequired = settings?.min_points_to_redeem || 600;
  const customerPoints = parseFloat(selectedCustomer?.available_points || 0);
  
  const parsedAmount = parseFloat(amount) || 0;
  const parsedDiscount = parseFloat(discountAmount) || 0;
  const manualDiscount = showDiscount ? parsedDiscount : 0;
  const priceAfterManualDiscount = Math.max(0, parsedAmount - manualDiscount);

  const maxPointsForThisSale = Math.min(customerPoints, priceAfterManualDiscount / pointValueDZD);
  const finalPrice = Math.max(0, priceAfterManualDiscount - (parseFloat(pointsToRedeem || 0) * pointValueDZD));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm text-start">
      <div className="w-full max-w-2xl bg-white border rounded-2xl shadow-2xl font-sans relative flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-100">
        
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/80 rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Zap className="text-orange-500" /> {t('pos.enter_storm')}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {error && <div className="p-3 mb-5 text-red-700 bg-red-50 border border-red-200 rounded-lg font-bold text-sm">{error}</div>}

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">{t('modal.sale_amount')}</label>
                <input type="number" step="0.01" value={amount} onChange={(e) => { setAmount(e.target.value); setPointsToRedeem(0); setShowDiscount(false); setDiscountAmount(''); }} placeholder="e.g. 1000" className="w-full px-4 py-3 text-lg font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 text-gray-900 transition-colors" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">{t('modal.optional_note')}</label>
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Flexy" className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 text-gray-900 transition-colors" />
              </div>
            </div>

            <div className="mt-1 pt-3 border-t border-gray-100">
              <label className="flex items-center gap-2 text-sm text-orange-600 cursor-pointer font-bold w-max">
                <input type="checkbox" checked={showDiscount} onChange={(e) => { setShowDiscount(e.target.checked); if (!e.target.checked) setDiscountAmount(''); }} className="rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                <Percent size={14} /> {t('modal.apply_discount')}
              </label>
              {showDiscount && (
                <div className="flex items-center gap-3 mt-3">
                  <input type="number" min="0" step="0.01" placeholder={t('modal.discount_placeholder')} value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} className="block w-full rounded-md border border-gray-300 px-3 py-2 font-bold focus:border-orange-500 outline-none" />
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 my-2"></div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t('modal.find_customer')}</h3>
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" placeholder={t('modal.phone_placeholder')} 
                  value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-10 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              
              {isSearching ? (
                <div className="text-xs text-blue-500 font-bold mt-2 animate-pulse flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> {t('modal.searching_crm')}</div>
              ) : selectedCustomer ? (
                <div className="mt-4 border-2 border-emerald-400 bg-emerald-50/30 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-lg">
                      <CheckCircle2 size={24} /> {t('modal.customer_found')}
                    </div>
                    {selectedCustomer.stats?.tier && (
                      <span className="bg-white border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                        {selectedCustomer.stats.tier}
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-sm mb-2">
                    <div><div className="text-gray-500 flex items-center gap-1.5 mb-1 text-xs"><User size={14}/> {t('modal.name')}</div><div className="font-bold text-gray-900 text-base">{selectedCustomer.first_name} {selectedCustomer.last_name}</div></div>
                    <div><div className="text-gray-500 flex items-center gap-1.5 mb-1 text-xs"><Phone size={14}/> {t('modal.phone')}</div><div className="font-bold text-gray-900 text-base">{selectedCustomer.phone_number}</div></div>
                    <div><div className="text-gray-500 flex items-center gap-1.5 mb-1 text-xs"><MapPin size={14}/> {t('modal.address')}</div><div className="font-bold text-gray-900">{selectedCustomer.address || '—'}</div></div>
                    <div><div className="text-gray-500 flex items-center gap-1.5 mb-1 text-xs"><Briefcase size={14}/> {t('modal.profession')}</div><div className="font-bold text-gray-900">{selectedCustomer.profession || '—'}</div></div>
                  </div>

                  <div className="border-t border-emerald-200/60 pt-4">
                    <div className="grid grid-cols-3 gap-4 text-center mb-3">
                      <div><div className="text-gray-500 text-xs mb-1">{t('ledger.sim_cards')}</div><div className="font-bold text-gray-900">{selectedCustomer.stats?.sim_count || 0}</div></div>
                      <div><div className="text-gray-500 text-xs mb-1">{t('ledger.storm_bundles')}</div><div className="font-bold text-gray-900">{selectedCustomer.stats?.storm_count || 0}</div></div>
                      <div><div className="text-gray-500 text-xs mb-1">{t('ledger.products')}</div><div className="font-bold text-gray-900">{selectedCustomer.stats?.accessory_count || 0}</div></div>
                    </div>
                    <div className="text-center text-sm font-medium text-emerald-700">{t('modal.total_spent')} <span className="font-bold">{formatDZD(selectedCustomer.stats?.total_spent || 0)}</span></div>
                  </div>
                </div>
              ) : phoneNumber.length >= 9 ? (
                
                <div className="mt-4 p-5 bg-orange-50 border border-orange-200 rounded-xl shadow-sm space-y-4">
                  <div className="text-[12px] font-black text-orange-800 uppercase tracking-wider flex items-center gap-1.5"><UserPlus size={16} strokeWidth={2.5}/> {t('modal.auto_register')}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">{t('modal.first_name')}</label><input type="text" value={newCustomerData.first_name} onChange={e => setNewCustomerData({...newCustomerData, first_name: e.target.value})} className="w-full rounded-lg border border-orange-200 p-2.5 text-sm font-bold text-gray-900 outline-none focus:border-orange-500" /></div>
                    <div><label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">{t('modal.last_name')}</label><input type="text" value={newCustomerData.last_name} onChange={e => setNewCustomerData({...newCustomerData, last_name: e.target.value})} className="w-full rounded-lg border border-orange-200 p-2.5 text-sm font-bold text-gray-900 outline-none focus:border-orange-500" /></div>
                    <div><label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">{t('modal.address')} <span className="lowercase text-gray-400 font-medium">{t('modal.optional')}</span></label><input type="text" value={newCustomerData.address} onChange={e => setNewCustomerData({...newCustomerData, address: e.target.value})} className="w-full rounded-lg border border-orange-200 p-2.5 text-sm font-bold text-gray-900 outline-none focus:border-orange-500" /></div>
                    <div><label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">{t('modal.profession')} <span className="lowercase text-gray-400 font-medium">{t('modal.optional')}</span></label><input type="text" value={newCustomerData.profession} onChange={e => setNewCustomerData({...newCustomerData, profession: e.target.value})} className="w-full rounded-lg border border-orange-200 p-2.5 text-sm font-bold text-gray-900 outline-none focus:border-orange-500" /></div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">{t('modal.referred_by')} <span className="lowercase text-gray-400 font-medium">{t('modal.veteran_phone')}</span></label>
                      <input type="text" placeholder="e.g. 055..." value={newCustomerData.referred_by_phone} onChange={e => setNewCustomerData({...newCustomerData, referred_by_phone: e.target.value})} className="w-full rounded-lg border border-orange-200 p-2.5 text-sm font-bold text-gray-900 outline-none focus:border-orange-500" />
                    </div>
                  </div>
                </div>

              ) : phoneNumber.length > 0 ? (
                <div className="text-xs font-bold text-gray-400 mt-2 italic">{t('modal.unregistered_walkin')}</div>
              ) : null}

              {selectedCustomer && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 p-4 rounded-xl shadow-inner mt-5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black uppercase text-indigo-800 flex items-center gap-1"><Award size={14}/> {t('modal.loyalty_balance')}</span>
                    <span className="text-sm font-black text-indigo-600">{Math.floor(customerPoints)} {t('ledger.pts')}</span>
                  </div>

                  {customerPoints >= minPointsRequired ? (
                    <>
                      <div className="flex gap-2 mt-3">
                        <input type="number" min="0" step="0.01" max={maxPointsForThisSale} value={pointsToRedeem} onChange={(e) => setPointsToRedeem(e.target.value)} className="flex-1 rounded-lg border border-indigo-200 p-2 font-bold text-indigo-900 outline-none focus:border-indigo-500" placeholder={t('modal.points_to_use')} />
                        <button type="button" onClick={() => setPointsToRedeem(Math.floor(maxPointsForThisSale))} className="bg-indigo-600 text-white px-3 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm">{t('modal.use_max')}</button>
                      </div>
                      {pointsToRedeem > 0 && <div className="mt-2 text-sm font-black text-green-700 animate-pulse text-end">{t('modal.loyalty_discount')} -{formatDZD(pointsToRedeem * pointValueDZD)}</div>}
                    </>
                  ) : (
                    <div className="mt-3 p-2 bg-white/50 rounded border border-indigo-100 text-xs font-bold text-indigo-500 text-center">{t('modal.requires_points')} {minPointsRequired} {t('modal.unlock_checkout')}{(minPointsRequired - customerPoints).toFixed(2)} {t('modal.points_to_go')}</div>
                  )}
                </div>
              )}
            </div>

            {phoneNumber.length >= 9 && (
  <div className="p-4 border-2 border-amber-200 bg-amber-50 rounded-xl space-y-3">
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={isPopNumber}
        onChange={(e) => { setIsPopNumber(e.target.checked); if (!e.target.checked) setPopCycle(null); }}
        className="mt-0.5 h-5 w-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
      />
      <span>
        <span className="flex items-center gap-1.5 font-bold text-amber-900"><Bell size={16} /> Ooredoo POP number</span>
        <span className="block text-xs font-medium text-amber-800/80 mt-0.5">Adds this customer to the POP customers and to the POP renewal alerts.</span>
      </span>
    </label>

    {isPopNumber && (
      <div>
        <div className="text-[11px] font-black uppercase tracking-wider text-amber-800 mb-2">Choose the cycle that suits the client</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[1, 8, 15, 22].map((cycle) => (
            <label
              key={cycle}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 cursor-pointer select-none font-bold text-sm transition-colors ${
                popCycle === cycle
                  ? 'border-amber-500 bg-white text-amber-700'
                  : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={popCycle === cycle}
                onChange={(e) => setPopCycle(e.target.checked ? cycle : null)}
                className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              Cycle {cycle}
            </label>
          ))}
        </div>
      </div>
    )}
  </div>
)}

            <div className="mt-6 flex flex-col items-end pt-5 border-t border-gray-200">
              <div className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">{t('modal.final_total')}</div>
              <div className="text-4xl font-black text-gray-900">{formatDZD(finalPrice)}</div>
            </div>

            <div className="pt-2">
              <button onClick={handleSubmit} disabled={loading || !amount} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-4 rounded-xl shadow-md transition-colors text-lg">
                {loading ? <RefreshCw size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                {loading ? t('modal.recording') : `${t('modal.confirm_charge')} ${formatDZD(finalPrice)}`}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
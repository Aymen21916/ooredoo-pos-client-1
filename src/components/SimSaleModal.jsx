import { useState, useMemo, useEffect } from 'react';
import api from '../api/axios';
import { useLanguage } from '../context/LanguageContext';
import {
  X, ChevronLeft, Smartphone, Tag, CheckCircle2, Percent, Award, Search, User, RefreshCw, UserPlus, Phone, MapPin, Briefcase
} from 'lucide-react';

const formatDZD = (n) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 2 }).format(n || 0);

const STEPS = ['category', 'offer', 'checkout'];

export default function SimSaleModal({ sessionId, catalog, onClose, onComplete }) {
  const { offers, categories } = catalog; 
  const { t } = useLanguage();

  const [step, setStep] = useState('category');
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);

  const [showDiscount, setShowDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  const [newCustomerData, setNewCustomerData] = useState({ first_name: '', last_name: '', address: '', profession: '', referred_by_phone: '' });
  const [appInstalled, setAppInstalled] = useState(false);

  useEffect(() => {
    api.get('/settings/loyalty').then(res => setSettings(res.data.data)).catch(console.error);
  }, []);

  useEffect(() => {
    const searchCustomer = async () => {
      if (phoneNumber.length < 9) { setSelectedCustomer(null); setPointsToRedeem(0); return; }
      setIsSearching(true);
      try {
        const { data } = await api.get(`/customers/lookup?phone=${phoneNumber}`);
        setSelectedCustomer(data.data || null);
        setPointsToRedeem(0);
      } catch (err) { setSelectedCustomer(null); } finally { setIsSearching(false); }
    };
    const delayDebounce = setTimeout(searchCustomer, 500);
    return () => clearTimeout(delayDebounce);
  }, [phoneNumber]);

  const visibleCategories = useMemo(() => {
    const counts = new Map();
    for (const o of offers) counts.set(o.category_id, (counts.get(o.category_id) || 0) + 1);
    return categories.filter((c) => counts.has(c.id)).map((c) => ({ ...c, offer_count: counts.get(c.id) }));
  }, [categories, offers]);

  const offersInCategory = useMemo(() => {
    if (!selectedCategory) return [];
    return offers.filter((o) => o.category_id === selectedCategory.id).sort((a, b) => Number(a.selling_price) - Number(b.selling_price));
  }, [offers, selectedCategory]);

  const handleConfirmSale = async (e) => {
    if (e) e.preventDefault();
    setSubmitting(true); setError('');

    try {
      let finalCustomerId = selectedCustomer?.id || null;

      if (!selectedCustomer && phoneNumber.length >= 9) {
        if (!newCustomerData.first_name || !newCustomerData.last_name) {
          setError(t('common.action_failed'));
          setSubmitting(false); return;
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

      const res = await api.post('/sales/sim', {
        session_id: sessionId, offer_id: selectedOffer.id, customer_id: finalCustomerId,
        discount_amount: showDiscount ? (parseFloat(discountAmount) || 0) : 0, points_redeemed: parseFloat(pointsToRedeem || 0), my_ooredoo_app_installed: appInstalled,
      });
      onComplete?.(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || t('common.action_failed')); setSubmitting(false);
    }
  };

  const goBack = () => {
    setError('');
    if (step === 'offer') setStep('category');
    else if (step === 'checkout') { setStep('offer'); setAppInstalled(false); setPhoneNumber(''); setSelectedCustomer(null); setPointsToRedeem(0); }
  };

  const stepNumber = STEPS.indexOf(step) + 1;

  const parsedDiscount = parseFloat(discountAmount) || 0;
  const originalPrice = selectedOffer ? parseFloat(selectedOffer.selling_price) : 0;
  const pointValueDZD = settings?.point_to_dzd_value || 1;
  const customerPoints = parseFloat(selectedCustomer?.available_points || 0);
  const minPointsRequired = settings?.min_points_to_redeem || 600;
  
  const manualDiscount = showDiscount ? parsedDiscount : 0;
  const priceAfterManualDiscount = Math.max(0, originalPrice - manualDiscount);
  const maxPointsForThisSale = Math.min(customerPoints, priceAfterManualDiscount / pointValueDZD);
  const finalPrice = Math.max(0, priceAfterManualDiscount - (parseFloat(pointsToRedeem || 0) * pointValueDZD));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-start">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/80 rounded-t-2xl">
          <div className="flex items-center gap-2">
            {step !== 'category' && <button onClick={goBack} className="p-1 rounded-full hover:bg-gray-200 text-gray-500"><ChevronLeft size={18} className="rtl:rotate-180" /></button>}
            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><Smartphone size={20} className="text-red-600" /> {t('pos.sell_sim')}</h3>
            <span className="mx-2 text-xs text-gray-500">{t('modal.step')} {stepNumber} {t('modal.of')} {STEPS.length}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {error && <div className="mx-4 mt-3 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 font-bold">{error}</div>}

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {step === 'category' ? (
            <>
              <h4 className="font-semibold text-gray-900 mb-3">{t('modal.choose_category')}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {visibleCategories.map((c) => (
                  <button key={c.id} onClick={() => { setSelectedCategory(c); setStep('offer'); }} className="p-4 rounded-xl border-2 border-gray-200 hover:border-red-400 hover:bg-red-50 transition-colors text-start">
                    <div className="flex items-center justify-between mb-1"><Tag size={18} className="text-red-600" /><span className="text-xs text-gray-500">{c.offer_count} {t('modal.offers')}</span></div>
                    <div className="font-bold text-gray-900">{c.name}</div>
                  </button>
                ))}
              </div>
            </>
          ) : step === 'offer' ? (
            <>
              <h4 className="font-semibold text-gray-900 mb-1">{selectedCategory?.name}</h4>
              <p className="text-xs text-gray-500 mb-4">{t('modal.pick_offer')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {offersInCategory.map((o) => (
                  <button key={o.id} onClick={() => { setSelectedOffer(o); setStep('checkout'); setShowDiscount(false); setDiscountAmount(''); }} className="p-4 rounded-xl border-2 border-gray-200 hover:border-red-400 hover:bg-red-50 transition-colors text-start">
                    <div className="text-2xl font-extrabold text-gray-900">{formatDZD(o.selling_price)}</div>
                    <div className="text-sm text-gray-700 mt-1 truncate">{o.name}</div>
                  </button>
                ))}
              </div>
            </>
          ) : step === 'checkout' ? (
            <div className="space-y-6">
              
              <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{t('modal.selected_offer')}</div>
                    <div className="font-bold text-gray-900 text-lg">{selectedOffer.name}</div>
                  </div>
                  <div className={`text-2xl font-black ${showDiscount && parsedDiscount > 0 ? 'text-gray-400 line-through text-lg' : 'text-gray-900'}`}>{formatDZD(selectedOffer.selling_price)}</div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <label className="flex items-center gap-2 text-sm text-red-600 cursor-pointer font-bold w-max">
                    <input type="checkbox" checked={showDiscount} onChange={(e) => { setShowDiscount(e.target.checked); if (!e.target.checked) setDiscountAmount(''); }} className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
                    <Percent size={14} /> {t('modal.apply_discount')}
                  </label>
                  {showDiscount && (
                    <div className="flex items-center gap-3 mt-3">
                      <input type="number" min="0" step="1" placeholder={t('modal.discount_placeholder')} value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} className="block w-full rounded-md border border-gray-300 px-3 py-2 font-bold focus:border-red-500 outline-none" />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 my-2"></div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('modal.find_customer')}</h3>
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" autoFocus placeholder={t('modal.phone_placeholder_req')} 
                    value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-10 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
                
                {isSearching ? (
                  <div className="text-xs text-blue-500 font-bold mt-2 animate-pulse flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> {t('modal.searching_crm')}</div>
                ) : selectedCustomer ? (
                  <div className="mt-4 border-2 border-emerald-400 bg-emerald-50/30 rounded-xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-lg"><CheckCircle2 size={24} /> {t('modal.customer_found')}</div>
                      {selectedCustomer.stats?.tier && <span className="bg-white border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">{selectedCustomer.stats.tier}</span>}
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
                        <input type="text" placeholder="e.g. 055..." value={newCustomerData.referred_by_phone} onChange={e => setNewCustomerData({...newCustomerData, referred_by_phone: e.target.value})} className="w-full rounded-lg border border-red-200 p-2.5 text-sm font-bold text-gray-900 outline-none focus:border-red-500" />
                      </div>
                    </div>
                  </div>

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
                          <input type="number" min="0" max={maxPointsForThisSale} value={pointsToRedeem} onChange={(e) => setPointsToRedeem(e.target.value)} className="flex-1 rounded-lg border border-indigo-200 p-2 font-bold text-indigo-900 outline-none focus:border-indigo-500" placeholder={t('modal.points_to_use')} />
                          <button type="button" onClick={() => setPointsToRedeem(Math.floor(maxPointsForThisSale))} className="bg-indigo-600 text-white px-3 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm">{t('modal.use_max')}</button>
                        </div>
                        {pointsToRedeem > 0 && <div className="mt-2 text-sm font-black text-green-700 animate-pulse text-end">{t('modal.loyalty_discount')} -{formatDZD(pointsToRedeem * pointValueDZD)}</div>}
                      </>
                    ) : (
                      <div className="mt-3 p-2 bg-white/50 rounded border border-indigo-100 text-xs font-bold text-indigo-500 text-center">{t('modal.requires_points')} {minPointsRequired} {t('modal.unlock_checkout')}{(minPointsRequired - customerPoints).toFixed(0)} {t('modal.points_to_go')}</div>
                    )}
                  </div>
                )}
              </div>

              <label className="flex items-start gap-3 p-4 border-2 border-red-200 bg-red-50 rounded-xl cursor-pointer select-none">
  <input type="checkbox" checked={appInstalled} onChange={(e) => setAppInstalled(e.target.checked)}
    className="mt-0.5 h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-500" />
  <span>
    <span className="flex items-center gap-1.5 font-bold text-red-900"><Smartphone size={16} /> My Ooredoo App Installed</span>
    <span className="block text-xs font-medium text-red-800/80 mt-0.5">Tick if you installed the My Ooredoo app for the customer with this SIM.</span>
  </span>
</label>

              <div className="mt-6 flex flex-col items-end pt-5 border-t border-gray-200">
                <div className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">{t('modal.final_total')}</div>
                <div className="text-4xl font-black text-gray-900">{formatDZD(finalPrice)}</div>
              </div>

              <div className="pt-2">
                <button onClick={handleConfirmSale} disabled={submitting} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-xl shadow-md transition-colors text-lg">
                  {submitting ? <RefreshCw size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                  {submitting ? t('modal.recording') : `${t('modal.confirm_charge')} ${formatDZD(finalPrice)}`}
                </button>
              </div>

            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
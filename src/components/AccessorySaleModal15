import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api/axios';
import { useLanguage } from '../context/LanguageContext';
import { X, ChevronLeft, Package, Search, Barcode, CheckCircle2, AlertTriangle, Award, User, RefreshCw, UserPlus, Phone, MapPin, Briefcase, Percent, ShieldAlert } from 'lucide-react';

const formatDZD = (n) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(n || 0);

const STEPS = ['product', 'checkout'];

export default function AccessorySaleModal({ sessionId, catalog, onClose, onComplete }) {
  const { products } = catalog;
  const { t } = useLanguage();
  
  const [step, setStep] = useState('product');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // NEW: Discount Approval State
  const [discountRequestId, setDiscountRequestId] = useState(null);
  const [discountRequestStatus, setDiscountRequestStatus] = useState('idle'); // idle, pending, approved, rejected
  const [discountAmount, setDiscountAmount] = useState('');
  
  const [submitting, setSubmitting] = useState(false);

  const [settings, setSettings] = useState(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  const [newCustomerData, setNewCustomerData] = useState({ first_name: '', last_name: '', address: '', profession: '', referred_by_phone: '' });

  const searchInputRef = useRef(null);

  useEffect(() => {
    if (step === 'product') setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [step]);

  useEffect(() => {
    api.get('/settings/loyalty').then(res => setSettings(res.data.data)).catch(console.error);
  }, []);

  // NEW: Polling loop to check discount status
  useEffect(() => {
    let interval;
    if (discountRequestStatus === 'pending' && discountRequestId) {
      interval = setInterval(async () => {
        try {
          const res = await api.get(`/discounts/${discountRequestId}/status`);
          if (res.data.data.status !== 'pending') {
            setDiscountRequestStatus(res.data.data.status); // Will change to 'approved' or 'rejected'
          }
        } catch (err) {
          // If request expired or failed, reset
          setDiscountRequestStatus('idle');
          setDiscountRequestId(null);
        }
      }, 3000); // Check every 3 seconds
    }
    return () => clearInterval(interval);
  }, [discountRequestStatus, discountRequestId]);

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

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase().trim();
    return products.filter((p) => p.name.toLowerCase().includes(query) || (p.barcode && p.barcode.toLowerCase() === query));
  }, [products, searchQuery]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchQuery.trim();
      const exactBarcodeMatch = products.find(p => p.barcode && p.barcode === query);
      if (exactBarcodeMatch) { selectProduct(exactBarcodeMatch); return; }
      if (filteredProducts.length === 1) selectProduct(filteredProducts[0]);
    }
  };

  const selectProduct = (prod) => {
    setSelectedProduct(prod); setStep('checkout'); setSearchQuery(''); setError(''); setPointsToRedeem(0); 
    setDiscountRequestStatus('idle'); setDiscountRequestId(null); setDiscountAmount('');
  };

  const requestAdminDiscount = async () => {
    try {
      setDiscountRequestStatus('pending');
      const res = await api.post('/discounts/request', {
        product_name: selectedProduct.name,
        price: selectedProduct.price
      });
      setDiscountRequestId(res.data.data.id);
    } catch (err) {
      setError("Failed to request discount permission.");
      setDiscountRequestStatus('idle');
    }
  };

  const handleConfirmSale = async () => {
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

      const res = await api.post('/sales/accessory', {
        session_id: sessionId, product_id: selectedProduct.id, customer_id: finalCustomerId, 
        points_redeemed: parseFloat(pointsToRedeem || 0),
        discount_amount: discountRequestStatus === 'approved' ? (parseFloat(discountAmount) || 0) : 0
      });
      onComplete?.(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || t('common.action_failed')); setSubmitting(false);
    }
  };

  const goBack = () => {
    setError('');
    if (step === 'checkout') { setStep('product'); setPhoneNumber(''); setSelectedCustomer(null); setPointsToRedeem(0); }
  };

  const stepNumber = STEPS.indexOf(step) + 1;
  
  const parsedDiscount = parseFloat(discountAmount) || 0;
  const originalPrice = selectedProduct ? parseFloat(selectedProduct.price) : 0;
  const pointValueDZD = settings?.point_to_dzd_value || 1;
  const customerPoints = parseFloat(selectedCustomer?.available_points || 0);
  const minPointsRequired = settings?.min_points_to_redeem || 600;
  
  // Enforce discount only if approved
  const manualDiscount = discountRequestStatus === 'approved' ? parsedDiscount : 0;
  const priceAfterManualDiscount = Math.max(0, originalPrice - manualDiscount);
  const maxPointsForThisSale = Math.min(customerPoints, priceAfterManualDiscount / pointValueDZD);
  const finalPrice = Math.max(0, priceAfterManualDiscount - (parseFloat(pointsToRedeem || 0) * pointValueDZD));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-start">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/80 rounded-t-2xl">
          <div className="flex items-center gap-2">
            {step !== 'product' && <button onClick={goBack} className="p-1 rounded-full hover:bg-gray-200 text-gray-500"><ChevronLeft size={18} className="rtl:rotate-180" /></button>}
            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><Package size={20} className="text-blue-600" /> {t('pos.sell_accessory')}</h3>
            <span className="mx-2 text-xs text-gray-500">{t('modal.step')} {stepNumber} {t('modal.of')} {STEPS.length}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {error && <div className="mx-4 mt-3 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 font-bold flex items-center gap-2"><AlertTriangle size={16}/> {error}</div>}

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {step === 'product' ? (
            <>
              <h4 className="font-semibold text-gray-900 mb-3">{t('modal.scan_search')}</h4>
              <div className="relative mb-6 shadow-sm">
                <div className="absolute inset-y-0 start-0 pl-3 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400 rtl:mr-3" /></div>
                <input ref={searchInputRef} type="text" placeholder={t('modal.search_placeholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleSearchKeyDown} className="block w-full px-10 py-4 border-2 border-blue-100 rounded-xl text-lg focus:ring-blue-500 focus:border-blue-500 outline-none" />
                <div className="absolute inset-y-0 end-0 pr-3 flex items-center pointer-events-none"><Barcode className="h-6 w-6 text-blue-300 rtl:ml-3" /></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredProducts.length === 0 ? (
                  <div className="col-span-full text-center text-gray-500 py-8 italic border-2 border-dashed border-gray-200 rounded-xl">{t('modal.no_products_found')} "{searchQuery}"</div>
                ) : (
                  filteredProducts.map((p) => (
                    <button key={p.id} onClick={() => selectProduct(p)} className="p-4 rounded-xl border-2 border-gray-100 hover:border-blue-400 hover:bg-blue-50 transition-all text-start flex justify-between items-center group">
                      <div className="overflow-hidden pe-3">
                        <div className="font-bold text-gray-900 truncate" title={p.name}>{p.name}</div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Barcode size={12}/> {p.barcode || 'N/A'}</div>
                      </div>
                      <div className="text-lg font-black text-blue-700 whitespace-nowrap bg-blue-100/50 px-3 py-1 rounded-lg group-hover:bg-blue-200 transition-colors">{formatDZD(p.price)}</div>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : step === 'checkout' ? (
            <div className="space-y-6">
              
              <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{t('modal.selected_product')}</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900 text-lg">{selectedProduct.name}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-1 mt-1"><Barcode size={14}/> {selectedProduct.barcode || 'N/A'}</div>
                  </div>
                  <div className={`text-2xl font-black ${discountRequestStatus === 'approved' && parsedDiscount > 0 ? 'text-gray-400 line-through text-lg' : 'text-blue-700'}`}>{formatDZD(selectedProduct.price)}</div>
                </div>
                
                {/* NEW: Admin Permission Discount Block */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  {discountRequestStatus === 'idle' && (
                    <button type="button" onClick={requestAdminDiscount} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-bold transition-colors w-max bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                      <ShieldAlert size={16} /> {t('modal.request_discount_permission') || 'Request Admin Discount Permission'}
                    </button>
                  )}
                  
                  {discountRequestStatus === 'pending' && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 font-bold animate-pulse bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 w-max">
                      <RefreshCw size={16} className="animate-spin" /> {t('modal.waiting_for_admin') || 'Waiting for Admin approval...'}
                    </div>
                  )}

                  {discountRequestStatus === 'rejected' && (
                    <div className="flex items-center gap-2 text-sm text-red-600 font-bold bg-red-50 px-3 py-2 rounded-lg border border-red-200 w-max">
                      <X size={16} strokeWidth={3} /> {t('modal.discount_denied') || 'Permission Denied by Admin'}
                    </div>
                  )}

                  {discountRequestStatus === 'approved' && (
                    <div className="space-y-3 animate-in fade-in zoom-in duration-300">
                      <div className="flex items-center gap-2 text-sm text-green-700 font-bold bg-green-50 px-3 py-2 rounded-lg border border-green-200 w-max">
                        <CheckCircle2 size={16} strokeWidth={3} /> {t('modal.discount_approved') || 'Discount Approved!'}
                      </div>
                      <input 
                         type="number" min="0" step="1" 
                         placeholder={t('modal.discount_placeholder')} 
                         value={discountAmount} 
                         onChange={(e) => setDiscountAmount(e.target.value)} 
                         className="block w-full rounded-md border-2 border-green-300 px-4 py-3 font-bold text-lg text-green-900 focus:border-green-600 outline-none bg-green-50" 
                      />
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
                    type="text" placeholder={t('modal.phone_placeholder')} 
                    value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-10 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:border-blue-500 transition-colors"
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
                        <input type="text" placeholder="e.g. 055..." value={newCustomerData.referred_by_phone} onChange={e => setNewCustomerData({...newCustomerData, referred_by_phone: e.target.value})} className="w-full rounded-lg border border-blue-200 p-2.5 text-sm font-bold text-gray-900 outline-none focus:border-blue-500" />
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
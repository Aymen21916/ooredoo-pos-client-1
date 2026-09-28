import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useLanguage } from '../../context/LanguageContext';
import {
  UsersRound, Search, RefreshCw, Phone, MapPin, Briefcase, User, 
  Smartphone, Zap, CreditCard, History, Award, Shield, Star, Crown, Printer
} from 'lucide-react';

const formatDZD = (n) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 2 }).format(n || 0);
const formatDateTime = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString('en-GB', { month: 'short' })} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const TierBadge = ({ tier }) => {
  const config = {
    VVIP: { color: 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white', icon: <Crown size={14} className="text-yellow-300" /> },
    VIP: { color: 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white', icon: <Star size={14} className="text-violet-200" /> },
    Gold: { color: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-900', icon: <Shield size={14} className="text-amber-800" /> },
    Silver: { color: 'bg-gradient-to-r from-slate-200 to-gray-300 text-gray-800', icon: <Shield size={14} className="text-gray-600" /> },
    Bronze: { color: 'bg-gradient-to-r from-orange-200 to-amber-300 text-orange-900', icon: <Shield size={14} className="text-orange-800" /> },
    Regular: { color: 'bg-gray-100 text-gray-500', icon: null }
  };
  const { color, icon } = config[tier] || config.Regular;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-transparent shadow-sm ${color}`}>
      {icon} {tier}
    </span>
  );
};

export default function CashierCustomers() {
  const { t } = useLanguage();
  const [searchPhone, setSearchPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState('');

  const [historyTab, setHistoryTab] = useState('loyalty'); 
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [settings, setSettings] = useState(null);

  const currentStoreName = historyRows.length > 0 ? historyRows[0].store_name : "Ooredoo Store";

  useEffect(() => {
    api.get('/settings/loyalty').then(res => setSettings(res.data.data)).catch(console.error);
  }, []);

  useEffect(() => {
    const searchDb = async () => {
      if (searchPhone.length < 9) { setCustomer(null); return; }
      setLoading(true); setError('');
      try {
        const { data } = await api.get(`/customers/lookup?phone=${searchPhone}`);
        if (data.data) {
          setCustomer(data.data);
          loadHistory(data.data.id, historyTab);
        } else {
          setCustomer(null);
          setError(t('crm.no_customer_found'));
        }
      } catch (err) {
        setError(t('crm.search_failed'));
      } finally {
        setLoading(false);
      }
    };
    const delayDebounce = setTimeout(searchDb, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchPhone, t]);

  const loadHistory = async (customerId, type) => {
    setHistoryLoading(true); setHistoryTab(type);
    try {
      if (type === 'loyalty') {
        const r = await api.get(`/customers/${customerId}/loyalty-ledger`);
        setHistoryRows(r.data.data);
      } else {
        const r = await api.get(`/customers/${customerId}/purchases`, { params: { type } });
        setHistoryRows(r.data.data);
      }
    } catch (err) {
      console.error('Failed to load history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const pointValueDZD = settings?.point_to_dzd_value || 1;

  return (
    <>
      <div className="space-y-6 pb-12 print:hidden text-start">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UsersRound className="text-red-600" /> {t('crm.customer_lookup')}
          </h1>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">{t('crm.search_database')}</label>
          <div className="relative max-w-xl">
            <Search size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" autoFocus placeholder={t('crm.search_placeholder')}
              value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} 
              className="w-full rounded-xl border-2 border-gray-200 px-11 py-4 text-lg font-bold text-gray-900 focus:border-red-500 focus:ring-red-500 outline-none transition-colors" 
            />
            {loading && <RefreshCw size={18} className="absolute end-4 top-1/2 -translate-y-1/2 text-red-500 animate-spin" />}
          </div>
          {error && <div className="mt-3 text-sm font-bold text-red-600">{error}</div>}
        </div>

        {customer && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">{customer.first_name} {customer.last_name}</h2>
                  <TierBadge tier={customer.stats?.tier} />
                </div>
                <div className="text-base font-medium text-gray-500 mb-4 font-mono text-start">{customer.phone_number}</div>
                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 font-medium">
                  <div className="flex items-center gap-2"><Briefcase size={16} className="text-gray-400"/> {customer.profession || '—'}</div>
                  <div className="flex items-center gap-2"><MapPin size={16} className="text-gray-400"/> {customer.address || '—'}</div>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="bg-white border border-indigo-100 rounded-xl p-4 shadow-sm min-w-[140px]">
                  <div className="text-[10px] font-black uppercase tracking-wider text-indigo-400 mb-1 flex items-center gap-1"><Award size={12}/> {t('crm.available_points')}</div>
                  <div className="text-3xl font-black text-indigo-700 leading-none">{Math.floor(customer.available_points || 0)}</div>
                </div>
                <div className="bg-white border border-purple-100 rounded-xl p-4 shadow-sm min-w-[140px]">
                  <div className="text-[10px] font-black uppercase tracking-wider text-purple-400 mb-1">{t('crm.lifetime_points')}</div>
                  <div className="text-3xl font-black text-purple-700 leading-none">{Math.floor(customer.lifetime_points || 0)}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-200 bg-white">
              <StatCard label={t('crm.total_sims')} value={customer.stats?.sim_count || 0} />
              <StatCard label={t('crm.storm_volume')} value={formatDZD(customer.stats?.storm_total)} />
              <StatCard label={t('crm.acc_profit')} value={formatDZD(customer.stats?.accessory_profit)} />
              <StatCard label={t('crm.total_spent')} value={formatDZD(customer.stats?.total_spent)} />
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between border-b border-gray-200 pb-px mb-6">
                <div className="flex gap-6 overflow-x-auto custom-scrollbar">
                  <TabBtn active={historyTab === 'loyalty'} onClick={() => loadHistory(customer.id, 'loyalty')} icon={<Award size={18}/>} label={t('crm.loyalty_ledger')} />
                  <TabBtn active={historyTab === 'sim'} onClick={() => loadHistory(customer.id, 'sim')} icon={<Smartphone size={18}/>} label={t('crm.sim_history')} />
                  <TabBtn active={historyTab === 'storm'} onClick={() => loadHistory(customer.id, 'storm')} icon={<Zap size={18}/>} label={t('crm.storm_history')} />
                  <TabBtn active={historyTab === 'accessory'} onClick={() => loadHistory(customer.id, 'accessory')} icon={<CreditCard size={18}/>} label={t('crm.accessories')} />
                </div>
                
                {historyTab === 'loyalty' && (
                  <button onClick={() => window.print()} className="hidden sm:flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition-colors shadow-sm mb-2">
                    <Printer size={16} /> {t('crm.print_statement')}
                  </button>
                )}
              </div>

              {historyLoading ? (
                <div className="flex justify-center py-12"><RefreshCw className="animate-spin text-red-600" size={28} /></div>
              ) : historyRows.length === 0 ? (
                <div className="text-sm text-gray-500 italic py-12 text-center font-medium">{t('crm.no_records')}</div>
              ) : (
                <HistoryTable type={historyTab} rows={historyRows} pointValueDZD={pointValueDZD} t={t} />
              )}
            </div>
          </div>
        )}
      </div>

      {customer && (
        <div className="hidden print:block bg-white text-black font-sans w-full max-w-4xl mx-auto absolute top-0 left-0 text-start" dir={document.documentElement.dir}>
          
          <div className="flex justify-between items-end border-b-2 border-gray-900 pb-6 mb-8">
            <div>
              <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Ooredoo Store</h1>
              <p className="text-lg font-bold text-gray-800 mt-1">{currentStoreName}</p>
              <p className="text-sm font-bold text-gray-500">Official Retail Partner</p>
            </div>
            <div className="text-end">
              <h2 className="text-2xl font-black uppercase tracking-widest text-gray-800">{t('crm.loyalty_statement')}</h2>
              <p className="text-sm font-bold text-gray-500 mt-1">{t('crm.date')}: {new Date().toLocaleDateString('en-GB')}</p>
            </div>
          </div>

          <div className="border-2 border-gray-200 rounded-xl p-6 mb-8 flex justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">{t('crm.customer_profile')}</h3>
              <p className="text-xl font-black text-gray-900">{customer.first_name} {customer.last_name}</p>
              <p className="text-sm font-bold text-gray-600 font-mono mt-1 text-start">{customer.phone_number}</p>
              <p className="text-sm font-bold text-gray-600 mt-1">{customer.address || t('crm.address_not_on_file')}</p>
            </div>
            <div className="text-end">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">{t('crm.rewards_status')}</h3>
              <p className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 border border-gray-300 inline-block px-3 py-1 rounded-md">{t(`crm.${(customer.stats?.tier || 'Regular').toLowerCase()}`) || customer.stats?.tier || 'Regular'} {t('crm.tier')}</p>
              <p className="text-3xl font-black text-gray-900">{Math.floor(customer.available_points || 0)} <span className="text-base text-gray-500">{t('ledger.pts')}</span></p>
              <p className="text-xs font-bold text-gray-500 mt-1">{t('crm.available_to_spend')}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-black uppercase tracking-wider text-gray-900 mb-4">{t('crm.detailed_history')}</h3>
            <table className="w-full text-sm text-start border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-900">
                  <th className="py-3 px-2 text-xs font-black uppercase tracking-widest text-start w-1/5">{t('crm.date')}</th>
                  <th className="py-3 px-2 text-xs font-black uppercase tracking-widest text-start w-1/5">{t('crm.location')}</th>
                  <th className="py-3 px-2 text-xs font-black uppercase tracking-widest text-start w-1/3">{t('crm.item_description')}</th>
                  <th className="py-3 px-2 text-xs font-black uppercase tracking-widest text-end">{t('crm.amount_dzd')}</th>
                  <th className="py-3 px-2 text-xs font-black uppercase tracking-widest text-end">{t('crm.points')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {historyRows.slice(0, 30).map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 px-2 font-bold text-gray-700">{formatDateTime(r.created_at || r.at)}</td>
                    <td className="py-3 px-2 font-bold text-gray-700 text-start">{r.store_name || t('crm.system')}</td>
                    <td className="py-3 px-2 text-start">
                      <div className="font-bold text-gray-900">{r.description || r.label || '—'}</div>
                      {Number(r.points_redeemed) > 0 && (
                        <div className="text-xs font-bold text-purple-700 mt-0.5">
                          {t('crm.includes_discount')} (-{formatDZD(Number(r.points_redeemed) * pointValueDZD)})
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2 text-end font-black text-gray-900">
                      {r.amount ? formatDZD(r.amount) : '—'}
                    </td>
                    <td className="py-3 px-2 text-end font-black">
                      {Number(r.points_earned) > 0 && <div className="text-green-600">+{Math.floor(r.points_earned)}</div>}
                      {Number(r.points_redeemed) > 0 && <div className="text-red-600">-{Math.floor(r.points_redeemed)}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {historyRows.length > 30 && (
              <p className="text-xs font-bold text-gray-400 mt-4 text-center italic">{t('crm.displaying_30')}</p>
            )}
          </div>
          
          <div className="mt-16 pt-6 border-t-2 border-gray-200 text-center flex justify-between items-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('crm.thank_you')}</p>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('crm.loyalty_priority')}</p>
          </div>

        </div>
      )}
    </>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="px-6 py-4">
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 text-start">{label}</div>
      <div className="text-lg font-black text-gray-900 truncate text-start">{value}</div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex items-center gap-2 pb-3 pt-2 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
        active ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      {icon} {label}
    </button>
  );
}

function HistoryTable({ type, rows, pointValueDZD, t }) {
  if (type === 'loyalty') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-start">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-1/5 text-start">{t('crm.date')}</th>
              <th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-1/5 text-start">{t('crm.location')}</th>
              <th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-1/3 text-start">{t('crm.item_description')}</th>
              <th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-end">{t('crm.amount_paid')}</th>
              <th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-end">{t('crm.points')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-4 px-2 text-xs font-medium text-gray-600 whitespace-nowrap text-start">{formatDateTime(r.created_at)}</td>
                <td className="py-4 px-2 text-xs font-bold text-gray-600 text-start">{r.store_name || t('crm.system')}</td>
                <td className="py-4 px-2 text-start">
                  <div className="font-bold text-gray-900 truncate max-w-[200px]" title={r.description}>{r.description}</div>
                  {Number(r.points_redeemed) > 0 && (
                     <div className="text-[10px] font-black uppercase text-purple-600 mt-1">
                       {t('crm.includes_discount')} (-{formatDZD(Number(r.points_redeemed) * pointValueDZD)})
                     </div>
                  )}
                </td>
                <td className="py-4 px-2 text-end font-black text-gray-900 whitespace-nowrap">
                  {r.amount ? formatDZD(r.amount) : '—'}
                </td>
                <td className="py-4 px-2 text-end font-black whitespace-nowrap">
                  {Number(r.points_earned) > 0 && <div className="text-green-600">+{Math.floor(r.points_earned)}</div>}
                  {Number(r.points_redeemed) > 0 && <div className="text-red-600">-{Math.floor(r.points_redeemed)}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-start">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-1/4 text-start">{t('crm.date')}</th>
            <th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-1/3 text-start">
              {type === 'sim' ? t('crm.serial') : type === 'storm' ? t('crm.note') : t('crm.product')}
            </th>
            {type !== 'storm' && (
               <th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-1/4 text-start">
                 {type === 'sim' ? t('crm.offer') : t('crm.category')}
               </th>
            )}
            <th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-end">{t('crm.amount_dzd')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((r) => (
            <tr key={r.id} className={`group ${r.is_voided ? 'opacity-40 line-through' : 'hover:bg-gray-50/50'}`}>
              <td className="py-4 px-2 text-xs font-medium text-gray-600 whitespace-nowrap text-start">{formatDateTime(r.at)}</td>
              <td className="py-4 px-2 font-bold text-gray-900 truncate max-w-[200px] text-start">{type === 'sim' ? r.serial : r.label || '—'}</td>
              {type !== 'storm' && (
                <td className="py-4 px-2 text-gray-500 font-medium truncate max-w-[150px] text-start">{type === 'sim' ? r.label : r.category || '—'}</td>
              )}
              <td className="py-4 px-2 text-end font-black text-gray-900 whitespace-nowrap">{formatDZD(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
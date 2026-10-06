import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import {
  LogOut, UserCircle, LayoutDashboard, Users, UsersRound, Tags,
  Package, MonitorDot, Wallet, FileText, HandCoins, Receipt, 
  BarChart3, TrendingUp, History, Activity, Menu, X, Layers, 
  Globe, ShieldAlert, CheckCircle2, Barcode, Landmark, UserCheck
} from 'lucide-react';
import OfflineBanner from './OfflineBanner';
import CorrectionBanner from './CorrectionBanner';
import { useCorrectionAlerts } from '../hooks/useCorrectionAlerts';

const formatDZD = (n) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(n || 0);

export default function Layout() {
  const { user, isAdmin, isCashier, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);

  // NEW: Admin Polling State for Discount Approvals
  const [pendingDiscounts, setPendingDiscounts] = useState([]);
  const correction = useCorrectionAlerts(isAdmin || isCashier);

  // NEW: Poll every 4 seconds if the user is an Admin
  useEffect(() => {
    let interval;
    if (isAdmin) {
      interval = setInterval(async () => {
        try {
          const res = await api.get('/discounts/admin/pending');
          setPendingDiscounts(res.data.data || []);
        } catch (err) {}
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isAdmin]);

  const handleResolveDiscount = async (id, status) => {
    try {
      await api.post(`/discounts/${id}/resolve`, { status });
      // Instantly remove from admin screen
      setPendingDiscounts(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-lg mx-3 mb-1 ${
      isActive 
        ? 'bg-red-50 text-red-600' 
        : 'text-gray-600 hover:text-red-600 hover:bg-gray-50'
    }`;

  const LANG_OPTIONS = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'ar', label: 'العربية' }
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <OfflineBanner />
      
      {/* NEW: Global Overlay for Admin layout.discount_requests */}
      {isAdmin && pendingDiscounts.length > 0 && (
        <div className="fixed bottom-6 right-6 rtl:left-6 rtl:right-auto z-[9999] flex flex-col gap-3 pointer-events-none">
          {pendingDiscounts.map(req => (
            <div key={req.id} className="bg-white rounded-xl shadow-2xl border-l-4 border-amber-500 p-4 w-80 pointer-events-auto animate-in slide-in-from-bottom-4 duration-300 text-start">
              <div className="flex items-center gap-2 text-amber-600 font-bold mb-2">
                <ShieldAlert size={18}/> {t('layout.discount_request') || 'layout.discount_request'}
              </div>
              <div className="text-sm text-gray-700 font-medium mb-4 leading-relaxed">
                <span className="font-bold text-gray-900">{req.cashier_name}</span> is requesting permission to manual discount <span className="font-bold text-gray-900">{req.product_name}</span> 
                <br/><span className="text-xs text-gray-500">(Original Price: {formatDZD(req.price)})</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleResolveDiscount(req.id, 'approved')} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                  <CheckCircle2 size={16}/> Approve
                </button>
                <button onClick={() => handleResolveDiscount(req.id, 'rejected')} className="flex-1 bg-red-100 hover:bg-red-200 text-red-800 font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5">
                  <X size={16} strokeWidth={3}/> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top Header Bar */}
      <header className="bg-red-600 text-white shadow-md z-30">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            
            <div className="flex items-center gap-3 sm:gap-4">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 hover:bg-red-700 rounded-md transition-colors">
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <div className="flex items-center gap-2 font-extrabold tracking-wider text-lg sm:text-xl">
                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-inner">
                  <span className="text-red-600 text-lg">O</span>
                </div>
                <span className="hidden sm:inline">OOREDOO POS</span>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-6">
              
              <div className="relative">
                <button
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="flex items-center gap-2 bg-black/20 hover:bg-black/30 px-3 py-1.5 rounded-lg border border-white/10 shadow-sm transition-colors text-white"
                >
                  <Globe size={16} className="text-red-100" />
                  <span className="text-sm font-bold uppercase">{language}</span>
                </button>

                {isLangOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsLangOpen(false)}></div>
                    <div className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-36 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                      {LANG_OPTIONS.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => { setLanguage(lang.code); setIsLangOpen(false); }}
                          className={`w-full text-start px-4 py-2.5 text-sm font-bold transition-colors ${
                            language === lang.code 
                              ? 'bg-red-50 text-red-600 border-s-4 border-red-600' 
                              : 'text-gray-700 hover:bg-gray-100 hover:text-black border-s-4 border-transparent'
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm font-medium bg-red-700 px-3 py-1.5 rounded-full border border-red-500 shadow-sm">
                <UserCircle size={18} className="hidden sm:block" />
                <span className="max-w-[100px] sm:max-w-none truncate">{user?.fullName}</span>
                <span className="bg-red-500 px-2 py-0.5 rounded text-xs uppercase tracking-wider ms-1 text-white">
                  {user?.role}
                </span>
              </div>
              
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-semibold hover:text-red-200 transition-colors" title={t('layout.logout')}>
                <LogOut size={18} />
                <span className="hidden sm:inline">{t('layout.logout')}</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-10 md:hidden transition-opacity" onClick={closeSidebar} />}

        <aside className={`absolute inset-y-0 z-20 w-64 bg-white border-x border-gray-200 flex flex-col shadow-lg transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${language === 'ar' ? 'right-0 border-l' : 'left-0 border-r'} ${isSidebarOpen ? 'translate-x-0' : (language === 'ar' ? 'translate-x-full' : '-translate-x-full')}`}>
          <nav className="flex-1 overflow-y-auto py-4 text-start">
            
            {isAdmin && (
              <div className="flex flex-col gap-1">
                <div className="px-6 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('layout.admin')}</div>
                <NavLink to="/admin/dashboard" className={navLinkClass} onClick={closeSidebar}><LayoutDashboard size={18} /> {t('layout.overview')}</NavLink>
                <NavLink to="/admin/offers" className={navLinkClass} onClick={closeSidebar}><Tags size={18} /> {t('layout.sim_offers')}</NavLink>
                <NavLink to="/admin/stock" className={navLinkClass} onClick={closeSidebar}><Layers size={18} /> {t('layout.sim_inventory')}</NavLink>
                <NavLink to="/admin/products" className={navLinkClass} onClick={closeSidebar}><Package size={18} /> {t('layout.products')}</NavLink>
                <NavLink to="/admin/barcode-settings" className={navLinkClass} onClick={closeSidebar}><Barcode size={18} /> pos.barcode_printing</NavLink>
                <NavLink to="/admin/users" className={navLinkClass} onClick={closeSidebar}><Users size={18} /> {t('layout.manage_users')}</NavLink>
                <NavLink to="/admin/customers" className={navLinkClass} onClick={closeSidebar}><UsersRound size={18} /> {t('layout.customers')}</NavLink>
                <NavLink to="/admin/customer-validation" className={navLinkClass} onClick={closeSidebar}>
                  <UserCheck size={18} /> Customer Validation
                  {correction.pendingCorrections > 0 && (
                    <span className="ms-auto rounded-full bg-amber-500 px-2 py-0.5 text-xs font-black text-white">{correction.pendingCorrections}</span>
                  )}
                </NavLink>
                <NavLink to="/admin/finances" className={navLinkClass} onClick={closeSidebar}><Wallet size={18} /> {t('layout.finances')}</NavLink>
                <NavLink to="/admin/register-ledger" className={navLinkClass} onClick={closeSidebar}><Landmark size={18} /> Register Ledger</NavLink>
                <NavLink to="/admin/advances" className={navLinkClass} onClick={closeSidebar}><HandCoins size={18} /> {t('layout.advances')}</NavLink>
                <NavLink to="/admin/expenses" className={navLinkClass} onClick={closeSidebar}><Receipt size={18} /> {t('layout.expenses')}</NavLink>
                <NavLink to="/admin/loyalty" className={navLinkClass} onClick={closeSidebar}><Receipt size={18} /> {t('layout.loyalty')}</NavLink>

                <div className="px-6 py-2 mt-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('layout.reports_audits')}</div>
                <NavLink to="/admin/reports" end className={navLinkClass} onClick={closeSidebar}><FileText size={18} /> {t('layout.daily_reports')}</NavLink>
                <NavLink to="/admin/reports/range" className={navLinkClass} onClick={closeSidebar}><BarChart3 size={18} /> {t('layout.date_range_reports')}</NavLink>
                <NavLink to="/admin/reports/trends" className={navLinkClass} onClick={closeSidebar}><TrendingUp size={18} /> {t('layout.trends')}</NavLink>
                <NavLink to="/admin/reports/cashier" className={navLinkClass} onClick={closeSidebar}><History size={18} /> {t('layout.cashier_history')}</NavLink>
                <NavLink to="/admin/audit" className={navLinkClass} onClick={closeSidebar}><Activity size={18} /> {t('layout.audit_log')}</NavLink>
              </div>
            )}

            {isCashier && (
              <div className="flex flex-col gap-1 mt-4">
                <div className="px-6 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('layout.sales')}</div>
                <NavLink to="/pos" className={navLinkClass} onClick={closeSidebar}><MonitorDot size={18} /> {t('layout.pos_terminal')}</NavLink>
                <NavLink to="/cashier/customers" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors mx-3 ${isActive ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-red-50 hover:text-red-600'}`}>
                  <UsersRound size={20} /><span>{t('layout.crm_loyalty')}</span>
                  {correction.needsCorrection > 0 && (
                    <span className="ms-auto rounded-full bg-amber-500 px-2 py-0.5 text-xs font-black text-white">{correction.needsCorrection}</span>
                  )}
                </NavLink>
                <div className="px-6 py-2 mt-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('layout.my_performance')}</div>
                <NavLink to="/cashier/reports/range" className={navLinkClass} onClick={closeSidebar}><BarChart3 size={18} /> {t('layout.my_reports')}</NavLink>
              </div>
            )}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto bg-gray-100 p-4 sm:p-6 lg:p-8 text-start">
          <div className="max-w-7xl mx-auto w-full">
            {isCashier && <CorrectionBanner count={correction.needsCorrection} />}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
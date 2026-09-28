import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { Lock, User, AlertCircle, Globe, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  
  const { login } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const LANG_OPTIONS = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'ar', label: 'العربية' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setIsSubmitting(true);
    const result = await login(username, password);

    if (result.success) {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user.role === 'admin') navigate('/admin/dashboard');
      else navigate('/pos');
    } else {
      setError(result.message); setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 relative">
      
      {/* Custom Floating Language Dropdown */}
      <div className="absolute top-6 end-6 lg:top-8 lg:end-8 z-50">
        <button
          onClick={() => setIsLangOpen(!isLangOpen)}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 shadow-sm transition-colors text-gray-700"
        >
          <Globe size={18} className="text-red-500" />
          <span className="text-sm font-bold uppercase">{language}</span>
        </button>

        {isLangOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsLangOpen(false)}></div>
            <div className="absolute end-0 mt-2 w-36 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
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

      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-xl border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Ooredoo <span className="text-red-600">POS</span>
          </h2>
          <p className="mt-2 text-sm text-gray-600">{t('login.subtitle')}</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-200">
              <AlertCircle size={18} />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center pl-3 rtl:pr-3">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="username" name="username" type="text" required
                value={username} onChange={(e) => setUsername(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-10 py-3 text-gray-900 placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 sm:text-sm text-start"
                placeholder={t('login.username')}
              />
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center pl-3 rtl:pr-3">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password" name="password" type={showPassword ? "text" : "password"} required
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-10 py-3 text-gray-900 placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 sm:text-sm text-start"
                placeholder={t('login.password')}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={isSubmitting}
            className="flex w-full justify-center rounded-lg bg-red-600 py-3 px-4 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? t('login.signing_in') : t('login.sign_in')}
          </button>
        </form>
      </div>
    </div>
  );
}
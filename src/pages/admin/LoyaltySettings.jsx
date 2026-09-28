import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useLanguage } from '../../context/LanguageContext';
import { Award, Save, RefreshCw, AlertCircle, CheckCircle2, TrendingUp, Users, Target } from 'lucide-react';

export default function LoyaltySettings() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const r = await api.get('/settings/loyalty');
      setSettings(r.data.data);
    } catch (err) {
      setMessage({ type: 'error', text: t('common.action_failed') });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      await api.patch('/settings/loyalty', settings);
      setMessage({ type: 'success', text: 'Loyalty rules updated successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || t('common.action_failed') });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><RefreshCw className="animate-spin text-red-600" size={32} /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 text-start">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Award className="text-red-600" size={28} /> {t('loyalty.engine')}
        </h1>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50">
          {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
          {saving ? t('common.saving') : t('loyalty.save_rules')}
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 font-bold text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 border-b pb-3"><TrendingUp className="text-blue-500"/> {t('loyalty.earning_rules')}</h2>
          <SettingField label={t('loyalty.storm_earn')} value={settings.storm_earn_percent} onChange={(v) => handleChange('storm_earn_percent', v)} />
          <SettingField label={t('loyalty.visit_bonus')} value={settings.visit_bonus_points} onChange={(v) => handleChange('visit_bonus_points', v)} />
          <SettingField label={t('loyalty.visit_min_spend')} value={settings.visit_bonus_min_spend} onChange={(v) => handleChange('visit_bonus_min_spend', v)} />
          <SettingField label={t('loyalty.ref_bonus')} value={settings.referral_bonus_points} onChange={(v) => handleChange('referral_bonus_points', v)} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 border-b pb-3"><Target className="text-orange-500"/> {t('loyalty.redemption_rules')}</h2>
          <SettingField label={t('loyalty.min_redeem')} value={settings.min_points_to_redeem} onChange={(v) => handleChange('min_points_to_redeem', v)} />
          <SettingField label={t('loyalty.pt_value')} value={settings.point_to_dzd_value} onChange={(v) => handleChange('point_to_dzd_value', v)} />
          <SettingField label={t('loyalty.expiry')} value={settings.expiry_days} onChange={(v) => handleChange('expiry_days', v)} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6 space-y-5 md:col-span-2">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 border-b pb-3"><Users className="text-purple-500"/> {t('loyalty.tier_thresholds')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <SettingField label="Bronze Level" value={settings.tier_bronze} onChange={(v) => handleChange('tier_bronze', v)} />
            <SettingField label="Silver Level" value={settings.tier_silver} onChange={(v) => handleChange('tier_silver', v)} />
            <SettingField label="Gold Level" value={settings.tier_gold} onChange={(v) => handleChange('tier_gold', v)} />
            <SettingField label="VIP Level" value={settings.tier_vip} onChange={(v) => handleChange('tier_vip', v)} />
            <SettingField label="VVIP Level" value={settings.tier_vvip} onChange={(v) => handleChange('tier_vvip', v)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-800 mb-2">{label}</label>
      <input type="number" step="0.01" min="0" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-black text-gray-900 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none" />
    </div>
  );
}
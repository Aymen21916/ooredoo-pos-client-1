import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Printer, X, CheckCircle2 } from 'lucide-react';

const formatDZD = (n) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(n || 0);

const formatDateTime = (s) => {
  if (!s) return '';
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function ReceiptModal({ transaction, onClose }) {
  const { t } = useLanguage();
  if (!transaction) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:bg-white print:backdrop-blur-none text-start">
      <div className="bg-gray-100 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:shadow-none print:w-full">
        
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 print:hidden">
          <div className="flex items-center gap-2 text-green-600 font-bold">
            <CheckCircle2 size={20} /> {t('receipt.success')}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={22} /></button>
        </div>

        <div className="p-6 flex justify-center bg-gray-100 print:bg-white print:p-0">
          <div id="print-section" className="bg-white p-6 shadow-sm w-full max-w-[80mm] font-mono text-sm text-gray-900 mx-auto print:shadow-none print:max-w-full">
            
            <div className="text-center mb-4">
              <h2 className="text-xl font-black uppercase tracking-widest">Ooredoo Store</h2>
              <div className="text-xs mt-1">AAO Sobha & Ain Meraine</div>
              <div className="text-xs">{t('receipt.store_subtitle')}</div>
            </div>

            <div className="border-t-2 border-dashed border-gray-300 my-3"></div>

            <div className="text-xs mb-3 space-y-1">
              <div className="flex justify-between"><span>{t('receipt.date')}</span><span>{formatDateTime(transaction.created_at)}</span></div>
              <div className="flex justify-between"><span>{t('receipt.ticket_id')}</span><span>#{transaction.id || Math.floor(Math.random() * 10000)}</span></div>
              <div className="flex justify-between"><span>{t('receipt.type')}</span><span className="uppercase">{t(`ledger.${transaction.type}`) || transaction.type}</span></div>
            </div>

            <div className="border-t-2 border-dashed border-gray-300 my-3"></div>

            <div className="mb-3 space-y-2">
              <div className="flex justify-between font-bold"><span>{t('receipt.description')}</span><span>{t('receipt.amount')}</span></div>
              <div className="flex justify-between text-xs"><span className="pr-4 uppercase">{transaction.description}</span><span>{formatDZD(transaction.amount)}</span></div>
            </div>

            <div className="border-t-2 border-gray-900 my-3"></div>

            <div className="flex justify-between items-center text-lg font-black uppercase">
              <span>{t('receipt.total_pay')}</span><span>{formatDZD(transaction.amount)}</span>
            </div>

            {transaction.customer_name && (
              <>
                <div className="border-t-2 border-dashed border-gray-300 my-4"></div>
                <div className="text-center mb-2"><h3 className="font-bold text-xs uppercase tracking-widest bg-gray-100 py-1 rounded">{t('receipt.loyalty_rewards')}</h3></div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between"><span>{t('receipt.customer')}</span><span className="font-bold uppercase truncate max-w-[120px]">{transaction.customer_name}</span></div>
                  {Number(transaction.points_earned) > 0 && <div className="flex justify-between"><span>{t('receipt.points_earned')}</span><span className="font-bold text-gray-900">+{Math.floor(transaction.points_earned)} {t('ledger.pts')}</span></div>}
                  {Number(transaction.points_redeemed) > 0 && <div className="flex justify-between"><span>{t('receipt.points_used')}</span><span className="font-bold text-gray-900">-{Math.floor(transaction.points_redeemed)} {t('ledger.pts')}</span></div>}
                  <div className="flex justify-between mt-2 pt-2 border-t border-dotted border-gray-300"><span className="font-bold">{t('receipt.new_balance')}</span><span className="font-black text-lg">{Math.floor(transaction.new_points_balance || 0)} {t('ledger.pts')}</span></div>
                </div>
              </>
            )}

            <div className="border-t-2 border-dashed border-gray-300 my-4"></div>

            <div className="text-center text-xs space-y-1">
              <p className="font-bold">{t('receipt.thank_you')}</p>
              <p>{t('receipt.merci')}</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-gray-200 flex gap-3 print:hidden">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">{t('receipt.close')}</button>
          <button onClick={() => window.print()} className="flex-[2] flex items-center justify-center gap-2 py-3 text-sm font-bold text-white bg-gray-900 rounded-xl hover:bg-black transition-colors shadow-md">
            <Printer size={18} /> {t('receipt.print')}
          </button>
        </div>

      </div>
    </div>
  );
}
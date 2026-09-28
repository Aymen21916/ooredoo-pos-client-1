import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, CheckCircle2, RefreshCw, User, Phone, MapPin, Briefcase, UserPlus, Search } from 'lucide-react';
import api from '../api/axios';

export default function UssdTerminalModal({ serviceCode, posSessionId, onClose, onTransactionSuccess }) {
  const { t } = useLanguage();
  const [ussdSessionId, setUssdSessionId] = useState("");
  const [promptText, setPromptText] = useState("");
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [error, setError] = useState("");
  
  const [activeTransactionDraft, setActiveTransactionDraft] = useState({ targetNumber: null, amount: null });
  const [parsedTransaction, setParsedTransaction] = useState(null);
  const [manualAmount, setManualAmount] = useState("");
  const [isRecordingPOS, setIsRecordingPOS] = useState(false);
  
  const [isCheckingClient, setIsCheckingClient] = useState(false);
  const [linkedCustomer, setLinkedCustomer] = useState(null);
  const [clientPhone, setClientPhone] = useState('');
  const [clientFirstName, setClientFirstName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientProfession, setClientProfession] = useState('');
  const [clientReferredByPhone, setClientReferredByPhone] = useState('');
  
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    let timer;
    if (ussdSessionId && !isLoading && !isFinished && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prevTime) => prevTime - 1), 1000);
    } else if (timeLeft === 0 && ussdSessionId && !isFinished) {
      handleSessionTimeout();
    }
    return () => clearInterval(timer);
  }, [ussdSessionId, isLoading, isFinished, timeLeft]);

  useEffect(() => {
    if (parsedTransaction?.targetNumber) {
      setClientPhone(parsedTransaction.targetNumber);
      checkClientExists(parsedTransaction.targetNumber);
    }
  }, [parsedTransaction]);

  const handleSessionTimeout = () => {
    setError("Error: Expired USSD Session (60s timeout)");
    setIsFinished(true);
  };

  const checkClientExists = async (phone) => {
    setIsCheckingClient(true);
    try {
      const res = await api.get(`/customers/lookup?phone=${phone}`);
      const found = res.data.data;
      if (found) { setLinkedCustomer(found); } 
      else { setLinkedCustomer(null); setClientFirstName(''); setClientLastName(''); setClientAddress(''); setClientProfession(''); }
    } catch (err) { 
      setLinkedCustomer(null); setClientFirstName(''); setClientLastName(''); setClientAddress(''); setClientProfession('');
    } finally { 
      setIsCheckingClient(false); 
    }
  };

  const parseResponse = (textArray) => {
    let mainText = ""; const parsedOptions = [];
    textArray.forEach(([id, text]) => {
      if (id === "") mainText += text + "\n";
      else parsedOptions.push({ id, label: text.trim() });
    });
    return { mainText: mainText.trim(), parsedOptions };
  };

  const sendUssdRequest = async (msg, isStart = false) => {
    if (!isStart && promptText) {
      const lowerPrompt = promptText.toLowerCase();
      if (lowerPrompt.includes("numéro")) setActiveTransactionDraft(prev => ({ ...prev, targetNumber: msg }));
      if (lowerPrompt.includes("somme") || lowerPrompt.includes("montant")) setActiveTransactionDraft(prev => ({ ...prev, amount: parseFloat(msg) }));
    }

    setIsLoading(true); setError(""); setInputValue("");
    const payload = { app_id: "ussd_app", service_code: isStart ? serviceCode : "", msg: msg, session_id: isStart ? "" : ussdSessionId, session_continue: "1", cache_enable: false };

    try {
      const response = await api.post('/sales/proxy/nbservice', payload);
      const result = response.data;
      if (result.code === 0 && result.data) {
        const { text, nb_session_id, session_continue } = result.data;
        setUssdSessionId(nb_session_id.toString()); setTimeLeft(60);
        const { mainText, parsedOptions } = parseResponse(text);
        setPromptText(mainText); setOptions(parsedOptions);

        if (session_continue === 0 || (mainText.includes("OK num") && parsedOptions.length === 0)) {
          setIsFinished(true);
          let opId = 'N/A';
          const opMatch = mainText.match(/operation (\d+)/i);
          if (opMatch) opId = opMatch[1];
          setParsedTransaction({ targetNumber: activeTransactionDraft.targetNumber, amount: activeTransactionDraft.amount, operationId: opId, success: true });
        }
      } else {
        setError("Error: " + (result.message || "Invalid response from server")); setIsFinished(true);
      }
    } catch (err) {
      setError(`Error: ${err.response?.data?.message || err.message || "Network error occurred."}`); setIsFinished(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputSubmit = (e) => { e.preventDefault(); if (inputValue.trim()) sendUssdRequest(inputValue.trim()); };

  const resetTerminal = () => {
    setUssdSessionId(""); setIsFinished(false); setPromptText(""); setOptions([]); setError(""); setParsedTransaction(null);
    setActiveTransactionDraft({ targetNumber: null, amount: null }); setLinkedCustomer(null); setClientPhone(''); setManualAmount(''); setTimeLeft(60);
    setClientReferredByPhone('');
  };

  const handleRecordInPOS = async () => {
    if (!parsedTransaction || !posSessionId) return;
    const finalAmount = parsedTransaction.amount !== null ? parsedTransaction.amount : parseFloat(manualAmount);
    if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) { setError("Please enter a valid amount."); return; }

    setIsRecordingPOS(true); setError("");
    try {
      let customerId = linkedCustomer?.id || null;
      
      // OPTIONAL REGISTRATION LOGIC: Only create customer if they explicitly typed a First or Last name.
      const hasName = clientFirstName.trim().length > 0 || clientLastName.trim().length > 0;
      
      if (!customerId && clientPhone && hasName) {
        const createRes = await api.post('/customers', {
          first_name: clientFirstName.trim() || 'Client', 
          last_name: clientLastName.trim() || clientPhone,
          phone_number: clientPhone, 
          address: clientAddress.trim() || null, 
          profession: clientProfession.trim() || null,
          referred_by_phone: clientReferredByPhone.trim() || null
        });
        customerId = createRes.data.data.id;
      }

      await api.post('/sales/storm', {
        session_id: posSessionId, customer_id: customerId, amount: finalAmount,
        note: parsedTransaction.operationId !== 'N/A' ? `USSD (*580#) Op: ${parsedTransaction.operationId} | Phone: (${parsedTransaction.targetNumber || clientPhone})` : `USSD (*585#) Bundle | Phone: (${parsedTransaction.targetNumber || clientPhone})`
      });
      if (onTransactionSuccess) onTransactionSuccess();
    } catch (err) { setError(`Failed: ${err.response?.data?.message || err.message}`); } 
    finally { setIsRecordingPOS(false); }
  };

  const formatDZD = (amount) => new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(amount || 0);
  
  // REMOVED !clientPhone requirement so registration can be skipped entirely
  const isConfirmDisabled = isRecordingPOS || (parsedTransaction?.amount === null && (!manualAmount || parseFloat(manualAmount) <= 0));
  const isCreatingNew = !linkedCustomer && (clientFirstName.trim() || clientLastName.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm text-start">
      <div className="w-full max-w-2xl bg-white border rounded-xl shadow-2xl font-sans relative flex flex-col max-h-[95vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/80 rounded-t-xl">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><span className="text-red-600 font-black">Ooredoo</span> USSD ({serviceCode})</h2>
          <div className="flex items-center gap-4">
            {ussdSessionId && !isFinished && <div className={`font-bold text-sm ${timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-gray-500'}`}>{timeLeft}s</div>}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 rounded-full transition-colors"><X size={20} /></button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {error && <div className="p-3 mb-4 text-red-700 bg-red-100 border border-red-300 rounded-lg font-medium text-sm">{error}</div>}

          {!ussdSessionId && !isLoading && !isFinished && !error && (
            <button onClick={() => sendUssdRequest("1", true)} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-lg transition-colors shadow-sm">{t('ussd.start_flow')}</button>
          )}

          {isLoading && (
            <div className="text-center py-8 text-gray-500 font-medium animate-pulse flex flex-col items-center">
              <span className="w-8 h-8 rounded-full border-4 border-red-200 border-t-red-600 animate-spin mb-3"></span>
              {t('ussd.processing')}
            </div>
          )}

          {ussdSessionId && !isLoading && !isFinished && (
            <div className="space-y-4 max-w-md mx-auto">
              {promptText && <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-800 font-medium whitespace-pre-line text-sm leading-relaxed">{promptText}</div>}
              {options.length > 0 ? (
                <div className="flex flex-col space-y-2">
                  {options.map((opt) => (
                    <button key={opt.id} onClick={() => sendUssdRequest(opt.id)} className="w-full text-start px-4 py-3 border border-gray-200 hover:border-red-500 hover:bg-red-50 rounded-lg transition-all text-sm group">
                      <span className="font-bold text-red-600 mx-2 group-hover:text-red-700">{opt.id}.</span> 
                      <span className="font-medium text-gray-700 group-hover:text-gray-900">{opt.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <form onSubmit={handleInputSubmit} className="flex flex-col space-y-3">
                  <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 font-medium" autoFocus />
                  <button type="submit" disabled={!inputValue.trim()} className="w-full bg-red-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg transition-colors shadow-sm">{t('ussd.submit_response')}</button>
                </form>
              )}
            </div>
          )}

          {(isFinished || error) && ussdSessionId && (
            <div className="mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {parsedTransaction && !error ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-blue-50/50 border-b border-blue-100 rounded-lg text-sm gap-3">
                    <div className="text-blue-700 font-medium">{t('ussd.operation')} {parsedTransaction.operationId !== 'N/A' && <span className="font-bold mx-1">{parsedTransaction.operationId}</span>}</div>
                    {parsedTransaction.amount !== null ? (
                      <span className="text-blue-800 font-black text-base">{formatDZD(parsedTransaction.amount)}</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <label className="text-blue-700 font-bold whitespace-nowrap">{t('ussd.sale_amount')}</label>
                        <input type="number" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} placeholder="e.g. 1000" className="w-24 px-2 py-1.5 text-sm border border-blue-200 rounded text-blue-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" />
                        <span className="text-blue-800 font-black">DZD</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">{t('modal.find_customer')}</h3>
                    {isCheckingClient ? (
                      <div className="flex items-center justify-center py-10 text-gray-500"><RefreshCw className="animate-spin mx-2" size={20} /> {t('ussd.searching')}</div>
                    ) : linkedCustomer ? (
                      <div className="space-y-6">
                        <div className="border-2 border-emerald-400 bg-emerald-50/30 rounded-xl p-5 shadow-sm">
                          <div className="flex items-center gap-2 text-emerald-600 font-bold mb-5 text-lg"><CheckCircle2 size={24} /> {t('ussd.customer_found')}</div>
                          <div className="grid grid-cols-2 gap-y-5 gap-x-4 text-sm mb-5">
                            <div><div className="text-gray-500 flex items-center gap-1.5 mb-1 text-xs"><User size={14}/> {t('modal.name')}</div><div className="font-bold text-gray-900 text-base">{linkedCustomer.first_name} {linkedCustomer.last_name}</div></div>
                            <div><div className="text-gray-500 flex items-center gap-1.5 mb-1 text-xs"><Phone size={14}/> {t('modal.phone')}</div><div className="font-bold text-gray-900 text-base">{linkedCustomer.phone_number}</div></div>
                            <div><div className="text-gray-500 flex items-center gap-1.5 mb-1 text-xs"><MapPin size={14}/> {t('modal.address')}</div><div className="font-bold text-gray-900">{linkedCustomer.address || '—'}</div></div>
                            <div><div className="text-gray-500 flex items-center gap-1.5 mb-1 text-xs"><Briefcase size={14}/> {t('modal.profession')}</div><div className="font-bold text-gray-900">{linkedCustomer.profession || '—'}</div></div>
                          </div>
                          <div className="border-t border-emerald-200/60 pt-4">
                            <div className="grid grid-cols-3 gap-4 text-center mb-3">
                              <div><div className="text-gray-500 text-xs mb-1">{t('ledger.sim_cards')}</div><div className="font-bold text-gray-900">{linkedCustomer.sim_count || linkedCustomer.stats?.sim_count || 0}</div></div>
                              <div><div className="text-gray-500 text-xs mb-1">{t('ledger.storm_bundles')}</div><div className="font-bold text-gray-900">{linkedCustomer.storm_count || linkedCustomer.stats?.storm_count || 0}</div></div>
                              <div><div className="text-gray-500 text-xs mb-1">{t('ledger.products')}</div><div className="font-bold text-gray-900">{linkedCustomer.accessory_count || linkedCustomer.stats?.accessory_count || 0}</div></div>
                            </div>
                            <div className="text-center text-sm font-medium text-emerald-700">{t('modal.total_spent')} <span className="font-bold">{formatDZD(linkedCustomer.total_spent || linkedCustomer.stats?.total_spent || 0)}</span></div>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <button onClick={() => setLinkedCustomer(null)} className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50 transition-colors">{t('ussd.different_customer')}</button>
                          <button onClick={handleRecordInPOS} disabled={isConfirmDisabled} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg shadow-sm transition-colors">
                            {isRecordingPOS ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                            {isRecordingPOS ? t('ussd.recording') : t('ussd.confirm_continue')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-5 bg-orange-50 border border-orange-200 rounded-xl shadow-sm space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="text-[12px] font-black text-orange-800 uppercase tracking-wider flex items-center gap-1.5">
                              <UserPlus size={16} strokeWidth={2.5}/> {t('modal.auto_register')}
                            </div>
                            <div className="flex items-center gap-2">
                               <input type="text" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="w-32 rounded-lg border border-orange-200 px-2.5 py-1.5 text-xs font-bold text-gray-900 outline-none focus:border-orange-500" placeholder={t('modal.phone')} />
                               <button onClick={() => checkClientExists(clientPhone)} className="p-1.5 bg-orange-200 text-orange-800 hover:bg-orange-300 rounded-lg transition-colors" title={t('ussd.search_again')}>
                                  <Search size={16} />
                               </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">{t('modal.first_name')}</label><input type="text" value={clientFirstName} onChange={e => setClientFirstName(e.target.value)} className="w-full rounded-lg border border-orange-200 p-2.5 text-sm font-bold text-gray-900 outline-none focus:border-orange-500" /></div>
                            <div><label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">{t('modal.last_name')}</label><input type="text" value={clientLastName} onChange={e => setClientLastName(e.target.value)} className="w-full rounded-lg border border-orange-200 p-2.5 text-sm font-bold text-gray-900 outline-none focus:border-orange-500" /></div>
                            <div><label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">{t('modal.address')} <span className="lowercase text-gray-400 font-medium">{t('modal.optional')}</span></label><input type="text" value={clientAddress} onChange={e => setClientAddress(e.target.value)} className="w-full rounded-lg border border-orange-200 p-2.5 text-sm font-bold text-gray-900 outline-none focus:border-orange-500" /></div>
                            <div><label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">{t('modal.profession')} <span className="lowercase text-gray-400 font-medium">{t('modal.optional')}</span></label><input type="text" value={clientProfession} onChange={e => setClientProfession(e.target.value)} className="w-full rounded-lg border border-orange-200 p-2.5 text-sm font-bold text-gray-900 outline-none focus:border-orange-500" /></div>
                            <div className="col-span-2">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">{t('modal.referred_by')} <span className="lowercase text-gray-400 font-medium">{t('modal.veteran_phone')}</span></label>
                              <input type="text" placeholder="e.g. 055..." value={clientReferredByPhone} onChange={e => setClientReferredByPhone(e.target.value)} className="w-full rounded-lg border border-red-200 p-2.5 text-sm font-bold text-gray-900 outline-none focus:border-red-500" />
                            </div>
                          </div>
                        </div>

                        <div className="text-xs font-bold text-gray-400 mt-2 italic text-center">
                          {t('modal.unregistered_walkin')}
                        </div>

                        <div className="pt-2">
                          <button onClick={handleRecordInPOS} disabled={isConfirmDisabled} className={`w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl shadow-sm transition-colors text-lg ${isCreatingNew ? 'bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400' : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'}`}>
                            {isRecordingPOS ? <RefreshCw size={20} className="animate-spin" /> : <span>+</span>}
                            {isRecordingPOS ? t('ussd.recording') : (isCreatingNew ? t('ussd.create_continue') : t('ussd.confirm_continue'))}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : !error && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg font-medium whitespace-pre-line text-sm text-center">
                  {promptText || t('ussd.transaction_complete')}
                </div>
              )}
              <div className="text-center mt-6">
                <button onClick={resetTerminal} className="text-gray-500 font-bold hover:text-gray-700 transition-colors text-sm underline underline-offset-4">
                  {t('ussd.start_new_session')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
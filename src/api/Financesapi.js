import api from './axios';

/**
 * One function per export of backend/controllers/financesController.js.
 *
 * `financesRoutes.js` was not part of the upload, so the paths below are the
 * REST paths I assumed. Only `/finances/registers` (used by MonthlyTrends) and
 * `/finances/manual-ledger` (documented in the controller) are confirmed.
 * If your router uses different paths, change them HERE only — every page
 * goes through this file.
 */
export const FINANCES_PATHS = {
  pool: '/finances/pool',                        // GET  getPool           | POST updatePool
  poolSync: '/finances/pool/sync',               // POST syncPoolWithOoredoo
  poolConvert: '/finances/pool/convert-points',  // POST autoConvertPoints
  reconciliation: '/finances/reconciliation',    // GET  getDailyReconciliation
  registers: '/finances/registers',              // GET  getRegisters
  register: (id) => `/finances/registers/${id}`, // PUT  updateRegister
  manualLedger: '/finances/manual-ledger',       // GET  getManualLedger
};

const unwrap = (r) => r.data?.data;

export const financesApi = {
  /** getPool -> { balance, bonus, points } */
  getPool: () => api.get(FINANCES_PATHS.pool).then(unwrap),

  /** syncPoolWithOoredoo -> { balance, bonus, points } (USSD *BalancePDV) */
  syncPool: () => api.post(FINANCES_PATHS.poolSync).then(unwrap),

  /** autoConvertPoints -> { balance, bonus, points, pointsConverted, dzdAdded } (USSD *582#) */
  convertPoints: () => api.post(FINANCES_PATHS.poolConvert).then(unwrap),

  /**
   * updatePool — logs a manual Side-Ledger entry.
   * actionType: 'RECHARGE' | 'REWARD'   amount: non-zero number (negatives allowed)
   */
  updatePool: ({ amount, actionType, note }) =>
    api.post(FINANCES_PATHS.pool, { amount, actionType, note: note || '' }).then(unwrap),

  /** getDailyReconciliation -> { timeline, opening, activity, audit } */
  getDailyReconciliation: () => api.get(FINANCES_PATHS.reconciliation).then(unwrap),

  /** getRegisters -> [{ id, name, location, current_cash }] */
  getRegisters: () => api.get(FINANCES_PATHS.registers).then((r) => r.data?.data || []),

  /** updateRegister — type: 'add' | 'subtract', amount > 0 */
  updateRegister: (storeId, { type, amount, note }) =>
    api.put(FINANCES_PATHS.register(storeId), { type, amount, note: note || undefined }).then(unwrap),

  /** getManualLedger ?from&to -> { from, to, totals, truncated, items } */
  getManualLedger: (from, to) => api.get(FINANCES_PATHS.manualLedger, { params: { from, to } }).then(unwrap),
};
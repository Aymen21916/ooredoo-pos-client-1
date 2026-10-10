import api from './axios';

/**
 * One function per route of backend/routes/reportsRoutes.js.
 * Every function resolves with the `data` payload of `sendSuccess` (r.data.data).
 */
const unwrap = (r) => r.data?.data;

export const reportsApi = {
  // ── Cashier-or-admin ──────────────────────────────────────────────────────
  /** GET /api/reports/range?from&to */
  range: (from, to) => api.get('/reports/range', { params: { from, to } }).then(unwrap),

  // ── Admin only ────────────────────────────────────────────────────────────
  /** GET /api/reports/preview?date */
  preview: (date) => api.get('/reports/preview', { params: { date } }).then(unwrap),

  /** POST /api/reports/generate { date, force_close_open_sessions? } */
  generate: (date, forceCloseOpenSessions = false) =>
    api
      .post('/reports/generate', {
        date,
        ...(forceCloseOpenSessions ? { force_close_open_sessions: true } : {}),
      })
      .then(unwrap),

  /** GET /api/reports?limit */
  list: (params = { limit: 100 }) => api.get('/reports', { params }).then(unwrap),

  /** GET /api/reports/:id */
  byId: (id) => api.get(`/reports/${id}`).then(unwrap),

  /** GET /api/reports/:id/export.csv  -> Blob */
  exportCsv: (id) => api.get(`/reports/${id}/export.csv`, { responseType: 'blob' }).then((r) => r.data),

  /** GET /api/reports/monthly?from&to&store_id */
  monthly: (params) => api.get('/reports/monthly', { params }).then(unwrap),

  /** GET /api/reports/top?from&to&limit */
  top: (params) => api.get('/reports/top', { params }).then(unwrap),

  /** GET /api/reports/cashier/:id?from&to */
  cashierHistory: (id, params) => api.get(`/reports/cashier/${id}`, { params }).then(unwrap),

  /** GET /api/reports/stats?from&to&store_id */
  statistics: (params) => api.get('/reports/stats', { params }).then(unwrap),

  /** GET /api/reports/cashiers/ranking?by&metric&order&from&to&store_id&limit */
  cashierRanking: (params) => api.get('/reports/cashiers/ranking', { params }).then(unwrap),

  /** GET /api/reports/audit?user_id&action&table&record_id&from&to&search&limit&offset */
  audit: (params) => api.get('/reports/audit', { params }).then(unwrap),
};

/** Triggers a browser download for a Blob. */
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

/** Removes empty-string / null params so they are not sent as `?store_id=`. */
export const cleanParams = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined));
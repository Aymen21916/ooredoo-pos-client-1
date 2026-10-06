import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export const CORRECTIONS_CHANGED = 'corrections:changed';

/** Call after anything that changes the counters (a correction was sent, a validation changed...). */
export const notifyCorrectionsChanged = () => window.dispatchEvent(new Event(CORRECTIONS_CHANGED));

/**
 * Polls /customer-validation/alerts (every minute, and instantly after notifyCorrectionsChanged()).
 *   cashier: needsCorrection (invalid customers nothing was sent for yet) · awaitingAdmin
 *   admin:   pendingCorrections (waiting for review) · unreviewed
 */
export function useCorrectionAlerts(enabled = true) {
  const [alerts, setAlerts] = useState({});

  const refresh = useCallback(async () => {
    try {
      const r = await api.get('/customer-validation/alerts');
      setAlerts(r.data.data || {});
    } catch (err) { /* a missed poll is harmless */ }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    refresh();
    const timer = setInterval(refresh, 60000);
    window.addEventListener(CORRECTIONS_CHANGED, refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener(CORRECTIONS_CHANGED, refresh);
    };
  }, [enabled, refresh]);

  return {
    needsCorrection: alerts.needs_correction || 0,
    awaitingAdmin: alerts.awaiting_admin || 0,
    pendingCorrections: alerts.pending_corrections || 0,
    unreviewed: alerts.unreviewed || 0,
    refresh,
  };
}
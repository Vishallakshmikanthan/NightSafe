// Offline mode utility for NightSafe
// Handles offline detection, local alert storage, and banner state

const OFFLINE_ALERTS_KEY = 'nightsafe_offline_alerts';
const MAX_OFFLINE_ALERTS = 50;

/**
 * Store an alert locally when offline
 */
export function storeOfflineAlert(alert) {
  try {
    const existing = getOfflineAlerts();
    const updated = [
      { ...alert, storedAt: new Date().toISOString(), offline: true },
      ...existing,
    ].slice(0, MAX_OFFLINE_ALERTS);
    localStorage.setItem(OFFLINE_ALERTS_KEY, JSON.stringify(updated));
  } catch (_) {}
}

/**
 * Retrieve all locally stored offline alerts
 */
export function getOfflineAlerts() {
  try {
    const data = localStorage.getItem(OFFLINE_ALERTS_KEY);
    if (data) return JSON.parse(data);
  } catch (_) {}
  return [];
}

/**
 * Clear all locally stored offline alerts
 */
export function clearOfflineAlerts() {
  try {
    localStorage.removeItem(OFFLINE_ALERTS_KEY);
  } catch (_) {}
}

/**
 * Simulate sending an SMS (mock — logs to console + localStorage)
 */
export function simulateSMSSend(to, message) {
  const entry = {
    to,
    message,
    sentAt: new Date().toISOString(),
    status: 'queued_offline',
  };
  try {
    const existing = JSON.parse(localStorage.getItem('nightsafe_sms_queue') || '[]');
    localStorage.setItem('nightsafe_sms_queue', JSON.stringify([entry, ...existing].slice(0, 20)));
  } catch (_) {}
  console.info('[NightSafe Offline] SMS queued:', entry);
  return entry;
}

/**
 * Check if the browser is online
 */
export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Subscribe to online/offline events. Returns cleanup fn.
 */
export function subscribeToNetworkState(onOnline, onOffline) {
  const handleOnline = () => { if (typeof onOnline === 'function') onOnline(); };
  const handleOffline = () => { if (typeof onOffline === 'function') onOffline(); };
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

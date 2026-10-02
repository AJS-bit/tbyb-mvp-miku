// Read-only bridge from the website (web/, same origin) to the app.
// The website stores its demo under `tbyb-miku-demo-v2`; this module only reads it and never writes it.
export const WEB_STORAGE_KEY = 'tbyb-miku-demo-v2';
const PENDING = ['requested', 'operator_check', 'payment_pending', 'confirmed'];
const isDay = value => { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const date = new Date(value + 'T00:00:00Z'); return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value; };
const addDays = (day, n) => { const date = new Date(day + 'T00:00:00Z'); date.setUTCDate(date.getUTCDate() + n); return date.toISOString().slice(0, 10); };

/** The newest pending website request's start date (today or later), with a 3-day end; otherwise null. */
export function webRequestDates(raw, today) {
  if (typeof raw !== 'string' || !raw) return null;
  let saved;
  try { saved = JSON.parse(raw); } catch { return null; }
  const list = Array.isArray(saved?.reservations) ? saved.reservations : [];
  const pending = list
    .filter(item => item && PENDING.includes(item.status) && isDay(item.request?.startDate) && item.request.startDate >= today)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  if (!pending.length) return null;
  const start = pending[0].request.startDate;
  return {start, end: addDays(start, 3)};
}

/** Reads the website's store without throwing; storage errors mean "nothing to prefill". */
export function readWebRequestDates(storage, today) {
  try { return webRequestDates(storage.getItem(WEB_STORAGE_KEY), today); } catch { return null; }
}

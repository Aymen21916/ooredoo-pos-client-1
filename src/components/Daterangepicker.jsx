import { CalendarRange, AlertCircle } from 'lucide-react';

const pad = (n) => String(n).padStart(2, '0');
export const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const rangePresets = (labels) => {
  const now = new Date();
  const today = fmtDate(now);
  const d30 = new Date(now);
  d30.setDate(d30.getDate() - 29);
  return [
    [labels.today, today, today],
    [labels.thisMonth, fmtDate(new Date(now.getFullYear(), now.getMonth(), 1)), today],
    [labels.last30, fmtDate(d30), today],
  ];
};

const DEFAULT_LABELS = {
  from: 'From',
  to: 'To',
  today: 'Today',
  thisMonth: 'This month',
  last30: 'Last 30 days',
  yesterday: 'Yesterday',
  invalid: '“From” must be on or before “To”.',
};

const LABEL_CLS = 'block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1';
const INPUT_CLS = 'rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-red-500';
const PRESET_CLS =
  'inline-flex items-center gap-1 rounded-md bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200';

/**
 * Shared From / To date range picker (same look & behaviour as the one in
 * Cash Management → Manual Side-Ledger History).
 *
 * Props
 *  - range           { from, to }  (YYYY-MM-DD strings)
 *  - onRangeChange   ({ from, to }) => void
 *  - allowEmpty      optional filters: empty dates are valid, only from > to warns
 *  - hideWarning     hide the built-in warning (parent shows its own hint)
 *  - labels          override any text, e.g. { from: t('reports.from') }
 *  - hint            small helper text shown under the picker (e.g. "5 days selected")
 *  - children        extra controls rendered at the end of the row
 */
export default function DateRangePicker({
  range,
  onRangeChange,
  allowEmpty = false,
  hideWarning = false,
  labels,
  hint,
  className = '',
  children,
}) {
  const L = { ...DEFAULT_LABELS, ...(labels || {}) };
  const today = fmtDate(new Date());
  const from = range?.from || '';
  const to = range?.to || '';

  const invalidRange = allowEmpty ? Boolean(from && to && from > to) : !from || !to || from > to;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className={LABEL_CLS}>{L.from}</label>
          <input
            type="date" value={from} max={today}
            onChange={(e) => onRangeChange({ from: e.target.value, to })}
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>{L.to}</label>
          <input
            type="date" value={to} max={today}
            onChange={(e) => onRangeChange({ from, to: e.target.value })}
            className={INPUT_CLS}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {rangePresets(L).map(([label, f, t]) => (
            <button type="button" key={label} onClick={() => onRangeChange({ from: f, to: t })} className={PRESET_CLS}>
              <CalendarRange size={14} /> {label}
            </button>
          ))}
        </div>
        {children}
      </div>

      {hint && <p className="text-xs text-gray-500">{hint}</p>}

      {!hideWarning && invalidRange && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-center gap-2">
          <AlertCircle size={16} /> {L.invalid}
        </div>
      )}
    </div>
  );
}

/**
 * Single-day variant with the same look (used where only ONE date makes sense,
 * e.g. generating an end-of-day report).
 */
export function SingleDatePicker({ value, onChange, label, hint, labels, className = '', children }) {
  const L = { ...DEFAULT_LABELS, ...(labels || {}) };
  const now = new Date();
  const today = fmtDate(now);
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const presets = [[L.today, today], [L.yesterday, fmtDate(y)]];

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className={LABEL_CLS}>{label || 'Date'}</label>
          <input type="date" value={value} max={today} onChange={(e) => onChange(e.target.value)} className={INPUT_CLS} />
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map(([name, d]) => (
            <button type="button" key={name} onClick={() => onChange(d)} className={PRESET_CLS}>
              <CalendarRange size={14} /> {name}
            </button>
          ))}
        </div>
        {children}
      </div>
      {hint && <p className="text-xs font-medium text-gray-500">{hint}</p>}
    </div>
  );
}
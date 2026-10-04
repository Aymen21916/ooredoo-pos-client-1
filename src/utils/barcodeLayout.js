// Pure helpers (no DOM, no libraries) shared by the settings page preview and the print routine.
// KEEP IN SYNC with the API's src/utils/barcodePrintSettings.js (same limits).

export const PAGE_SIZES = { A4: { w: 210, h: 297 }, Letter: { w: 215.9, h: 279.4 } };

export const FORMATS = [
  { value: 'CODE128', label: 'Code 128 — any text or number (recommended)', sample: 'ABC-123456' },
  { value: 'EAN13',   label: 'EAN-13 — 12 or 13 digits',                    sample: '613000012345' },
  { value: 'EAN8',    label: 'EAN-8 — 7 or 8 digits',                       sample: '1234567' },
  { value: 'UPC',     label: 'UPC-A — 11 or 12 digits',                     sample: '01234567890' },
  { value: 'CODE39',  label: 'Code 39 — A–Z, 0–9 and - . space',            sample: 'ABC123456' },
];

export const DEFAULT_SETTINGS = {
  mode: 'roll',
  label_width_mm: 50,
  label_height_mm: 30,
  padding_mm: 1.5,
  page_size: 'A4',
  columns: 3,
  rows: 8,
  margin_top_mm: 10,
  margin_left_mm: 7,
  gap_x_mm: 2,
  gap_y_mm: 0,
  format: 'CODE128',
  barcode_width_pct: 90,
  barcode_height_mm: 10,
  show_value: true,
  value_font_size_pt: 7,
  show_store_name: false,
  store_name: '',
  store_font_size_pt: 7,
  show_name: true,
  name_font_size_pt: 8,
  name_max_lines: 2,
  show_price: true,
  price_font_size_pt: 10,
  currency_label: 'DA',
  text_align: 'center',
  copies_mode: 'fixed',
  default_copies: 1,
};

export const LIMITS = {
  label_width_mm: [15, 200], label_height_mm: [10, 200], padding_mm: [0, 10],
  columns: [1, 12], rows: [1, 30],
  margin_top_mm: [0, 50], margin_left_mm: [0, 50], gap_x_mm: [0, 30], gap_y_mm: [0, 30],
  barcode_width_pct: [30, 100], barcode_height_mm: [5, 60],
  value_font_size_pt: [5, 20], store_font_size_pt: [5, 20],
  name_font_size_pt: [5, 20], name_max_lines: [1, 3], price_font_size_pt: [5, 30],
  default_copies: [1, 500],
};
const INT_KEYS = new Set(['columns', 'rows', 'barcode_width_pct', 'name_max_lines', 'default_copies']);

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Returns { fieldName: message } — empty object when everything is valid. */
export function validateSettings(s) {
  const errors = {};
  for (const [k, [min, max]] of Object.entries(LIMITS)) {
    const v = s[k];
    const ok = isNum(v) && v >= min && v <= max && (!INT_KEYS.has(k) || Number.isInteger(v));
    if (!ok) errors[k] = `${INT_KEYS.has(k) ? 'Whole number' : 'Number'} between ${min} and ${max}`;
  }
  if (String(s.store_name || '').length > 40) errors.store_name = 'Max 40 characters';
  if (String(s.currency_label || '').length > 10) errors.currency_label = 'Max 10 characters';

  if (!errors.label_width_mm && !errors.label_height_mm && !errors.padding_mm
      && (s.padding_mm * 2 >= s.label_width_mm || s.padding_mm * 2 >= s.label_height_mm)) {
    errors.padding_mm = 'Too large for this label size';
  }

  if (s.mode === 'sheet' && !errors.columns && !errors.rows && !errors.label_width_mm && !errors.label_height_mm
      && !errors.margin_left_mm && !errors.margin_top_mm && !errors.gap_x_mm && !errors.gap_y_mm) {
    const page = PAGE_SIZES[s.page_size] || PAGE_SIZES.A4;
    const usedW = s.margin_left_mm + s.columns * s.label_width_mm + (s.columns - 1) * s.gap_x_mm;
    const usedH = s.margin_top_mm + s.rows * s.label_height_mm + (s.rows - 1) * s.gap_y_mm;
    if (usedW > page.w + 0.01) errors.layout = `${s.columns} column(s) need ${usedW.toFixed(1)} mm but ${s.page_size} is ${page.w} mm wide.`;
    else if (usedH > page.h + 0.01) errors.layout = `${s.rows} row(s) need ${usedH.toFixed(1)} mm but ${s.page_size} is ${page.h} mm tall.`;
  }
  return errors;
}

/** Fills missing/invalid numbers with defaults and clamps — so previews and printing never crash. */
export function normalizeSettings(raw = {}) {
  const s = { ...DEFAULT_SETTINGS, ...raw };
  for (const [k, [min, max]] of Object.entries(LIMITS)) {
    let v = s[k];
    if (!isNum(v)) v = DEFAULT_SETTINGS[k];
    v = Math.min(max, Math.max(min, v));
    s[k] = INT_KEYS.has(k) ? Math.round(v) : v;
  }
  s.store_name = String(s.store_name || '').slice(0, 40);
  s.currency_label = String(s.currency_label || '').slice(0, 10);
  if (!FORMATS.some((f) => f.value === s.format)) s.format = DEFAULT_SETTINGS.format;
  if (!['roll', 'sheet'].includes(s.mode)) s.mode = 'roll';
  if (!PAGE_SIZES[s.page_size]) s.page_size = 'A4';
  if (!['left', 'center', 'right'].includes(s.text_align)) s.text_align = 'center';
  if (!['fixed', 'stock'].includes(s.copies_mode)) s.copies_mode = 'fixed';
  return s;
}

const PT_TO_MM = 0.3528;

/** Rough height of everything stacked on one label, in mm (to warn when it won't fit). */
export function estimateContentHeightMm(s) {
  let pt = 0;
  let blocks = 0;
  if (s.show_store_name && s.store_name) { pt += s.store_font_size_pt * 1.1; blocks += 1; }
  if (s.show_name)  { pt += s.name_font_size_pt * 1.15 * s.name_max_lines; blocks += 1; }
  if (s.show_value) { pt += s.value_font_size_pt * 1.1; blocks += 1; }
  if (s.show_price) { pt += s.price_font_size_pt * 1.1; blocks += 1; }
  return pt * PT_TO_MM + s.barcode_height_mm + blocks * 0.4;
}

/** Physical width of one bar module in mm — the number that decides if a scanner can read it. */
export function barWidthMm(s, modules) {
  const inner = s.label_width_mm - 2 * s.padding_mm;
  const box = inner * (s.barcode_width_pct / 100);
  return modules > 0 ? box / modules : 0;
}

export const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

const formatPrice = (price, currency) => {
  const n = Number(price);
  if (!Number.isFinite(n)) return '';
  const num = new Intl.NumberFormat('fr-DZ', { maximumFractionDigits: 2 }).format(n);
  return currency ? `${num} ${currency}` : num;
};

/** One label as an HTML string. `svg` is the already-rendered barcode. */
export function buildLabelHtml(product, s, svg) {
  const parts = [];
  if (s.show_store_name && s.store_name) parts.push(`<div class="bp-store">${esc(s.store_name)}</div>`);
  if (s.show_name) parts.push(`<div class="bp-name">${esc(product.name)}</div>`);
  parts.push(`<div class="bp-bc">${svg}</div>`);
  if (s.show_value) parts.push(`<div class="bp-val">${esc(product.barcode)}</div>`);
  if (s.show_price) {
    const price = formatPrice(product.price, s.currency_label);
    if (price) parts.push(`<div class="bp-price">${esc(price)}</div>`);
  }
  return `<div class="bp-label">${parts.join('')}</div>`;
}

/**
 * CSS for labels. `scope` prefixes every rule (used by the on-screen preview so it can't leak);
 * `print: true` adds the @page rules for the print document.
 */
export function buildCss(s, { scope = '', print = false } = {}) {
  const sc = scope ? `${scope} ` : '';
  const align = { left: 'flex-start', center: 'center', right: 'flex-end' }[s.text_align] || 'center';
  const page = PAGE_SIZES[s.page_size] || PAGE_SIZES.A4;
  let css = '';

  if (print) {
    css += s.mode === 'sheet'
      ? `@page { size: ${page.w}mm ${page.h}mm; margin: 0; }`
      : `@page { size: ${s.label_width_mm}mm ${s.label_height_mm}mm; margin: 0; }`;
    css += 'html, body { margin: 0; padding: 0; background: #fff; }';
    css += '* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }';
  }

  css += `${sc}.bp-label, ${sc}.bp-label * { box-sizing: border-box; margin: 0; padding: 0; }`;
  css += `${sc}.bp-label { width: ${s.label_width_mm}mm; height: ${s.label_height_mm}mm; padding: ${s.padding_mm}mm; `
    + `display: flex; flex-direction: column; align-items: ${align}; justify-content: center; gap: 0.4mm; `
    + `text-align: ${s.text_align}; overflow: hidden; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; }`;
  css += `${sc}.bp-store { font-size: ${s.store_font_size_pt}pt; font-weight: 700; line-height: 1.1; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`;
  css += `${sc}.bp-name { font-size: ${s.name_font_size_pt}pt; line-height: 1.15; max-width: 100%; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: ${s.name_max_lines}; overflow: hidden; word-break: break-word; }`;
  css += `${sc}.bp-bc { width: ${s.barcode_width_pct}%; height: ${s.barcode_height_mm}mm; flex: none; }`;
  css += `${sc}.bp-bc svg { display: block; width: 100%; height: 100%; shape-rendering: crispEdges; }`;
  css += `${sc}.bp-val { font-size: ${s.value_font_size_pt}pt; font-family: 'Courier New', monospace; line-height: 1.1; max-width: 100%; white-space: nowrap; overflow: hidden; }`;
  css += `${sc}.bp-price { font-size: ${s.price_font_size_pt}pt; font-weight: 800; line-height: 1.1; white-space: nowrap; }`;

  if (print) {
    if (s.mode === 'sheet') {
      css += `.bp-page { box-sizing: border-box; width: ${page.w}mm; height: ${page.h}mm; padding: ${s.margin_top_mm}mm 0 0 ${s.margin_left_mm}mm; `
        + `display: grid; grid-template-columns: repeat(${s.columns}, ${s.label_width_mm}mm); grid-auto-rows: ${s.label_height_mm}mm; `
        + `column-gap: ${s.gap_x_mm}mm; row-gap: ${s.gap_y_mm}mm; align-content: start; justify-content: start; `
        + 'overflow: hidden; break-after: page; page-break-after: always; }';
      css += '.bp-page:last-child { break-after: auto; page-break-after: auto; }';
    } else {
      css += '.bp-label { break-after: page; page-break-after: always; }';
      css += '.bp-label:last-child { break-after: auto; page-break-after: auto; }';
    }
  }
  return css;
}

/** Full HTML document for printing. `labels` = array of label HTML strings (one per physical label). */
export function buildPrintDocument(labels, s) {
  const body = s.mode === 'sheet'
    ? chunk(labels, s.columns * s.rows).map((pg) => `<div class="bp-page">${pg.join('')}</div>`).join('')
    : labels.join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Barcode labels</title>`
    + `<style>${buildCss(s, { print: true })}</style></head><body>${body}</body></html>`;
}
import JsBarcode from 'jsbarcode';
import { FORMATS, buildLabelHtml, buildPrintDocument, normalizeSettings } from './barcodeLayout';

const SVG_NS = 'http://www.w3.org/2000/svg';
const QUIET_MODULES = 10; // blank space left/right of the bars, in bar widths (standard quiet zone)

function encode(value, format) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  // 1 px per bar module: the SVG is stretched to the real size by CSS, so bars stay in proportion.
  JsBarcode(svg, value, {
    format, width: 1, height: 50, displayValue: false,
    margin: 0, marginLeft: QUIET_MODULES, marginRight: QUIET_MODULES,
  });
  const w = parseFloat(svg.getAttribute('width')) || 0;
  const h = parseFloat(svg.getAttribute('height')) || 50;
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  return { svg: svg.outerHTML, modules: w };
}

/** Returns { svg, modules, fallback } — or null when the value can't be encoded at all. */
export function renderBarcode(value, format) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  try {
    return { ...encode(text, format), fallback: false };
  } catch (e) { /* JsBarcode throws when the value doesn't fit the format */ }
  if (format !== 'CODE128') {
    try {
      return { ...encode(text, 'CODE128'), fallback: true };
    } catch (e) { /* not encodable in Code 128 either */ }
  }
  return null;
}

export const sampleProduct = (format) => ({
  id: 'sample',
  name: 'Sample product name 128GB',
  barcode: FORMATS.find((f) => f.value === format)?.sample || 'ABC123',
  price: 12500,
  stock_quantity: 1,
});

// Prints an HTML document through a hidden iframe (no popup blockers).
function printHtml(html) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  let removed = false;
  const remove = () => { if (!removed) { removed = true; iframe.remove(); } };

  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) { remove(); return; }
    win.onafterprint = () => setTimeout(remove, 300);
    setTimeout(() => { win.focus(); win.print(); }, 200);
  };
  iframe.srcdoc = html;
  document.body.appendChild(iframe);
  setTimeout(remove, 5 * 60 * 1000); // safety net
}

const defaultCopies = (product, s) =>
  s.copies_mode === 'stock'
    ? Math.min(500, Math.max(1, Math.floor(Number(product.stock_quantity) || 0)))
    : s.default_copies;

/**
 * Prints labels for the given products using the saved settings.
 * Returns { printed, skipped[], fallback[] } so the caller can tell the user what happened.
 *  - skipped:  no barcode, or a barcode that can't be encoded
 *  - fallback: printed as Code 128 because the value doesn't fit the chosen format
 */
export function printLabels(products, rawSettings, { copiesFor } = {}) {
  const s = normalizeSettings(rawSettings);
  const labels = [];
  const skipped = [];
  const fallback = [];

  for (const p of products) {
    const bc = renderBarcode(p.barcode, s.format);
    if (!bc) { skipped.push(p); continue; }
    if (bc.fallback) fallback.push(p);
    const html = buildLabelHtml(p, s, bc.svg);
    const copies = copiesFor ? copiesFor(p, s) : defaultCopies(p, s);
    for (let i = 0; i < copies; i += 1) labels.push(html);
  }

  if (labels.length > 0) printHtml(buildPrintDocument(labels, s));
  return { printed: labels.length, skipped, fallback };
}

/** Prints sample labels with the CURRENT (even unsaved) settings: a full page of them in sheet mode. */
export function printTest(rawSettings) {
  const s = normalizeSettings(rawSettings);
  const count = s.mode === 'sheet' ? s.columns * s.rows : 2;
  return printLabels([sampleProduct(s.format)], s, { copiesFor: () => count });
}
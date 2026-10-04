import { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import { Barcode, Printer, Save, RotateCcw, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  DEFAULT_SETTINGS, FORMATS, PAGE_SIZES, validateSettings, normalizeSettings,
  estimateContentHeightMm, barWidthMm, buildCss, buildLabelHtml,
} from '../../utils/barcodeLayout';
import { renderBarcode, printTest, sampleProduct } from '../../utils/barcodePrint';

const MM = 3.7795; // CSS pixels per millimetre

const inputCls = (err) =>
  `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 focus:border-red-500 focus:ring-red-500 ${
    err ? 'border-red-400' : 'border-gray-300'
  }`;

function Field({ label, hint, error, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p>
        : hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

function NumberField({ label, unit, k, s, set, errors, hint }) {
  return (
    <Field label={unit ? `${label} (${unit})` : label} error={errors[k]} hint={hint}>
      <input
        type="number" step="any" value={s[k]}
        onChange={(e) => set(k, e.target.value === '' ? '' : Number(e.target.value))}
        className={inputCls(errors[k])}
      />
    </Field>
  );
}

function TextField({ label, k, s, set, errors, hint, placeholder }) {
  return (
    <Field label={label} error={errors[k]} hint={hint}>
      <input type="text" value={s[k]} placeholder={placeholder} onChange={(e) => set(k, e.target.value)} className={inputCls(errors[k])} />
    </Field>
  );
}

function SelectField({ label, k, s, set, options, hint }) {
  return (
    <Field label={label} hint={hint}>
      <select value={s[k]} onChange={(e) => set(k, e.target.value)} className={inputCls(false)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

function Toggle({ label, k, s, set }) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none self-end pb-2">
      <input
        type="checkbox" checked={!!s[k]} onChange={(e) => set(k, e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
      />
      {label}
    </label>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest border-b border-gray-100 pb-3 mb-5">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">{children}</div>
    </div>
  );
}

function SheetThumb({ s }) {
  const page = PAGE_SIZES[s.page_size];
  const k = 0.7; // px per mm
  const cells = [];
  for (let r = 0; r < s.rows; r += 1) {
    for (let c = 0; c < s.columns; c += 1) {
      cells.push({
        key: `${r}-${c}`,
        left: (s.margin_left_mm + c * (s.label_width_mm + s.gap_x_mm)) * k,
        top: (s.margin_top_mm + r * (s.label_height_mm + s.gap_y_mm)) * k,
      });
    }
  }
  return (
    <div>
      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
        {s.page_size} page — {s.columns * s.rows} labels per sheet
      </div>
      <div className="relative bg-white ring-1 ring-gray-300 shadow-sm" style={{ width: page.w * k, height: page.h * k }}>
        {cells.map((c) => (
          <div
            key={c.key}
            className="absolute border border-red-300 bg-red-50/50"
            style={{ left: c.left, top: c.top, width: s.label_width_mm * k, height: s.label_height_mm * k }}
          />
        ))}
      </div>
    </div>
  );
}

export default function BarcodeSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get('/settings/barcode-print')
      .then((res) => {
        if (cancelled) return;
        const data = { ...DEFAULT_SETTINGS, ...res.data.data };
        setSettings(data);
        setSaved(data);
      })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.message || 'Failed to load settings.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const set = (k, v) => { setSuccess(''); setSettings((p) => ({ ...p, [k]: v })); };

  const errors = useMemo(() => validateSettings(settings), [settings]);
  const hasErrors = Object.keys(errors).length > 0;
  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);
  const eff = useMemo(() => normalizeSettings(settings), [settings]);

  // Live preview (always built from sanitised values so typing never breaks it)
  const sample = useMemo(() => sampleProduct(eff.format), [eff.format]);
  const preview = useMemo(() => {
    const bc = renderBarcode(sample.barcode, eff.format);
    return bc ? { bc, html: buildLabelHtml(sample, eff, bc.svg) } : null;
  }, [eff, sample]);
  const previewCss = useMemo(() => buildCss(eff, { scope: '.bp-preview' }), [eff]);

  const barMm = preview ? barWidthMm(eff, preview.bc.modules) : 0;
  const barLevel = barMm >= 0.25 ? 'good' : barMm >= 0.19 ? 'ok' : 'poor';
  const innerH = eff.label_height_mm - 2 * eff.padding_mm;
  const contentH = estimateContentHeightMm(eff);
  const overflow = contentH > innerH;
  const scale = Math.min(3, 340 / (eff.label_width_mm * MM));

  const handleSave = async () => {
    if (hasErrors) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.put('/settings/barcode-print', settings);
      const data = { ...DEFAULT_SETTINGS, ...res.data.data };
      setSettings(data);
      setSaved(data);
      setSuccess('Settings saved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm('Reset all fields to the default values? (Nothing is saved until you press Save.)')) return;
    setSuccess('');
    setSettings({ ...DEFAULT_SETTINGS });
  };

  if (loading) return <div className="p-6 flex justify-center"><RefreshCw className="animate-spin text-red-600" /></div>;

  const s = settings;

  return (
    <div className="space-y-6 pb-12 text-start">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Barcode className="text-red-600" /> Barcode Printing Settings
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            <RotateCcw size={16} /> Reset to defaults
          </button>
          <button
            onClick={() => printTest(settings)}
            className="flex items-center gap-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            <Printer size={16} /> Test print
          </button>
          <button
            onClick={handleSave} disabled={saving || hasErrors || !dirty}
            className="flex items-center gap-2 text-sm font-bold text-white bg-red-600 px-5 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <Save size={16} /> {saving ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 flex items-start gap-2">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" /><span>{success}</span>
        </div>
      )}
      {errors.layout && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" /><span>{errors.layout}</span>
        </div>
      )}
      {dirty && !success && <p className="text-xs font-bold text-amber-600">You have unsaved changes.</p>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Section title="Paper & label">
            <SelectField
              label="Printer type" k="mode" s={s} set={set}
              options={[
                { value: 'roll', label: 'Label roll (one label per page)' },
                { value: 'sheet', label: 'Sticker sheet (grid on A4 / Letter)' },
              ]}
              hint={s.mode === 'roll'
                ? 'Thermal / label printers: the page is as big as one label.'
                : 'Office printers with pre-cut sticker sheets.'}
            />
            <NumberField label="Label width" unit="mm" k="label_width_mm" s={s} set={set} errors={errors} />
            <NumberField label="Label height" unit="mm" k="label_height_mm" s={s} set={set} errors={errors} />
            <NumberField label="Inner padding" unit="mm" k="padding_mm" s={s} set={set} errors={errors} />
            {s.mode === 'sheet' && (
              <>
                <SelectField
                  label="Page size" k="page_size" s={s} set={set}
                  options={[{ value: 'A4', label: 'A4 (210 × 297 mm)' }, { value: 'Letter', label: 'Letter (215.9 × 279.4 mm)' }]}
                />
                <NumberField label="Columns" k="columns" s={s} set={set} errors={errors} />
                <NumberField label="Rows" k="rows" s={s} set={set} errors={errors} />
                <NumberField label="Top margin" unit="mm" k="margin_top_mm" s={s} set={set} errors={errors} />
                <NumberField label="Left margin" unit="mm" k="margin_left_mm" s={s} set={set} errors={errors} />
                <NumberField label="Horizontal gap" unit="mm" k="gap_x_mm" s={s} set={set} errors={errors} />
                <NumberField label="Vertical gap" unit="mm" k="gap_y_mm" s={s} set={set} errors={errors} />
              </>
            )}
          </Section>

          <Section title="Barcode">
            <SelectField
              label="Format" k="format" s={s} set={set}
              options={FORMATS.map((f) => ({ value: f.value, label: f.label }))}
              hint="A product whose barcode doesn't fit this format is printed as Code 128."
            />
            <NumberField label="Barcode width" unit="% of label" k="barcode_width_pct" s={s} set={set} errors={errors} />
            <NumberField label="Barcode height" unit="mm" k="barcode_height_mm" s={s} set={set} errors={errors} />
            <Toggle label="Print the number under the bars" k="show_value" s={s} set={set} />
            <NumberField label="Number font size" unit="pt" k="value_font_size_pt" s={s} set={set} errors={errors} />
          </Section>

          <Section title="Text on the label">
            <Toggle label="Show product name" k="show_name" s={s} set={set} />
            <NumberField label="Name font size" unit="pt" k="name_font_size_pt" s={s} set={set} errors={errors} />
            <NumberField label="Name max lines" k="name_max_lines" s={s} set={set} errors={errors} />

            <Toggle label="Show price" k="show_price" s={s} set={set} />
            <NumberField label="Price font size" unit="pt" k="price_font_size_pt" s={s} set={set} errors={errors} />
            <TextField label="Currency text" k="currency_label" s={s} set={set} errors={errors} placeholder="DA" hint="Printed after the price. Leave empty for none." />

            <Toggle label="Show store name" k="show_store_name" s={s} set={set} />
            <TextField label="Store name" k="store_name" s={s} set={set} errors={errors} placeholder="My Shop" />
            <NumberField label="Store font size" unit="pt" k="store_font_size_pt" s={s} set={set} errors={errors} />

            <SelectField
              label="Alignment" k="text_align" s={s} set={set}
              options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]}
            />
          </Section>

          <Section title="Copies">
            <SelectField
              label="Labels per product" k="copies_mode" s={s} set={set}
              options={[
                { value: 'fixed', label: 'A fixed number' },
                { value: 'stock', label: 'One per unit in stock (max 500)' },
              ]}
            />
            <NumberField
              label="Fixed number of labels" k="default_copies" s={s} set={set} errors={errors}
              hint={s.copies_mode === 'stock' ? 'Not used while "one per unit in stock" is selected.' : undefined}
            />
          </Section>
        </div>

        {/* Preview */}
        <div className="space-y-4 xl:sticky xl:top-4 self-start">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest border-b border-gray-100 pb-3">Live preview</h2>

            <div className="flex justify-center bg-gray-100 rounded-xl p-4 overflow-auto">
              {preview ? (
                <div
                  className="bg-white shadow ring-1 ring-gray-300 overflow-hidden shrink-0"
                  style={{ width: eff.label_width_mm * MM * scale, height: eff.label_height_mm * MM * scale }}
                >
                  <div
                    className="bp-preview"
                    style={{
                      width: `${eff.label_width_mm}mm`, height: `${eff.label_height_mm}mm`,
                      transform: `scale(${scale})`, transformOrigin: 'top left',
                    }}
                  >
                    <style>{previewCss}</style>
                    <div dangerouslySetInnerHTML={{ __html: preview.html }} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-600">Could not draw the sample barcode.</p>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Sample data: “{sample.name}” — {sample.barcode}. The preview is enlarged; real size is {eff.label_width_mm} × {eff.label_height_mm} mm.
            </p>

            {preview && (
              <div
                className={`rounded-lg border p-3 text-xs font-medium ${
                  barLevel === 'good' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : barLevel === 'ok' ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                Thinnest bar ≈ <b>{barMm.toFixed(2)} mm</b>.{' '}
                {barLevel === 'good' && 'Easy to scan.'}
                {barLevel === 'ok' && 'Readable by most scanners; cheap ones may struggle. Widen the barcode if you can.'}
                {barLevel === 'poor' && 'Too thin for reliable scanning. Widen the barcode, use a bigger label, or shorter codes.'}
              </div>
            )}

            {overflow && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800 flex gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>
                  The content needs about {contentH.toFixed(1)} mm but only {innerH.toFixed(1)} mm is available: part of the label
                  may be cut off. Reduce font sizes / barcode height, or use a taller label.
                </span>
              </div>
            )}
          </div>

          {s.mode === 'sheet' && !errors.layout && !errors.columns && !errors.rows && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 overflow-auto">
              <SheetThumb s={eff} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
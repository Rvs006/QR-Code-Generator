import { X, Trash2, Info } from 'lucide-react';
import type { QRConfig, GeneratedQR } from '@/lib/qr-renderer';

interface RowData {
  mainFolder: string;
  subFolder: string;
  assetTag: string;
  payload: string;
  valid: boolean;
  warning: string | null;
}

interface Colors {
  bg: string;
  bg1: string;
  bg2: string;
  bg3: string;
  bdr: string;
  bdrA: string;
  tx: string;
  tx2: string;
  tx3: string;
}

export interface QRConfigPanelProps {
  showConfig: boolean;
  setShowConfig: (v: boolean) => void;
  config: QRConfig & { name?: string; desc?: string };
  handleUpdateConfig: (key: string, value: any) => void;
  activePreset: string;
  handleSelectPreset: (key: string) => void;
  customPresets: Record<string, QRConfig>;
  handleDeleteCustomPreset: (name: string) => void;
  handleSaveCustomPreset: (name: string) => void;
  newPresetName: string;
  setNewPresetName: (v: string) => void;
  computedModSize: number;
  generatedImages: GeneratedQR[];
  previewDataURL: string;
  rows: RowData[];
  isMobile: boolean;
  d: boolean;
  c: Colors;
  PRESETS: Record<string, QRConfig & { name: string; desc: string }>;
  EC_LABELS: Record<string, string>;
  PAPER_SIZES: Record<string, { name: string; w: number; h: number }>;
}

export default function QRConfigPanel({
  showConfig,
  setShowConfig,
  config,
  handleUpdateConfig,
  activePreset,
  handleSelectPreset,
  customPresets,
  handleDeleteCustomPreset,
  handleSaveCustomPreset,
  newPresetName,
  setNewPresetName,
  computedModSize,
  generatedImages,
  previewDataURL,
  rows,
  isMobile,
  d,
  c,
  PRESETS,
  EC_LABELS,
  PAPER_SIZES,
}: QRConfigPanelProps) {
  if (!showConfig) return null;

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label="QR Configuration">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: d ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)' }} onClick={() => setShowConfig(false)} />
      <div className={`absolute right-0 top-0 h-full ${isMobile ? 'w-full' : 'w-[380px]'} overflow-y-auto`} style={{ background: c.bg1, borderLeft: isMobile ? 'none' : `1px solid ${c.bdr}` }}>
        <div className="sticky top-0 px-5 py-4 flex items-center justify-between z-10" style={{ background: c.bg1, borderBottom: `1px solid ${c.bdr}` }}>
          <h2 className="text-[16px] font-bold">QR Configuration</h2>
          <button data-testid="button-close-config" aria-label="Close settings" className="p-1.5 rounded-lg" style={{ color: c.tx3 }} onClick={() => setShowConfig(false)}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="rounded-xl px-4 py-3 flex items-start gap-2.5" style={{ background: d ? 'rgba(0,176,240,0.08)' : 'rgba(42,90,158,0.05)', border: `1px solid ${d ? 'rgba(0,176,240,0.15)' : 'rgba(42,90,158,0.1)'}` }}>
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#2A5A9E]" />
            <div className="text-[12px] leading-relaxed" style={{ color: c.tx2 }}>
              <strong style={{ color: c.tx }}>What is this?</strong> These settings control how your QR code labels look and print. Start with a preset below, then fine-tune individual settings if needed. Changes apply to all labels when you generate.
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: c.tx3 }}>Preset</label>
            <div className="flex gap-2">
              {Object.entries(PRESETS).map(([key, preset]) => (
                <button key={key} className="flex-1 px-3 py-2.5 rounded-lg text-left transition-all" style={activePreset === key ? { background: 'rgba(42,90,158,0.15)', border: '1px solid #2A5A9E' } : { background: c.bg2, border: `1px solid ${c.bdr}` }} onClick={() => handleSelectPreset(key)}>
                  <div className="text-[12px] font-semibold" style={{ color: activePreset === key ? '#00B0F0' : c.tx2 }}>{preset.name}</div>
                  <div className="text-[10px] mt-0.5 leading-snug" style={{ color: c.tx3 }}>{preset.desc.split(' — ')[1]}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider pb-2 mb-3" style={{ color: c.tx3, borderBottom: `1px solid ${c.bdr}` }}>QR Code</div>
            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-semibold flex items-center gap-1.5 mb-0.5" style={{ color: c.tx2 }}>Error Correction</label>
                <div className="text-[11px] mb-1.5 leading-snug" style={{ color: c.tx3 }}>Higher levels make the QR code scannable even if partially damaged, but increase QR size.</div>
                <select data-testid="select-ec" className="w-full rounded-lg px-3 py-2 text-[13px] outline-none" style={{ background: c.bg, border: `1px solid ${c.bdr}`, color: c.tx }} value={config.ec} onChange={(e) => handleUpdateConfig('ec', e.target.value)}>
                  {Object.entries(EC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-semibold mb-0.5 block" style={{ color: c.tx2 }}>Module Size</label>
                  <div className="text-[11px] mb-1.5 leading-snug" style={{ color: c.tx3 }}>Size of each QR square, auto-calculated to fit your label.</div>
                  <div className="w-full rounded-lg px-3 py-2 text-[13px]" style={{ background: c.bg, border: `1px solid ${c.bdr}`, color: c.tx3 }}>Auto: {computedModSize}px</div>
                </div>
                <div>
                  <label className="text-[12px] font-semibold mb-0.5 block" style={{ color: c.tx2 }}>Quiet Zone</label>
                  <div className="text-[11px] mb-1.5 leading-snug" style={{ color: c.tx3 }}>The empty white border around the QR code. Scanners need this space to find where the code starts. The number is how many "squares" wide the border is. Default is 4 — increase if labels are on dark backgrounds, decrease to save space on small labels.</div>
                  <input type="number" className="w-full rounded-lg px-3 py-2 text-[13px] outline-none" style={{ background: c.bg, border: `1px solid ${c.bdr}`, color: c.tx }} value={config.quiet} onChange={(e) => handleUpdateConfig('quiet', parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ background: c.bg2 }}>
                <div>
                  <span className="text-[13px] block" style={{ color: c.tx2 }}>Pixel-perfect mode</span>
                  <span className="text-[11px] leading-snug" style={{ color: c.tx3 }}>Aligns QR pixels to exact screen pixels for sharper output.</span>
                </div>
                <button data-testid="button-pixel-perfect" className="w-10 h-[22px] rounded-full relative transition-colors flex-shrink-0 ml-3" style={{ background: config.pixelPerfect ? '#4CAF50' : c.bg3, border: config.pixelPerfect ? 'none' : `1px solid ${c.bdr}` }} onClick={() => handleUpdateConfig('pixelPerfect', !config.pixelPerfect)}>
                  <div className="w-4 h-4 bg-white rounded-full absolute top-[3px] transition-transform" style={{ left: config.pixelPerfect ? '22px' : '3px' }} />
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider pb-2 mb-3" style={{ color: c.tx3, borderBottom: `1px solid ${c.bdr}` }}>Label & Print</div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[['labelW', 'Width (mm)', 'Physical width of the printed label.'], ['labelH', 'Height (mm)', 'Physical height of the printed label.']].map(([key, label, hint]) => (
                  <div key={key}>
                    <label className="text-[12px] font-semibold mb-0.5 block" style={{ color: c.tx2 }}>{label}</label>
                    <div className="text-[11px] mb-1.5 leading-snug" style={{ color: c.tx3 }}>{hint}</div>
                    <input type="number" className="w-full rounded-lg px-3 py-2 text-[13px] outline-none" style={{ background: c.bg, border: `1px solid ${c.bdr}`, color: c.tx }} value={(config as any)[key]} onChange={(e) => handleUpdateConfig(key, parseInt(e.target.value) || 0)} />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-[12px] font-semibold mb-0.5 block" style={{ color: c.tx2 }}>Print DPI</label>
                <div className="text-[11px] mb-1.5 leading-snug" style={{ color: c.tx3 }}>Dots per inch — higher means sharper but larger file size.</div>
                <select className="w-full rounded-lg px-3 py-2 text-[13px] outline-none" style={{ background: c.bg, border: `1px solid ${c.bdr}`, color: c.tx }} value={config.dpi} onChange={(e) => handleUpdateConfig('dpi', parseInt(e.target.value))}>
                  <option value={150}>150 DPI (Draft)</option><option value={300}>300 DPI (Standard)</option><option value={600}>600 DPI (High Quality)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[['fontTag', 'Tag Font (pt)', 'Font size of the asset tag text on the label.'], ['fontPath', 'Path Font (pt)', 'Font size of the folder path text below the tag.']].map(([key, label, hint]) => (
                  <div key={key}>
                    <label className="text-[12px] font-semibold mb-0.5 block" style={{ color: c.tx2 }}>{label}</label>
                    <div className="text-[11px] mb-1.5 leading-snug" style={{ color: c.tx3 }}>{hint}</div>
                    <input type="number" className="w-full rounded-lg px-3 py-2 text-[13px] outline-none" style={{ background: c.bg, border: `1px solid ${c.bdr}`, color: c.tx }} value={(config as any)[key]} onChange={(e) => handleUpdateConfig(key, parseInt(e.target.value) || 0)} />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-[12px] font-semibold mb-0.5 block" style={{ color: c.tx2 }}>Image Format</label>
                <div className="text-[11px] mb-1.5 leading-snug" style={{ color: c.tx3 }}>PNG for raster output, SVG for scalable vector output.</div>
                <select className="w-full rounded-lg px-3 py-2 text-[13px] outline-none" style={{ background: c.bg, border: `1px solid ${c.bdr}`, color: c.tx }} value={config.format} onChange={(e) => handleUpdateConfig('format', e.target.value)}>
                  <option value="png">PNG</option><option value="svg">SVG</option>
                </select>
              </div>
              <div>
                <label className="text-[12px] font-semibold mb-0.5 block" style={{ color: c.tx2 }}>Paper Size</label>
                <div className="text-[11px] mb-1.5 leading-snug" style={{ color: c.tx3 }}>Page size used for PDF export and printing label sheets.</div>
                <select data-testid="select-paper-size" className="w-full rounded-lg px-3 py-2 text-[13px] outline-none" style={{ background: c.bg, border: `1px solid ${c.bdr}`, color: c.tx }} value={config.paperSize} onChange={(e) => handleUpdateConfig('paperSize', e.target.value)}>
                  {Object.entries(PAPER_SIZES).map(([key, ps]) => <option key={key} value={key}>{ps.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider pb-2 mb-3" style={{ color: c.tx3, borderBottom: `1px solid ${c.bdr}` }}>Live Preview — Scaled Label</div>
            <div className="rounded-xl p-5 flex flex-col items-center" style={{ background: c.bg, border: `1px solid ${c.bdr}` }}>
              <div className="relative flex flex-col items-center justify-center bg-white rounded transition-all duration-300" style={{ width: `${Math.min(config.labelW * 2.8, 280)}px`, height: `${Math.min(config.labelH * 2.8, 200)}px`, border: '1.5px dashed #ccc' }}>
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1">
                  <div className="h-px flex-1" style={{ background: '#bbb', minWidth: '16px' }} />
                  <span className="text-[9px] font-semibold px-1" style={{ color: c.tx3, fontFamily: "'JetBrains Mono', monospace" }}>{config.labelW}mm</span>
                  <div className="h-px flex-1" style={{ background: '#bbb', minWidth: '16px' }} />
                </div>
                <div className="absolute -right-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5">
                  <div className="w-px flex-1" style={{ background: '#bbb', minHeight: '8px' }} />
                  <span className="text-[9px] font-semibold" style={{ color: c.tx3, fontFamily: "'JetBrains Mono', monospace", writingMode: 'vertical-lr' as any }}>{config.labelH}mm</span>
                  <div className="w-px flex-1" style={{ background: '#bbb', minHeight: '8px' }} />
                </div>
                <img src={generatedImages[0]?.dataURL || previewDataURL} alt="Preview" className="object-contain" style={{ maxWidth: '80%', maxHeight: '60%', imageRendering: 'pixelated' }} />
                <div className="text-[10px] font-bold text-[#111] mt-1 text-center" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: `${Math.min(config.fontTag, 12) * 0.85}px` }}>{rows.length > 0 ? rows[0].assetTag : 'FCU-199001'}</div>
                <div className="text-[8px] text-[#888] text-center" style={{ fontSize: `${Math.min(config.fontPath, 9) * 0.8}px` }}>{rows.length > 0 ? [rows[0].mainFolder, rows[0].subFolder].filter(Boolean).join(' / ') : '334OS / EMS'}</div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-4 text-[10px]" style={{ color: c.tx3, fontFamily: "'JetBrains Mono', monospace" }}>
                <span>{config.labelW}×{config.labelH}mm</span>
                <span>·</span>
                <span>{config.dpi} DPI</span>
                <span>·</span>
                <span>{EC_LABELS[config.ec]}</span>
                <span>·</span>
                <span>Auto {computedModSize}px modules</span>
              </div>
              <div className="text-[9px] mt-1.5 text-center" style={{ color: c.tx3 }}>{config.pixelPerfect ? '✓ Pixel-perfect' : '✗ Pixel-perfect off'} · Quiet zone: {config.quiet} modules</div>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider pb-2 mb-3" style={{ color: c.tx3, borderBottom: `1px solid ${c.bdr}` }}>My Presets</div>
            {Object.keys(customPresets).length > 0 ? (
              <div className="space-y-1.5 mb-3">
                {Object.keys(customPresets).map(name => (
                  <div key={name} className="flex items-center gap-2 rounded-lg px-3 py-2 transition-all group" style={activePreset === name ? { background: 'rgba(42,90,158,0.15)', border: '1px solid #2A5A9E' } : { background: c.bg2, border: `1px solid ${c.bdr}` }}>
                    <button data-testid={`button-load-preset-${name}`} className="flex-1 text-left" onClick={() => { handleSelectPreset(name); }}>
                      <span className="text-[12px] font-semibold" style={{ color: activePreset === name ? '#00B0F0' : c.tx2 }}>{name}</span>
                    </button>
                    <button data-testid={`button-delete-preset-settings-${name}`} className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: c.tx3 }} onClick={() => handleDeleteCustomPreset(name)}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] mb-3" style={{ color: c.tx3 }}>No saved presets yet. Save your current settings below.</p>
            )}
            <div className="flex gap-2">
              <input data-testid="input-preset-name" type="text" className="flex-1 rounded-lg px-3 py-2 text-[13px] outline-none" style={{ background: c.bg, border: `1px solid ${c.bdr}`, color: c.tx }} placeholder="Preset name..." value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCustomPreset(newPresetName); }} />
              <button data-testid="button-save-preset" className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-40" style={{ background: '#2A5A9E', color: 'white' }} disabled={!newPresetName.trim()} onClick={() => handleSaveCustomPreset(newPresetName)}>Save</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
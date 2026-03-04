import { FileSpreadsheet, HelpCircle, Check, X, AlertCircle } from 'lucide-react';
import type { RawFileData } from '@/lib/file-parser';

interface ColumnMapperProps {
  showColumnMapper: boolean;
  setShowColumnMapper: (v: boolean) => void;
  rawFileData: RawFileData;
  columnMapping: Record<string, number | undefined>;
  setColumnMapping: React.Dispatch<React.SetStateAction<Record<string, number | undefined>>>;
  handleApplyMapping: () => void;
  fileError: string | null;
  isMobile: boolean;
  d: boolean;
  c: { bg: string; bg1: string; bg2: string; bg3: string; bdr: string; tx: string; tx2: string; tx3: string };
}

export default function ColumnMapper({ showColumnMapper, setShowColumnMapper, rawFileData, columnMapping, setColumnMapping, handleApplyMapping, fileError, isMobile, d, c }: ColumnMapperProps) {
  if (!showColumnMapper || !rawFileData) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Map Your Columns">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: d ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)' }} onClick={() => setShowColumnMapper(false)} />
      <div className={`relative rounded-2xl ${isMobile ? 'w-[95%] p-4 max-h-[90vh] overflow-y-auto' : 'w-[90%] max-w-xl p-6 max-h-[85vh] overflow-y-auto'} shadow-2xl`} style={{ background: c.bg1, border: `1px solid ${c.bdr}` }}>
        <button className="absolute top-4 right-4 p-1 z-10" style={{ color: c.tx3 }} onClick={() => setShowColumnMapper(false)} aria-label="Close column mapper"><X className="w-4 h-4" /></button>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(42,90,158,0.15)' }}>
            <FileSpreadsheet className="w-5 h-5 text-[#2A5A9E]" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold" style={{ color: c.tx }}>Map Your Columns</h3>
            <p className="text-[12px]" style={{ color: c.tx3 }}>We found {rawFileData.headers.length} columns in your file. Tell us what each one means.</p>
          </div>
        </div>

        <div className="rounded-lg px-3 py-2.5 mb-4 flex items-start gap-2" style={{ background: d ? 'rgba(0,176,240,0.08)' : 'rgba(42,90,158,0.05)', border: `1px solid ${d ? 'rgba(0,176,240,0.2)' : 'rgba(42,90,158,0.12)'}` }}>
          <HelpCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#2A5A9E]" />
          <div className="text-[12px] leading-relaxed" style={{ color: c.tx2 }}>
            Use the dropdowns to match each field to the correct column from your spreadsheet. Only <strong>Asset Tag</strong> is required — the others are optional. The preview below each dropdown shows what data will be used.
          </div>
        </div>

        <div className="space-y-3 mb-4">
          {([
            { key: 'assetTag', label: 'Asset Tag', required: true, desc: 'The unique name printed on each QR label', example: 'e.g. FCU-199001, AHU-200003' },
            { key: 'mainFolder', label: 'Main Folder', required: false, desc: 'Groups labels into project/building folders in the ZIP export', example: 'e.g. 334OS, Building-A' },
            { key: 'subFolder', label: 'Sub-Folder', required: false, desc: 'Second level of folder structure (system, floor, etc.)', example: 'e.g. EMS, Level-19, HVAC' },
            { key: 'payload', label: 'Payload', required: false, desc: 'Machine-readable data embedded in the QR code (JSON, URL, or text)', example: 'e.g. {"guid":"abc-123","site":"334OS"}' },
          ] as const).map(({ key, label, required, desc, example }) => {
            const selectedIdx = columnMapping[key];
            const previewVal = selectedIdx !== undefined && rawFileData.rawRows[0] ? String(rawFileData.rawRows[0][selectedIdx] || '') : null;
            return (
            <div key={key} className="rounded-lg p-3" style={{ background: c.bg2, border: `1px solid ${selectedIdx !== undefined ? 'rgba(42,90,158,0.3)' : c.bdr}` }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[13px] font-semibold" style={{ color: c.tx }}>{label}</span>
                {required && <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: 'rgba(229,57,53,0.1)', color: '#E53935' }}>Required</span>}
              </div>
              <div className="text-[11px] mb-2 leading-snug" style={{ color: c.tx3 }}>{desc} — <span style={{ fontStyle: 'italic' }}>{example}</span></div>
              <select
                data-testid={`select-map-${key}`}
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                style={{ background: c.bg, border: `1px solid ${c.bdr}`, color: c.tx }}
                value={selectedIdx !== undefined ? String(selectedIdx) : ''}
                onChange={(e) => setColumnMapping(prev => ({ ...prev, [key]: e.target.value !== '' ? parseInt(e.target.value) : undefined }))}
              >
                <option value="">— Not in my file —</option>
                {rawFileData.headers.map((h, i) => (
                  <option key={i} value={String(i)}>{h || `Column ${i + 1}`}</option>
                ))}
              </select>
              {previewVal && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-[#4CAF50] flex-shrink-0" />
                  <span className="text-[11px] truncate" style={{ color: '#4CAF50', fontFamily: "'JetBrains Mono', monospace" }}>{previewVal.substring(0, 60)}{previewVal.length > 60 ? '...' : ''}</span>
                </div>
              )}
            </div>
            );
          })}
        </div>

        {rawFileData.rawRows.length > 0 && (
          <details className="mb-4">
            <summary className="text-[11px] font-bold uppercase tracking-wider cursor-pointer select-none py-1" style={{ color: c.tx3 }}>Your file data (first row)</summary>
            <div className="rounded-lg p-3 mt-2 space-y-2.5" style={{ background: c.bg, border: `1px solid ${c.bdr}` }}>
              {rawFileData.headers.map((h, i) => {
                const isUsed = Object.values(columnMapping).includes(i);
                const val = String(rawFileData.rawRows[0]?.[i] || '—');
                return (
                <div key={i} className="rounded-lg p-2" style={{ background: isUsed ? (d ? 'rgba(76,175,80,0.06)' : 'rgba(76,175,80,0.04)') : c.bg2 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono flex-shrink-0" style={{ background: isUsed ? 'rgba(76,175,80,0.12)' : c.bg3, color: isUsed ? '#4CAF50' : c.tx3 }}>{i + 1}</span>
                    <span className="text-[12px] font-medium truncate" style={{ color: isUsed ? c.tx : c.tx3 }}>{h || `Column ${i + 1}`}</span>
                  </div>
                  <div className="text-[11px] break-all leading-relaxed pl-6" style={{ color: c.tx2, fontFamily: "'JetBrains Mono', monospace" }}>{val.substring(0, 120)}{val.length > 120 ? '...' : ''}</div>
                </div>
                );
              })}
            </div>
          </details>
        )}

        {fileError && (
          <div className="flex items-center gap-2 text-[12px] px-3 py-2 rounded-lg mb-3" style={{ background: 'rgba(229,57,53,0.1)', color: '#E53935' }}>
            <AlertCircle className="w-3.5 h-3.5" />{fileError}
          </div>
        )}
        <div className="flex gap-2">
          <button data-testid="button-apply-mapping" className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold bg-[#2A5A9E] text-white disabled:opacity-40" onClick={handleApplyMapping} disabled={columnMapping.assetTag === undefined}>Apply Mapping</button>
          <button className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-colors" style={{ background: c.bg2, color: c.tx2, border: `1px solid ${c.bdr}` }} onClick={() => setShowColumnMapper(false)}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

import { Type, Info, X } from 'lucide-react';

interface PayloadTemplateRowData {
  assetTag: string;
  mainFolder: string;
  subFolder: string;
  payload: string;
}

interface Colors {
  bg: string;
  bg1: string;
  bg2: string;
  bg3: string;
  bdr: string;
  tx: string;
  tx2: string;
  tx3: string;
}

interface PayloadTemplateModalProps {
  showPayloadTemplate: boolean;
  setShowPayloadTemplate: (v: boolean) => void;
  payloadTemplate: string;
  setPayloadTemplate: React.Dispatch<React.SetStateAction<string>>;
  templateOverwrite: boolean;
  setTemplateOverwrite: React.Dispatch<React.SetStateAction<boolean>>;
  handleApplyTemplate: () => void;
  rows: PayloadTemplateRowData[];
  d: boolean;
  c: Colors;
}

export default function PayloadTemplateModal({
  showPayloadTemplate,
  setShowPayloadTemplate,
  payloadTemplate,
  setPayloadTemplate,
  templateOverwrite,
  setTemplateOverwrite,
  handleApplyTemplate,
  rows,
  d,
  c,
}: PayloadTemplateModalProps) {
  if (!showPayloadTemplate) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center" role="dialog" aria-modal="true" aria-label="QR Data Template">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: d ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)' }} onClick={() => setShowPayloadTemplate(false)} />
      <div className="relative rounded-2xl max-w-lg w-[90%] p-6 shadow-2xl" style={{ background: c.bg1, border: `1px solid ${c.bdr}` }}>
        <button className="absolute top-4 right-4 p-1" style={{ color: c.tx3 }} onClick={() => setShowPayloadTemplate(false)} aria-label="Close template editor"><X className="w-4 h-4" /></button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,176,240,0.15)' }}>
            <Type className="w-5 h-5 text-[#00B0F0]" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold">QR Data Template</h3>
            <p className="text-[13px]" style={{ color: c.tx3 }}>Generate payloads from a template with variables</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5 rounded-lg px-3 py-2.5 mb-4" style={{ background: 'rgba(0,176,240,0.08)', border: '1px solid rgba(0,176,240,0.15)' }}>
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#00B0F0]" />
          <p className="text-[12px] leading-relaxed" style={{ color: c.tx2 }}>This controls what data is encoded inside each QR code. By default, QR codes contain just the asset tag. Use this template to build structured data (like JSON) that includes the asset tag, folder paths, or other fields. Click the variable buttons below to insert them into your template.</p>
        </div>
        <div className="mb-3">
          <label className="text-[12px] font-semibold block mb-1.5" style={{ color: c.tx2 }}>Template</label>
          <textarea
            data-testid="textarea-payload-template"
            className="w-full rounded-lg px-3 py-2.5 text-[13px] outline-none resize-none"
            style={{ background: c.bg, border: `1px solid ${c.bdr}`, color: '#00B0F0', fontFamily: "'JetBrains Mono', monospace", minHeight: '80px' }}
            value={payloadTemplate}
            onChange={(e) => setPayloadTemplate(e.target.value)}
            placeholder='{"guid":"{assetTag}","site":"{mainFolder}"}'
          />
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="text-[11px] font-medium" style={{ color: c.tx3 }}>Variables:</span>
          {['{assetTag}', '{mainFolder}', '{subFolder}'].map(v => (
            <button key={v} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,176,240,0.1)', color: '#00B0F0', border: '1px solid rgba(0,176,240,0.2)' }} onClick={() => setPayloadTemplate(prev => prev + v)}>{v}</button>
          ))}
        </div>
        {rows.length > 0 && (
          <div className="mb-3">
            <div className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: c.tx3 }}>Preview (row 1)</div>
            <pre className="rounded-lg p-3 text-[12px] text-[#00B0F0] whitespace-pre-wrap break-all" style={{ background: c.bg, border: `1px solid ${c.bdr}`, fontFamily: "'JetBrains Mono', monospace" }}>
              {payloadTemplate.replace(/\{assetTag\}/g, rows[0]?.assetTag || '').replace(/\{mainFolder\}/g, rows[0]?.mainFolder || '').replace(/\{subFolder\}/g, rows[0]?.subFolder || '')}
            </pre>
          </div>
        )}
        <div className="flex items-center justify-between rounded-lg px-3 py-2.5 mb-4" style={{ background: c.bg2 }}>
          <span className="text-[13px]" style={{ color: c.tx2 }}>Overwrite existing payloads</span>
          <button data-testid="button-template-overwrite" className="w-10 h-[22px] rounded-full relative transition-colors" style={{ background: templateOverwrite ? '#F5A623' : c.bg3, border: templateOverwrite ? 'none' : `1px solid ${c.bdr}` }} onClick={() => setTemplateOverwrite(p => !p)}>
            <div className="w-4 h-4 bg-white rounded-full absolute top-[3px] transition-transform" style={{ left: templateOverwrite ? '22px' : '3px' }} />
          </button>
        </div>
        <div className="flex gap-2">
          <button data-testid="button-apply-template" className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold bg-[#00B0F0] text-white" onClick={handleApplyTemplate}>Apply to {templateOverwrite ? 'all' : 'empty'} rows</button>
          <button className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-colors" style={{ background: c.bg2, color: c.tx2, border: `1px solid ${c.bdr}` }} onClick={() => setShowPayloadTemplate(false)}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
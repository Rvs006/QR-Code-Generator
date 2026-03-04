import { AlertTriangle, Search, X } from 'lucide-react';

interface DuplicateModalProps {
  pendingRows: { assetTag: string }[];
  duplicateGroups: Record<string, number>;
  dupeSearchQuery: string;
  setDupeSearchQuery: (q: string) => void;
  dupeHoverAction: string | null;
  setDupeHoverAction: (action: string | null) => void;
  handleDuplicateKeepAll: () => void;
  handleDuplicateKeepFirst: () => void;
  handleDuplicateKeepLast: () => void;
  handleDuplicateCancel: () => void;
  d: boolean;
  c: { bg: string; bg1: string; bg2: string; bg3: string; bdr: string; tx: string; tx2: string; tx3: string };
}

export default function DuplicateModal({
  pendingRows,
  duplicateGroups,
  dupeSearchQuery,
  setDupeSearchQuery,
  dupeHoverAction,
  setDupeHoverAction,
  handleDuplicateKeepAll,
  handleDuplicateKeepFirst,
  handleDuplicateKeepLast,
  handleDuplicateCancel,
  d,
  c,
}: DuplicateModalProps) {
  const totalRows = pendingRows.length;
  const dupeTagCount = Object.keys(duplicateGroups).length;
  const totalDupeRows = Object.values(duplicateGroups).reduce((s, c) => s + c, 0);
  const uniqueCount = totalRows - totalDupeRows + dupeTagCount;
  const removedIfDeduped = totalRows - uniqueCount;
  const filteredDupes = dupeSearchQuery
    ? Object.entries(duplicateGroups).filter(([tag]) => tag.toLowerCase().includes(dupeSearchQuery.toLowerCase()))
    : Object.entries(duplicateGroups);
  const getSeverity = (count: number) => count > 50 ? 'heavy' : count > 5 ? 'moderate' : 'mild';
  const severityStyles: Record<string, { bg: string; border: string; badge: string; badgeColor: string }> = {
    mild: { bg: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', badge: 'rgba(245,166,35,0.15)', badgeColor: '#F5A623' },
    moderate: { bg: 'rgba(255,152,0,0.1)', border: '1px solid rgba(255,152,0,0.3)', badge: 'rgba(255,152,0,0.2)', badgeColor: '#FF9800' },
    heavy: { bg: 'rgba(229,57,53,0.08)', border: '1px solid rgba(229,57,53,0.25)', badge: 'rgba(229,57,53,0.15)', badgeColor: '#E53935' },
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Duplicate asset tags">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: d ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)' }} onClick={handleDuplicateCancel} />
      <div className="relative rounded-2xl max-w-md w-[90%] p-6 shadow-2xl max-h-[90vh] overflow-y-auto" style={{ background: c.bg1, border: `1px solid ${c.bdr}` }}>
        <button aria-label="Close duplicate modal" className="absolute top-4 right-4 p-1" style={{ color: c.tx3 }} onClick={handleDuplicateCancel}><X className="w-4 h-4" /></button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,166,35,0.15)' }}>
            <AlertTriangle className="w-5 h-5 text-[#F5A623]" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold">Duplicate Asset Tags Found</h3>
            <p className="text-[13px]" style={{ color: c.tx3 }}>{dupeTagCount} tag{dupeTagCount > 1 ? 's' : ''} appear more than once</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[12px] mb-3 px-1" style={{ color: c.tx2 }}>
          <span><strong>{totalRows}</strong> total rows</span>
          <span style={{ color: c.tx3 }}>·</span>
          <span><strong>{uniqueCount}</strong> unique tags</span>
          <span style={{ color: c.tx3 }}>·</span>
          <span style={{ color: '#F5A623' }}><strong>{removedIfDeduped}</strong> would be removed</span>
        </div>
        {dupeTagCount > 5 && (
          <div className="mb-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: c.tx3 }} />
              <input data-testid="input-dupe-search" type="text" placeholder="Search duplicate tags..." className="w-full pl-8 pr-3 py-2 rounded-lg text-[12px] outline-none" style={{ background: c.bg, border: `1px solid ${c.bdr}`, color: c.tx }} value={dupeSearchQuery} onChange={(e) => setDupeSearchQuery(e.target.value)} />
            </div>
          </div>
        )}
        <div className="rounded-xl p-3 mb-4 max-h-[200px] overflow-y-auto space-y-2" style={{ background: c.bg, border: `1px solid ${c.bdr}` }}>
          {filteredDupes.map(([tag, count]) => {
            const sev = getSeverity(count);
            const ss = severityStyles[sev];
            return (
              <div key={tag} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: ss.bg, border: ss.border }}>
                <span className="text-[13px] font-semibold truncate mr-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{tag}</span>
                <span className="text-[12px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0" style={{ background: ss.badge, color: ss.badgeColor }}>×{count}</span>
              </div>
            );
          })}
          {filteredDupes.length === 0 && dupeSearchQuery && (
            <div className="text-center text-[12px] py-3" style={{ color: c.tx3 }}>No matching tags found</div>
          )}
        </div>
        <div className="rounded-lg px-3 py-2.5 mb-4 flex items-start gap-2" style={{ background: d ? 'rgba(245,166,35,0.06)' : 'rgba(245,166,35,0.04)', border: `1px solid rgba(245,166,35,0.15)` }}>
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#F5A623]" />
          <div className="text-[12px] leading-relaxed" style={{ color: c.tx2 }}>
            Your file contains rows with the same Asset Tag name. This can happen when one asset has multiple entries with different data. Choose how to handle them:
          </div>
        </div>
        {dupeHoverAction && (
          <div className="text-[11px] mb-2 px-1 font-medium" style={{ color: '#2A5A9E' }}>
            {dupeHoverAction === 'keepAll' && `Will import all ${totalRows} rows including duplicates`}
            {dupeHoverAction === 'keepFirst' && `Will remove ${removedIfDeduped} duplicate rows and keep ${uniqueCount} rows`}
            {dupeHoverAction === 'keepLast' && `Will remove ${removedIfDeduped} duplicate rows and keep ${uniqueCount} rows (last occurrence)`}
          </div>
        )}
        <div className="space-y-2 mb-4">
          <button data-testid="button-dupe-keep-all" className="w-full text-left rounded-lg px-4 py-3 transition-colors" style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)' }} onClick={handleDuplicateKeepAll} onMouseEnter={() => setDupeHoverAction('keepAll')} onMouseLeave={() => setDupeHoverAction(null)}>
            <div className="text-[13px] font-semibold mb-0.5" style={{ color: '#F5A623' }}>Keep All Rows</div>
            <div className="text-[11px]" style={{ color: c.tx3 }}>Import every row, including duplicates. Each will generate its own QR code — useful if duplicate entries have different payloads.</div>
          </button>
          <button data-testid="button-dupe-keep-first" className="w-full text-left rounded-lg px-4 py-3 transition-colors bg-[#2A5A9E]" onClick={handleDuplicateKeepFirst} onMouseEnter={() => setDupeHoverAction('keepFirst')} onMouseLeave={() => setDupeHoverAction(null)}>
            <div className="text-[13px] font-semibold mb-0.5 text-white">Keep First Only</div>
            <div className="text-[11px] text-white/70">Remove duplicates and keep only the first occurrence of each Asset Tag. Best when duplicates are accidental.</div>
          </button>
          <button data-testid="button-dupe-keep-last" className="w-full text-left rounded-lg px-4 py-3 transition-colors" style={{ background: d ? 'rgba(42,90,158,0.15)' : 'rgba(42,90,158,0.08)', border: '1px solid rgba(42,90,158,0.25)' }} onClick={handleDuplicateKeepLast} onMouseEnter={() => setDupeHoverAction('keepLast')} onMouseLeave={() => setDupeHoverAction(null)}>
            <div className="text-[13px] font-semibold mb-0.5" style={{ color: '#2A5A9E' }}>Keep Last Only</div>
            <div className="text-[11px]" style={{ color: c.tx3 }}>Remove duplicates and keep only the last occurrence of each Asset Tag. Best when the latest entry is the corrected one.</div>
          </button>
          <button data-testid="button-dupe-cancel" className="w-full text-left rounded-lg px-4 py-3 transition-colors" style={{ background: c.bg2, border: `1px solid ${c.bdr}` }} onClick={handleDuplicateCancel}>
            <div className="text-[13px] font-semibold mb-0.5" style={{ color: c.tx2 }}>Cancel</div>
            <div className="text-[11px]" style={{ color: c.tx3 }}>Go back without importing. You can fix your file and try again.</div>
          </button>
        </div>
      </div>
    </div>
  );
}

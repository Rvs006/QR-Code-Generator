import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, ChevronDown, ChevronRight, Settings, HelpCircle, Clock, X, Check, AlertTriangle, AlertCircle, Search, QrCode, Download, Printer, ScanLine, RotateCcw, ChevronLeft, Copy, ArrowUpDown, Zap, Sun, Moon, Info, FileText, Trash2, ExternalLink, Shield, FolderOpen, File, Folder, CheckCircle, XCircle, Smartphone, ArrowLeft, ArrowRight, Pencil, Plus, Type, Home as HomeIcon, Menu, Columns, Maximize2, Navigation } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import GuidedTour, { isTourCompleted, resetTour, type TourStep } from '@/components/GuidedTour';
import { renderQR, estimateModuleSize, type QRConfig, type GeneratedQR } from '@/lib/qr-renderer';
import { parseFile, parseFileRaw, applyMapping, autoMapColumns, partialAutoMapColumns, type ParsedRow, type RawFileData } from '@/lib/file-parser';
import { exportToZip } from '@/lib/zip-exporter';
import { exportToPDF } from '@/lib/pdf-exporter';
import { printLabels } from '@/lib/print-labels';
import { verifyQR, type VerifyResult } from '@/lib/qr-verifier';

import logoPath from '@assets/Gemini_Generated_Image_7x4kll7x4kll7x4k-removebg-preview_1772556180115.png';
import AppIcon from '@/components/AppIcon';
import ColumnMapper from '@/components/ColumnMapper';
import DuplicateModal from '@/components/DuplicateModal';
import QRConfigPanel from '@/components/QRConfigPanel';
import PayloadTemplateModal from '@/components/PayloadTemplateModal';

interface RowData extends ParsedRow {
  valid: boolean;
  warning: string | null;
}

const PRESETS: Record<string, QRConfig & { name: string; desc: string }> = {
  indoor: { name: 'Indoor Standard', desc: 'Office & server rooms — 50×30mm labels, 300 DPI, medium error correction', ec: 'M', modSize: 0, quiet: 4, labelW: 50, labelH: 30, dpi: 300, fontTag: 10, fontPath: 7, format: 'png', pixelPerfect: true, paperSize: 'a4' },
  outdoor: { name: 'Outdoor Harsh', desc: 'Rooftop & plant rooms — larger 70×40mm labels, 600 DPI, max error correction for dirt/UV damage', ec: 'H', modSize: 0, quiet: 4, labelW: 70, labelH: 40, dpi: 600, fontTag: 12, fontPath: 8, format: 'png', pixelPerfect: true, paperSize: 'a4' },
  draft: { name: 'Quick Draft', desc: 'Test prints & internal review — small labels, 150 DPI, fastest generation', ec: 'L', modSize: 0, quiet: 4, labelW: 50, labelH: 30, dpi: 150, fontTag: 10, fontPath: 7, format: 'png', pixelPerfect: false, paperSize: 'a4' },
};

const PAPER_SIZES: Record<string, { name: string; w: number; h: number }> = {
  a3: { name: 'A3 (297 × 420 mm)', w: 297, h: 420 },
  a4: { name: 'A4 (210 × 297 mm)', w: 210, h: 297 },
  a5: { name: 'A5 (148 × 210 mm)', w: 148, h: 210 },
  letter: { name: 'Letter (216 × 279 mm)', w: 216, h: 279 },
  legal: { name: 'Legal (216 × 356 mm)', w: 216, h: 356 },
  tabloid: { name: 'Tabloid (279 × 432 mm)', w: 279, h: 432 },
};

const EC_LABELS: Record<string, string> = { L: 'Low (7%)', M: 'Medium (15%)', Q: 'Quartile (25%)', H: 'High (30%)' };

interface RecentFileEntry {
  name: string;
  rows: number;
  folders: number;
  timestamp: number;
  sessionKey: string;
}

function getRecentFiles(): RecentFileEntry[] {
  try {
    return JSON.parse(localStorage.getItem('ec-recent-files') || '[]');
  } catch { return []; }
}

function saveRecentFile(entry: Omit<RecentFileEntry, 'sessionKey' | 'timestamp'>, rowsData: any[], configData: any) {
  const sessionKey = `ec-hist-${Date.now()}`;
  const recent = getRecentFiles();
  const newEntry: RecentFileEntry = { ...entry, timestamp: Date.now(), sessionKey };
  const updated = [newEntry, ...recent.filter(r => r.name !== entry.name)].slice(0, 10);
  try {
    localStorage.setItem('ec-recent-files', JSON.stringify(updated));
    localStorage.setItem(sessionKey, JSON.stringify({ rows: rowsData, config: configData }));
  } catch {}
}

function removeRecentFile(sessionKey: string) {
  const recent = getRecentFiles().filter(r => r.sessionKey !== sessionKey);
  try {
    localStorage.setItem('ec-recent-files', JSON.stringify(recent));
    localStorage.removeItem(sessionKey);
  } catch {}
}

function clearAllRecentFiles() {
  const recent = getRecentFiles();
  recent.forEach(r => { try { localStorage.removeItem(r.sessionKey); } catch {} });
  localStorage.removeItem('ec-recent-files');
}

function formatRecentDate(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 172800000) return 'Yesterday';
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const MOCK_ROWS: ParsedRow[] = [
  { mainFolder: '334OS', subFolder: 'EMS', assetTag: 'FCU-199001', payload: '{"guid":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","site":"334OS","asset":"FCU-199001","type":"FCU","floor":"L19"}' },
  { mainFolder: '334OS', subFolder: 'EMS', assetTag: 'FCU-199002', payload: '{"guid":"b2c3d4e5-f6a7-8901-bcde-f12345678901","site":"334OS","asset":"FCU-199002","type":"FCU","floor":"L19"}' },
  { mainFolder: '334OS', subFolder: 'EMS', assetTag: 'AHU-300015', payload: '{"guid":"c3d4e5f6-a7b8-9012-cdef-123456789012","site":"334OS","asset":"AHU-300015","type":"AHU","floor":"B2"}' },
  { mainFolder: '334OS', subFolder: 'Leak Detection', assetTag: 'LD-400001', payload: '{"guid":"d4e5f6a7-b8c9-0123-defa-234567890123","site":"334OS","asset":"LD-400001","type":"LD","floor":"B1"}' },
  { mainFolder: '1ES', subFolder: 'HVAC', assetTag: 'VAV-500010', payload: '{"guid":"e5f6a7b8-c9d0-1234-efab-345678901234","site":"1ES","asset":"VAV-500010","type":"VAV","floor":"L5"}' },
  { mainFolder: '1ES', subFolder: 'HVAC', assetTag: 'VAV-500011', payload: '{"guid":"f6a7b8c9-d0e1-2345-fabc-456789012345","site":"1ES","asset":"VAV-500011","type":"VAV","floor":"L5"}' },
  { mainFolder: '1ES', subFolder: 'Fire', assetTag: 'FD-600003', payload: '{"guid":"a7b8c9d0-e1f2-3456-abcd-567890123456","site":"1ES","asset":"FD-600003","type":"FD","floor":"L3"}' },
  { mainFolder: '1TS', subFolder: 'BMS', assetTag: 'CTL-700020', payload: '{"guid":"b8c9d0e1-f2a3-4567-bcde-678901234567","site":"1TS","asset":"CTL-700020","type":"CTL","floor":"L1"}' },
  { mainFolder: '1TS', subFolder: 'BMS', assetTag: 'SEN-800045', payload: '' },
  { mainFolder: '334OS', subFolder: 'EMS', assetTag: 'FCU-199001', payload: '{"guid":"x9y0z1a2-b3c4-5678-cdef-789012345678","site":"334OS","asset":"FCU-199001","type":"FCU","floor":"L20"}' },
  { mainFolder: '1ES', subFolder: '', assetTag: 'PMP-900100', payload: '{"guid":"z1a2b3c4-d5e6-7890-defa-890123456789","site":"1ES","asset":"PMP-900100","type":"PMP","floor":"B3","extra":"extended-payload-data-for-testing-long-content-in-qr-generation-scenario-to-push-version-higher"}' },
  { mainFolder: '334OS', subFolder: 'EMS', assetTag: 'CHW-110005', payload: '{"guid":"a2b3c4d5-e6f7-8901-efab-901234567890","site":"334OS","asset":"CHW-110005","type":"CHW","floor":"L12"}' },
];

function validateRows(data: ParsedRow[]): RowData[] {
  const tagCount: Record<string, number> = {};
  data.forEach(r => { const tag = r.assetTag.trim().toLowerCase(); if (tag) tagCount[tag] = (tagCount[tag] || 0) + 1; });
  return data.map((r) => {
    if (!r.payload || r.payload.trim() === '') return { ...r, valid: false, warning: 'Empty payload — QR will have no data' };
    let isJson = false;
    try { JSON.parse(r.payload); isJson = true; } catch(e) {}
    if (!isJson) return { ...r, valid: true, warning: 'Payload is not valid JSON' };
    const tag = r.assetTag.trim().toLowerCase();
    if (tag && tagCount[tag] > 1) return { ...r, valid: true, warning: `Duplicate asset tag — appears ${tagCount[tag]} times` };
    if (r.payload.length > 150) return { ...r, valid: true, warning: `Long payload (${r.payload.length} chars) — may need QR Version 7+` };
    return { ...r, valid: true, warning: null };
  });
}

export default function Home() {
  const isMobile = useIsMobile();
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ec-theme');
      if (saved) return saved === 'dark';
      if (window.matchMedia) return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [appState, setAppState] = useState<'empty' | 'loaded' | 'generating' | 'results'>('empty');
  const [rows, setRows] = useState<RowData[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showConfig, setShowConfig] = useState(false);
  const [showPayloadModal, setShowPayloadModal] = useState<RowData | null>(null);
  const [showScanViewer, setShowScanViewer] = useState(false);
  const [scanIndex, setScanIndex] = useState(0);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showRecentFiles, setShowRecentFiles] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [config, setConfig] = useState<QRConfig & { name?: string; desc?: string }>({ ...PRESETS.draft });
  const [activePreset, setActivePreset] = useState('draft');
  const [customPresets, setCustomPresets] = useState<Record<string, QRConfig>>(() => {
    try { return JSON.parse(localStorage.getItem('ec-custom-presets') || '{}'); } catch { return {}; }
  });
  const [newPresetName, setNewPresetName] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0, asset: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<GeneratedQR[]>([]);
  const [generatedIndices, setGeneratedIndices] = useState<number[]>([]);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [galleryPage, setGalleryPage] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyResults, setVerifyResults] = useState<VerifyResult[]>([]);
  const [verifyRunning, setVerifyRunning] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState(0);
  const [showFolderTree, setShowFolderTree] = useState(false);
  const [printSelected, setPrintSelected] = useState<Set<number>>(new Set());
  const [printPayloadView, setPrintPayloadView] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [pendingRows, setPendingRows] = useState<RowData[]>([]);
  const [duplicateGroups, setDuplicateGroups] = useState<Record<string, number>>({});
  const [dupeSearchQuery, setDupeSearchQuery] = useState('');
  const [dupeHoverAction, setDupeHoverAction] = useState<string | null>(null);
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [rawFileData, setRawFileData] = useState<RawFileData | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, number | undefined>>({ mainFolder: undefined, subFolder: undefined, assetTag: undefined, payload: undefined });
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; field: string } | null>(null);
  const [showSessionBanner, setShowSessionBanner] = useState(false);
  const [showPayloadTemplate, setShowPayloadTemplate] = useState(false);
  const [payloadTemplate, setPayloadTemplate] = useState(() => localStorage.getItem('ec-payload-template') || '{assetTag}');
  const [templateOverwrite, setTemplateOverwrite] = useState(false);
  const [exportFilename, setExportFilename] = useState('Electracom_QR_Codes');
  const [editingFilename, setEditingFilename] = useState(false);
  const [recentFiles, setRecentFiles] = useState<RecentFileEntry[]>(getRecentFiles());
  const [recentToast, setRecentToast] = useState<string | null>(null);
  const [dataPage, setDataPage] = useState(0);
  const [lastLoadedFileName, setLastLoadedFileName] = useState('');
  const [duplicateSummary, setDuplicateSummary] = useState<{ total: number; dupes: number } | null>(null);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [generationWarning, setGenerationWarning] = useState<string | null>(null);
  const genCancelRef = useRef(false);
  const storageWarningShown = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tourActive, setTourActive] = useState(false);
  const [tourPhase, setTourPhase] = useState<'landing' | 'loaded' | 'results'>('landing');

  const TOUR_STEPS: Record<string, TourStep[]> = {
    landing: [
      { target: 'dropzone', title: 'Upload Your Data', description: 'Drop an Excel (.xlsx), CSV, or PDF file here with your asset data. The app expects 4 columns: Main Folder, Sub-Folder, Asset Tag, and Payload.', position: 'bottom' },
      { target: 'button-load-demo', title: 'Try Demo Data', description: 'Not ready to upload? Load sample data with 12 assets to explore all features without needing a file.', position: 'bottom' },
      { target: 'button-preset-dropdown', title: 'Choose a Preset', description: 'Pick a QR label preset: Quick Draft for fast testing, Indoor Standard for office labels, or Outdoor Harsh for weatherproof labels.', position: 'bottom' },
      { target: 'button-settings', title: 'Customize Settings', description: 'Fine-tune label size, DPI, error correction level, PDF paper size, and other QR code parameters.', position: 'bottom' },
      { target: 'button-theme-toggle', title: 'Light / Dark Mode', description: 'Switch between light and dark themes to suit your preference.', position: 'bottom' },
    ],
    loaded: [
      { target: 'data-table-area', title: 'Review Your Assets', description: 'Your imported data appears here. Click any cell to edit it directly — asset tags, folder paths, and payloads are all editable.', position: 'top' },
      { target: 'button-payload-template', title: 'QR Data Template', description: 'Customize what data gets encoded inside each QR code. Use variables like {assetTag} and {mainFolder} to build structured payloads.', position: 'bottom' },
      { target: 'button-generate', title: 'Generate QR Codes', description: 'Click here to generate ISO/IEC 18004 compliant QR codes for all rows, or select specific rows first to generate only those.', position: 'top' },
    ],
    results: [
      { target: 'button-download-zip', title: 'Download as ZIP', description: 'Export all QR code images organized in a folder structure matching your Main Folder / Sub-Folder hierarchy.', position: 'bottom' },
      { target: 'button-download-pdf', title: 'Download as PDF', description: 'Generate a print-ready PDF with labels arranged on your chosen paper size. Use the dropdown next to this button to pick the paper size.', position: 'bottom' },
      { target: 'button-print', title: 'Print Labels', description: 'Print your QR code labels directly from the browser — no download needed.', position: 'bottom' },
    ],
  };

  useEffect(() => {
    if (appState === 'empty' && !isTourCompleted('ec-tour-landing')) {
      setTimeout(() => { setTourPhase('landing'); setTourActive(true); }, 800);
    }
  }, []);

  useEffect(() => {
    if (appState === 'loaded' && !isTourCompleted('ec-tour-loaded')) {
      setTimeout(() => { setTourPhase('loaded'); setTourActive(true); }, 500);
    }
    if (appState === 'results' && !isTourCompleted('ec-tour-results')) {
      setTimeout(() => { setTourPhase('results'); setTourActive(true); }, 500);
    }
  }, [appState]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const h = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('ec-theme')) setDark(e.matches);
    };
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  const toggleTheme = () => {
    setDark(p => {
      const next = !p;
      localStorage.setItem('ec-theme', next ? 'dark' : 'light');
      return next;
    });
  };

  useEffect(() => {
    try {
      const savedRows = localStorage.getItem('ec-session-rows');
      const savedState = localStorage.getItem('ec-session-state');
      if (savedRows && savedState && (savedState === 'loaded' || savedState === 'results')) {
        const parsed = JSON.parse(savedRows);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setShowSessionBanner(true);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (rows.length > 0 && (appState === 'loaded' || appState === 'results')) {
      try {
        localStorage.setItem('ec-session-rows', JSON.stringify(rows));
        localStorage.setItem('ec-session-config', JSON.stringify(config));
        localStorage.setItem('ec-session-state', appState);
      } catch (err: any) {
        if (!storageWarningShown.current && err?.name === 'QuotaExceededError') {
          storageWarningShown.current = true;
          setRecentToast('Storage full — session may not be saved');
          setTimeout(() => setRecentToast(null), 4000);
        }
      }
    }
  }, [rows, config, appState]);

  const handleResumeSession = () => {
    if (rows.length > 0 && !window.confirm('You have data loaded. Resuming will replace it. Continue?')) {
      return;
    }
    try {
      const savedRows = JSON.parse(localStorage.getItem('ec-session-rows') || '[]');
      const savedConfig = JSON.parse(localStorage.getItem('ec-session-config') || '{}');
      if (savedRows.length > 0) {
        setRows(savedRows);
        if (savedConfig.ec) setConfig(prev => ({ ...prev, ...savedConfig }));
        setAppState('loaded');
      }
    } catch {}
    setShowSessionBanner(false);
  };

  const handleDismissSession = () => {
    localStorage.removeItem('ec-session-rows');
    localStorage.removeItem('ec-session-config');
    localStorage.removeItem('ec-session-state');
    setShowSessionBanner(false);
  };

  const handleClearSession = () => {
    localStorage.removeItem('ec-session-rows');
    localStorage.removeItem('ec-session-config');
    localStorage.removeItem('ec-session-state');
  };

  const d = dark;
  const c = {
    bg: d ? '#070a10' : '#f4f5f7',
    bg1: d ? '#0e1219' : '#ffffff',
    bg2: d ? '#151a24' : '#f0f1f4',
    bg3: d ? '#1c2230' : '#e4e6eb',
    bdr: d ? '#252d3a' : '#dde0e6',
    bdrA: d ? '#3a4560' : '#c0c4cc',
    tx: d ? '#e6e9f0' : '#1a1d24',
    tx2: d ? '#8a95a8' : '#5a6070',
    tx3: d ? '#5a6577' : '#9a9fae',
  };

  const computedModSize = useMemo(() => {
    const sampleLen = rows.length > 0 ? Math.max(...rows.filter(r => r.valid).map(r => r.payload.length), 100) : 100;
    return estimateModuleSize(config, sampleLen);
  }, [config, rows]);

  const validation = useMemo(() => {
    const valid = rows.filter(r => r.valid && !r.warning).length;
    const warnings = rows.filter(r => r.warning && r.valid).length;
    const errors = rows.filter(r => !r.valid).length;
    return { valid, warnings, errors, total: rows.length };
  }, [rows]);

  const filteredRows = useMemo(() => {
    let result = rows.map((r, i) => ({ ...r, _idx: i }));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => r.assetTag.toLowerCase().includes(q) || r.mainFolder.toLowerCase().includes(q) || r.subFolder.toLowerCase().includes(q));
    }
    if (sortCol) {
      result.sort((a: any, b: any) => {
        const av = a[sortCol] || '';
        const bv = b[sortCol] || '';
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return result;
  }, [rows, searchQuery, sortCol, sortDir]);

  const folders = useMemo(() => {
    const f: Record<string, number> = {};
    rows.forEach(r => { const key = [r.mainFolder, r.subFolder].filter(Boolean).join('/') || 'Outputted QR Codes'; f[key] = (f[key] || 0) + 1; });
    return f;
  }, [rows]);

  const finalizeLoadRows = (validated: RowData[], fileName?: string) => {
    setRows(validated);
    setAppState('loaded');
    setSelectedRows(new Set());
    setGeneratedCount(0);
    setGeneratedImages([]);
    setGeneratedIndices([]);
    setDataPage(0);
    setDuplicateSummary(null);
    if (fileName) {
      const folderSet = new Set<string>();
      validated.forEach(r => { const key = [r.mainFolder, r.subFolder].filter(Boolean).join('/'); if (key) folderSet.add(key); });
      saveRecentFile({ name: fileName, rows: validated.length, folders: folderSet.size }, validated, config);
      setRecentFiles(getRecentFiles());
    }
  };

  const checkAndLoadRows = (validated: RowData[], fileName?: string) => {
    const tagCount: Record<string, number> = {};
    validated.forEach(r => { const tag = r.assetTag.trim().toLowerCase(); if (tag) tagCount[tag] = (tagCount[tag] || 0) + 1; });
    const dupes: Record<string, number> = {};
    Object.entries(tagCount).forEach(([tag, count]) => { if (count > 1) dupes[tag] = count; });

    if (Object.keys(dupes).length > 0) {
      setPendingRows(validated);
      setDuplicateGroups(dupes);
      setShowDuplicateModal(true);
    } else {
      finalizeLoadRows(validated, fileName || lastLoadedFileName);
    }
  };

  const handleDuplicateKeepAll = () => {
    finalizeLoadRows(pendingRows, lastLoadedFileName);
    setShowDuplicateModal(false);
    setPendingRows([]);
    setDuplicateGroups({});
  };

  const handleDuplicateKeepFirst = () => {
    const seen = new Set<string>();
    const deduped = pendingRows.filter(r => {
      const tag = r.assetTag.trim().toLowerCase();
      if (!tag) return true;
      if (seen.has(tag)) return false;
      seen.add(tag);
      return true;
    });
    finalizeLoadRows(validateRows(deduped), lastLoadedFileName);
    setShowDuplicateModal(false);
    setPendingRows([]);
    setDuplicateGroups({});
  };

  const handleDuplicateKeepLast = () => {
    const seen = new Set<string>();
    const deduped = [...pendingRows].reverse().filter(r => {
      const tag = r.assetTag.trim().toLowerCase();
      if (!tag) return true;
      if (seen.has(tag)) return false;
      seen.add(tag);
      return true;
    }).reverse();
    finalizeLoadRows(validateRows(deduped), lastLoadedFileName);
    setShowDuplicateModal(false);
    setPendingRows([]);
    setDuplicateGroups({});
  };

  const handleDuplicateCancel = () => {
    setShowDuplicateModal(false);
    setPendingRows([]);
    setDuplicateGroups({});
  };

  const handleFileUpload = async (file: File) => {
    setLoadingFile(true);
    setFileError(null);
    setLastLoadedFileName(file.name);
    try {
      const raw = await parseFileRaw(file);
      const autoMap = autoMapColumns(raw.headers);
      if (autoMap && autoMap.assetTag !== undefined) {
        const parsed = applyMapping(raw.rawRows, autoMap);
        if (parsed.length > 0) {
          setRawFileData(null);
          const validated = validateRows(parsed);
          checkAndLoadRows(validated, file.name);
          return;
        }
      }
      setRawFileData(raw);
      const initialMapping = partialAutoMapColumns(raw.headers);
      setColumnMapping(initialMapping);
      setShowColumnMapper(true);
    } catch (err: any) {
      setFileError(err.message || 'Failed to parse file');
    } finally {
      setLoadingFile(false);
    }
  };

  const handleApplyMapping = () => {
    if (!rawFileData) return;
    const mapping: Record<string, number> = {};
    if (columnMapping.assetTag === undefined) {
      setFileError('Asset Tag column must be mapped');
      return;
    }
    if (columnMapping.mainFolder !== undefined) mapping.mainFolder = columnMapping.mainFolder;
    if (columnMapping.subFolder !== undefined) mapping.subFolder = columnMapping.subFolder;
    mapping.assetTag = columnMapping.assetTag;
    if (columnMapping.payload !== undefined) mapping.payload = columnMapping.payload;
    const parsed = applyMapping(rawFileData.rawRows, mapping);
    if (parsed.length === 0) {
      setFileError('No valid rows found with the selected mapping');
      return;
    }
    const validated = validateRows(parsed);
    checkAndLoadRows(validated, lastLoadedFileName);
    setShowColumnMapper(false);
  };

  const handleEditCell = (rowIdx: number, field: string, value: string) => {
    setRows(prev => {
      const updated = [...prev];
      updated[rowIdx] = { ...updated[rowIdx], [field]: value };
      return validateRows(updated);
    });
    setEditingCell(null);
  };

  const handleAddRow = () => {
    const newRow: ParsedRow = { mainFolder: '', subFolder: '', assetTag: `NEW-${Date.now().toString(36).toUpperCase()}`, payload: '' };
    setRows(prev => validateRows([...prev, newRow]));
  };

  const handleDeleteRow = (idx: number) => {
    setRows(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      return validateRows(updated);
    });
    setSelectedRows(prev => {
      const n = new Set<number>();
      prev.forEach(i => { if (i < idx) n.add(i); else if (i > idx) n.add(i - 1); });
      return n;
    });
  };

  const handleApplyTemplate = () => {
    localStorage.setItem('ec-payload-template', payloadTemplate);
    setRows(prev => {
      const updated = prev.map(r => {
        if (!templateOverwrite && r.payload.trim()) return r;
        const generated = payloadTemplate
          .replace(/\{assetTag\}/g, r.assetTag)
          .replace(/\{mainFolder\}/g, r.mainFolder)
          .replace(/\{subFolder\}/g, r.subFolder);
        return { ...r, payload: generated };
      });
      return validateRows(updated);
    });
    setShowPayloadTemplate(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    if (e.target) e.target.value = '';
  };

  const handleLoadDemo = () => {
    setLastLoadedFileName('demo_assets.xlsx');
    setRawFileData(null);
    const validated = validateRows(MOCK_ROWS);
    checkAndLoadRows(validated, 'demo_assets.xlsx');
  };

  const handleSwapFile = () => {
    fileInputRef.current?.click();
  };

  const handleGenerate = async () => {
    const indices = selectedRows.size > 0
      ? rows.map((r, idx) => selectedRows.has(idx) && r.valid ? idx : -1).filter(i => i >= 0)
      : rows.map((r, idx) => r.valid ? idx : -1).filter(i => i >= 0);
    const count = indices.length;
    if (count === 0) return;

    genCancelRef.current = false;
    setProgress({ current: 0, total: count, asset: rows[indices[0]]?.assetTag || '' });
    setAppState('generating');
    setGeneratedImages([]);

    const images: GeneratedQR[] = [];
    const BATCH_SIZE = 50;

    for (let i = 0; i < indices.length; i++) {
      if (genCancelRef.current) {
        setAppState('loaded');
        return;
      }

      const row = rows[indices[i]];

      try {
        const qr = await renderQR(row.payload, row.assetTag, row.mainFolder, row.subFolder, config);
        images.push(qr);
      } catch (err) {
        console.error(`Failed to generate QR for ${row.assetTag}:`, err);
        images.push({
          dataURL: '',
          qrOnlyDataURL: '',
          width: 0,
          height: 0,
          assetTag: row.assetTag,
          mainFolder: row.mainFolder,
          subFolder: row.subFolder,
          payload: row.payload,
        });
      }

      if (i % BATCH_SIZE === 0 || i === indices.length - 1) {
        setProgress({ current: i + 1, total: count, asset: row.assetTag });
        await new Promise(r => setTimeout(r, 0));
      }
      if (genCancelRef.current) {
        setAppState('loaded');
        return;
      }
    }

    const tagCount: Record<string, number> = {};
    images.forEach(img => { tagCount[img.assetTag] = (tagCount[img.assetTag] || 0) + 1; });
    const dupeCount = Object.values(tagCount).filter(c => c > 1).reduce((a, c) => a + c, 0);
    setDuplicateSummary(dupeCount > 0 ? { total: images.length, dupes: dupeCount } : null);

    const failedCount = images.filter(img => !img.dataURL).length;

    setGeneratedCount(images.length);
    setGeneratedImages(images);
    setGeneratedIndices(indices);
    setAppState('results');
    setGalleryPage(0);

    if (failedCount > 0) {
      setGenerationWarning(`${failedCount} of ${images.length} QR codes failed to generate`);
    } else {
      setGenerationWarning(null);
    }
  };

  const handleCancelGenerate = () => {
    genCancelRef.current = true;
    setAppState('loaded');
  };

  const handleSort = (col: string) => {
    if (sortCol === col) { setSortDir(p => p === 'asc' ? 'desc' : 'asc'); }
    else { setSortCol(col); setSortDir('asc'); }
  };

  const handleSelectAll = () => {
    const visibleIndices = filteredRows.map(r => r._idx);
    const allVisibleSelected = visibleIndices.every(i => selectedRows.has(i));
    if (allVisibleSelected) {
      setSelectedRows(prev => {
        const n = new Set(prev);
        visibleIndices.forEach(i => n.delete(i));
        return n;
      });
    } else {
      setSelectedRows(prev => {
        const n = new Set(prev);
        visibleIndices.forEach(i => n.add(i));
        return n;
      });
    }
  };

  const handleSelectRow = (idx: number) => {
    setSelectedRows(prev => { const n = new Set(prev); if (n.has(idx)) n.delete(idx); else n.add(idx); return n; });
  };

  const handleUpdateConfig = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setActivePreset('custom');
  };

  const handleSelectPreset = (key: string) => {
    if (PRESETS[key]) {
      setConfig({ ...PRESETS[key] });
    } else if (customPresets[key]) {
      setConfig({ ...customPresets[key] });
    }
    setActivePreset(key);
    setShowPresetDropdown(false);
  };

  const handleSaveCustomPreset = (name: string) => {
    if (!name.trim()) return;
    const updated = { ...customPresets, [name.trim()]: { ...config } };
    setCustomPresets(updated);
    localStorage.setItem('ec-custom-presets', JSON.stringify(updated));
    setActivePreset(name.trim());
    setNewPresetName('');
  };

  const handleDeleteCustomPreset = (name: string) => {
    const updated = { ...customPresets };
    delete updated[name];
    setCustomPresets(updated);
    localStorage.setItem('ec-custom-presets', JSON.stringify(updated));
    if (activePreset === name) setActivePreset('custom');
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSaveImage = (img: GeneratedQR) => {
    if (!img.dataURL) return;
    const byteString = atob(img.dataURL.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: 'image/png' });
    const safeName = (img.assetTag || 'qr').replace(/[<>:"/\\|?*]/g, '_').trim();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleStartVerify = async () => {
    setShowVerifyModal(true);
    setVerifyRunning(true);
    setVerifyProgress(0);
    setVerifyResults([]);

    const items = generatedImages.filter(img => img.dataURL);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const result = await verifyQR(item.qrOnlyDataURL, item.payload, item.assetTag, item.mainFolder, item.subFolder);
      setVerifyResults(prev => [...prev, result]);
      setVerifyProgress(Math.round(((i + 1) / items.length) * 100));
      await new Promise(r => setTimeout(r, 50));
    }

    setVerifyRunning(false);
  };

  const handleCloseVerify = () => {
    setShowVerifyModal(false);
    setVerifyRunning(false);
  };

  const handleDownloadZip = async () => {
    if (generatedImages.length === 0) return;
    setExportProgress('Preparing ZIP...');
    try {
      await exportToZip(generatedImages, exportFilename);
    } finally {
      setExportProgress(null);
    }
  };

  const handleDownloadPDF = async () => {
    if (generatedImages.length === 0) return;
    setExportProgress('Generating PDF...');
    try {
      await exportToPDF(generatedImages, config, undefined, exportFilename);
    } finally {
      setExportProgress(null);
    }
  };

  const handlePrint = () => {
    if (generatedImages.length === 0) return;
    printLabels(generatedImages, config, printSelected);
  };

  const folderTree = useMemo(() => {
    const tree: Record<string, Record<string, string[]>> = {};
    const sourceRows = generatedImages.length > 0 ? generatedImages : rows.filter(r => r.valid);
    sourceRows.forEach(r => {
      const main = r.mainFolder || 'Outputted QR Codes';
      const sub = r.subFolder || '';
      if (!tree[main]) tree[main] = {};
      if (!tree[main][sub]) tree[main][sub] = [];
      tree[main][sub].push(r.assetTag);
    });
    return tree;
  }, [rows, generatedImages]);

  const configSummary = `${EC_LABELS[config.ec]?.split(' ')[0]} EC · Auto ${computedModSize}px · ${config.labelW}×${config.labelH}mm · ${config.dpi} DPI · ${config.format.toUpperCase()}`;
  const PER_PAGE = 20;
  const galleryItems = generatedImages.length > 0 ? generatedImages : [];
  const pageItems = galleryItems.slice(galleryPage * PER_PAGE, (galleryPage + 1) * PER_PAGE);
  const totalPages = Math.ceil(galleryItems.length / PER_PAGE);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === 'Escape') {
        if (editingCell) { setEditingCell(null); return; }
        if (showColumnMapper) { setShowColumnMapper(false); return; }
        if (showPayloadTemplate) { setShowPayloadTemplate(false); return; }
        if (showScanViewer) { setShowScanViewer(false); return; }
        if (showPayloadModal) { setShowPayloadModal(null); return; }
        if (showPrintPreview) { setShowPrintPreview(false); setPrintPayloadView(null); return; }
        if (showConfig) { setShowConfig(false); return; }
        if (showHelpModal) { setShowHelpModal(false); return; }
        if (showVerifyModal) { handleCloseVerify(); return; }
        if (showFolderTree) { setShowFolderTree(false); return; }
      }
      if (showScanViewer && galleryItems.length > 0) {
        if (e.key === 'ArrowLeft' && scanIndex > 0) setScanIndex(p => p - 1);
        if (e.key === 'ArrowRight' && scanIndex < galleryItems.length - 1) setScanIndex(p => p + 1);
      }
      if (!isInput && !e.metaKey && !e.ctrlKey) {
        if (e.key === 'g' && appState === 'loaded') { e.preventDefault(); handleGenerate(); }
        if (e.key === 'z' && appState === 'results') { e.preventDefault(); handleDownloadZip(); }
        if (e.key === 'd' && appState === 'results') { e.preventDefault(); handleDownloadPDF(); }
        if (e.key === 'p' && appState === 'results') { e.preventDefault(); handlePrint(); }
        if (e.key === 'c') { e.preventDefault(); setShowConfig(prev => !prev); }
        if (e.key === '?') { e.preventDefault(); setShowHelpModal(true); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showScanViewer, showPayloadModal, showPrintPreview, showConfig, showHelpModal, showVerifyModal, showFolderTree, showColumnMapper, showPayloadTemplate, editingCell, scanIndex, galleryItems.length, appState]);

  const prettyPayload = (p: string) => { try { return JSON.stringify(JSON.parse(p), null, 2); } catch(e) { return p || '(empty)'; } };

  const previewDataURL = useMemo(() => {
    const canvas = document.createElement('canvas');
    const size = 120;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#ccc';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Preview', size / 2, size / 2 + 5);
    return canvas.toDataURL();
  }, []);

  return (
    <div data-testid="app-container" className="min-h-screen" style={{ background: c.bg, color: c.tx, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.pdf"
        className="hidden"
        onChange={handleFileInputChange}
        data-testid="input-file-upload"
      />

      <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #00B0F0, #F5A623, #4CAF50, #9C27B0, #E53935)' }} />

      <header className={`sticky top-0 z-50 backdrop-blur-xl ${isMobile ? 'px-3 py-2' : 'px-6 py-3'} flex items-center gap-3`} style={{ background: d ? 'rgba(14,18,25,0.95)' : 'rgba(255,255,255,0.95)', borderBottom: `1px solid ${c.bdr}` }}>
        <div className="flex items-center gap-2 min-w-0 cursor-pointer" data-testid="img-logo" onClick={() => { setAppState('empty'); setGeneratedImages([]); setGalleryPage(0); if (rows.length > 0) setShowSessionBanner(true); }} title="Return to home">
          <AppIcon size={isMobile ? 32 : 40} isDark={d} />
          <img src={logoPath} alt="Electracom" className={`${isMobile ? 'h-9' : 'h-12'} object-contain flex-shrink-0`} style={{ filter: d ? 'brightness(1.8)' : 'none' }} />
        </div>

        <div className={`ml-auto flex items-center ${isMobile ? 'gap-0.5' : 'gap-1.5'}`}>
          {appState !== 'empty' && (
            <button data-testid="button-home" aria-label="Home" className={`${isMobile ? 'p-1.5' : 'p-2'} rounded-lg transition-colors`} style={{ color: c.tx3 }} onMouseEnter={(e) => { e.currentTarget.style.background = c.bg2; e.currentTarget.style.color = '#2A5A9E'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.tx3; }} onClick={() => { setAppState('empty'); setGeneratedImages([]); setGalleryPage(0); if (rows.length > 0) setShowSessionBanner(true); }} title="Home"><HomeIcon className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} /></button>
          )}
          <div className="relative">
            <button data-testid="button-preset-dropdown" className={`flex items-center gap-1.5 rounded-lg ${isMobile ? 'px-2 py-1.5' : 'px-3 py-1.5'} text-[13px] transition-colors`} style={{ background: c.bg2, border: `1px solid ${c.bdr}`, color: c.tx2 }} onClick={() => setShowPresetDropdown(p => !p)}>
              <Zap className="w-3.5 h-3.5 text-[#F5A623]" />
              {!isMobile && <span>{activePreset === 'custom' ? 'Custom' : (PRESETS[activePreset]?.name || activePreset)}</span>}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showPresetDropdown && (
              <>
              <div className="fixed inset-0 z-[49]" onClick={() => setShowPresetDropdown(false)} />
              <div className="absolute right-0 top-full mt-1 w-52 rounded-lg shadow-2xl overflow-hidden z-50" style={{ background: c.bg1, border: `1px solid ${c.bdr}` }}>
                {Object.entries(PRESETS).map(([key, preset]) => (
                  <button key={key} data-testid={`button-preset-${key}`} className="w-full text-left px-3 py-2.5 transition-colors" onMouseEnter={(e) => (e.currentTarget.style.background = c.bg2)} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')} onClick={() => handleSelectPreset(key)}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[13px] ${activePreset === key ? 'font-semibold' : ''}`} style={{ color: activePreset === key ? '#00B0F0' : c.tx }}>{preset.name}</span>
                      {activePreset === key && <Check className="w-3.5 h-3.5 text-[#00B0F0]" />}
                    </div>
                    <div className="text-[11px] mt-0.5 leading-snug" style={{ color: c.tx3 }}>{preset.desc}</div>
                  </button>
                ))}
                {Object.keys(customPresets).length > 0 && (
                  <div style={{ borderTop: `1px solid ${c.bdr}` }}>
                    <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.tx3 }}>My Presets</div>
                    {Object.keys(customPresets).map(name => (
                      <div key={name} className="flex items-center w-full px-3 py-2 transition-colors group" onMouseEnter={(e) => (e.currentTarget.style.background = c.bg2)} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                        <button className="flex-1 text-left" onClick={() => handleSelectPreset(name)}>
                          <div className="flex items-center justify-between">
                            <span className={`text-[13px] ${activePreset === name ? 'font-semibold' : ''}`} style={{ color: activePreset === name ? '#00B0F0' : c.tx }}>{name}</span>
                            {activePreset === name && <Check className="w-3.5 h-3.5 text-[#00B0F0]" />}
                          </div>
                        </button>
                        <button data-testid={`button-delete-preset-${name}`} className="ml-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: c.tx3 }} onClick={(e) => { e.stopPropagation(); handleDeleteCustomPreset(name); }}><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ borderTop: `1px solid ${c.bdr}` }}>
                  <button className="w-full text-left px-3 py-2.5 text-[13px] transition-colors" style={{ color: c.tx3 }} onMouseEnter={(e) => (e.currentTarget.style.background = c.bg2)} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')} onClick={() => { setShowPresetDropdown(false); setShowConfig(true); }}>
                    <Settings className="w-3.5 h-3.5 inline mr-2" />Customize...
                  </button>
                </div>
              </div>
              </>
            )}
          </div>

          {!isMobile && <button data-testid="button-settings" aria-label="Settings" className="p-2 rounded-lg transition-colors" style={{ color: c.tx3 }} onMouseEnter={(e) => (e.currentTarget.style.background = c.bg2)} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')} onClick={() => setShowConfig(true)} title="Settings"><Settings className="w-4 h-4" /></button>}

          {!isMobile && <div className="relative">
            <button data-testid="button-recent-files" aria-label="Recent files" className="p-2 rounded-lg transition-colors" style={{ color: c.tx3 }} onMouseEnter={(e) => (e.currentTarget.style.background = c.bg2)} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')} onClick={() => setShowRecentFiles(p => !p)} title="Recent files"><Clock className="w-4 h-4" /></button>
            {showRecentFiles && (
              <div className="absolute right-0 top-full mt-1 w-72 rounded-lg shadow-2xl overflow-hidden z-50" style={{ background: c.bg1, border: `1px solid ${c.bdr}` }}>
                <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${c.bdr}` }}>
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.tx3 }}>Recent Files</span>
                  {recentFiles.length > 0 && (
                    <button data-testid="button-clear-recent" className="text-[11px] transition-colors" style={{ color: c.tx3 }} onMouseEnter={(e) => (e.currentTarget.style.color = '#E53935')} onMouseLeave={(e) => (e.currentTarget.style.color = c.tx3)} onClick={() => { clearAllRecentFiles(); setRecentFiles([]); setShowRecentFiles(false); setRecentToast('All sessions cleared'); setTimeout(() => setRecentToast(null), 2500); }}>Clear all</button>
                  )}
                </div>
                {recentFiles.length === 0 ? (
                  <div className="px-3 py-6 text-center text-[13px]" style={{ color: c.tx3 }}>No recent files</div>
                ) : recentFiles.map((f) => (
                  <div key={f.sessionKey} className="flex items-center gap-3 px-3 py-2.5 transition-colors group" onMouseEnter={(e) => (e.currentTarget.style.background = c.bg2)} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <button className="flex items-center gap-3 min-w-0 flex-1 text-left" onClick={() => {
                      try {
                        const data = JSON.parse(localStorage.getItem(f.sessionKey) || '{}');
                        if (data.rows?.length > 0) {
                          if (data.config) setConfig(prev => ({ ...prev, ...data.config }));
                          setLastLoadedFileName(f.name);
                          setRawFileData(null);
                          const validated = validateRows(data.rows);
                          checkAndLoadRows(validated, f.name);
                        }
                      } catch {}
                      setShowRecentFiles(false);
                    }}>
                      <FileSpreadsheet className="w-4 h-4 flex-shrink-0" style={{ color: '#2A5A9E' }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium truncate" style={{ color: c.tx }}>{f.name}</div>
                        <div className="text-[11px]" style={{ color: c.tx3 }}>{f.rows} rows · {f.folders} folders · {formatRecentDate(f.timestamp)}</div>
                      </div>
                    </button>
                    <button data-testid={`button-dismiss-recent-${f.sessionKey}`} className="p-1 rounded opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity flex-shrink-0" style={{ color: c.tx3 }} onClick={(e) => { e.stopPropagation(); removeRecentFile(f.sessionKey); setRecentFiles(getRecentFiles()); setRecentToast('Session removed from history'); setTimeout(() => setRecentToast(null), 2500); }}><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>}

          <button data-testid="button-help" aria-label="Help" className={`${isMobile ? 'p-1.5' : 'p-2'} rounded-lg transition-colors`} style={{ color: c.tx3 }} onMouseEnter={(e) => (e.currentTarget.style.background = c.bg2)} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')} onClick={() => setShowHelpModal(true)} title="Help"><HelpCircle className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} /></button>

          <button data-testid="button-theme-toggle" aria-label={d ? 'Switch to light mode' : 'Switch to dark mode'} className={`${isMobile ? 'p-1.5' : 'p-2'} rounded-lg transition-colors`} style={{ color: c.tx3 }} onMouseEnter={(e) => { e.currentTarget.style.background = c.bg2; e.currentTarget.style.color = '#F5A623'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.tx3; }} onClick={toggleTheme} title={d ? 'Light mode' : 'Dark mode'}>
            {d ? <Sun className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} /> : <Moon className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />}
          </button>
        </div>
      </header>

      <div className={`max-w-[1080px] mx-auto ${isMobile ? 'px-3 py-4' : 'px-6 py-7'}`}>
        {showSessionBanner && appState === 'empty' && (
          <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex items-center justify-between'} rounded-xl px-4 py-3 mb-5`} style={{ background: d ? 'rgba(42,90,158,0.12)' : 'rgba(42,90,158,0.06)', border: `1px solid ${d ? 'rgba(42,90,158,0.3)' : 'rgba(42,90,158,0.15)'}` }} data-testid="banner-session">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-[#2A5A9E] flex-shrink-0" />
              <span className="text-[13px]" style={{ color: c.tx2 }}>You have a previous session. Resume where you left off?</span>
            </div>
            <div className="flex items-center gap-2">
              <button data-testid="button-resume-session" className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-[#2A5A9E] text-white" onClick={handleResumeSession}>Resume</button>
              <button data-testid="button-dismiss-session" className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors" style={{ color: c.tx3, border: `1px solid ${c.bdr}` }} onClick={handleDismissSession}>Dismiss</button>
            </div>
          </div>
        )}

        {appState === 'empty' && (
          <div className={`flex flex-col items-center ${isMobile ? 'pt-4' : 'pt-16'}`}>
            <h1 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold mb-1`} data-testid="text-heading">QR Code Label Generator</h1>
            <p className={`${isMobile ? 'text-[12px]' : 'text-[15px]'} mb-5 text-center max-w-md px-2`} style={{ color: c.tx2 }}>Upload your asset data to generate ISO/IEC 18004 compliant QR codes for physical labels.</p>

            <div
              data-testid="dropzone"
              className={`w-full max-w-lg border-2 border-dashed rounded-2xl ${isMobile ? 'p-5' : 'p-10'} text-center cursor-pointer group transition-all`}
              style={{ borderColor: isDragging ? '#2A5A9E' : c.bdr, background: isDragging ? (d ? 'rgba(42,90,158,0.08)' : 'rgba(42,90,158,0.04)') : 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2A5A9E'; e.currentTarget.style.background = d ? 'rgba(42,90,158,0.05)' : 'rgba(42,90,158,0.03)'; }}
              onMouseLeave={(e) => { if (!isDragging) { e.currentTarget.style.borderColor = c.bdr; e.currentTarget.style.background = 'transparent'; } }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className={`${isMobile ? 'w-8 h-8 mb-3' : 'w-10 h-10 mb-4'} mx-auto transition-colors`} style={{ color: c.tx3 }} />
              {loadingFile ? (
                <p className="text-[14px] font-medium mb-1" style={{ color: '#00B0F0' }}>Processing file...</p>
              ) : (
                <>
                  <p className={`${isMobile ? 'text-[13px]' : 'text-[15px]'} font-medium mb-1`} style={{ color: c.tx2 }}>Drop your .xlsx, .csv, or .pdf file here</p>
                  <p className="text-[13px]" style={{ color: c.tx3 }}>or click to browse</p>
                </>
              )}
              <div className={`mt-3 flex items-center justify-center gap-1.5 text-[11px] ${isMobile ? 'flex-wrap' : ''}`} style={{ color: c.tx3 }}>
                <FileSpreadsheet className="w-3.5 h-3.5 flex-shrink-0" />
                <span>4 columns: Main Folder · Sub-Folder · Asset Tag · Payload</span>
              </div>
            </div>

            {fileError && (
              <div className="mt-4 flex items-center gap-2 text-[13px] px-4 py-2 rounded-lg" style={{ background: 'rgba(229,57,53,0.1)', color: '#E53935' }} data-testid="text-file-error">
                <AlertCircle className="w-4 h-4" />{fileError}
              </div>
            )}

            <button data-testid="button-load-demo" className="mt-5 flex items-center gap-2 text-[13px] transition-colors" style={{ color: c.tx3 }} onMouseEnter={(e) => (e.currentTarget.style.color = '#00B0F0')} onMouseLeave={(e) => (e.currentTarget.style.color = c.tx3)} onClick={handleLoadDemo}>
              <FileSpreadsheet className="w-4 h-4" />Load demo data (12 sample assets)
            </button>

            <button className="mt-2 flex items-center gap-2 text-[13px] transition-colors" style={{ color: c.tx3 }} onMouseEnter={(e) => (e.currentTarget.style.color = '#00B0F0')} onMouseLeave={(e) => (e.currentTarget.style.color = c.tx3)} onClick={() => setShowHowItWorks(true)}>
              <Info className="w-4 h-4" />How it works
            </button>
            <button data-testid="button-take-tour" className="mt-1 flex items-center gap-2 text-[13px] transition-colors" style={{ color: c.tx3 }} onMouseEnter={(e) => (e.currentTarget.style.color = '#00B0F0')} onMouseLeave={(e) => (e.currentTarget.style.color = c.tx3)} onClick={() => { const phase = appState === 'results' ? 'results' : appState === 'loaded' ? 'loaded' : 'landing'; resetTour(`ec-tour-${phase}`); setTourPhase(phase); setTourActive(true); }}>
              <Navigation className="w-4 h-4" />Take a tour
            </button>
          </div>
        )}

        {(appState === 'loaded' || appState === 'generating' || appState === 'results') && (
          <div>
            {appState !== 'results' && (
              <>
                <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex items-center justify-between'} mb-4`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileSpreadsheet className="w-5 h-5 text-[#2A5A9E] flex-shrink-0" />
                    <span className="text-[15px] font-semibold" data-testid="text-row-count">{rows.length} rows loaded</span>
                    <div className="flex items-center gap-2">
                      {validation.valid > 0 && <span className="flex items-center gap-1 text-[12px] text-[#4CAF50]"><CheckCircle className="w-3.5 h-3.5" />{validation.valid}</span>}
                      {validation.warnings > 0 && <span className="flex items-center gap-1 text-[12px] text-[#F5A623]"><AlertTriangle className="w-3.5 h-3.5" />{validation.warnings}</span>}
                      {validation.errors > 0 && <span className="flex items-center gap-1 text-[12px] text-[#E53935]"><XCircle className="w-3.5 h-3.5" />{validation.errors}</span>}
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
                    <button data-testid="button-payload-template" className="flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg transition-colors" style={{ color: c.tx3, border: `1px solid ${c.bdr}` }} onClick={() => setShowPayloadTemplate(true)}><Type className="w-3.5 h-3.5" />{!isMobile && 'QR Data'}</button>
                    {rawFileData && <button data-testid="button-remap" className="flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg font-semibold transition-colors" style={{ background: 'rgba(42,90,158,0.12)', color: '#2A5A9E', border: '1px solid rgba(42,90,158,0.3)' }} onClick={() => setShowColumnMapper(true)}><Columns className="w-3.5 h-3.5" />{!isMobile && 'Re-map Columns'}</button>}
                    <button data-testid="button-swap-file" className="flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg transition-colors" style={{ color: c.tx3, border: `1px solid ${c.bdr}` }} onClick={handleSwapFile}><Upload className="w-3.5 h-3.5" />{!isMobile && 'New file'}</button>
                    <div className="relative flex-1 min-w-0">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: c.tx3 }} />
                      <input data-testid="input-search" type="text" placeholder="Search assets..." className={`pl-8 pr-3 py-1.5 rounded-lg text-[13px] outline-none ${isMobile ? 'w-full' : 'w-48'}`} style={{ background: c.bg2, border: `1px solid ${c.bdr}`, color: c.tx }} value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setDataPage(0); }} />
                    </div>
                  </div>
                </div>

                {(() => {
                  const ROWS_PER_PAGE = 50;
                  const totalPages = Math.ceil(filteredRows.length / ROWS_PER_PAGE);
                  const pageRows = filteredRows.slice(dataPage * ROWS_PER_PAGE, (dataPage + 1) * ROWS_PER_PAGE);
                  const paginationBar = totalPages > 1 ? (
                    <div className="flex items-center justify-between py-2 px-1 mb-2">
                      <span className="text-[12px]" style={{ color: c.tx3 }}>Page {dataPage + 1} of {totalPages} ({filteredRows.length} rows)</span>
                      <div className="flex items-center gap-1">
                        <button data-testid="button-table-prev" className="px-2.5 py-1 rounded text-[12px] font-medium transition-colors disabled:opacity-30" style={{ color: c.tx2, border: `1px solid ${c.bdr}` }} disabled={dataPage === 0} onClick={() => setDataPage(p => p - 1)}>Prev</button>
                        <button data-testid="button-table-next" className="px-2.5 py-1 rounded text-[12px] font-medium transition-colors disabled:opacity-30" style={{ color: c.tx2, border: `1px solid ${c.bdr}` }} disabled={dataPage >= totalPages - 1} onClick={() => setDataPage(p => p + 1)}>Next</button>
                      </div>
                    </div>
                  ) : null;
                  return <>
                {paginationBar}
                {isMobile ? (
                  <div className="space-y-2 mb-4">
                    {pageRows.map((row, i) => {
                      const isDupe = row.warning?.startsWith('Duplicate');
                      return (
                        <div key={i} data-testid={`card-row-${row._idx}`} className="rounded-xl p-3" style={{ background: c.bg1, border: `1px solid ${isDupe ? '#F5A623' : c.bdr}`, borderLeftWidth: isDupe ? '3px' : '1px' }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <input type="checkbox" checked={selectedRows.has(row._idx)} onChange={() => handleSelectRow(row._idx)} data-testid={`checkbox-row-${row._idx}`} className="rounded flex-shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  {editingCell && editingCell.rowIdx === row._idx && editingCell.field === 'assetTag' ? (
                                    <input autoFocus data-testid={`input-edit-assetTag-${row._idx}`} className="w-full rounded px-1.5 py-0.5 text-[13px] font-semibold outline-none" style={{ background: c.bg, border: `1px solid #2A5A9E`, color: c.tx, fontFamily: "'JetBrains Mono', monospace" }} defaultValue={row.assetTag} placeholder="Enter asset tag" onKeyDown={(e) => { if (e.key === 'Enter') handleEditCell(row._idx, 'assetTag', (e.target as HTMLInputElement).value); if (e.key === 'Escape') setEditingCell(null); }} onBlur={(e) => handleEditCell(row._idx, 'assetTag', e.target.value)} />
                                  ) : (
                                    <span className="text-[13px] font-semibold truncate cursor-pointer" data-testid={`text-asset-tag-${row._idx}`} style={{ fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setEditingCell({ rowIdx: row._idx, field: 'assetTag' })}>{row.assetTag || <span className="italic text-[12px] font-normal" style={{ color: c.tx3, opacity: 0.6 }}>Tap to edit</span>}</span>
                                  )}
                                  {isDupe && <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0" style={{ background: 'rgba(245,166,35,0.15)', color: '#F5A623' }}>Dup</span>}
                                  {row.warning ? (row.valid ? <AlertTriangle className="w-3.5 h-3.5 text-[#F5A623] flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-[#E53935] flex-shrink-0" />) : <CheckCircle className="w-3.5 h-3.5 text-[#4CAF50] flex-shrink-0" />}
                                </div>
                                {editingCell && editingCell.rowIdx === row._idx && editingCell.field === 'folders' ? (
                                  <div className="flex gap-1 mt-1">
                                    <input autoFocus className="flex-1 rounded px-1.5 py-0.5 text-[11px] outline-none" style={{ background: c.bg, border: `1px solid #2A5A9E`, color: c.tx }} defaultValue={row.mainFolder} placeholder="Main folder" onKeyDown={(e) => { if (e.key === 'Enter') { handleEditCell(row._idx, 'mainFolder', (e.target as HTMLInputElement).value); } if (e.key === 'Escape') setEditingCell(null); }} onBlur={(e) => { handleEditCell(row._idx, 'mainFolder', e.target.value); }} />
                                    <input className="flex-1 rounded px-1.5 py-0.5 text-[11px] outline-none" style={{ background: c.bg, border: `1px solid #2A5A9E`, color: c.tx }} defaultValue={row.subFolder} placeholder="Sub folder" onKeyDown={(e) => { if (e.key === 'Enter') handleEditCell(row._idx, 'subFolder', (e.target as HTMLInputElement).value); if (e.key === 'Escape') setEditingCell(null); }} onBlur={(e) => handleEditCell(row._idx, 'subFolder', e.target.value)} />
                                  </div>
                                ) : (
                                  <div className="text-[11px] truncate mt-0.5 cursor-pointer" style={{ color: c.tx3 }} onClick={() => setEditingCell({ rowIdx: row._idx, field: 'folders' })}>
                                    {[row.mainFolder, row.subFolder].filter(Boolean).join(' / ') || <span className="italic" style={{ opacity: 0.6 }}>Tap to add folders</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button data-testid={`button-delete-row-${row._idx}`} aria-label={`Delete row ${row.assetTag}`} className="p-1.5 rounded flex-shrink-0" style={{ color: '#E53935' }} onClick={() => handleDeleteRow(row._idx)}><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                          {editingCell && editingCell.rowIdx === row._idx && editingCell.field === 'payload' ? (
                            <textarea
                              autoFocus
                              data-testid={`input-edit-payload-${row._idx}`}
                              className="w-full rounded px-2 py-1.5 text-[11px] outline-none resize-none mt-2"
                              style={{ background: c.bg, border: `1px solid #2A5A9E`, color: c.tx, fontFamily: "'JetBrains Mono', monospace", minHeight: '50px' }}
                              defaultValue={row.payload}
                              placeholder="Enter payload data..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditCell(row._idx, 'payload', (e.target as HTMLTextAreaElement).value); }
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              onBlur={(e) => handleEditCell(row._idx, 'payload', e.target.value)}
                            />
                          ) : (
                            <div className="flex items-center gap-1 mt-2" data-testid={`cell-payload-${row._idx}`} onClick={() => setEditingCell({ rowIdx: row._idx, field: 'payload' })}>
                              <span className="text-[11px] px-2 py-1 rounded truncate flex-1 text-left cursor-pointer" style={{ background: c.bg3, color: row.payload ? '#00B0F0' : c.tx3, fontFamily: "'JetBrains Mono', monospace" }}>
                                {row.payload ? row.payload.substring(0, 50) + (row.payload.length > 50 ? '...' : '') : <span className="italic" style={{ opacity: 0.6 }}>Tap to edit payload</span>}
                              </span>
                              {row.payload && (
                                <button className="p-1 rounded flex-shrink-0" style={{ color: c.tx3 }} onClick={(e) => { e.stopPropagation(); setShowPayloadModal(row); }} title="Expand"><Maximize2 className="w-3 h-3" /></button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                <div data-testid="data-table-area" className="rounded-xl overflow-hidden mb-4" style={{ border: `1px solid ${c.bdr}` }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr style={{ background: c.bg2 }}>
                          <th className="w-10 px-3 py-2.5 text-center">
                            <input type="checkbox" checked={selectedRows.size === rows.length && rows.length > 0} onChange={handleSelectAll} data-testid="checkbox-select-all" className="rounded" />
                          </th>
                          <th className="px-3 py-2.5 text-left font-semibold cursor-pointer select-none" style={{ color: c.tx2 }} onClick={() => handleSort('mainFolder')}>
                            <div className="flex items-center gap-1">Folder <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          <th className="px-3 py-2.5 text-left font-semibold cursor-pointer select-none" style={{ color: c.tx2 }} onClick={() => handleSort('subFolder')}>
                            <div className="flex items-center gap-1">Sub-Folder <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          <th className="px-3 py-2.5 text-left font-semibold cursor-pointer select-none" style={{ color: c.tx2 }} onClick={() => handleSort('assetTag')}>
                            <div className="flex items-center gap-1">Asset Tag <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          <th className="px-3 py-2.5 text-left font-semibold" style={{ color: c.tx2 }}>Payload</th>
                          <th className="px-3 py-2.5 text-left font-semibold w-12" style={{ color: c.tx2 }}>Status</th>
                          <th className="px-3 py-2.5 text-center font-semibold w-10" style={{ color: c.tx2 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((row, i) => {
                          const isDupe = row.warning?.startsWith('Duplicate');
                          const editableCell = (field: string, value: string, mono?: boolean) => {
                            if (editingCell && editingCell.rowIdx === row._idx && editingCell.field === field) {
                              return (
                                <input
                                  autoFocus
                                  data-testid={`input-edit-${field}-${row._idx}`}
                                  className="w-full rounded px-1.5 py-0.5 text-[13px] outline-none"
                                  style={{ background: c.bg, border: `1px solid #2A5A9E`, color: c.tx, fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit' }}
                                  defaultValue={value}
                                  placeholder={field === 'assetTag' ? 'Enter asset tag' : field === 'mainFolder' ? 'Enter main folder' : 'Enter sub folder'}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleEditCell(row._idx, field, (e.target as HTMLInputElement).value);
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  onBlur={(e) => handleEditCell(row._idx, field, e.target.value)}
                                />
                              );
                            }
                            return (
                              <div className="group/cell flex items-center gap-1 cursor-pointer min-w-[60px] min-h-[24px] rounded px-1 -mx-1 transition-colors hover:bg-black/5 dark:hover:bg-white/5" onClick={() => setEditingCell({ rowIdx: row._idx, field })} data-testid={`cell-${field}-${row._idx}`}>
                                {value ? (
                                  <span style={{ color: c.tx2, fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit' }}>{value}</span>
                                ) : (
                                  <span className="italic text-[12px]" style={{ color: c.tx3, opacity: 0.6 }}>Click to edit</span>
                                )}
                                <Pencil className="w-3 h-3 opacity-0 group-hover/cell:opacity-40 flex-shrink-0" style={{ color: c.tx3 }} />
                              </div>
                            );
                          };
                          return (
                          <tr key={i} className="transition-colors" style={{ background: isDupe ? (d ? 'rgba(245,166,35,0.06)' : 'rgba(245,166,35,0.08)') : (i % 2 === 0 ? 'transparent' : c.bg2), borderTop: `1px solid ${c.bdr}`, borderLeft: isDupe ? '3px solid #F5A623' : '3px solid transparent' }} onMouseEnter={(e) => (e.currentTarget.style.background = d ? 'rgba(42,90,158,0.08)' : 'rgba(42,90,158,0.04)')} onMouseLeave={(e) => (e.currentTarget.style.background = isDupe ? (d ? 'rgba(245,166,35,0.06)' : 'rgba(245,166,35,0.08)') : (i % 2 === 0 ? 'transparent' : c.bg2))}>
                            <td className="px-3 py-2 text-center">
                              <input type="checkbox" checked={selectedRows.has(row._idx)} onChange={() => handleSelectRow(row._idx)} data-testid={`checkbox-row-${row._idx}`} className="rounded" />
                            </td>
                            <td className="px-3 py-2">{editableCell('mainFolder', row.mainFolder)}</td>
                            <td className="px-3 py-2">{editableCell('subFolder', row.subFolder)}</td>
                            <td className="px-3 py-2 font-semibold" data-testid={`text-asset-tag-${row._idx}`}>
                              <div className="flex items-center gap-2">
                                {editableCell('assetTag', row.assetTag, true)}
                                {isDupe && <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: 'rgba(245,166,35,0.15)', color: '#F5A623' }}>Duplicate</span>}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {editingCell && editingCell.rowIdx === row._idx && editingCell.field === 'payload' ? (
                                <textarea
                                  autoFocus
                                  data-testid={`input-edit-payload-${row._idx}`}
                                  className="w-full rounded px-2 py-1.5 text-[12px] outline-none resize-none"
                                  style={{ background: c.bg, border: `1px solid #2A5A9E`, color: c.tx, fontFamily: "'JetBrains Mono', monospace", minHeight: '60px', maxWidth: '250px' }}
                                  defaultValue={row.payload}
                                  placeholder="Enter payload data..."
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditCell(row._idx, 'payload', (e.target as HTMLTextAreaElement).value); }
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  onBlur={(e) => handleEditCell(row._idx, 'payload', e.target.value)}
                                />
                              ) : (
                                <div className="flex items-center gap-1 group/payload">
                                  <div className="cursor-pointer rounded px-2 py-1 text-[12px] truncate max-w-[180px] transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ fontFamily: "'JetBrains Mono', monospace", color: row.payload ? '#00B0F0' : c.tx3 }} onClick={() => setEditingCell({ rowIdx: row._idx, field: 'payload' })} data-testid={`cell-payload-${row._idx}`}>
                                    {row.payload ? row.payload.substring(0, 35) + (row.payload.length > 35 ? '...' : '') : <span className="italic text-[11px]" style={{ opacity: 0.6 }}>Click to edit</span>}
                                  </div>
                                  {row.payload && (
                                    <button className="p-0.5 rounded opacity-0 group-hover/payload:opacity-60 transition-opacity" style={{ color: c.tx3 }} onClick={() => setShowPayloadModal(row)} title="Expand payload"><Maximize2 className="w-3 h-3" /></button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {row.warning ? (
                                <div className="flex items-center gap-1" title={row.warning}>
                                  {row.valid ? <AlertTriangle className="w-4 h-4 text-[#F5A623]" /> : <AlertCircle className="w-4 h-4 text-[#E53935]" />}
                                </div>
                              ) : (
                                <CheckCircle className="w-4 h-4 text-[#4CAF50]" />
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button data-testid={`button-delete-row-${row._idx}`} aria-label={`Delete row ${row.assetTag}`} className="p-1 rounded opacity-40 hover:opacity-100 transition-opacity" style={{ color: '#E53935' }} onClick={() => handleDeleteRow(row._idx)} title="Delete row"><Trash2 className="w-3.5 h-3.5" /></button>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                )}
                {paginationBar}
                </>;
                })()}
                <button data-testid="button-add-row" className="flex items-center gap-1.5 text-[12px] mt-2 mb-1 transition-colors" style={{ color: c.tx3 }} onMouseEnter={(e) => (e.currentTarget.style.color = '#00B0F0')} onMouseLeave={(e) => (e.currentTarget.style.color = c.tx3)} onClick={handleAddRow}><Plus className="w-3.5 h-3.5" />Add row</button>
              </>
            )}

            {appState === 'loaded' && (
              <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex items-center justify-between'} rounded-xl px-4 py-3`} style={{ background: c.bg1, border: `1px solid ${c.bdr}` }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <Settings className="w-3.5 h-3.5 flex-shrink-0" style={{ color: c.tx3 }} />
                  <span className={`${isMobile ? 'text-[12px]' : 'text-[13px]'}`} style={{ color: c.tx3 }}>{configSummary}</span>
                  <button data-testid="button-edit-config" className="text-[13px] text-[#00B0F0] ml-1" onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')} onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')} onClick={() => setShowConfig(true)}>QR Config</button>
                </div>
                <button data-testid="button-generate" className={`flex items-center justify-center gap-2 bg-[#2A5A9E] text-white ${isMobile ? 'px-4 py-2.5 w-full' : 'px-5 py-2.5'} rounded-lg font-semibold text-[14px] transition-colors shadow-lg disabled:opacity-40 disabled:cursor-not-allowed`} style={{ boxShadow: '0 4px 14px rgba(42,90,158,0.25)' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#1B3F6F')} onMouseLeave={(e) => (e.currentTarget.style.background = '#2A5A9E')} onClick={handleGenerate} disabled={validation.errors > 0 && selectedRows.size === 0}>
                  {generatedCount > 0 ? <RotateCcw className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}{generatedCount > 0 ? 'Re-generate' : 'Generate'} {selectedRows.size > 0 ? `${selectedRows.size} selected` : `all ${validation.valid + validation.warnings}`}
                </button>
              </div>
            )}

            {appState === 'generating' && (
              <div className="rounded-xl px-4 py-4" style={{ background: c.bg1, border: `1px solid ${c.bdr}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px]" style={{ color: c.tx2 }}>Processing {progress.current.toLocaleString()} of {progress.total.toLocaleString()} — <span className="font-medium" style={{ color: c.tx, fontFamily: "'JetBrains Mono', monospace" }}>{progress.asset}</span></span>
                  <button data-testid="button-cancel-generate" className="text-[13px] text-[#E53935]" onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')} onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')} onClick={handleCancelGenerate}>Cancel</button>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: c.bg3 }}>
                  <div className="h-full rounded-full transition-all duration-150" style={{ background: 'linear-gradient(90deg, #00B0F0, #2A5A9E)', width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }} />
                </div>
                <div className="text-[12px] mt-1.5" style={{ color: c.tx3 }}>{Math.round(progress.total > 0 ? (progress.current / progress.total) * 100 : 0)}% complete</div>
              </div>
            )}

            {appState === 'results' && (
              <div>
                <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex items-center justify-between'} rounded-xl px-4 py-3 mb-4`} style={{ background: c.bg1, border: `1px solid ${c.bdr}` }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(76,175,80,0.15)' }}><Check className="w-4 h-4 text-[#4CAF50]" /></div>
                    <span className={`${isMobile ? 'text-[13px]' : 'text-[14px]'} font-medium`} data-testid="text-generated-count">{generatedCount.toLocaleString()} QR codes</span>
                    {generationWarning && <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" data-testid="badge-generation-warning" style={{ background: 'rgba(229,57,53,0.15)', color: '#E53935' }}><AlertTriangle className="w-3 h-3 inline mr-1" />{generationWarning}</span>}
                    {duplicateSummary && <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" data-testid="badge-duplicates" style={{ background: 'rgba(245,166,35,0.15)', color: '#F5A623' }}>{duplicateSummary.dupes} duplicates</span>}
                    {!isMobile && <span className="text-[12px]" style={{ color: c.tx3 }}>· just now</span>}
                    {!isMobile && <span className="text-[11px] px-1" style={{ color: c.tx3 }}>·</span>}
                    {editingFilename ? (
                      <input
                        data-testid="input-export-filename"
                        autoFocus
                        className={`text-[12px] px-2 py-0.5 rounded outline-none ${isMobile ? 'w-full' : 'w-44'}`}
                        style={{ background: c.bg, border: `1px solid #2A5A9E`, color: c.tx, fontFamily: "'JetBrains Mono', monospace" }}
                        defaultValue={exportFilename}
                        onKeyDown={(e) => { if (e.key === 'Enter') { setExportFilename((e.target as HTMLInputElement).value || 'Electracom_QR_Codes'); setEditingFilename(false); } if (e.key === 'Escape') setEditingFilename(false); }}
                        onBlur={(e) => { setExportFilename(e.target.value || 'Electracom_QR_Codes'); setEditingFilename(false); }}
                      />
                    ) : (
                      <button data-testid="button-edit-filename" className="flex items-center gap-1 text-[12px] transition-colors truncate" style={{ color: c.tx3, fontFamily: "'JetBrains Mono', monospace" }} onClick={() => setEditingFilename(true)} title="Edit export filename">
                        <FileText className="w-3 h-3 flex-shrink-0" /><span className="truncate">{exportFilename}</span><Pencil className="w-2.5 h-2.5 ml-0.5 opacity-50 flex-shrink-0" />
                      </button>
                    )}
                  </div>
                  <div className={`flex items-center gap-1.5 ${isMobile ? 'flex-wrap' : ''}`}>
                    <button data-testid="button-download-zip" className={`flex items-center gap-1.5 bg-[#4CAF50] text-white ${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'} rounded-lg font-semibold text-[13px] transition-colors`} onMouseEnter={(e) => (e.currentTarget.style.background = '#388E3C')} onMouseLeave={(e) => (e.currentTarget.style.background = '#4CAF50')} onClick={handleDownloadZip}><Download className="w-4 h-4" />{!isMobile && 'ZIP'}</button>
                    {!isMobile && <div className="w-px h-5 mx-0.5" style={{ background: c.bdr }} />}
                    <div className="flex items-center">
                      <button data-testid="button-download-pdf" className={`flex items-center gap-1.5 bg-[#2A5A9E] text-white ${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'} rounded-l-lg font-semibold text-[13px] transition-colors`} onMouseEnter={(e) => (e.currentTarget.style.background = '#1B3F6F')} onMouseLeave={(e) => (e.currentTarget.style.background = '#2A5A9E')} onClick={handleDownloadPDF}><FileText className="w-4 h-4" />{!isMobile && 'PDF'}</button>
                      <select data-testid="select-export-paper-size" className="bg-[#1B3F6F] text-white text-[11px] font-semibold border-l border-white/20 outline-none cursor-pointer" style={{ padding: isMobile ? '6px 4px 6px 2px' : '8px 6px 8px 4px' }} value={config.paperSize} onChange={(e) => handleUpdateConfig('paperSize', e.target.value)} title="Paper size for PDF and Print">
                        {Object.entries(PAPER_SIZES).map(([key, ps]) => <option key={key} value={key}>{key.toUpperCase()}</option>)}
                      </select>
                      <button data-testid="button-print" className={`flex items-center gap-1.5 ${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'} rounded-r-lg font-semibold text-[13px] transition-colors`} style={{ background: d ? '#1B3F6F' : '#3d6db5', color: 'white' }} onMouseEnter={(e) => (e.currentTarget.style.background = d ? '#153055' : '#2A5A9E')} onMouseLeave={(e) => (e.currentTarget.style.background = d ? '#1B3F6F' : '#3d6db5')} onClick={() => setShowPrintPreview(true)}><Printer className="w-4 h-4" />{!isMobile && 'Print'}</button>
                    </div>
                    {!isMobile && <div className="w-px h-5 mx-0.5" style={{ background: c.bdr }} />}
                    <button data-testid="button-verify" className={`flex items-center gap-1.5 ${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'} rounded-lg font-semibold text-[13px] transition-colors`} style={{ background: c.bg3, color: c.tx, border: `1px solid ${c.bdr}` }} onClick={handleStartVerify}><ScanLine className="w-4 h-4" />{!isMobile && 'Verify'}</button>
                    <button data-testid="button-folder-tree" className={`flex items-center gap-1.5 ${isMobile ? 'px-2.5 py-1.5' : 'px-3 py-2'} rounded-lg text-[13px] transition-colors`} style={{ color: c.tx3 }} onClick={() => setShowFolderTree(true)}><FolderOpen className="w-3.5 h-3.5" />{!isMobile && 'Folders'}</button>
                    <button data-testid="button-regenerate" className={`flex items-center gap-1.5 text-[13px] ${isMobile ? 'px-2.5 py-1.5' : 'px-3 py-2'} transition-colors`} style={{ color: c.tx3 }} onClick={() => setAppState('loaded')}><RotateCcw className="w-3.5 h-3.5" />{!isMobile && 'Edit Data'}</button>
                  </div>
                </div>

                {!isMobile && <div className="flex items-center gap-2 mb-4 px-1">
                  <Settings className="w-3.5 h-3.5" style={{ color: c.tx3 }} />
                  <span className="text-[12px]" style={{ color: c.tx3 }}>{configSummary}</span>
                  <button className="text-[12px] text-[#00B0F0]" onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')} onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')} onClick={() => { setShowConfig(true); }}>QR Config</button>
                </div>}

                <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? Math.min(Math.max(config.labelW * 1.8, 100), 140) : Math.min(Math.max(config.labelW * 2.2, 120), 200)}px, 1fr))` }}>
                  {pageItems.map((item, i) => (
                    <div key={i} data-testid={`card-qr-${i}`} className="rounded-xl overflow-hidden cursor-pointer transition-all relative group" style={{ background: c.bg1, border: `1px solid ${c.bdr}` }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2A5A9E'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.bdr; e.currentTarget.style.transform = 'translateY(0)'; }} onClick={() => { setScanIndex(galleryPage * PER_PAGE + i); setShowScanViewer(true); }}>
                      <div className="bg-white p-3 flex items-center justify-center relative" style={{ aspectRatio: `${config.labelW} / ${config.labelH}` }}>
                        {item.dataURL ? <img src={item.dataURL} alt={item.assetTag} title={item.payload || 'No payload'} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} /> : <div className="text-gray-400 text-sm">Error</div>}
                        {item.dataURL && (
                          <button
                            data-testid={`button-download-qr-${i}`}
                            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: 'rgba(42,90,158,0.9)', color: 'white' }}
                            onClick={(e) => { e.stopPropagation(); handleSaveImage(item); }}
                            title="Download this QR"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="text-[12px] font-semibold text-center truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{item.assetTag}</div>
                        <div className="text-[11px] text-center truncate mt-0.5" style={{ color: c.tx3 }}>{[item.mainFolder, item.subFolder].filter(Boolean).join(' / ')}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <button className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: c.tx3 }} disabled={galleryPage === 0} onClick={() => setGalleryPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-[12px]" style={{ color: c.tx3, fontFamily: "'JetBrains Mono', monospace" }}>{galleryPage + 1} / {totalPages}</span>
                    <button className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: c.tx3 }} disabled={galleryPage >= totalPages - 1} onClick={() => setGalleryPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <QRConfigPanel
        showConfig={showConfig}
        setShowConfig={setShowConfig}
        config={config}
        handleUpdateConfig={handleUpdateConfig}
        activePreset={activePreset}
        handleSelectPreset={handleSelectPreset}
        customPresets={customPresets}
        handleDeleteCustomPreset={handleDeleteCustomPreset}
        handleSaveCustomPreset={handleSaveCustomPreset}
        newPresetName={newPresetName}
        setNewPresetName={setNewPresetName}
        computedModSize={computedModSize}
        generatedImages={generatedImages}
        previewDataURL={previewDataURL}
        rows={rows}
        isMobile={isMobile}
        d={d}
        c={c}
        PRESETS={PRESETS}
        EC_LABELS={EC_LABELS}
        PAPER_SIZES={PAPER_SIZES}
      />

      {showPayloadModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: d ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)' }} onClick={() => setShowPayloadModal(null)} />
          <div className="relative rounded-2xl max-w-lg w-[90%] p-6 shadow-2xl" style={{ background: c.bg1, border: `1px solid ${c.bdr}` }}>
            <button className="absolute top-4 right-4 p-1" style={{ color: c.tx3 }} onClick={() => setShowPayloadModal(null)}><X className="w-4 h-4" /></button>
            <h3 className="text-[16px] font-bold mb-1">Payload Data</h3>
            <p className="text-[13px] mb-4" style={{ color: c.tx3, fontFamily: "'JetBrains Mono', monospace" }}>{showPayloadModal.assetTag} — {[showPayloadModal.mainFolder, showPayloadModal.subFolder].filter(Boolean).join(' / ')}</p>
            {showPayloadModal.warning && <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg text-[12px]" style={{ background: showPayloadModal.valid ? 'rgba(245,166,35,0.1)' : 'rgba(229,57,53,0.1)', color: showPayloadModal.valid ? '#F5A623' : '#E53935' }}>{showPayloadModal.valid ? <AlertTriangle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}{showPayloadModal.warning}</div>}
            <pre className="rounded-xl p-4 text-[13px] text-[#00B0F0] overflow-x-auto whitespace-pre-wrap break-all leading-relaxed" style={{ background: c.bg, border: `1px solid ${c.bdr}`, fontFamily: "'JetBrains Mono', monospace" }}>{prettyPayload(showPayloadModal.payload)}</pre>
            <button data-testid="button-copy-payload" className="mt-3 flex items-center gap-1.5 text-[12px] transition-colors" style={{ color: copied ? '#4CAF50' : c.tx3 }} onClick={() => handleCopy(showPayloadModal.payload)}>{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copied ? 'Copied!' : 'Copy payload'}</button>
          </div>
        </div>
      )}

      {showScanViewer && galleryItems[scanIndex] && (() => {
        const item = galleryItems[scanIndex];
        return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.92)' }} onClick={(e) => { if (e.target === e.currentTarget) setShowScanViewer(false); }}>
          <div className={`bg-white rounded-2xl ${isMobile ? 'max-w-full w-[95%]' : 'max-w-[460px] w-[92%]'} relative`} style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
            <button data-testid="button-close-scan" className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 transition-colors z-10" onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f0f0'; e.currentTarget.style.color = '#111'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#999'; }} onClick={() => setShowScanViewer(false)}><X className="w-5 h-5" /></button>

            <div className={`${isMobile ? 'px-4 pt-4 pb-3' : 'px-8 pt-8 pb-4'} flex items-center justify-center`}>
              <div className={`w-full aspect-square ${isMobile ? 'max-w-[220px]' : 'max-w-[280px]'} bg-[#f8f8f8] rounded-xl border-2 border-[#e8e8e8] flex items-center justify-center`}>
                {item.dataURL ? <img src={item.dataURL} alt={item.assetTag} title={item.payload || 'No payload'} className="w-full h-full object-contain p-2" style={{ imageRendering: 'pixelated' }} /> : <div className="text-gray-400">No QR</div>}
              </div>
            </div>

            <div className={`text-center ${isMobile ? 'px-4' : 'px-6'}`}>
              <div className={`${isMobile ? 'text-[17px]' : 'text-[20px]'} font-bold text-[#111]`} style={{ fontFamily: "'DM Sans', sans-serif" }}>{item.assetTag}</div>
              <div className="text-[13px] text-[#777] mt-1">{[item.mainFolder, item.subFolder].filter(Boolean).join(' / ') || 'No folder'}</div>
            </div>

            <div className={`${isMobile ? 'mx-4' : 'mx-6'} my-3 h-px bg-[#e8e8e8]`} />

            <div className={`${isMobile ? 'px-4' : 'px-6'}`}>
              <div className="text-[11px] font-semibold text-[#999] uppercase tracking-wider mb-1.5">Encoded Payload</div>
              <pre className={`bg-[#f5f6f8] border border-[#e0e2e8] rounded-lg ${isMobile ? 'p-2 text-[11px] max-h-[100px]' : 'p-3 text-[12px] max-h-[130px]'} text-[#2a5a9e] whitespace-pre-wrap break-all leading-relaxed overflow-auto`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>{prettyPayload(item.payload)}</pre>
            </div>

            {!isMobile && <div className="flex items-center justify-center gap-2 mt-3 px-6 text-[12px] text-[#aaa]">
              <Smartphone className="w-4 h-4" />
              <span>Point your phone camera at the QR code to verify</span>
            </div>}

            <div className={`flex items-center justify-center gap-3 ${isMobile ? 'px-4 pt-3 pb-1.5' : 'px-6 pt-4 pb-2'}`}>
              <button data-testid="button-scan-prev" className={`flex items-center gap-1.5 ${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'} rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-30`} style={{ background: '#f0f2f5', border: '1px solid #ddd', color: '#555' }} disabled={scanIndex === 0} onClick={() => setScanIndex(p => p - 1)}><ArrowLeft className="w-4 h-4" />{!isMobile && 'Prev'}</button>
              <span className="text-[13px] text-[#999] px-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{scanIndex + 1} / {galleryItems.length}</span>
              <button data-testid="button-scan-next" className={`flex items-center gap-1.5 ${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'} rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-30`} style={{ background: '#f0f2f5', border: '1px solid #ddd', color: '#555' }} disabled={scanIndex >= galleryItems.length - 1} onClick={() => setScanIndex(p => p + 1)}>{!isMobile && 'Next'}<ArrowRight className="w-4 h-4" /></button>
            </div>

            <div className={`flex items-center gap-2 ${isMobile ? 'px-4 pb-4' : 'px-6 pb-5'}`}>
              <button data-testid="button-copy-scan-payload" className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold transition-colors" style={{ background: '#f0f2f5', border: '1px solid #ddd', color: '#555' }} onClick={() => handleCopy(item.payload)}>{copied ? <Check className="w-3.5 h-3.5 text-[#4CAF50]" /> : <Copy className="w-3.5 h-3.5" />}{copied ? 'Copied!' : 'Copy'}</button>
              <button data-testid="button-save-image" className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold transition-colors" style={{ background: '#f0f2f5', border: '1px solid #ddd', color: '#555' }} onClick={() => handleSaveImage(item)}><Download className="w-3.5 h-3.5" />Save</button>
            </div>
          </div>

          {!isMobile && <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-4 text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 rounded" style={{ border: '1px solid rgba(255,255,255,0.2)', fontSize: '10px' }}>ESC</span> Close</span>
            <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 rounded" style={{ border: '1px solid rgba(255,255,255,0.2)', fontSize: '10px' }}>←</span><span className="px-1.5 py-0.5 rounded" style={{ border: '1px solid rgba(255,255,255,0.2)', fontSize: '10px' }}>→</span> Navigate</span>
          </div>}
        </div>
        );
      })()}

      {showPrintPreview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: d ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)' }} onClick={() => { setShowPrintPreview(false); setPrintPayloadView(null); }} />
          <div className={`relative rounded-2xl ${isMobile ? 'w-[95%]' : 'max-w-3xl w-[90%]'} max-h-[88vh] overflow-hidden flex flex-col shadow-2xl`} style={{ background: c.bg1, border: `1px solid ${c.bdr}` }}>
            <div className={`${isMobile ? 'px-4 py-3' : 'px-6 py-4'} flex items-center justify-between flex-shrink-0`} style={{ borderBottom: `1px solid ${c.bdr}` }}>
              <div className="min-w-0">
                <h3 className="text-[16px] font-bold">Print Preview</h3>
                {!isMobile && <p className="text-[12px] mt-0.5" style={{ color: c.tx3 }}>Click a label to inspect payload · Check/uncheck to select for printing</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button data-testid="button-print-select-all" className={`${isMobile ? 'px-2 py-1' : 'px-3 py-1.5'} rounded-lg text-[12px] font-medium transition-colors`} style={{ background: c.bg2, color: c.tx2, border: `1px solid ${c.bdr}` }} onClick={() => setPrintSelected(new Set(generatedImages.map((_, i) => i)))}>Select All</button>
                <button data-testid="button-print-deselect-all" className={`${isMobile ? 'px-2 py-1' : 'px-3 py-1.5'} rounded-lg text-[12px] font-medium transition-colors`} style={{ background: c.bg2, color: c.tx2, border: `1px solid ${c.bdr}` }} onClick={() => setPrintSelected(new Set())}>Deselect All</button>
                {!isMobile && <span className="text-[12px]" style={{ color: c.tx3 }}>{printSelected.size > 0 ? `${printSelected.size} selected` : 'All labels'}</span>}
                <button data-testid="button-print-execute" className={`flex items-center gap-1.5 bg-[#2A5A9E] text-white ${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'} rounded-lg font-semibold text-[13px]`} onClick={handlePrint}><Printer className="w-4 h-4" />{!isMobile && 'Print'}</button>
                <button className="p-1.5 rounded-lg" aria-label="Close print preview" style={{ color: c.tx3 }} onClick={() => { setShowPrintPreview(false); setPrintPayloadView(null); }}><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.min(Math.max(config.labelW * 2, 110), 180)}px, 1fr))` }}>
                {generatedImages.map((item, i) => (
                  <div key={i} className="rounded-xl overflow-hidden relative" style={{ background: c.bg2, border: `1px solid ${printSelected.has(i) ? '#2A5A9E' : c.bdr}` }}>
                    <div className="absolute top-2 left-2 z-10">
                      <input type="checkbox" checked={printSelected.has(i)} onChange={() => { setPrintSelected(prev => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; }); }} className="rounded" />
                    </div>
                    <div className="bg-white p-2 flex items-center justify-center cursor-pointer" style={{ aspectRatio: `${config.labelW} / ${config.labelH}` }} onClick={() => setPrintPayloadView(printPayloadView === i ? null : i)}>
                      {item.dataURL ? <img src={item.dataURL} alt={item.assetTag} title={item.payload || 'No payload'} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">Error</div>}
                    </div>
                    <div className="p-2 text-center">
                      <div className="text-[11px] font-semibold truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{item.assetTag}</div>
                      <div className="text-[10px] truncate" style={{ color: c.tx3 }}>{[item.mainFolder, item.subFolder].filter(Boolean).join(' / ')}</div>
                    </div>
                    {printPayloadView === i && (
                      <div className="p-2" style={{ borderTop: `1px solid ${c.bdr}` }}>
                        <pre className="text-[10px] text-[#00B0F0] whitespace-pre-wrap break-all max-h-20 overflow-auto" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{prettyPayload(item.payload)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showVerifyModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: d ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)' }} onClick={handleCloseVerify} />
          <div className="relative rounded-2xl max-w-lg w-[90%] max-h-[80vh] overflow-hidden flex flex-col shadow-2xl" style={{ background: c.bg1, border: `1px solid ${c.bdr}` }}>
            <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: `1px solid ${c.bdr}` }}>
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-[#2A5A9E]" />
                <h3 className="text-[16px] font-bold">QR Verification</h3>
              </div>
              <button className="p-1.5 rounded-lg" style={{ color: c.tx3 }} onClick={handleCloseVerify}><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-3" style={{ borderBottom: `1px solid ${c.bdr}` }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px]" style={{ color: c.tx2 }}>{verifyRunning ? 'Verifying...' : 'Complete'}</span>
                <span className="text-[13px] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{verifyProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: c.bg3 }}>
                <div className="h-full rounded-full transition-all duration-150" style={{ background: 'linear-gradient(90deg, #4CAF50, #2A5A9E)', width: `${verifyProgress}%` }} />
              </div>
              {!verifyRunning && verifyResults.length > 0 && (
                <div className="flex items-center gap-4 mt-2 text-[12px]">
                  <span className="text-[#4CAF50]">{verifyResults.filter(r => r.passed).length} passed</span>
                  <span className="text-[#E53935]">{verifyResults.filter(r => !r.passed).length} failed</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {verifyResults.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: r.passed ? 'rgba(76,175,80,0.08)' : 'rgba(229,57,53,0.08)', border: `1px solid ${r.passed ? 'rgba(76,175,80,0.2)' : 'rgba(229,57,53,0.2)'}` }}>
                  {r.passed ? <CheckCircle className="w-4 h-4 text-[#4CAF50] flex-shrink-0" /> : <XCircle className="w-4 h-4 text-[#E53935] flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{r.assetTag}</div>
                    <div className="text-[11px]" style={{ color: c.tx3 }}>{r.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showFolderTree && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: d ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)' }} onClick={() => setShowFolderTree(false)} />
          <div className="relative rounded-2xl max-w-md w-[90%] max-h-[80vh] overflow-hidden flex flex-col shadow-2xl" style={{ background: c.bg1, border: `1px solid ${c.bdr}` }}>
            <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: `1px solid ${c.bdr}` }}>
              <div className="flex items-center gap-3">
                <FolderOpen className="w-5 h-5 text-[#F5A623]" />
                <h3 className="text-[16px] font-bold">ZIP Structure</h3>
              </div>
              <div className="flex items-center gap-2">
                <button data-testid="button-download-zip-modal" className="flex items-center gap-2 bg-[#4CAF50] text-white px-3 py-1.5 rounded-lg font-semibold text-[12px]" onClick={handleDownloadZip}><Download className="w-3.5 h-3.5" />Download ZIP</button>
                <button className="p-1.5 rounded-lg" style={{ color: c.tx3 }} onClick={() => setShowFolderTree(false)}><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {Object.entries(folderTree).map(([main, subs]) => (
                <div key={main} className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Folder className="w-4 h-4 text-[#F5A623]" />
                    <span className="text-[13px] font-semibold">{main}</span>
                  </div>
                  {Object.entries(subs).map(([sub, assets]) => (
                    <div key={sub} className="ml-6 mb-2">
                      {sub && (
                        <div className="flex items-center gap-2 mb-1">
                          <Folder className="w-3.5 h-3.5 text-[#F5A623]" />
                          <span className="text-[12px] font-medium" style={{ color: c.tx2 }}>{sub}</span>
                        </div>
                      )}
                      <div className={sub ? 'ml-5' : ''}>
                        {assets.map((tag, k) => (
                          <div key={k} className="flex items-center gap-2 py-0.5">
                            <File className="w-3 h-3" style={{ color: c.tx3 }} />
                            <span className="text-[11px]" style={{ color: c.tx3, fontFamily: "'JetBrains Mono', monospace" }}>{tag}.png</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showHowItWorks && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: d ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)' }} onClick={() => setShowHowItWorks(false)} />
          <div className="relative rounded-2xl max-w-lg w-[90%] p-6 shadow-2xl" style={{ background: c.bg1, border: `1px solid ${c.bdr}` }}>
            <button className="absolute top-4 right-4 p-1" style={{ color: c.tx3 }} onClick={() => setShowHowItWorks(false)}><X className="w-4 h-4" /></button>
            <h3 className="text-[16px] font-bold mb-4">How It Works</h3>
            <div className="space-y-4 text-[13px]" style={{ color: c.tx2 }}>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[12px] font-bold text-white bg-[#2A5A9E]">1</div>
                <div><strong className="block" style={{ color: c.tx }}>Upload your data</strong>Drop an Excel (.xlsx), CSV, or PDF file with 4 columns: Main Folder, Sub-Folder, Asset Tag, and Payload (JSON).</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[12px] font-bold text-white bg-[#F5A623]">2</div>
                <div><strong className="block" style={{ color: c.tx }}>Review & configure</strong>Check validation warnings, select rows, and adjust QR settings (error correction, size, DPI).</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[12px] font-bold text-white bg-[#4CAF50]">3</div>
                <div><strong className="block" style={{ color: c.tx }}>Generate & export</strong>Generate ISO/IEC 18004 QR codes. Download as ZIP (folder structure) or PDF (print-ready A4 label sheets). Print directly or verify with jsQR decode.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDuplicateModal && (
        <DuplicateModal
          pendingRows={pendingRows}
          duplicateGroups={duplicateGroups}
          dupeSearchQuery={dupeSearchQuery}
          setDupeSearchQuery={setDupeSearchQuery}
          dupeHoverAction={dupeHoverAction}
          setDupeHoverAction={setDupeHoverAction}
          handleDuplicateKeepAll={handleDuplicateKeepAll}
          handleDuplicateKeepFirst={handleDuplicateKeepFirst}
          handleDuplicateKeepLast={handleDuplicateKeepLast}
          handleDuplicateCancel={handleDuplicateCancel}
          d={d}
          c={c}
        />
      )}

      {showHelpModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: d ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)' }} onClick={() => setShowHelpModal(false)} />
          <div className="relative rounded-2xl max-w-lg w-[90%] p-6 shadow-2xl" style={{ background: c.bg1, border: `1px solid ${c.bdr}` }}>
            <button className="absolute top-4 right-4 p-1" style={{ color: c.tx3 }} onClick={() => setShowHelpModal(false)}><X className="w-4 h-4" /></button>
            <h3 className="text-[16px] font-bold mb-4">Help & Keyboard Shortcuts</h3>
            <div className="space-y-3 text-[13px]" style={{ color: c.tx2 }}>
              <div>
                <strong className="block mb-2" style={{ color: c.tx }}>Keyboard Shortcuts</strong>
                <div className="space-y-1.5">
                  {[['ESC', 'Close any modal'], ['←', 'Previous QR in viewer'], ['→', 'Next QR in viewer'], ['G', 'Generate QR codes'], ['Z', 'Download ZIP'], ['D', 'Download PDF'], ['P', 'Print labels'], ['C', 'Toggle config panel'], ['?', 'Open this help']].map(([key, desc]) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono" style={{ background: c.bg2, border: `1px solid ${c.bdr}` }}>{key}</span>
                      <span>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ borderTop: `1px solid ${c.bdr}`, paddingTop: '12px' }}>
                <strong className="block mb-2" style={{ color: c.tx }}>Supported File Formats</strong>
                <div className="space-y-1">
                  <div>Import: .xlsx, .xls, .csv, .pdf</div>
                  <div>Export: ZIP (folder structure), PDF (A4 label sheets)</div>
                </div>
              </div>
              <div style={{ borderTop: `1px solid ${c.bdr}`, paddingTop: '12px' }}>
                <strong className="block mb-2" style={{ color: c.tx }}>Printer Compatibility</strong>
                <div className="space-y-1">
                  <div>Optimized for Brother, Zebra, Dymo, and standard A4 laser/inkjet printers commonly used in asset management.</div>
                  <div>Label sizes configurable in mm with precise @page CSS for accurate sizing.</div>
                </div>
              </div>
              <div style={{ borderTop: `1px solid ${c.bdr}`, paddingTop: '12px' }}>
                <strong className="block mb-1" style={{ color: c.tx }}>Privacy</strong>
                <div>All data stays in your browser. No files are uploaded to any server.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ColumnMapper
        showColumnMapper={showColumnMapper}
        setShowColumnMapper={setShowColumnMapper}
        rawFileData={rawFileData!}
        columnMapping={columnMapping}
        setColumnMapping={setColumnMapping}
        handleApplyMapping={handleApplyMapping}
        fileError={fileError}
        isMobile={isMobile}
        d={d}
        c={c}
      />

      <PayloadTemplateModal
        showPayloadTemplate={showPayloadTemplate}
        setShowPayloadTemplate={setShowPayloadTemplate}
        payloadTemplate={payloadTemplate}
        setPayloadTemplate={setPayloadTemplate}
        templateOverwrite={templateOverwrite}
        setTemplateOverwrite={setTemplateOverwrite}
        handleApplyTemplate={handleApplyTemplate}
        rows={rows}
        d={d}
        c={c}
      />
      {recentToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] px-4 py-2.5 rounded-xl shadow-2xl text-[13px] font-medium animate-in fade-in slide-in-from-bottom-4" style={{ background: c.bg1, border: `1px solid ${c.bdr}`, color: c.tx }}>
          {recentToast}
        </div>
      )}

      {exportProgress && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl" style={{ background: c.bg1, border: `1px solid ${c.bdr}` }}>
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#2A5A9E', borderTopColor: 'transparent' }} />
          <span className="text-[13px] font-medium" style={{ color: c.tx }}>{exportProgress}</span>
        </div>
      )}
      <GuidedTour
        steps={TOUR_STEPS[tourPhase] || []}
        tourKey={`ec-tour-${tourPhase}`}
        active={tourActive}
        onComplete={() => setTourActive(false)}
        onSkip={() => setTourActive(false)}
      />
    </div>
  );
}

# Electracom QR Code Generator

## Overview
Production-ready QR code label generator for asset management. Generates ISO/IEC 18004 compliant QR codes from uploaded Excel/CSV/PDF data files and exports as ZIP (folder structure) or PDF (print-ready label sheets with configurable paper size).

## Architecture
- **Frontend**: React SPA (TypeScript) with Vite build system
- **Backend**: Express.js (minimal - serves static files only, no API needed)
- **Styling**: Inline style theming system with `c.bg/c.tx/c.bdr` pattern (NOT Tailwind utility classes for colors)
- **State Machine**: `appState`: empty → loaded → generating → results

## Key Libraries
- `qrcode` - ISO/IEC 18004 compliant QR generation
- `exceljs` - Excel file parsing (replaced `xlsx` due to CVEs)
- `jszip` + `file-saver` - ZIP export with folder structure
- `jspdf` - PDF label sheet export
- `jsqr` - QR code verification/decoding
- `pdfjs-dist` - PDF file import

## File Structure
```
client/src/
├── App.tsx                    # Root component (renders Home)
├── pages/
│   └── home.tsx               # Main app component (~1690 lines, orchestration + UI)
├── components/
│   ├── AppIcon.tsx            # Animated QR scanner icon (single PNG, CSS filter for dark mode)
│   ├── GuidedTour.tsx         # Pulsing guided tour component with step navigation
│   ├── QRConfigPanel.tsx      # Settings sidebar (presets, EC, DPI, label size, paper size, preview)
│   ├── DuplicateModal.tsx     # Duplicate asset tag resolution modal (severity colors, search, stats)
│   ├── ColumnMapper.tsx       # Column mapping modal for file import
│   └── PayloadTemplateModal.tsx # QR data template editor modal
├── lib/
│   ├── qr-renderer.ts         # DPI-aware QR generation with auto module sizing
│   ├── file-parser.ts         # Multi-format import (XLSX/CSV/PDF) with column mapping
│   ├── zip-exporter.ts        # ZIP export with folder structure + collision handling
│   ├── pdf-exporter.ts        # PDF label sheet export with configurable paper size + safety guards
│   ├── print-labels.ts        # Print-ready HTML with dynamic paper size
│   └── qr-verifier.ts         # QR decode verification with jsQR (uses qrOnlyDataURL)
```

## Features
- Multi-format file import: .xlsx, .xls, .csv, .pdf (drag-and-drop + file picker)
- **Column mapping modal**: Auto-detects column headers, shows mapping UI when headers don't match expected names. Uses `parseFileRaw()` + `autoMapColumns()` + `applyMapping()` from file-parser.ts
- DPI-aware QR rendering: module size auto-calculated from label dimensions + DPI + payload
- Three built-in presets: Indoor Standard (50×30mm/300DPI), Outdoor Harsh (70×40mm/600DPI), Quick Draft (50×30mm/150DPI). Default: Quick Draft. **Custom presets**: Save/load/delete in Settings panel "My Presets" section and header preset dropdown. Stored in `ec-custom-presets` localStorage.
- **Editable rows**: Single-click any cell (mainFolder, subFolder, assetTag, payload) to inline-edit. Empty cells show "Click to edit" placeholder. Add/delete rows supported. Re-validates on edit.
- **Inline payload editing**: Payload column is now directly editable via click (textarea). Long payloads can be expanded via Maximize2 icon. Mobile cards also support tap-to-edit payloads.
- **Duplicate asset tag detection**: Case-insensitive matching. Enhanced modal with summary stats (total rows / unique tags / would be removed), severity color-coding (mild=yellow, moderate=orange, heavy=red), searchable tag list, hover preview showing removal count. Actions: Keep All / Keep First Only / Keep Last Only / Cancel.
- Batch generation with live progress tracking
- **Generation failure warning**: If any QR codes fail to generate, a red badge shows the count (e.g., "3 of 100 QR codes failed to generate")
- QR verification using isolated QR-only image (qrOnlyDataURL) for accurate decode
- Dual export: ZIP (folder structure with collision-safe filenames) + PDF (configurable paper size with crop marks + safety guards for oversized labels)
- **PDF paper size**: A3, A4, A5, Letter, Legal, Tabloid. Selector in Settings panel and as split-button next to PDF download button. Default: A4.
- **Print paper size**: Now respects configured paper size (was hardcoded A4). Uses `config.paperSize` for dynamic `@page { size }` CSS.
- **Custom export filename**: Editable inline in results bar, date suffix auto-appended. Passed to `exportToZip()` and `exportToPDF()`.
- Label-sized gallery cards with aspect ratio matching configured label dimensions
- **Individual QR download**: Download button appears on hover over gallery cards (top-right corner), uses `stopPropagation` to avoid opening scan viewer
- **QR Data Template** (toolbar: "QR Data"): Modal with template editor using `{assetTag}`, `{mainFolder}`, `{subFolder}` variables. Toggle for overwrite vs fill-empty-only. Template saved to localStorage. Info box explains the feature.
- **Session persistence**: Rows and config auto-saved to localStorage (`ec-session-rows`, `ec-session-config`, `ec-session-state`). Resume banner on reopen with confirmation if data already loaded. localStorage quota warning shown on full storage.
- **Guided Tour**: Pulsing blue highlight ring walks users through app features. Auto-triggers for first-time users (per phase: landing/loaded/results). "Take a Tour" button on landing page for manual re-trigger. Only scrolls to target on step change (not during polling). Stored in `ec-tour-landing`, `ec-tour-loaded`, `ec-tour-results` localStorage keys.
- **Select All**: Only selects visible/filtered rows when search is active (was selecting all rows regardless of filter)
- Professional printing optimized for standard printers (Brother, Zebra, Dymo)
- Dark/light theme with localStorage persistence
- Gallery view, scan viewer with keyboard navigation (G=generate, Z=zip, D=pdf, P=print, C=config, ?=help)
- Row selection, search/filter, column sorting
- Duplicate rows highlighted with amber border and "Duplicate" badge in data table
- **Accessibility**: aria-labels on all icon-only buttons, role="dialog" on modals
- Toolbar buttons: "QR Data" (was Template), "New file" (was Swap file), "Re-map Columns" (blue-tinted, column mapper, only when rawFileData available)
- "Re-generate" label + RotateCcw icon on Generate button when returning from results view
- Results toolbar labels: "QR Config" (opens settings), "Edit Data" (returns to data table)

## Important Notes
- 100% client-side - no data leaves the browser (privacy requirement)
- The inline style theming system is intentional, not Tailwind classes
- Module size (modSize) is now auto-computed, not user-editable — shown as read-only "Auto: Xpx"
- `calculateModuleSize()` and `estimateModuleSize()` exported from qr-renderer.ts for UI use
- Electracom logo: `@assets/Gemini_Generated_Image_7x4kll7x4kll7x4k-removebg-preview_1772556180115.png`
- AppIcon component: uses `@assets/Screenshot_2026-03-04_114115-removebg-preview_1772624498715.png` (single PNG, CSS filter `brightness(0)` for light, `invert(1)` for dark)
- MOCK_ROWS kept for demo data loading feature (includes intentional duplicate FCU-199001)
- **Recent Files**: Real session history stored in `ec-recent-files` localStorage. Each entry saves rows + config to `ec-hist-{timestamp}` key. Up to 10 entries. Dismiss individual or clear all. Clear all auto-closes dropdown.
- **Data table pagination**: 50 rows per page with Prev/Next navigation. Resets to page 0 on search or file load.
- **Batch QR generation**: Processes in batches of 50 with UI yield between batches. Duplicate summary badge shown in results bar.
- **Export progress**: Toast overlay shown during ZIP/PDF generation
- file-parser.ts exports: `parseFile()` (auto-mapping), `parseFileRaw()` (raw headers+rows), `autoMapColumns()`, `partialAutoMapColumns()`, `applyMapping()`, `RawFileData` type
- **Navigation**: Electracom logo is clickable (returns to landing page). Home button appears in header when not on landing page. Session auto-saves to localStorage, resume banner appears when returning home.
- **QR hover tooltip**: QR code images show payload data on hover (via title attribute), not just asset tag name
- **PNG download**: Uses anchor element download (not file-saver saveAs) to avoid Windows Security warnings
- **Mobile responsive**: Full mobile/tablet support via `useIsMobile` hook (768px breakpoint). Header compact on mobile (icon-only preset, hidden text). Landing page reduced padding. Data table → card view on mobile (with tap-to-edit for all fields including payload). Results action bar stacks vertically with icon-only buttons. Config panel full-width on mobile. Scan viewer reduced padding. Session banner stacks vertically.
- `Home` icon from lucide-react conflicts → always import as `Home as HomeIcon`
- Empty/blank asset tags skipped in duplicate counting (`.trim()` + truthiness check)

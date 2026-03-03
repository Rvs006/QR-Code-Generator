# Electracom QR Code Generator

## Overview
Production-ready QR code label generator for asset management. Generates ISO/IEC 18004 compliant QR codes from uploaded Excel/CSV/PDF data files and exports as ZIP (folder structure) or PDF (print-ready A4 label sheets).

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
│   └── home.tsx               # Main app component with all UI/logic
├── lib/
│   ├── qr-renderer.ts         # DPI-aware QR generation with auto module sizing
│   ├── file-parser.ts         # Multi-format import (XLSX/CSV/PDF) with column mapping
│   ├── zip-exporter.ts        # ZIP export with folder structure + custom filename
│   ├── pdf-exporter.ts        # Professional PDF label sheet export + custom filename
│   ├── print-labels.ts        # Print-ready HTML for UK printers
│   └── qr-verifier.ts         # QR decode verification with jsQR (uses qrOnlyDataURL)
```

## Features
- Multi-format file import: .xlsx, .xls, .csv, .pdf (drag-and-drop + file picker)
- **Column mapping modal**: Auto-detects column headers, shows mapping UI when headers don't match expected names. Uses `parseFileRaw()` + `autoMapColumns()` + `applyMapping()` from file-parser.ts
- DPI-aware QR rendering: module size auto-calculated from label dimensions + DPI + payload
- Three presets: Indoor Standard (50×30mm/300DPI), Outdoor Harsh (70×40mm/600DPI), Quick Draft (50×30mm/150DPI)
- **Editable rows**: Double-click any cell (mainFolder, subFolder, assetTag) to inline-edit. Pencil icon on hover. Add/delete rows supported. Re-validates on edit.
- Duplicate asset tag detection with override modal (Keep All / Keep First Only / Cancel)
- Batch generation with live progress tracking
- QR verification using isolated QR-only image (qrOnlyDataURL) for accurate decode
- Dual export: ZIP (folder structure) + PDF (A4 label sheets with crop marks)
- **Custom export filename**: Editable inline in results bar, date suffix auto-appended. Passed to `exportToZip()` and `exportToPDF()`.
- Label-sized gallery cards with aspect ratio matching configured label dimensions
- **Individual QR download**: Download button appears on hover over gallery cards (top-right corner), uses `stopPropagation` to avoid opening scan viewer
- **Payload template builder**: Modal with template editor using `{assetTag}`, `{mainFolder}`, `{subFolder}` variables. Toggle for overwrite vs fill-empty-only. Template saved to localStorage.
- **Session persistence**: Rows and config auto-saved to localStorage (`ec-session-rows`, `ec-session-config`, `ec-session-state`). Resume banner on reopen. Does not persist generated images.
- Professional printing optimized for UK standard printers (Brother, Zebra, Dymo)
- Dark/light theme with localStorage persistence
- Gallery view, scan viewer with keyboard navigation (G=generate, Z=zip, D=pdf, P=print, C=config, ?=help)
- Row selection, search/filter, column sorting
- Duplicate rows highlighted with amber border and "Duplicate" badge in data table
- Save as Preset to localStorage

## Important Notes
- 100% client-side - no data leaves the browser (privacy requirement)
- The inline style theming system is intentional, not Tailwind classes
- Module size (modSize) is now auto-computed, not user-editable — shown as read-only "Auto: Xpx"
- `calculateModuleSize()` and `estimateModuleSize()` exported from qr-renderer.ts for UI use
- Electracom logo: `@assets/Gemini_Generated_Image_7x4kll7x4kll7x4k-removebg-preview_1772556180115.png`
- MOCK_ROWS kept for demo data loading feature (includes intentional duplicate FCU-199001)
- RECENT_FILES kept as cosmetic mock data
- file-parser.ts exports: `parseFile()` (auto-mapping), `parseFileRaw()` (raw headers+rows), `autoMapColumns()`, `partialAutoMapColumns()`, `applyMapping()`, `RawFileData` type
- **Navigation**: Electracom logo is clickable (returns to landing page). Home button appears in header when not on landing page. Session auto-saves to localStorage, resume banner appears when returning home.
- **QR hover tooltip**: QR code images show payload data on hover (via title attribute), not just asset tag name
- **PNG download**: Uses anchor element download (not file-saver saveAs) to avoid Windows Security warnings
- **Mobile responsive**: Full mobile/tablet support via `useIsMobile` hook (768px breakpoint). Header compact on mobile (icon-only preset, hidden text). Landing page reduced padding. Data table → card view on mobile. Results action bar stacks vertically with icon-only buttons. Config panel full-width on mobile. Scan viewer reduced padding. Session banner stacks vertically.

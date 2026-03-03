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
- `xlsx` - Excel/CSV file parsing
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
│   ├── file-parser.ts         # Multi-format import (XLSX/CSV/PDF)
│   ├── zip-exporter.ts        # ZIP export with folder structure
│   ├── pdf-exporter.ts        # Professional PDF label sheet export
│   ├── print-labels.ts        # Print-ready HTML for UK printers
│   └── qr-verifier.ts         # QR decode verification with jsQR (uses qrOnlyDataURL)
```

## Features
- Multi-format file import: .xlsx, .xls, .csv, .pdf (drag-and-drop + file picker)
- DPI-aware QR rendering: module size auto-calculated from label dimensions + DPI + payload
- Three presets: Indoor Standard (50×30mm/300DPI), Outdoor Harsh (70×40mm/600DPI), Quick Draft (50×30mm/150DPI)
- Duplicate asset tag detection with override modal (Keep All / Keep First Only / Cancel)
- Batch generation with live progress tracking
- QR verification using isolated QR-only image (qrOnlyDataURL) for accurate decode
- Dual export: ZIP (folder structure) + PDF (A4 label sheets with crop marks)
- Label-sized gallery cards with aspect ratio matching configured label dimensions
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

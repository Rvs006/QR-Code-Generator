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
│   ├── qr-renderer.ts         # Real QR generation with canvas
│   ├── file-parser.ts         # Multi-format import (XLSX/CSV/PDF)
│   ├── zip-exporter.ts        # ZIP export with folder structure
│   ├── pdf-exporter.ts        # Professional PDF label sheet export
│   ├── print-labels.ts        # Print-ready HTML for UK printers
│   └── qr-verifier.ts         # QR decode verification with jsQR
```

## Features
- Multi-format file import: .xlsx, .xls, .csv, .pdf (drag-and-drop + file picker)
- Real QR code generation with configurable error correction (L/M/Q/H)
- Three presets: Indoor Standard, Outdoor Harsh, Quick Draft
- Batch generation with live progress tracking
- QR verification (decodes each QR and compares to source payload)
- Dual export: ZIP (folder structure) + PDF (A4 label sheets with crop marks)
- Professional printing optimized for UK standard printers (Brother, Zebra, Dymo)
- Dark/light theme with localStorage persistence
- Gallery view, scan viewer with keyboard navigation
- Row selection, search/filter, column sorting

## Important Notes
- 100% client-side - no data leaves the browser (privacy requirement)
- The inline style theming system is intentional, not Tailwind classes
- Electracom logo: `@assets/Gemini_Generated_Image_7x4kll7x4kll7x4k-removebg-preview_1772556180115.png`
- MOCK_ROWS kept for demo data loading feature
- RECENT_FILES kept as cosmetic mock data


# Replit Agent — One-Shot Prompt

Copy EVERYTHING below into Replit Agent. It contains the complete prompt, project setup, prototype code reference, original working code reference, and deployment instructions.

---

## PROMPT TO PASTE INTO REPLIT AGENT:

```
I need you to build a complete production Electracom QR Code Generator web app. I have two code files:

1. PROTOTYPE (App.jsx) — Complete React UI with all screens, modals, interactions, themes, keyboard shortcuts. This is the DESIGN SOURCE OF TRUTH. Keep every pixel of this UI.

2. ORIGINAL APP (original.html) — Working vanilla JS/HTML app with real QR generation, file parsing, ZIP export, and printing. This is the LOGIC SOURCE OF TRUTH. Port the logic into the React prototype.

## PROJECT SETUP

Create a Vite + React + Tailwind CSS project:

1. Initialize: `npm create vite@latest electracom-qr -- --template react`
2. Install dependencies:
```bash
npm install lucide-react qrcode xlsx jszip file-saver jsqr recharts
npm install -D tailwindcss @tailwindcss/vite
```

3. File structure:
```
electracom-qr/
├── index.html          (add Google Fonts link for DM Sans + JetBrains Mono)
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx         ← Paste the PROTOTYPE code here as starting point
│   ├── App.css         ← Tailwind imports + custom scrollbar styles
│   ├── lib/
│   │   ├── qr-renderer.js   ← Port renderQR() + drawLabelsOnCanvas() from original
│   │   ├── file-parser.js   ← Port handleFileObj() + XLSX parsing from original
│   │   ├── zip-exporter.js  ← Port exportZip() from original
│   │   ├── print-labels.js  ← Port printLabels() from original
│   │   └── qr-verifier.js   ← NEW: use jsQR to decode canvas → compare to source
```

4. In `index.html`, add inside <head>:
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

5. In `vite.config.js`:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

6. In `src/App.css`:
```css
@import "tailwindcss";

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #555; }
```

## WHAT TO CHANGE IN THE PROTOTYPE

The prototype has these simulated/placeholder items. Replace each one:

### 1. Replace PseudoQR component → Real QR generation
- Remove the `PseudoQR` component and `hashStr` function entirely
- Create `src/lib/qr-renderer.js` — port the `renderQR()` and `drawLabelsOnCanvas()` functions from the original HTML app
- Use the `qrcode` npm package (not qrcodejs CDN)
- Each gallery card, scan viewer, print preview, and config preview should show REAL generated QR code images (as canvas or data URL)
- Store generated images as dataURLs in state alongside row data

### 2. Replace handleLoadDemo() → Real file upload
- Create `src/lib/file-parser.js` — port `handleFileObj()` from the original
- Wire drag-and-drop events on the drop zone (dragover, dragleave, drop)
- Wire the hidden file input for click-to-browse
- Parse XLSX using the `xlsx` package, extract 4 columns, run through existing `validateRows()`
- Remove MOCK_ROWS constant — use real parsed data

### 3. Replace simulated generation → Real batch QR rendering
- In `handleGenerate()`, replace the `setInterval` simulation with actual async QR generation loop
- Call `renderQR()` for each selected row with the current config
- Store results as `{ dataURL, width, height, row }` array in state
- Update progress bar with real progress

### 4. Replace folder tree download → Real ZIP export
- Create `src/lib/zip-exporter.js` — port `exportZip()` from the original
- Wire the "Download ZIP" button in the folder tree modal to create and save a real ZIP
- Folder structure: MainFolder/SubFolder/AssetTag.png (or .svg)
- If no folders specified, use "Outputted QR Codes/" as fallback

### 5. Replace print button → Real print
- Create `src/lib/print-labels.js` — port `printLabels()` from the original
- Open new window with print-ready CSS layout
- IMPORTANT: Only print labels that are selected in `printSelected` Set. If none selected, print all.

### 6. Replace verify simulation → Real QR decode
- Create `src/lib/qr-verifier.js`
- Use `jsQR` to decode each generated QR canvas back to text
- Compare decoded text to original source payload
- Return pass/fail with detail message

### 7. Add localStorage for theme
- On theme change, save to localStorage: `localStorage.setItem('ec-theme', dark ? 'dark' : 'light')`
- On app load, read from localStorage first, then fall back to system preference

### 8. Wire copy & save buttons
- Copy payload: `navigator.clipboard.writeText(payload)`
- Save image: convert canvas to blob → `saveAs(blob, 'assetTag.png')` using file-saver

### 9. Wire drag and drop on the upload zone
- Add `onDragOver`, `onDragLeave`, `onDrop` handlers to the drop zone div
- On drop, extract file and pass to file parser
- Show visual feedback (border color change) during drag

## WHAT NOT TO CHANGE

- The inline style theming system (`c.bg`, `c.tx`, `c.bdr` pattern) — this is intentional, not Tailwind classes for colors
- The `appState` state machine (empty → loaded → generating → results)
- Keyboard shortcuts useEffect
- All modal/overlay structures
- The Electracom logo URL (keep as-is)
- The gradient bar at the top
- All text content, labels, descriptions

## RECENT_FILES
Keep the RECENT_FILES mock data — in a real production app this would use localStorage to track previously opened files. For now it's cosmetic.

## DEPLOYMENT
After everything works:
1. Run `npm run build` to create production build
2. Deploy using Replit's built-in deployment (Static site or Autoscale)
3. The app is 100% client-side — no backend needed, no API calls, no database
4. All data stays in the browser — this is a privacy requirement

## TESTING CHECKLIST
After building, verify each of these works:
- [ ] Drop .xlsx file → table renders with real data + validation
- [ ] Click payload cell → modal shows formatted JSON
- [ ] Select 3 rows → Generate button says "Generate 3 selected"
- [ ] Generate → real QR codes appear in gallery (scannable with phone)
- [ ] Click QR in gallery → scan viewer shows large QR + payload + prev/next
- [ ] Phone camera pointed at screen QR → shows JSON payload
- [ ] Arrow keys navigate scan viewer, ESC closes
- [ ] Verify → decodes each QR → shows real pass/fail
- [ ] Download ZIP → real ZIP file with correct folder structure
- [ ] Print → only selected labels print (or all if none selected)
- [ ] Theme toggle persists on page reload
- [ ] Switch preset → config live preview label size changes
- [ ] Dark mode + light mode both render correctly
- [ ] Folder tree preview matches actual ZIP structure
```

---

## ABOUT HOSTING

**Replit handles hosting automatically.** Once you deploy:
- Replit gives you a `.replit.app` URL  
- It's a static site (no server needed) — Replit's free tier works fine
- If you want a custom domain (e.g. `qr.electracom.com`), go to Replit Deployments → Custom Domain → add your DNS CNAME record

**No backend, no database, no environment variables needed.** The entire app runs in the browser.

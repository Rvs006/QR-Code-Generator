import type { GeneratedQR } from './qr-renderer';
import type { QRConfig } from './qr-renderer';

function escapeHTML(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function printLabels(
  images: GeneratedQR[],
  config: QRConfig,
  printSelectedSet: Set<number>
): void {
  const itemsToPrint = printSelectedSet.size > 0
    ? images.filter((_, i) => printSelectedSet.has(i))
    : images;

  if (itemsToPrint.length === 0) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow pop-ups to print labels.');
    return;
  }

  const paperSizeMap: Record<string, string> = {
    a3: 'A3', a4: 'A4', a5: 'A5',
    letter: 'letter', legal: 'legal', tabloid: 'tabloid',
  };
  const paperSizeCSS = paperSizeMap[config.paperSize] || 'A4';

  const labelW = config.labelW;
  const labelH = config.labelH;

  const fontFam = config.fontFamily || 'Courier New';
  const fontCSS = fontFam === 'Arial' ? "Arial, sans-serif" : `'${escapeHTML(fontFam)}', monospace`;

  const grouped: Record<string, GeneratedQR[]> = {};
  for (const item of itemsToPrint) {
    const folder = item.mainFolder || 'Uncategorised';
    if (!grouped[folder]) grouped[folder] = [];
    grouped[folder].push(item);
  }

  const sectionsHTML = Object.entries(grouped).map(([folder, items]) => {
    const labelsHTML = items.map(item => `
      <div class="label" style="width:${labelW}mm; height:${labelH}mm;">
        <img src="${item.dataURL}" alt="${escapeHTML(item.assetTag)}" />
      </div>
    `).join('');
    return `
      <div class="folder-group">
        <div class="folder-header">${escapeHTML(folder)}</div>
        <div class="container">${labelsHTML}</div>
      </div>
    `;
  }).join('');

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Electracom QR Labels</title>
<style>
  @page {
    size: ${paperSizeCSS};
    margin: 10mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    background: white;
    color: #111;
  }
  .folder-group {
    page-break-before: auto;
    margin-bottom: 5mm;
  }
  .folder-group:not(:first-child) {
    page-break-before: always;
  }
  .folder-header {
    font-size: 14pt;
    font-weight: bold;
    font-family: ${fontCSS};
    padding-bottom: 3mm;
    margin-bottom: 3mm;
    border-bottom: 0.5mm solid #ccc;
  }
  .container {
    display: flex;
    flex-wrap: wrap;
    gap: 3mm;
    justify-content: flex-start;
    align-items: flex-start;
  }
  .label {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2mm;
    border: 0.3mm solid #ddd;
    page-break-inside: avoid;
    break-inside: avoid;
    overflow: hidden;
  }
  .label img {
    max-width: calc(100% - 2mm);
    max-height: calc(100% - 2mm);
    object-fit: contain;
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
  }
  @media print {
    .label {
      border: 0.2mm solid #ccc;
    }
  }
</style>
</head>
<body>
${sectionsHTML}
<script>
  setTimeout(function() { window.print(); }, 600);
</script>
</body>
</html>`);
  printWindow.document.close();
}

import type { GeneratedQR } from './qr-renderer';
import type { QRConfig } from './qr-renderer';

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
  const tagFontPt = config.fontTag;
  const pathFontPt = config.fontPath;

  const labelsHTML = itemsToPrint.map(item => {
    const path = [item.mainFolder, item.subFolder].filter(Boolean).join(' / ');
    return `
      <div class="label" style="width:${labelW}mm; height:${labelH}mm;">
        <img src="${item.dataURL}" alt="${item.assetTag}" />
        <div class="tag" style="font-size:${tagFontPt}pt;">${item.assetTag}</div>
        ${path ? `<div class="path" style="font-size:${pathFontPt}pt;">${path}</div>` : ''}
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
    max-height: calc(100% - 10mm);
    object-fit: contain;
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
  }
  .tag {
    font-weight: bold;
    font-family: 'Courier New', monospace;
    text-align: center;
    margin-top: 1mm;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  .path {
    color: #888;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  @media print {
    .label {
      border: 0.2mm solid #ccc;
    }
  }
</style>
</head>
<body>
<div class="container">
${labelsHTML}
</div>
<script>
  setTimeout(function() { window.print(); }, 600);
</script>
</body>
</html>`);
  printWindow.document.close();
}

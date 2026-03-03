import { jsPDF } from 'jspdf';
import type { GeneratedQR } from './qr-renderer';
import type { QRConfig } from './qr-renderer';

export async function exportToPDF(
  images: GeneratedQR[],
  config: QRConfig,
  selectedIndices?: Set<number>,
  customFilename?: string
): Promise<void> {
  const itemsToExport = selectedIndices && selectedIndices.size > 0
    ? images.filter((_, i) => selectedIndices.has(i))
    : images;

  if (itemsToExport.length === 0) return;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginTop = 15;
  const marginLeft = 10;
  const marginRight = 10;
  const marginBottom = 15;

  const labelW = config.labelW;
  const labelH = config.labelH;
  const gapX = 3;
  const gapY = 3;

  const usableWidth = pageWidth - marginLeft - marginRight;
  const usableHeight = pageHeight - marginTop - marginBottom;

  const cols = Math.floor((usableWidth + gapX) / (labelW + gapX));
  const rows = Math.floor((usableHeight + gapY) / (labelH + gapY));
  const labelsPerPage = cols * rows;

  const startX = marginLeft + (usableWidth - (cols * labelW + (cols - 1) * gapX)) / 2;
  const startY = marginTop;

  for (let i = 0; i < itemsToExport.length; i++) {
    if (i > 0 && i % labelsPerPage === 0) {
      pdf.addPage();
    }

    const pageIndex = i % labelsPerPage;
    const col = pageIndex % cols;
    const row = Math.floor(pageIndex / cols);

    const x = startX + col * (labelW + gapX);
    const y = startY + row * (labelH + gapY);

    const item = itemsToExport[i];

    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.2);
    pdf.rect(x, y, labelW, labelH);

    const qrSize = Math.min(labelW - 4, labelH - 12);
    const qrX = x + (labelW - qrSize) / 2;
    const qrY = y + 2;

    try {
      pdf.addImage(item.dataURL, 'PNG', qrX, qrY, qrSize, qrSize);
    } catch (e) {
      pdf.setFontSize(6);
      pdf.text('QR Error', x + labelW / 2, y + labelH / 2, { align: 'center' });
    }

    pdf.setFontSize(Math.min(config.fontTag * 0.8, 8));
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 17, 17);
    const tagY = qrY + qrSize + 2;
    pdf.text(item.assetTag, x + labelW / 2, tagY, { align: 'center', maxWidth: labelW - 2 });

    const pathText = [item.mainFolder, item.subFolder].filter(Boolean).join(' / ');
    if (pathText) {
      pdf.setFontSize(Math.min(config.fontPath * 0.7, 6));
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(136, 136, 136);
      pdf.text(pathText, x + labelW / 2, tagY + 3, { align: 'center', maxWidth: labelW - 2 });
    }

    const cropLen = 2;
    pdf.setDrawColor(150, 150, 150);
    pdf.setLineWidth(0.1);
    pdf.line(x - 1, y, x - 1 - cropLen, y);
    pdf.line(x, y - 1, x, y - 1 - cropLen);
    pdf.line(x + labelW + 1, y, x + labelW + 1 + cropLen, y);
    pdf.line(x + labelW, y - 1, x + labelW, y - 1 - cropLen);
    pdf.line(x - 1, y + labelH, x - 1 - cropLen, y + labelH);
    pdf.line(x, y + labelH + 1, x, y + labelH + 1 + cropLen);
    pdf.line(x + labelW + 1, y + labelH, x + labelW + 1 + cropLen, y + labelH);
    pdf.line(x + labelW, y + labelH + 1, x + labelW, y + labelH + 1 + cropLen);
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const baseName = customFilename ? customFilename.replace(/[<>:"/\\|?*]/g, '_').trim() : 'Electracom_QR_Labels';
  pdf.save(`${baseName}_${dateStr}.pdf`);
}

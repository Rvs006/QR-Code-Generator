import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { GeneratedQR } from './qr-renderer';

export async function exportToZip(images: GeneratedQR[]): Promise<void> {
  const zip = new JSZip();

  for (const img of images) {
    let folderPath = '';
    if (img.mainFolder && img.subFolder) {
      folderPath = `${sanitize(img.mainFolder)}/${sanitize(img.subFolder)}/`;
    } else if (img.mainFolder) {
      folderPath = `${sanitize(img.mainFolder)}/`;
    } else if (img.subFolder) {
      folderPath = `${sanitize(img.subFolder)}/`;
    } else {
      folderPath = 'Outputted QR Codes/';
    }

    const filename = `${sanitize(img.assetTag)}.png`;
    const base64 = img.dataURL.split(',')[1];
    zip.file(folderPath + filename, base64, { base64: true });
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const zipName = `Electracom_QR_Codes_${dateStr}.zip`;

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, zipName);
}

function sanitize(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim() || 'Unknown';
}

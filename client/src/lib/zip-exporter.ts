import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { GeneratedQR } from './qr-renderer';

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function exportToZip(images: GeneratedQR[], customFilename?: string): Promise<void> {
  const zip = new JSZip();
  const usedPaths = new Map<string, number>();

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

    const baseName = sanitize(img.assetTag);
    let filename = `${baseName}.png`;
    let fullPath = folderPath + filename;
    while (usedPaths.has(fullPath)) {
      const count = usedPaths.get(fullPath)!;
      usedPaths.set(fullPath, count + 1);
      filename = `${baseName}_${count}.png`;
      fullPath = folderPath + filename;
    }
    usedPaths.set(fullPath, 1);

    const base64 = img.dataURL.split(',')[1];
    const binaryData = base64ToUint8Array(base64);
    zip.file(folderPath + filename, binaryData, { binary: true });
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const baseName = customFilename ? sanitize(customFilename) : 'Electracom_QR_Codes';
  const zipName = `${baseName}_${dateStr}.zip`;

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  saveAs(blob, zipName);
}

function sanitize(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim() || 'Unknown';
}

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
  let skipped = 0;

  for (const img of images) {
    if (!img.dataURL) {
      skipped++;
      continue;
    }

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

    try {
      const base64 = img.dataURL.split(',')[1];
      if (!base64) throw new Error(`Invalid image data for ${img.assetTag}`);
      const binaryData = base64ToUint8Array(base64);
      zip.file(folderPath + filename, binaryData, { binary: true });
    } catch (e) {
      skipped++;
      console.warn(`Skipped ${img.assetTag} during ZIP export:`, e);
    }
  }

  if (zip.files && Object.keys(zip.files).length === 0) {
    throw new Error('No valid QR codes to export. All images were skipped.');
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

  if (skipped > 0) {
    console.warn(`ZIP export complete. ${skipped} image(s) were skipped due to errors.`);
  }
}

function sanitize(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim() || 'Unknown';
}

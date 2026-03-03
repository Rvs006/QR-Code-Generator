import jsQR from 'jsqr';

export interface VerifyResult {
  assetTag: string;
  folder: string;
  payload: string;
  passed: boolean;
  decodedMatch: boolean;
  detail: string;
  decoded?: string;
}

export async function verifyQR(
  qrOnlyDataURL: string,
  expectedPayload: string,
  assetTag: string,
  mainFolder: string,
  subFolder: string
): Promise<VerifyResult> {
  const folder = [mainFolder, subFolder].filter(Boolean).join('/');

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load QR image'));
      img.src = qrOnlyDataURL;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (!code) {
      return {
        assetTag,
        folder,
        payload: expectedPayload,
        passed: false,
        decodedMatch: false,
        detail: 'Could not decode QR code from image',
      };
    }

    const decoded = code.data;
    const matches = decoded === expectedPayload;

    return {
      assetTag,
      folder,
      payload: expectedPayload,
      passed: matches,
      decodedMatch: matches,
      decoded,
      detail: matches
        ? 'Payload matches source'
        : `Decoded payload differs — expected "${expectedPayload.substring(0, 40)}..." got "${decoded.substring(0, 40)}..."`,
    };
  } catch (err: any) {
    return {
      assetTag,
      folder,
      payload: expectedPayload,
      passed: false,
      decodedMatch: false,
      detail: `Verification error: ${err.message}`,
    };
  }
}

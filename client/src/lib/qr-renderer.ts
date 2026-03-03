import QRCode from 'qrcode';

export interface QRConfig {
  ec: string;
  modSize: number;
  quiet: number;
  labelW: number;
  labelH: number;
  dpi: number;
  fontTag: number;
  fontPath: number;
  format: string;
  pixelPerfect: boolean;
}

export interface GeneratedQR {
  dataURL: string;
  qrOnlyDataURL: string;
  width: number;
  height: number;
  assetTag: string;
  mainFolder: string;
  subFolder: string;
  payload: string;
}

export async function renderQR(
  payload: string,
  assetTag: string,
  mainFolder: string,
  subFolder: string,
  config: QRConfig
): Promise<GeneratedQR> {
  const ecMap: Record<string, 'L' | 'M' | 'Q' | 'H'> = { L: 'L', M: 'M', Q: 'Q', H: 'H' };
  const errorCorrectionLevel = ecMap[config.ec] || 'M';
  const margin = config.quiet;
  const scale = config.modSize;

  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, payload || ' ', {
    errorCorrectionLevel,
    margin,
    scale,
    color: { dark: '#000000', light: '#ffffff' },
  });

  const qrOnlyDataURL = qrCanvas.toDataURL('image/png');

  const qrWidth = qrCanvas.width;
  const qrHeight = qrCanvas.height;

  const tagFontSize = Math.max(config.fontTag * (config.dpi / 96), 10);
  const pathFontSize = Math.max(config.fontPath * (config.dpi / 96), 8);
  const textPadding = 8;
  const tagHeight = tagFontSize + 4;
  const pathText = [mainFolder, subFolder].filter(Boolean).join(' / ');
  const pathHeight = pathText ? pathFontSize + 4 : 0;
  const totalTextHeight = tagHeight + pathHeight + textPadding * 2;

  const finalWidth = qrWidth;
  const finalHeight = qrHeight + totalTextHeight;

  const canvas = document.createElement('canvas');
  canvas.width = finalWidth;
  canvas.height = finalHeight;
  const ctx = canvas.getContext('2d')!;

  if (config.pixelPerfect) {
    ctx.imageSmoothingEnabled = false;
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, finalWidth, finalHeight);

  ctx.drawImage(qrCanvas, 0, 0);

  ctx.fillStyle = '#111111';
  ctx.font = `bold ${tagFontSize}px 'JetBrains Mono', 'Courier New', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(assetTag, finalWidth / 2, qrHeight + textPadding, finalWidth - 16);

  if (pathText) {
    ctx.fillStyle = '#888888';
    ctx.font = `${pathFontSize}px 'DM Sans', sans-serif`;
    ctx.fillText(pathText, finalWidth / 2, qrHeight + textPadding + tagHeight, finalWidth - 16);
  }

  const dataURL = canvas.toDataURL('image/png');

  return {
    dataURL,
    qrOnlyDataURL,
    width: finalWidth,
    height: finalHeight,
    assetTag,
    mainFolder,
    subFolder,
    payload,
  };
}

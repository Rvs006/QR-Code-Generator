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

const QR_VERSION_CAPACITIES: Record<string, number[]> = {
  L: [17,32,53,78,106,134,154,192,230,271,321,367,425,458,520,586,644,718,792,858,929,1003,1091,1171,1273,1367,1465,1528,1628,1732,1840,1952,2068,2188,2303,2431,2563,2699,2809,2953],
  M: [14,26,42,62,84,106,122,152,180,213,251,287,331,362,412,450,504,560,624,666,711,779,857,911,997,1059,1125,1190,1264,1370,1452,1538,1628,1722,1809,1911,1989,2099,2213,2331],
  Q: [11,20,32,46,60,74,86,108,130,151,177,203,241,258,292,322,364,394,442,482,509,565,611,661,715,751,805,868,908,982,1030,1112,1168,1228,1283,1351,1423,1499,1579,1663],
  H: [7,14,24,34,44,58,64,84,98,119,137,155,177,194,220,250,280,310,338,382,403,439,461,511,535,593,625,658,698,742,790,842,898,958,983,1051,1093,1139,1219,1273],
};

function getQRModuleCount(payloadLength: number, ec: string): number {
  const caps = QR_VERSION_CAPACITIES[ec] || QR_VERSION_CAPACITIES['M'];
  let version = 1;
  for (let i = 0; i < caps.length; i++) {
    if (payloadLength <= caps[i]) {
      version = i + 1;
      break;
    }
    if (i === caps.length - 1) version = 40;
  }
  return 17 + version * 4;
}

export function calculateModuleSize(
  labelWmm: number,
  labelHmm: number,
  dpi: number,
  ec: string,
  payloadLength: number,
  quietZone: number,
  fontTag: number,
  fontPath: number,
  hasPath: boolean
): number {
  const labelWpx = Math.round((labelWmm / 25.4) * dpi);
  const labelHpx = Math.round((labelHmm / 25.4) * dpi);

  const tagFontPx = Math.max(fontTag * (dpi / 96), 10);
  const pathFontPx = Math.max(fontPath * (dpi / 96), 8);
  const textPadding = 8;
  const tagH = tagFontPx + 4;
  const pathH = hasPath ? pathFontPx + 4 : 0;
  const totalTextH = tagH + pathH + textPadding * 2;

  const availableH = labelHpx - totalTextH;
  const availableW = labelWpx;
  const availablePx = Math.min(availableW, availableH);

  const moduleCount = getQRModuleCount(payloadLength, ec);
  const totalModules = moduleCount + 2 * quietZone;

  const modSize = Math.max(1, Math.floor(availablePx / totalModules));
  return modSize;
}

export function estimateModuleSize(config: QRConfig, samplePayloadLength?: number): number {
  const payloadLen = samplePayloadLength || 100;
  return calculateModuleSize(
    config.labelW,
    config.labelH,
    config.dpi,
    config.ec,
    payloadLen,
    config.quiet,
    config.fontTag,
    config.fontPath,
    true
  );
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
  const hasPath = !!(mainFolder || subFolder);

  const computedModSize = calculateModuleSize(
    config.labelW,
    config.labelH,
    config.dpi,
    config.ec,
    (payload || ' ').length,
    config.quiet,
    config.fontTag,
    config.fontPath,
    hasPath
  );

  const scale = computedModSize;

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

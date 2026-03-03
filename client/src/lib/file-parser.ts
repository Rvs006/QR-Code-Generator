import * as XLSX from 'xlsx';

export interface ParsedRow {
  mainFolder: string;
  subFolder: string;
  assetTag: string;
  payload: string;
}

export interface RawFileData {
  headers: string[];
  rawRows: string[][];
}

const EXPECTED_FIELDS = ['mainFolder', 'subFolder', 'assetTag', 'payload'];
const HEADER_ALIASES: Record<string, string[]> = {
  mainFolder: ['main folder', 'mainfolder', 'folder', 'site', 'building', 'location', 'main_folder', 'main-folder'],
  subFolder: ['sub folder', 'subfolder', 'sub-folder', 'sub_folder', 'system', 'category', 'department', 'area', 'zone'],
  assetTag: ['asset tag', 'assettag', 'asset_tag', 'asset-tag', 'asset id', 'assetid', 'asset_id', 'tag', 'id', 'name', 'label', 'code', 'reference', 'ref'],
  payload: ['payload', 'data', 'qr data', 'qrdata', 'qr_data', 'qr-data', 'content', 'json', 'value', 'encoded', 'qr payload', 'qr content'],
};

export function autoMapColumns(headers: string[]): Record<string, number> | null {
  const mapping: Record<string, number> = {};
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());

  for (const field of EXPECTED_FIELDS) {
    const aliases = HEADER_ALIASES[field];
    const idx = lowerHeaders.findIndex(h => aliases.includes(h) || h === field.toLowerCase());
    if (idx >= 0) {
      mapping[field] = idx;
    }
  }

  if (mapping.assetTag !== undefined) {
    return mapping;
  }

  return null;
}

export function applyMapping(rawRows: string[][], mapping: Record<string, number>): ParsedRow[] {
  const rows: ParsedRow[] = [];
  for (const raw of rawRows) {
    const mainFolder = mapping.mainFolder !== undefined ? String(raw[mapping.mainFolder] || '').trim() : '';
    const subFolder = mapping.subFolder !== undefined ? String(raw[mapping.subFolder] || '').trim() : '';
    const assetTag = mapping.assetTag !== undefined ? String(raw[mapping.assetTag] || '').trim() : '';
    const payload = mapping.payload !== undefined ? String(raw[mapping.payload] || '').trim() : '';

    if (!assetTag && !payload) continue;
    rows.push({ mainFolder, subFolder, assetTag, payload });
  }
  return rows;
}

export async function parseFileRaw(file: File): Promise<RawFileData> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'xlsx' || ext === 'xls') {
    return parseExcelRaw(file);
  } else if (ext === 'csv') {
    return parseCSVRaw(file);
  } else if (ext === 'pdf') {
    return parsePDFRaw(file);
  }

  throw new Error(`Unsupported file format: .${ext}. Please use .xlsx, .csv, or .pdf files.`);
}

export async function parseFile(file: File): Promise<ParsedRow[]> {
  const { headers, rawRows } = await parseFileRaw(file);

  const mapping = autoMapColumns(headers);
  if (mapping) {
    const rows = applyMapping(rawRows, mapping);
    if (rows.length > 0) return rows;
  }

  if (rawRows.length > 0 && rawRows[0].length >= 3) {
    const fallbackMapping: Record<string, number> = { mainFolder: 0, subFolder: 1, assetTag: 2, payload: 3 };
    const rows = applyMapping(rawRows, fallbackMapping);
    if (rows.length > 0) return rows;
  }

  throw new Error('Could not auto-map columns. Please map them manually.');
}

async function parseExcelRaw(file: File): Promise<RawFileData> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error('No sheets found in workbook');

  const sheet = workbook.Sheets[firstSheetName];
  const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (jsonData.length < 2) throw new Error('File must have at least a header row and one data row');

  const headers = (jsonData[0] || []).map((h: any) => String(h || '').trim());
  const rawRows = jsonData.slice(1).filter(row => row && row.length > 0).map(row => row.map((cell: any) => String(cell || '')));

  return { headers, rawRows };
}

async function parseCSVRaw(file: File): Promise<RawFileData> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim());

  if (lines.length < 2) throw new Error('CSV must have at least a header row and one data row');

  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  const rawRows = lines.slice(1).map(line => parseCSVLine(line)).filter(cols => cols.length > 0);

  return { headers, rawRows };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

async function parsePDFRaw(file: File): Promise<RawFileData> {
  const pdfjsLib = await import('pdfjs-dist');

  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let allText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    allText += pageText + '\n';
  }

  const lines = allText.split(/\n/).filter(l => l.trim());
  const headers = ['Column 1', 'Column 2', 'Column 3', 'Column 4'];
  const rawRows: string[][] = [];

  for (const line of lines) {
    const parts = line.split(/\t|(?:\s{2,})|,/).map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2 && !parts[0].match(/^(main|sub|asset|tag|folder|payload|header)/i)) {
      rawRows.push(parts);
    }
  }

  return { headers, rawRows };
}

import * as XLSX from 'xlsx';

export interface ParsedRow {
  mainFolder: string;
  subFolder: string;
  assetTag: string;
  payload: string;
}

export async function parseFile(file: File): Promise<ParsedRow[]> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'xlsx' || ext === 'xls') {
    return parseExcel(file);
  } else if (ext === 'csv') {
    return parseCSV(file);
  } else if (ext === 'pdf') {
    return parsePDF(file);
  }

  throw new Error(`Unsupported file format: .${ext}. Please use .xlsx, .csv, or .pdf files.`);
}

async function parseExcel(file: File): Promise<ParsedRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error('No sheets found in workbook');

  const sheet = workbook.Sheets[firstSheetName];
  const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (jsonData.length < 2) throw new Error('File must have at least a header row and one data row');

  const rows: ParsedRow[] = [];
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length === 0) continue;

    const mainFolder = String(row[0] || '').trim();
    const subFolder = String(row[1] || '').trim();
    const assetTag = String(row[2] || '').trim();
    const payload = String(row[3] || '').trim();

    if (!assetTag && !payload) continue;

    rows.push({ mainFolder, subFolder, assetTag, payload });
  }

  if (rows.length === 0) throw new Error('No valid data rows found. Expected 4 columns: Main Folder, Sub-Folder, Asset Tag, Payload');

  return rows;
}

async function parseCSV(file: File): Promise<ParsedRow[]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim());

  if (lines.length < 2) throw new Error('CSV must have at least a header row and one data row');

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length === 0) continue;

    const mainFolder = (cols[0] || '').trim();
    const subFolder = (cols[1] || '').trim();
    const assetTag = (cols[2] || '').trim();
    const payload = (cols[3] || '').trim();

    if (!assetTag && !payload) continue;

    rows.push({ mainFolder, subFolder, assetTag, payload });
  }

  if (rows.length === 0) throw new Error('No valid data rows found in CSV');

  return rows;
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

async function parsePDF(file: File): Promise<ParsedRow[]> {
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

  const rows: ParsedRow[] = [];
  const lines = allText.split(/\n/).filter(l => l.trim());

  for (const line of lines) {
    const parts = line.split(/\t|(?:\s{2,})|,/).map(s => s.trim()).filter(Boolean);
    if (parts.length >= 3) {
      const mainFolder = parts.length >= 4 ? parts[0] : '';
      const subFolder = parts.length >= 4 ? parts[1] : '';
      const assetTag = parts.length >= 4 ? parts[2] : parts[0];
      const payload = parts.length >= 4 ? parts[3] : (parts.length >= 2 ? parts[parts.length - 1] : '');

      if (assetTag && !assetTag.match(/^(main|sub|asset|tag|folder|payload|header)/i)) {
        rows.push({ mainFolder, subFolder, assetTag, payload });
      }
    }
  }

  if (rows.length === 0) {
    throw new Error('Could not extract table data from PDF. Ensure the PDF contains a table with columns: Main Folder, Sub-Folder, Asset Tag, Payload');
  }

  return rows;
}

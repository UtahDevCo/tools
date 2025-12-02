import type { Transaction } from './types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? 'Unknown';
}

function parseDate(dateStr: string): Date {
  const parts = dateStr.split('/').map(Number);
  const month = parts[0] ?? 1;
  const day = parts[1] ?? 1;
  const year = parts[2] ?? 2000;
  return new Date(year, month - 1, day);
}

function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
  const cleaned = amountStr.replace(/[$,]/g, '').replace(/[()]/g, (match) => match === '(' ? '-' : '');
  return parseFloat(cleaned) || 0;
}

function parseQuantity(quantityStr: string): number | null {
  if (!quantityStr) return null;
  return parseFloat(quantityStr) || null;
}

function parsePrice(priceStr: string): number | null {
  if (!priceStr) return null;
  return parseFloat(priceStr.replace(/[$,]/g, '')) || null;
}

function extractCusip(description: string): string | null {
  const match = description.match(/CUSIP:\s*([A-Z0-9]+)/);
  return match?.[1] ?? null;
}

// Parse CSV handling multi-line quoted fields
function parseCSVContent(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++;
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.length > 0) {
          rows.push(currentRow);
        }
        currentRow = [];
        if (char === '\r') i++; // Skip \n in \r\n
      } else if (char !== '\r') {
        currentField += char;
      }
    }
  }

  // Handle last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

export function parseCSV(csvContent: string): Transaction[] {
  const rows = parseCSVContent(csvContent);
  const transactions: Transaction[] = [];

  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const fields = rows[i];
    if (!fields || fields.length < 9) continue;

    const activityDateStr = fields[0] ?? '';
    
    // Skip footer/notes lines (they don't have a valid date in the first field)
    if (!activityDateStr || !activityDateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      continue;
    }

    const processDateStr = fields[1] ?? '';
    const settleDateStr = fields[2] ?? '';
    const instrument = fields[3] ?? '';
    const description = fields[4] ?? '';
    const transCode = fields[5] ?? '';
    const quantityStr = fields[6] ?? '';
    const priceStr = fields[7] ?? '';
    const amountStr = fields[8] ?? '';

    if (!transCode) continue;

    transactions.push({
      activityDate: parseDate(activityDateStr),
      processDate: parseDate(processDateStr),
      settleDate: parseDate(settleDateStr),
      instrument,
      description,
      transCode,
      quantity: parseQuantity(quantityStr),
      price: parsePrice(priceStr),
      amount: parseAmount(amountStr),
      cusip: extractCusip(description),
    });
  }

  return transactions;
}

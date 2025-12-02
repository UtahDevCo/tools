import { parseCSV } from './src/parser';
import { calculateFIFOGainsLosses, generateYearlyPnL } from './src/fifo-calculator';
import { formatPositionSummary, formatYearlyPnLReport } from './src/formatter';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

function main() {
  // Default to temp/robinhood-history.csv relative to this file
  const scriptDir = dirname(Bun.main);
  const defaultPath = resolve(scriptDir, 'temp/robinhood-history.csv');
  const csvPath = process.argv[2] || defaultPath;

  if (!existsSync(csvPath)) {
    console.error(`Error: CSV file not found at: ${csvPath}`);
    console.error('Usage: bun run index.ts [path-to-csv]');
    process.exit(1);
  }

  console.log(`Reading Robinhood history from: ${csvPath}\n`);

  const csvContent = readFileSync(csvPath, 'utf-8');
  const transactions = parseCSV(csvContent);

  console.log(`Parsed ${transactions.length} transactions\n`);

  const { positions, errors } = calculateFIFOGainsLosses(transactions);

  // Print position summary with FIFO gains/losses
  console.log(formatPositionSummary(positions, errors));

  // Generate and print yearly P&L reports (excludes sales with incomplete cost basis)
  const yearlyReports = generateYearlyPnL(positions, errors);
  console.log(formatYearlyPnLReport(yearlyReports, errors.length));

  if (errors.length > 0) {
    console.error('\n' + '!'.repeat(60));
    console.error('WARNING: Some sales could not be matched to purchases.');
    console.error('Please run a Robinhood report that goes farther back in time.');
    console.error('!'.repeat(60) + '\n');
    process.exit(1);
  }

  console.log('\n');
}

main();
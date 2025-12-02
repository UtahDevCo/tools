import type { MonthlyReport, YearlyReport, PositionSummary, YearlyPnLReport } from './types';
import { InsufficientCostBasisError } from './types';

function formatCurrency(amount: number): string {
  const sign = amount >= 0 ? '' : '-';
  const absAmount = Math.abs(amount);
  return `${sign}$${absAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatBreakdown(breakdown: MonthlyReport['breakdown'], indent = '  '): string {
  const lines: string[] = [];

  if (breakdown.interest !== 0) {
    lines.push(`${indent}Interest:       ${formatCurrency(breakdown.interest)}`);
  }
  if (breakdown.dividends !== 0) {
    lines.push(`${indent}Dividends:      ${formatCurrency(breakdown.dividends)}`);
  }
  if (breakdown.capitalGains !== 0) {
    lines.push(`${indent}Capital Gains:  ${formatCurrency(breakdown.capitalGains)}`);
  }
  if (breakdown.stockLending !== 0) {
    lines.push(`${indent}Stock Lending:  ${formatCurrency(breakdown.stockLending)}`);
  }
  if (breakdown.fees !== 0) {
    lines.push(`${indent}Fees:           ${formatCurrency(breakdown.fees)}`);
  }
  if (breakdown.tradingGainLoss !== 0) {
    lines.push(`${indent}Trading P&L:    ${formatCurrency(breakdown.tradingGainLoss)}`);
  }

  return lines.join('\n');
}

export function formatYearlyReport(report: YearlyReport): string {
  const lines: string[] = [];

  lines.push(`\n${'='.repeat(60)}`);
  lines.push(`YEAR ${report.year}`);
  lines.push('='.repeat(60));
  lines.push(`Net Gain/Loss: ${formatCurrency(report.netGainLoss)}`);
  lines.push(`  Total Gains:  ${formatCurrency(report.gains)}`);
  lines.push(`  Total Losses: ${formatCurrency(report.losses)}`);
  lines.push('\nBreakdown:');
  lines.push(formatBreakdown(report.breakdown));

  lines.push('\n--- Monthly Details ---');

  for (const month of report.months) {
    lines.push(`\n${month.monthName} ${month.year}:`);
    lines.push(`  Net: ${formatCurrency(month.netGainLoss)}`);
    if (month.gains > 0 || month.losses < 0) {
      lines.push(`  (Gains: ${formatCurrency(month.gains)}, Losses: ${formatCurrency(month.losses)})`);
    }
    const breakdown = formatBreakdown(month.breakdown, '    ');
    if (breakdown) {
      lines.push(breakdown);
    }
  }

  return lines.join('\n');
}

export function formatSummaryTable(reports: YearlyReport[]): string {
  const lines: string[] = [];

  lines.push('\n' + '='.repeat(80));
  lines.push('SUMMARY TABLE');
  lines.push('='.repeat(80));
  lines.push('');
  lines.push('Year       | Net Gain/Loss  | Gains         | Losses');
  lines.push('-'.repeat(60));

  for (const report of reports) {
    lines.push(
      `${report.year}       | ${formatCurrency(report.netGainLoss).padEnd(14)} | ${formatCurrency(report.gains).padEnd(13)} | ${formatCurrency(report.losses)}`
    );
  }

  const totals = reports.reduce(
    (acc, r) => ({
      netGainLoss: acc.netGainLoss + r.netGainLoss,
      gains: acc.gains + r.gains,
      losses: acc.losses + r.losses,
    }),
    { netGainLoss: 0, gains: 0, losses: 0 }
  );

  lines.push('-'.repeat(60));
  lines.push(
    `TOTAL      | ${formatCurrency(totals.netGainLoss).padEnd(14)} | ${formatCurrency(totals.gains).padEnd(13)} | ${formatCurrency(totals.losses)}`
  );

  return lines.join('\n');
}

export function formatPositionSummary(positions: Map<string, PositionSummary>, errors: InsufficientCostBasisError[]): string {
  const lines: string[] = [];

  lines.push('\n' + '='.repeat(80));
  lines.push('REALIZED GAINS/LOSSES BY CUSIP (FIFO)');
  lines.push('='.repeat(80));

  if (errors.length > 0) {
    lines.push('\n⚠️  WARNING: Insufficient cost basis data for some positions.');
    lines.push('   The following sales could not be fully matched to purchases:');
    for (const error of errors) {
      lines.push(`   - ${error.instrument} (${error.cusip}): sold ${error.quantityNeeded.toFixed(4)} shares on ${formatDate(error.saleDate)}, only ${error.quantityAvailable.toFixed(4)} shares in lots`);
    }
    lines.push('   Please run a Robinhood report that goes farther back in time.\n');
  }

  // Summary table
  lines.push('\nSUMMARY BY POSITION:');
  lines.push('-'.repeat(80));
  lines.push('Symbol     | CUSIP       | Realized G/L   | Proceeds       | Cost Basis     | Shares Held');
  lines.push('-'.repeat(80));

  const sortedPositions = Array.from(positions.values()).sort((a, b) => 
    b.realizedGainLoss - a.realizedGainLoss
  );

  let totalRealizedGL = 0;
  let totalProceeds = 0;
  let totalCostBasis = 0;

  for (const pos of sortedPositions) {
    if (pos.sales.length === 0) continue; // Skip positions with no sales

    const symbol = pos.instrument.padEnd(10);
    const cusip = pos.cusip.padEnd(11);
    const gl = formatCurrency(pos.realizedGainLoss).padEnd(14);
    const proceeds = formatCurrency(pos.totalProceeds).padEnd(14);
    const costBasis = formatCurrency(pos.totalProceeds - pos.realizedGainLoss).padEnd(14);
    const shares = pos.currentShares.toFixed(4);
    const warning = pos.hasInsufficientCostBasis ? ' ⚠️' : '';

    lines.push(`${symbol} | ${cusip} | ${gl} | ${proceeds} | ${costBasis} | ${shares}${warning}`);

    totalRealizedGL += pos.realizedGainLoss;
    totalProceeds += pos.totalProceeds;
    totalCostBasis += pos.totalProceeds - pos.realizedGainLoss;
  }

  lines.push('-'.repeat(80));
  lines.push(
    `${'TOTAL'.padEnd(10)} | ${''.padEnd(11)} | ${formatCurrency(totalRealizedGL).padEnd(14)} | ${formatCurrency(totalProceeds).padEnd(14)} | ${formatCurrency(totalCostBasis).padEnd(14)} |`
  );

  // Detailed breakdown per position
  lines.push('\n\nDETAILED SALES BY POSITION:');
  lines.push('='.repeat(80));

  for (const pos of sortedPositions) {
    if (pos.sales.length === 0) continue;

    const warning = pos.hasInsufficientCostBasis ? ' ⚠️ (incomplete cost basis)' : '';
    lines.push(`\n${pos.instrument} (CUSIP: ${pos.cusip})${warning}`);
    lines.push('-'.repeat(60));
    lines.push(`  Total Realized G/L: ${formatCurrency(pos.realizedGainLoss)}`);
    lines.push(`  Total Proceeds:     ${formatCurrency(pos.totalProceeds)}`);
    lines.push(`  Total Cost Basis:   ${formatCurrency(pos.totalProceeds - pos.realizedGainLoss)}`);
    lines.push(`  Shares Remaining:   ${pos.currentShares.toFixed(4)}`);
    lines.push(`  Unrealized Basis:   ${formatCurrency(pos.unrealizedCostBasis)}`);

    lines.push('\n  Sales:');
    for (const sale of pos.sales) {
      lines.push(`    ${formatDate(sale.saleDate)}: Sold ${sale.quantitySold.toFixed(4)} shares`);
      lines.push(`      Proceeds: ${formatCurrency(sale.proceeds)}, Cost Basis: ${formatCurrency(sale.costBasis)}, G/L: ${formatCurrency(sale.gainLoss)}`);
      
      if (sale.lots.length > 1) {
        lines.push('      Lots used (FIFO):');
        for (const lot of sale.lots) {
          lines.push(`        - Bought ${formatDate(lot.purchaseDate)}: ${lot.quantity.toFixed(4)} shares @ ${formatCurrency(lot.costBasis)} basis → ${formatCurrency(lot.gainLoss)} G/L`);
        }
      }
    }
  }

  return lines.join('\n');
}

export function formatYearlyPnLReport(reports: YearlyPnLReport[], excludedCount: number): string {
  const lines: string[] = [];

  lines.push('\n' + '='.repeat(80));
  lines.push('YEARLY PROFIT & LOSS STATEMENTS (FIFO)');
  lines.push('='.repeat(80));

  if (excludedCount > 0) {
    lines.push(`\n⚠️  Note: ${excludedCount} sale(s) excluded due to incomplete cost basis data.`);
    lines.push('   Only sales with complete purchase history are included in these totals.\n');
  }

  // Summary table
  lines.push('\nYEARLY SUMMARY:');
  lines.push('-'.repeat(80));
  lines.push('Year       | Net P&L        | Proceeds       | Cost Basis     | # Sales');
  lines.push('-'.repeat(80));

  let grandTotalPnL = 0;
  let grandTotalProceeds = 0;
  let grandTotalCostBasis = 0;
  let grandTotalSales = 0;

  for (const report of reports) {
    const year = String(report.year).padEnd(10);
    const pnl = formatCurrency(report.realizedGainLoss).padEnd(14);
    const proceeds = formatCurrency(report.totalProceeds).padEnd(14);
    const costBasis = formatCurrency(report.totalCostBasis).padEnd(14);
    const sales = String(report.salesCount);

    lines.push(`${year} | ${pnl} | ${proceeds} | ${costBasis} | ${sales}`);

    grandTotalPnL += report.realizedGainLoss;
    grandTotalProceeds += report.totalProceeds;
    grandTotalCostBasis += report.totalCostBasis;
    grandTotalSales += report.salesCount;
  }

  lines.push('-'.repeat(80));
  lines.push(
    `${'TOTAL'.padEnd(10)} | ${formatCurrency(grandTotalPnL).padEnd(14)} | ${formatCurrency(grandTotalProceeds).padEnd(14)} | ${formatCurrency(grandTotalCostBasis).padEnd(14)} | ${grandTotalSales}`
  );

  // Detailed breakdown per year
  for (const report of reports) {
    lines.push(`\n\n${'='.repeat(80)}`);
    lines.push(`YEAR ${report.year} - DETAILED BREAKDOWN`);
    lines.push('='.repeat(80));
    lines.push(`\nTotal Realized P&L: ${formatCurrency(report.realizedGainLoss)}`);
    lines.push(`Total Proceeds:     ${formatCurrency(report.totalProceeds)}`);
    lines.push(`Total Cost Basis:   ${formatCurrency(report.totalCostBasis)}`);
    lines.push(`Number of Sales:    ${report.salesCount}`);

    lines.push('\nBy Position:');
    lines.push('-'.repeat(70));
    lines.push('Symbol     | CUSIP       | P&L            | Proceeds       | # Sales');
    lines.push('-'.repeat(70));

    for (const pos of report.byPosition) {
      const symbol = pos.instrument.padEnd(10);
      const cusip = pos.cusip.padEnd(11);
      const pnl = formatCurrency(pos.gainLoss).padEnd(14);
      const proceeds = formatCurrency(pos.proceeds).padEnd(14);
      const sales = String(pos.salesCount);

      lines.push(`${symbol} | ${cusip} | ${pnl} | ${proceeds} | ${sales}`);
    }
  }

  return lines.join('\n');
}

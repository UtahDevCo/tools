import type { Transaction, MonthlyReport, YearlyReport } from './types';
import { getMonthName } from './parser';

const MINIMUM_MONTHS_REQUIRED = 3;

function createEmptyBreakdown() {
  return {
    interest: 0,
    dividends: 0,
    capitalGains: 0,
    stockLending: 0,
    fees: 0,
    tradingGainLoss: 0,
  };
}

function categorizeTransaction(transaction: Transaction): keyof ReturnType<typeof createEmptyBreakdown> {
  const { transCode, description } = transaction;

  switch (transCode) {
    case 'INT':
      return 'interest';
    case 'CDIV':
    case 'MDIV':
      return 'dividends';
    case 'SCAP':
    case 'LCAP':
      return 'capitalGains';
    case 'SLIP':
      return 'stockLending';
    case 'GOLD':
    case 'MINT':
      return 'fees';
    case 'Buy':
    case 'Sell':
      return 'tradingGainLoss';
    default:
      // Skip ACH, ITRF, OEXP - these are transfers/expirations, not gains/losses
      if (transCode === 'ACH' || transCode === 'ITRF' || transCode === 'OEXP') {
        return 'tradingGainLoss'; // Will be excluded in calculation
      }
      return 'tradingGainLoss';
  }
}

function shouldIncludeInGainLoss(transaction: Transaction): boolean {
  const { transCode } = transaction;
  // Exclude transfers, option expirations - they don't represent gains/losses
  if (transCode === 'ACH' || transCode === 'ITRF' || transCode === 'OEXP') {
    return false;
  }
  return true;
}

export function calculateGainsLosses(transactions: Transaction[]): YearlyReport[] {
  // Filter to only include transactions that represent gains/losses
  const gainLossTransactions = transactions.filter(shouldIncludeInGainLoss);

  // Get unique year-month combinations to check data coverage
  const yearMonths = new Set<string>();
  for (const t of gainLossTransactions) {
    const year = t.activityDate.getFullYear();
    const month = t.activityDate.getMonth() + 1;
    yearMonths.add(`${year}-${month}`);
  }

  if (yearMonths.size < MINIMUM_MONTHS_REQUIRED) {
    throw new InsufficientDataError(yearMonths.size, MINIMUM_MONTHS_REQUIRED);
  }

  // Group transactions by year and month
  const yearlyData = new Map<number, Map<number, Transaction[]>>();

  for (const transaction of gainLossTransactions) {
    const year = transaction.activityDate.getFullYear();
    const month = transaction.activityDate.getMonth() + 1;

    if (!yearlyData.has(year)) {
      yearlyData.set(year, new Map());
    }

    const monthlyData = yearlyData.get(year)!;
    if (!monthlyData.has(month)) {
      monthlyData.set(month, []);
    }

    monthlyData.get(month)!.push(transaction);
  }

  // Calculate reports
  const yearlyReports: YearlyReport[] = [];

  const sortedYears = Array.from(yearlyData.keys()).sort((a, b) => a - b);

  for (const year of sortedYears) {
    const monthlyData = yearlyData.get(year)!;
    const monthlyReports: MonthlyReport[] = [];
    const yearlyBreakdown = createEmptyBreakdown();
    let yearlyGains = 0;
    let yearlyLosses = 0;

    const sortedMonths = Array.from(monthlyData.keys()).sort((a, b) => a - b);

    for (const month of sortedMonths) {
      const monthTransactions = monthlyData.get(month)!;
      const breakdown = createEmptyBreakdown();
      let gains = 0;
      let losses = 0;

      for (const t of monthTransactions) {
        const category = categorizeTransaction(t);
        breakdown[category] += t.amount;

        if (t.amount > 0) {
          gains += t.amount;
        } else {
          losses += t.amount;
        }
      }

      // Update yearly totals
      for (const key of Object.keys(breakdown) as (keyof typeof breakdown)[]) {
        yearlyBreakdown[key] += breakdown[key];
      }
      yearlyGains += gains;
      yearlyLosses += losses;

      monthlyReports.push({
        year,
        month,
        monthName: getMonthName(month),
        gains,
        losses,
        netGainLoss: gains + losses,
        breakdown,
      });
    }

    yearlyReports.push({
      year,
      gains: yearlyGains,
      losses: yearlyLosses,
      netGainLoss: yearlyGains + yearlyLosses,
      breakdown: yearlyBreakdown,
      months: monthlyReports,
    });
  }

  return yearlyReports;
}

export class InsufficientDataError extends Error {
  constructor(
    public readonly monthsFound: number,
    public readonly monthsRequired: number
  ) {
    super(
      `Insufficient data: found ${monthsFound} month(s) of data, but at least ${monthsRequired} months are required. ` +
      `Please run another Robinhood report that goes farther back in time.`
    );
    this.name = 'InsufficientDataError';
  }
}

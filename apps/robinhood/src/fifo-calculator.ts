import type { Transaction, Lot, RealizedGainLoss, PositionSummary, YearlyPnLReport } from './types';
import { InsufficientCostBasisError } from './types';

type LotQueue = Lot[];

export function calculateFIFOGainsLosses(transactions: Transaction[]): {
  positions: Map<string, PositionSummary>;
  errors: InsufficientCostBasisError[];
} {
  // Sort transactions by date (oldest first for FIFO)
  // Note: Include transactions from before 2024 to provide cost basis for 2024-2025 sales
  const sorted = [...transactions]
    .filter(t => t.transCode === 'Buy' || t.transCode === 'Sell')
    .filter(t => t.cusip !== null && t.quantity !== null)
    .sort((a, b) => a.activityDate.getTime() - b.activityDate.getTime());

  // Track lots per CUSIP
  const lotsByCusip = new Map<string, LotQueue>();
  const positions = new Map<string, PositionSummary>();
  const errors: InsufficientCostBasisError[] = [];

  function getOrCreatePosition(cusip: string, instrument: string): PositionSummary {
    if (!positions.has(cusip)) {
      positions.set(cusip, {
        cusip,
        instrument,
        totalBought: 0,
        totalSold: 0,
        currentShares: 0,
        totalCostBasis: 0,
        totalProceeds: 0,
        realizedGainLoss: 0,
        unrealizedCostBasis: 0,
        sales: [],
        hasInsufficientCostBasis: false,
      });
    }
    return positions.get(cusip)!;
  }

  for (const t of sorted) {
    const cusip = t.cusip!;
    const quantity = t.quantity!;
    const price = t.price ?? 0;
    const position = getOrCreatePosition(cusip, t.instrument);

    if (t.transCode === 'Buy') {
      // Add a new lot
      if (!lotsByCusip.has(cusip)) {
        lotsByCusip.set(cusip, []);
      }
      const lots = lotsByCusip.get(cusip)!;
      
      const costBasis = Math.abs(t.amount); // Buy amounts are negative in CSV
      lots.push({
        date: t.activityDate,
        quantity,
        costBasis,
        pricePerShare: price,
      });

      position.totalBought += quantity;
      position.currentShares += quantity;
      position.totalCostBasis += costBasis;
    } else if (t.transCode === 'Sell') {
      // Process sale using FIFO
      const lots = lotsByCusip.get(cusip) ?? [];
      let remainingToSell = quantity;
      const proceeds = t.amount; // Sell amounts are positive
      let totalCostBasisUsed = 0;
      const lotsUsed: RealizedGainLoss['lots'] = [];

      // Calculate available shares
      const availableShares = lots.reduce((sum, lot) => sum + lot.quantity, 0);

      if (availableShares < remainingToSell - 0.0001) { // Small tolerance for floating point
        // Not enough cost basis data
        errors.push(new InsufficientCostBasisError(
          cusip,
          t.instrument,
          t.activityDate,
          remainingToSell,
          availableShares
        ));
        position.hasInsufficientCostBasis = true;
        
        // Still record the sale but with estimated cost basis
        position.totalSold += quantity;
        position.currentShares -= quantity;
        position.totalProceeds += proceeds;
        
        // Use available lots
        while (remainingToSell > 0.0001 && lots.length > 0) {
          const lot = lots[0]!;
          const sharesToUse = Math.min(lot.quantity, remainingToSell);
          const costBasisUsed = (sharesToUse / lot.quantity) * lot.costBasis;
          const proceedsForLot = (sharesToUse / quantity) * proceeds;

          lotsUsed.push({
            purchaseDate: lot.date,
            quantity: sharesToUse,
            costBasis: costBasisUsed,
            proceeds: proceedsForLot,
            gainLoss: proceedsForLot - costBasisUsed,
          });

          totalCostBasisUsed += costBasisUsed;
          lot.quantity -= sharesToUse;
          lot.costBasis -= costBasisUsed;
          remainingToSell -= sharesToUse;

          if (lot.quantity < 0.0001) {
            lots.shift();
          }
        }

        // Record partial realized gain/loss
        const realizedGL: RealizedGainLoss = {
          saleDate: t.activityDate,
          instrument: t.instrument,
          cusip,
          quantitySold: quantity,
          proceeds,
          costBasis: totalCostBasisUsed,
          gainLoss: proceeds - totalCostBasisUsed,
          lots: lotsUsed,
        };
        position.sales.push(realizedGL);
        position.realizedGainLoss += realizedGL.gainLoss;
        
        continue;
      }

      // Normal FIFO processing
      while (remainingToSell > 0.0001 && lots.length > 0) {
        const lot = lots[0]!;
        const sharesToUse = Math.min(lot.quantity, remainingToSell);
        const costBasisUsed = (sharesToUse / lot.quantity) * lot.costBasis;
        const proceedsForLot = (sharesToUse / quantity) * proceeds;

        lotsUsed.push({
          purchaseDate: lot.date,
          quantity: sharesToUse,
          costBasis: costBasisUsed,
          proceeds: proceedsForLot,
          gainLoss: proceedsForLot - costBasisUsed,
        });

        totalCostBasisUsed += costBasisUsed;
        lot.quantity -= sharesToUse;
        lot.costBasis -= costBasisUsed;
        remainingToSell -= sharesToUse;

        if (lot.quantity < 0.0001) {
          lots.shift();
        }
      }

      const realizedGL: RealizedGainLoss = {
        saleDate: t.activityDate,
        instrument: t.instrument,
        cusip,
        quantitySold: quantity,
        proceeds,
        costBasis: totalCostBasisUsed,
        gainLoss: proceeds - totalCostBasisUsed,
        lots: lotsUsed,
      };

      position.sales.push(realizedGL);
      position.totalSold += quantity;
      position.currentShares -= quantity;
      position.totalProceeds += proceeds;
      position.realizedGainLoss += realizedGL.gainLoss;
    }
  }

  // Calculate unrealized cost basis (remaining lots)
  for (const [cusip, lots] of lotsByCusip) {
    const position = positions.get(cusip);
    if (position) {
      position.unrealizedCostBasis = lots.reduce((sum, lot) => sum + lot.costBasis, 0);
    }
  }

  return { positions, errors };
}

/**
 * Generate yearly P&L reports from position summaries.
 * Only includes sales with complete cost basis (excludes sales missing original purchase data).
 */
export function generateYearlyPnL(
  positions: Map<string, PositionSummary>,
  errors: InsufficientCostBasisError[]
): YearlyPnLReport[] {
  // Build a set of sales to exclude (those with insufficient cost basis)
  const excludedSales = new Set<string>();
  for (const error of errors) {
    // Key by cusip + date to identify sales with missing cost basis
    const key = `${error.cusip}-${error.saleDate.getTime()}`;
    excludedSales.add(key);
  }

  // Aggregate by year
  const yearlyData = new Map<number, {
    totalProceeds: number;
    totalCostBasis: number;
    salesCount: number;
    byPosition: Map<string, {
      cusip: string;
      instrument: string;
      proceeds: number;
      costBasis: number;
      salesCount: number;
    }>;
  }>();

  for (const position of positions.values()) {
    for (const sale of position.sales) {
      // Check if this sale should be excluded
      const saleKey = `${sale.cusip}-${sale.saleDate.getTime()}`;
      if (excludedSales.has(saleKey)) {
        continue; // Skip sales with incomplete cost basis
      }

      const year = sale.saleDate.getFullYear();

      if (!yearlyData.has(year)) {
        yearlyData.set(year, {
          totalProceeds: 0,
          totalCostBasis: 0,
          salesCount: 0,
          byPosition: new Map(),
        });
      }

      const yearData = yearlyData.get(year)!;
      yearData.totalProceeds += sale.proceeds;
      yearData.totalCostBasis += sale.costBasis;
      yearData.salesCount += 1;

      if (!yearData.byPosition.has(sale.cusip)) {
        yearData.byPosition.set(sale.cusip, {
          cusip: sale.cusip,
          instrument: sale.instrument,
          proceeds: 0,
          costBasis: 0,
          salesCount: 0,
        });
      }

      const posData = yearData.byPosition.get(sale.cusip)!;
      posData.proceeds += sale.proceeds;
      posData.costBasis += sale.costBasis;
      posData.salesCount += 1;
    }
  }

  // Convert to array and sort by year
  const reports: YearlyPnLReport[] = [];
  for (const [year, data] of yearlyData) {
    reports.push({
      year,
      totalProceeds: data.totalProceeds,
      totalCostBasis: data.totalCostBasis,
      realizedGainLoss: data.totalProceeds - data.totalCostBasis,
      salesCount: data.salesCount,
      byPosition: Array.from(data.byPosition.values())
        .map(p => ({
          ...p,
          gainLoss: p.proceeds - p.costBasis,
        }))
        .sort((a, b) => b.gainLoss - a.gainLoss), // Sort by gain/loss descending
    });
  }

  return reports.sort((a, b) => a.year - b.year);
}

import type { StockBar, StockSnapshot, OptionSnapshot } from "./types.ts";

/**
 * Spawns the alpaca CLI command safely and parses the JSON output.
 */
function runAlpacaCommand(args: string[]): string {
  const proc = Bun.spawnSync(["alpaca", ...args]);
  if (proc.exitCode !== 0) {
    const err = proc.stderr.toString();
    throw new Error(`Alpaca CLI error: ${err}`);
  }
  return proc.stdout.toString();
}

/**
 * Fetches historical daily or weekly bars for a set of symbols.
 */
export async function fetchStockBars(
  symbols: string[],
  timeframe: '1Day' | '1Week',
  start: string,
  end?: string
): Promise<Record<string, StockBar[]>> {
  const symbolsCsv = symbols.join(',');
  const args = ["data", "multi-bars", "--symbols", symbolsCsv, "--start", start, "--timeframe", timeframe, "--limit", "10000"];
  if (end) {
    args.push("--end", end);
  }
  
  try {
    const output = runAlpacaCommand(args);
    const data = JSON.parse(output);
    return data.bars || {};
  } catch (error) {
    console.error(`Error fetching historical bars for ${symbolsCsv}:`, error);
    return {};
  }
}

/**
 * Fetches the current snapshot for a single stock.
 */
export async function fetchStockSnapshot(symbol: string): Promise<StockSnapshot | null> {
  const args = ["data", "snapshot", "--symbol", symbol];
  try {
    const output = runAlpacaCommand(args);
    return JSON.parse(output) as StockSnapshot;
  } catch (error) {
    console.error(`Error fetching stock snapshot for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetches the option chain for an underlying stock symbol.
 */
export async function fetchOptionChain(
  symbol: string,
  options?: {
    type?: 'call' | 'put';
    expirationDateGte?: string;
    expirationDateLte?: string;
  }
): Promise<Record<string, OptionSnapshot>> {
  const args = ["data", "option", "chain", "--underlying-symbol", symbol, "--limit", "1000"];
  if (options?.type) {
    args.push("--type", options.type);
  }
  if (options?.expirationDateGte) {
    args.push("--expiration-date-gte", options.expirationDateGte);
  }
  if (options?.expirationDateLte) {
    args.push("--expiration-date-lte", options.expirationDateLte);
  }

  try {
    const output = runAlpacaCommand(args);
    const data = JSON.parse(output);
    return data.snapshots || {};
  } catch (error) {
    console.error(`Error fetching option chain for ${symbol}:`, error);
    return {};
  }
}

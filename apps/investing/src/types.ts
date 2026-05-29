export interface StockBar {
  c: number; // Close
  h: number; // High
  l: number; // Low
  o: number; // Open
  t: string; // Time
  v: number; // Volume
  vw: number; // Volume Weighted Average Price
  n: number; // Number of trades
}

export interface StockSnapshot {
  symbol: string;
  dailyBar: StockBar;
  latestQuote: {
    ap: number;
    as: number;
    bp: number;
    bs: number;
    t: string;
  };
  latestTrade: {
    p: number;
    s: number;
    t: string;
  };
  prevDailyBar: StockBar;
}

export interface OptionSnapshot {
  dailyBar?: StockBar;
  greeks: {
    delta: number;
    gamma: number;
    rho: number;
    theta: number;
    vega: number;
  };
  latestQuote: {
    ap: number; // Ask price
    as: number; // Ask size
    bp: number; // Bid price
    bs: number; // Bid size
    t: string;  // Quote timestamp
  };
  latestTrade?: {
    p: number;
    s: number;
    t: string;
  };
  prevDailyBar?: StockBar;
}

export interface CloudMetrics {
  cloudsGreen: number; // Number of green clouds (0 to 3)
  ema8: number;
  ema9: number;
  ema20: number;
  ema21: number;
  ema34: number;
  ema50: number;
}

export interface StockMetrics {
  symbol: string;
  close: number;
  weeklyTrend: CloudMetrics;
  dailyTrend: CloudMetrics;
  rsi: number;
  lowerBand: number;
  middleBand: number;
  upperBand: number;
  passesScreen: boolean;
  reason: string;
}

export interface OptionContract {
  symbol: string;
  underlying: string;
  type: 'call' | 'put';
  strike: number;
  expiry: string;
  bid: number;
  ask: number;
  mid: number;
  spreadPercent: number;
  iv: number;
  delta: number;
  theta: number;
  vega: number;
  intrinsic: number;
  timeValue: number;
  monthlyReturnPercent?: number; // ROC for CSPs
  breakevenPrice: number;
}

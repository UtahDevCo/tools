export const DEFAULT_WATCHLIST = [
  'AAPL',
  'AMZN',
  'GOOGL',
  'MSFT',
  'NVDA',
  'META',
  'INTU',
  'ZS'
];

export const CONFIG = {
  // Stock screening defaults
  rsiThreshold: 35,
  bollingerBandBuffer: 1.02, // Price within 2% of the lower band (or below it)

  // Options pricing / Black-Scholes defaults
  riskFreeRate: 0.045, // 4.5% annual risk-free rate

  // CSP screening defaults
  cspMinDte: 30,
  cspMaxDte: 45,
  cspMinDelta: 0.25,
  cspMaxDelta: 0.35,
  cspMinSafetyMargin: 0.10, // Strike is at least 10% below stock price
  cspMinIv: 0.50, // 50% IV
  cspMaxSpreadPercent: 0.10, // Bid-Ask spread < 10% of mid price

  // LEAPS screening defaults
  leapsMinDte: 365, // 12+ months out
  leapsMaxDte: 730, // 24 months out
  leapsMinDelta: 0.65,
  leapsMaxDelta: 0.85,
  leapsTargetDelta: 0.75,
  leapsMaxSpreadPercent: 0.10 // Tight spreads are highly preferred
};

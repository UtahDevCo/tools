/**
 * Standard Normal Probability Density Function (PDF).
 */
export function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Standard Normal Cumulative Distribution Function (CDF).
 * Using high-precision polynomial approximation (Abramowitz & Stegun).
 */
export function normalCDF(x: number): number {
  if (x < 0) {
    return 1 - normalCDF(-x);
  }

  const p = 0.2316419;
  const a1 = 0.31938153;
  const a2 = -0.356563782;
  const a3 = 1.781477937;
  const a4 = -1.821255978;
  const a5 = 1.330274429;

  const k = 1 / (1 + p * x);
  const sum = k * (a1 + k * (a2 + k * (a3 + k * (a4 + k * a5))));
  const cdf = 1 - normalPDF(x) * sum;
  return cdf;
}

/**
 * Calculates the theoretical Black-Scholes price of a European option.
 * 
 * @param S Current stock price
 * @param K Strike price
 * @param T Time to expiration in years
 * @param r Annual risk-free interest rate (e.g. 0.045 for 4.5%)
 * @param sigma Implied volatility (e.g. 0.30 for 30%)
 * @param type Option type ('call' or 'put')
 */
export function blackScholesPrice(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: 'call' | 'put'
): number {
  if (T <= 0) {
    if (type === 'call') {
      return Math.max(0, S - K);
    } else {
      return Math.max(0, K - S);
    }
  }

  if (sigma <= 0) {
    sigma = 0.0001; // Avoid division by zero
  }

  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  if (type === 'call') {
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  } else {
    return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
  }
}

/**
 * Calculates Delta: sensitivity of option price to changes in stock price.
 */
export function calculateDelta(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: 'call' | 'put'
): number {
  if (T <= 0) {
    if (type === 'call') {
      return S >= K ? 1.0 : 0.0;
    } else {
      return S <= K ? -1.0 : 0.0;
    }
  }

  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  if (type === 'call') {
    return normalCDF(d1);
  } else {
    return normalCDF(d1) - 1.0;
  }
}

/**
 * Calculates Vega: sensitivity of option price to a 1% change in implied volatility.
 */
export function calculateVega(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number
): number {
  if (T <= 0) return 0;
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  // Standard Vega is for a 1% (0.01) change in IV
  return (S * Math.sqrt(T) * normalPDF(d1)) / 100;
}

/**
 * Calculates Theta: sensitivity of option price to a 1-day decrease in time to expiration.
 * Theta is typically negative for long options.
 */
export function calculateTheta(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: 'call' | 'put'
): number {
  if (T <= 0) return 0;

  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  const term1 = -(S * normalPDF(d1) * sigma) / (2 * Math.sqrt(T));

  if (type === 'call') {
    const term2 = r * K * Math.exp(-r * T) * normalCDF(d2);
    // Theta is returned as daily change
    return (term1 - term2) / 365;
  } else {
    const term2 = r * K * Math.exp(-r * T) * normalCDF(-d2);
    return (term1 + term2) / 365;
  }
}

/**
 * Uses the Bisection method to solve for Implied Volatility (IV) from option market price.
 */
export function findImpliedVolatility(
  S: number,
  K: number,
  T: number,
  r: number,
  marketPrice: number,
  type: 'call' | 'put'
): number {
  // Edge case checks
  const intrinsic = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
  if (marketPrice <= intrinsic) {
    return 0.0001; // Minimum IV
  }

  let low = 0.0001;
  let high = 5.0; // 500% max IV
  let mid = 0.5;
  
  const maxIterations = 100;
  const tolerance = 0.0001;

  for (let i = 0; i < maxIterations; i++) {
    mid = (low + high) / 2;
    const testPrice = blackScholesPrice(S, K, T, r, mid, type);

    if (Math.abs(testPrice - marketPrice) < tolerance) {
      return mid;
    }

    if (testPrice > marketPrice) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return mid;
}

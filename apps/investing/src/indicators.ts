/**
 * Calculates the Simple Moving Average (SMA) of an array of numbers.
 */
export function calculateSMA(values: number[], period: number): number[] {
  const sma: number[] = new Array(values.length).fill(NaN);
  if (values.length < period) {
    return sma;
  }

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i]!;
  }
  sma[period - 1] = sum / period;

  for (let i = period; i < values.length; i++) {
    sum = sum - values[i - period]! + values[i]!;
    sma[i] = sum / period;
  }

  return sma;
}

/**
 * Calculates the Exponential Moving Average (EMA) of an array of numbers.
 */
export function calculateEMA(values: number[], period: number): number[] {
  const ema: number[] = new Array(values.length).fill(NaN);
  if (values.length < period) {
    return ema;
  }

  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i]!;
  }
  
  let currentEma = sum / period;
  ema[period - 1] = currentEma;

  for (let i = period; i < values.length; i++) {
    currentEma = values[i]! * k + currentEma * (1 - k);
    ema[i] = currentEma;
  }

  return ema;
}

/**
 * Calculates the Rolling Standard Deviation.
 */
export function calculateStdDev(values: number[], period: number): number[] {
  const stdDev: number[] = new Array(values.length).fill(NaN);
  const sma = calculateSMA(values, period);
  if (values.length < period) {
    return stdDev;
  }

  for (let i = period - 1; i < values.length; i++) {
    const mean = sma[i]!;
    let sumOfSquares = 0;
    for (let j = 0; j < period; j++) {
      const diff = values[i - j]! - mean;
      sumOfSquares += diff * diff;
    }
    stdDev[i] = Math.sqrt(sumOfSquares / period);
  }

  return stdDev;
}

/**
 * Result structure for Bollinger Bands.
 */
export interface BollingerBands {
  upper: number[];
  middle: number[];
  lower: number[];
}

/**
 * Calculates Bollinger Bands (default: 20 period SMA, 2 standard deviations).
 */
export function calculateBollingerBands(
  values: number[],
  period: number = 20,
  multiplier: number = 2
): BollingerBands {
  const middle = calculateSMA(values, period);
  const stdDev = calculateStdDev(values, period);
  const upper = new Array(values.length).fill(NaN);
  const lower = new Array(values.length).fill(NaN);

  for (let i = 0; i < values.length; i++) {
    const midVal = middle[i]!;
    const sdVal = stdDev[i]!;
    if (!Number.isNaN(midVal) && !Number.isNaN(sdVal)) {
      upper[i] = midVal + multiplier * sdVal;
      lower[i] = midVal - multiplier * sdVal;
    }
  }

  return { upper, middle, lower };
}

/**
 * Calculates the Relative Strength Index (RSI) using Wilder's smoothing.
 */
export function calculateRSI(values: number[], period: number = 14): number[] {
  const rsi: number[] = new Array(values.length).fill(NaN);
  if (values.length <= period) {
    return rsi;
  }

  let sumGain = 0;
  let sumLoss = 0;

  // Initial sum of gains/losses
  for (let i = 1; i <= period; i++) {
    const diff = values[i]! - values[i - 1]!;
    if (diff > 0) {
      sumGain += diff;
    } else {
      sumLoss -= diff;
    }
  }

  let avgGain = sumGain / period;
  let avgLoss = sumLoss / period;

  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i]! - values[i - 1]!;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return rsi;
}

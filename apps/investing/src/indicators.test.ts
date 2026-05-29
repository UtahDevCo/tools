import { expect, test, describe } from "bun:test";
import { calculateSMA, calculateEMA, calculateRSI, calculateBollingerBands } from "./indicators.ts";

describe("Technical Indicators", () => {
  test("Simple Moving Average (SMA)", () => {
    const data = [10, 20, 30, 40, 50, 60];
    const sma3 = calculateSMA(data, 3);
    
    // First two elements should be NaN (insufficient data)
    expect(Number.isNaN(sma3[0])).toBe(true);
    expect(Number.isNaN(sma3[1])).toBe(true);
    
    // Remaining should be SMA
    expect(sma3[2]).toBe(20); // (10+20+30)/3
    expect(sma3[3]).toBe(30); // (20+30+40)/3
    expect(sma3[4]).toBe(40); // (30+40+50)/3
    expect(sma3[5]).toBe(50); // (40+50+60)/3
  });

  test("Exponential Moving Average (EMA)", () => {
    const data = [10, 12, 14, 16, 18];
    const ema3 = calculateEMA(data, 3);
    
    // First two elements should be NaN
    expect(Number.isNaN(ema3[0])).toBe(true);
    expect(Number.isNaN(ema3[1])).toBe(true);
    
    // Index 2: Initial EMA is SMA(3) = (10+12+14)/3 = 12
    expect(ema3[2]).toBeCloseTo(12, 4);
    
    // Index 3: k = 2/(3+1) = 0.5
    // EMA = 16 * 0.5 + 12 * (1 - 0.5) = 8 + 6 = 14
    expect(ema3[3]).toBeCloseTo(14, 4);
    
    // Index 4: EMA = 18 * 0.5 + 14 * 0.5 = 9 + 7 = 16
    expect(ema3[4]).toBeCloseTo(16, 4);
  });

  test("Relative Strength Index (RSI)", () => {
    // Constant values should yield 0 gains and losses (RSI 100 if avgLoss is 0)
    const data = [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50];
    const rsi14 = calculateRSI(data, 14);
    
    expect(rsi14.length).toBe(data.length);
    expect(Number.isNaN(rsi14[13])).toBe(true);
    expect(rsi14[14]).toBe(100);
    expect(rsi14[15]).toBe(100);

    // Dynamic upward trend
    const upTrend = Array.from({ length: 20 }, (_, i) => 10 + i * 2);
    const rsiUp = calculateRSI(upTrend, 14);
    expect(rsiUp[14]).toBe(100); // Continuous gains
  });

  test("Bollinger Bands (BB)", () => {
    const data = Array.from({ length: 25 }, () => 100);
    const bands = calculateBollingerBands(data, 20, 2);
    
    // Constant values should have stddev of 0
    // Bands should be equal to SMA (100)
    expect(bands.middle[20]).toBe(100);
    expect(bands.upper[20]).toBe(100);
    expect(bands.lower[20]).toBe(100);

    const dynamicData = [
      10, 12, 11, 13, 12, 14, 13, 15, 14, 16,
      15, 17, 16, 18, 17, 19, 18, 20, 19, 21,
      20, 22, 21, 23, 22
    ];
    const dynBands = calculateBollingerBands(dynamicData, 20, 2);
    expect(dynBands.upper[20]).toBeGreaterThan(dynBands.middle[20]!);
    expect(dynBands.lower[20]).toBeLessThan(dynBands.middle[20]!);
  });
});

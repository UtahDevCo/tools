import { expect, test, describe } from "bun:test";
import {
  normalCDF,
  blackScholesPrice,
  calculateDelta,
  calculateTheta,
  calculateVega,
  findImpliedVolatility
} from "./black-scholes.ts";

describe("Black-Scholes Engine", () => {
  test("Normal CDF Approximation", () => {
    // Normal distribution values
    expect(normalCDF(0)).toBeCloseTo(0.5, 5);
    expect(normalCDF(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCDF(-1.96)).toBeCloseTo(0.025, 3);
  });

  test("Black-Scholes Options Pricing (Call)", () => {
    const S = 100;
    const K = 100;
    const T = 1.0; // 1 year
    const r = 0.05; // 5% risk-free rate
    const sigma = 0.20; // 20% volatility

    const callPrice = blackScholesPrice(S, K, T, r, sigma, 'call');
    
    // Standard ATM call option price under BS should be approx 10.45
    expect(callPrice).toBeCloseTo(10.45, 1);
  });

  test("Black-Scholes Options Pricing (Put)", () => {
    const S = 100;
    const K = 100;
    const T = 1.0; // 1 year
    const r = 0.05; // 5% risk-free rate
    const sigma = 0.20; // 20% volatility

    const putPrice = blackScholesPrice(S, K, T, r, sigma, 'put');
    
    // Put-Call Parity says: Call - Put = S - K * exp(-r * T)
    // 10.45 - Put = 100 - 100 * exp(-0.05) = 100 - 95.12 = 4.88
    // Put = 10.45 - 4.88 = 5.57
    expect(putPrice).toBeCloseTo(5.57, 1);
  });

  test("Option Greeks (Delta, Theta, Vega)", () => {
    const S = 100;
    const K = 100;
    const T = 1.0;
    const r = 0.05;
    const sigma = 0.20;

    const callDelta = calculateDelta(S, K, T, r, sigma, 'call');
    const putDelta = calculateDelta(S, K, T, r, sigma, 'put');
    const vega = calculateVega(S, K, T, r, sigma);
    const callTheta = calculateTheta(S, K, T, r, sigma, 'call');

    // ATM Call Delta should be positive, Put Delta negative
    expect(callDelta).toBeGreaterThan(0.5);
    expect(putDelta).toBeLessThan(0);
    expect(callDelta + Math.abs(putDelta)).toBeCloseTo(1.0, 4);

    // Vega should be positive
    expect(vega).toBeGreaterThan(0);

    // Theta for long call option should be negative (time decay)
    expect(callTheta).toBeLessThan(0);
  });

  test("Numerical Implied Volatility Solver", () => {
    const S = 100;
    const K = 95; // ITM call
    const T = 0.5;
    const r = 0.04;
    const trueSigma = 0.35; // 35% IV

    // 1. Calculate standard pricing
    const marketPrice = blackScholesPrice(S, K, T, r, trueSigma, 'call');

    // 2. Solve for IV from marketPrice
    const solvedSigma = findImpliedVolatility(S, K, T, r, marketPrice, 'call');

    // 3. Solved IV should match our true IV exactly
    expect(solvedSigma).toBeCloseTo(trueSigma, 3);
  });
});

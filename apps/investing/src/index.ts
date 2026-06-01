import { fetchStockBars, fetchStockSnapshot, fetchOptionChain } from "./alpaca.ts";
import { calculateEMA, calculateRSI, calculateBollingerBands } from "./indicators.ts";
import { findImpliedVolatility, calculateDelta, calculateTheta, calculateVega } from "./black-scholes.ts";
import { CONFIG, DEFAULT_WATCHLIST } from "./config.ts";
import type { StockMetrics, OptionContract, OptionSnapshot } from "./types.ts";

/**
 * Basic terminal formatting helper for clean, beautiful premium design.
 */
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  bgGreen: "\x1b[42m",
  bgRed: "\x1b[41m",
  bgYellow: "\x1b[43m"
};

/**
 * Helper to determine the visible character length of a string (excluding ANSI escape codes).
 */
function getVisibleLength(str: string): number {
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').length;
}

/**
 * Pads the end of a string to a target visible length (ignoring ANSI escape codes).
 */
function padEndVisible(str: string, targetLength: number): string {
  const visibleLen = getVisibleLength(str);
  if (visibleLen >= targetLength) return str;
  return str + ' '.repeat(targetLength - visibleLen);
}

/**
 * Parses an option symbol (e.g. AAPL260529C00110000)
 */
function parseOptionSymbol(symbol: string) {
  const match = symbol.match(/^([A-Z]+)(\d{6})([CP])(\d{8})$/);
  if (!match) return null;
  
  const underlying = match[1]!;
  const yy = match[2]!.substring(0, 2);
  const mm = match[2]!.substring(2, 4);
  const dd = match[2]!.substring(4, 6);
  const expiry = `20${yy}-${mm}-${dd}`;
  const typeStr = match[3]!;
  const type: 'call' | 'put' = typeStr === 'C' ? 'call' : 'put';
  const strike = parseInt(match[4]!) / 1000;
  
  return { underlying, expiry, type, strike };
}

/**
 * Calculates days to expiration
 */
function getDTE(expiryStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryStr);
  expiry.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - today.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Dynamic date calculators for historical bars fetching.
 */
function getStartDates() {
  const today = new Date();
  
  // Daily bars need ~150 days to stabilize 50 EMA. We fetch 9 months of data.
  const nineMonthsAgo = new Date();
  nineMonthsAgo.setMonth(today.getMonth() - 9);
  
  // Weekly bars need ~100 weeks to stabilize 50 EMA. We fetch 30 months (2.5 years) of data.
  const thirtyMonthsAgo = new Date();
  thirtyMonthsAgo.setMonth(today.getMonth() - 30);
  
  return {
    dailyStart: nineMonthsAgo.toISOString().split('T')[0]!,
    weeklyStart: thirtyMonthsAgo.toISOString().split('T')[0]!
  };
}

/**
 * Screens a single symbol based on Ripster clouds, RSI, and Bollinger Bands.
 */
async function screenSymbol(symbol: string, dailyBars: any[], weeklyBars: any[]): Promise<StockMetrics> {
  const defaultMetrics: StockMetrics = {
    symbol,
    close: 0,
    weeklyTrend: { cloudsGreen: 0, ema8: 0, ema9: 0, ema20: 0, ema21: 0, ema34: 0, ema50: 0 },
    dailyTrend: { cloudsGreen: 0, ema8: 0, ema9: 0, ema20: 0, ema21: 0, ema34: 0, ema50: 0 },
    rsi: 50,
    lowerBand: 0,
    middleBand: 0,
    upperBand: 0,
    passesScreen: false,
    reason: "Missing historical data"
  };

  if (!dailyBars || dailyBars.length < 50 || !weeklyBars || weeklyBars.length < 50) {
    return defaultMetrics;
  }

  // Daily Calculations
  const dailyCloses = dailyBars.map(b => b.c);
  const dailyClose = dailyCloses[dailyCloses.length - 1]!;
  
  const dEma8 = calculateEMA(dailyCloses, 8);
  const dEma9 = calculateEMA(dailyCloses, 9);
  const dEma20 = calculateEMA(dailyCloses, 20);
  const dEma21 = calculateEMA(dailyCloses, 21);
  const dEma34 = calculateEMA(dailyCloses, 34);
  const dEma50 = calculateEMA(dailyCloses, 50);
  
  const dRsi = calculateRSI(dailyCloses, 14);
  const dBB = calculateBollingerBands(dailyCloses, 20, 2);

  const dIdx = dailyCloses.length - 1;
  const dailyRsiVal = dRsi[dIdx]!;
  const dailyLowerBB = dBB.lower[dIdx]!;
  const dailyMiddleBB = dBB.middle[dIdx]!;
  const dailyUpperBB = dBB.upper[dIdx]!;

  // Cloud 2: 8-9, Cloud 3: 20-21, Cloud 4: 34-50
  let dCloudsGreen = 0;
  if (dEma8[dIdx]! > dEma9[dIdx]!) dCloudsGreen++;
  if (dEma20[dIdx]! > dEma21[dIdx]!) dCloudsGreen++;
  if (dEma34[dIdx]! > dEma50[dIdx]!) dCloudsGreen++;

  // Weekly Calculations
  const weeklyCloses = weeklyBars.map(b => b.c);
  const wEma8 = calculateEMA(weeklyCloses, 8);
  const wEma9 = calculateEMA(weeklyCloses, 9);
  const wEma20 = calculateEMA(weeklyCloses, 20);
  const wEma21 = calculateEMA(weeklyCloses, 21);
  const wEma34 = calculateEMA(weeklyCloses, 34);
  const wEma50 = calculateEMA(weeklyCloses, 50);

  const wIdx = weeklyCloses.length - 1;
  let wCloudsGreen = 0;
  if (wEma8[wIdx]! > wEma9[wIdx]!) wCloudsGreen++;
  if (wEma20[wIdx]! > wEma21[wIdx]!) wCloudsGreen++;
  if (wEma34[wIdx]! > wEma50[wIdx]!) wCloudsGreen++;

  // Screen Logic
  const hasWeeklyTrend = wCloudsGreen >= 2;
  const hasDailyTrend = dCloudsGreen >= 2;
  const isOversoldRsi = dailyRsiVal <= CONFIG.rsiThreshold;
  const isRestingAtBB = dailyClose <= dailyLowerBB * CONFIG.bollingerBandBuffer;

  let passesScreen = false;
  let reason = "";

  if (!hasWeeklyTrend) {
    reason = "Weekly trend is bearish (<2 green clouds)";
  } else if (!hasDailyTrend) {
    reason = "Daily trend is bearish (<2 green clouds)";
  } else if (!isOversoldRsi) {
    reason = `RSI (${dailyRsiVal.toFixed(1)}) is not oversold (> ${CONFIG.rsiThreshold})`;
  } else if (!isRestingAtBB) {
    reason = `Price ($${dailyClose.toFixed(2)}) is not near lower BB ($${dailyLowerBB.toFixed(2)})`;
  } else {
    passesScreen = true;
    reason = "Strong trend + oversold setup matching strategy!";
  }

  return {
    symbol,
    close: dailyClose,
    weeklyTrend: {
      cloudsGreen: wCloudsGreen,
      ema8: wEma8[wIdx]!,
      ema9: wEma9[wIdx]!,
      ema20: wEma20[wIdx]!,
      ema21: wEma21[wIdx]!,
      ema34: wEma34[wIdx]!,
      ema50: wEma50[wIdx]!
    },
    dailyTrend: {
      cloudsGreen: dCloudsGreen,
      ema8: dEma8[dIdx]!,
      ema9: dEma9[dIdx]!,
      ema20: dEma20[dIdx]!,
      ema21: dEma21[dIdx]!,
      ema34: dEma34[dIdx]!,
      ema50: dEma50[dIdx]!
    },
    rsi: dailyRsiVal,
    lowerBand: dailyLowerBB,
    middleBand: dailyMiddleBB,
    upperBand: dailyUpperBB,
    passesScreen,
    reason
  };
}

/**
 * Action: Screen stocks and print results.
 */
export async function runStockScreener(customSymbols?: string[]) {
  const symbols = customSymbols && customSymbols.length > 0 ? customSymbols : DEFAULT_WATCHLIST;
  console.log(`\n${colors.bright}${colors.blue}=== RUNNING INVESTING STOCK SCREENER ===${colors.reset}`);
  console.log(`${colors.dim}Target list: ${symbols.join(', ')}${colors.reset}\n`);

  const { dailyStart, weeklyStart } = getStartDates();
  console.log(`${colors.dim}Fetching historical bars: Daily from ${dailyStart}, Weekly from ${weeklyStart}...${colors.reset}`);

  // Fetch all in parallel
  const [dailyData, weeklyData] = await Promise.all([
    fetchStockBars(symbols, '1Day', dailyStart),
    fetchStockBars(symbols, '1Week', weeklyStart)
  ]);

  const results: StockMetrics[] = [];
  for (const sym of symbols) {
    const dBars = dailyData[sym] || [];
    const wBars = weeklyData[sym] || [];
    const res = await screenSymbol(sym, dBars, wBars);
    results.push(res);
  }

  // Print premium summary table
  console.log(`\n${colors.bright}STOCK SCREENING RESULTS:${colors.reset}`);
  console.log(`${colors.bright}--------------------------------------------------------------------------------------------------------------------------------${colors.reset}`);
  console.log(`${colors.bright}${"Symbol".padEnd(8)} | ${"Close".padEnd(10)} | ${"W-Clouds".padEnd(9)} | ${"D-Clouds".padEnd(9)} | ${"RSI(14)".padEnd(8)} | ${"BB Position (Lower - Mid - Upper)".padEnd(35)} | ${"Screen".padEnd(6)} | ${"Reason"}${colors.reset}`);
  console.log(`${colors.bright}--------------------------------------------------------------------------------------------------------------------------------${colors.reset}`);

  for (const r of results) {
    const isPass = r.passesScreen;
    const passText = isPass ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
    const wCloudText = r.weeklyTrend.cloudsGreen >= 2 ? `${colors.green}${r.weeklyTrend.cloudsGreen}/3 Green${colors.reset}` : `${colors.red}${r.weeklyTrend.cloudsGreen}/3 Green${colors.reset}`;
    const dCloudText = r.dailyTrend.cloudsGreen >= 2 ? `${colors.green}${r.dailyTrend.cloudsGreen}/3 Green${colors.reset}` : `${colors.red}${r.dailyTrend.cloudsGreen}/3 Green${colors.reset}`;
    const rsiText = r.rsi <= CONFIG.rsiThreshold ? `${colors.green}${r.rsi.toFixed(1)}${colors.reset}` : `${r.rsi.toFixed(1)}`;
    
    // Format BB Position
    const bbPos = `$${r.lowerBand.toFixed(1)} - $${r.middleBand.toFixed(1)} - $${r.upperBand.toFixed(1)}`;
    const priceText = isPass ? `${colors.green}$${r.close.toFixed(2)}${colors.reset}` : `$${r.close.toFixed(2)}`;

    console.log(`${colors.bright}${padEndVisible(r.symbol, 8)}${colors.reset} | ${padEndVisible(priceText, 10)} | ${padEndVisible(wCloudText, 9)} | ${padEndVisible(dCloudText, 9)} | ${padEndVisible(rsiText, 8)} | ${padEndVisible(bbPos, 35)} | ${padEndVisible(passText, 6)} | ${r.reason}`);
  }
  console.log(`${colors.bright}--------------------------------------------------------------------------------------------------------------------------------${colors.reset}\n`);

  const passedSymbols = results.filter(r => r.passesScreen).map(r => r.symbol);
  if (passedSymbols.length > 0) {
    console.log(`${colors.bright}${colors.green}🎉 Screening Complete! The following stocks passed: ${passedSymbols.join(', ')}${colors.reset}`);
    console.log(`${colors.dim}You should run the options screener next: "bun run src/index.ts options <symbol> --strategy <csp|leaps>"${colors.reset}\n`);
  } else {
    console.log(`${colors.bright}${colors.yellow}⚠️ No symbols fully passed the screen. You can still query their options chains manually using:${colors.reset}`);
    console.log(`${colors.dim}"bun run src/index.ts options <symbol> --strategy <csp|leaps>"${colors.reset}\n`);
  }
}

/**
 * Action: Screen option chain and print best contracts.
 */
export async function runOptionScreener(symbol: string, strategy: 'csp' | 'leaps') {
  console.log(`\n${colors.bright}${colors.blue}=== RUNNING OPTIONS SCREENER FOR ${symbol} (STRATEGY: ${strategy.toUpperCase()}) ===${colors.reset}`);
  
  // 1. Fetch current stock price
  const snapshot = await fetchStockSnapshot(symbol);
  if (!snapshot || !snapshot.dailyBar) {
    console.error(`${colors.red}Error: Could not retrieve current stock price for ${symbol}.${colors.reset}`);
    return;
  }
  const stockPrice = snapshot.dailyBar.c;
  console.log(`Current Stock Price: ${colors.bright}${colors.cyan}$${stockPrice.toFixed(2)}${colors.reset}\n`);

  // 2. Determine expiration dates filters
  const today = new Date();
  const minDate = new Date();
  const maxDate = new Date();

  if (strategy === 'csp') {
    minDate.setDate(today.getDate() + CONFIG.cspMinDte);
    maxDate.setDate(today.getDate() + CONFIG.cspMaxDte);
  } else {
    minDate.setDate(today.getDate() + CONFIG.leapsMinDte);
    maxDate.setDate(today.getDate() + CONFIG.leapsMaxDte);
  }

  const minDateStr = minDate.toISOString().split('T')[0]!;
  const maxDateStr = maxDate.toISOString().split('T')[0]!;

  console.log(`${colors.dim}Filtering expiries between ${minDateStr} and ${maxDateStr}...${colors.reset}`);

  // 3. Fetch Option Chain
  const type = strategy === 'csp' ? 'put' : 'call';
  const rawChain = await fetchOptionChain(symbol, {
    type,
    expirationDateGte: minDateStr,
    expirationDateLte: maxDateStr
  });

  const rawKeys = Object.keys(rawChain);
  if (rawKeys.length === 0) {
    console.log(`${colors.yellow}No option contracts found matching the expiration criteria.${colors.reset}\n`);
    return;
  }
  console.log(`Fetched ${rawKeys.length} matching raw option contracts. Analyzing...`);

  // 4. Analyze and process contracts
  const candidates: OptionContract[] = [];

  for (const optSymbol of rawKeys) {
    const optSnapshot = rawChain[optSymbol]!;
    const parsed = parseOptionSymbol(optSymbol);
    if (!parsed) continue;

    const { expiry, strike } = parsed;
    const dte = getDTE(expiry);
    const T = dte / 365;

    const bid = optSnapshot.latestQuote?.bp || 0;
    const ask = optSnapshot.latestQuote?.ap || 0;
    const mid = (bid + ask) / 2;

    if (mid <= 0) continue; // Skip illiquid ghost town contracts

    const spreadPercent = (ask - bid) / mid;
    
    // Evaluate IV & Greeks. Falling back to high-precision Black-Scholes solver.
    let iv = optSnapshot.greeks?.delta !== 0 ? (optSnapshot.latestQuote as any).iv || 0 : 0;
    let delta = optSnapshot.greeks?.delta || 0;
    let theta = optSnapshot.greeks?.theta || 0;
    let vega = optSnapshot.greeks?.vega || 0;

    // Numerical solver fallback for after-hours or missing API values
    if (delta === 0 || iv === 0) {
      iv = findImpliedVolatility(stockPrice, strike, T, CONFIG.riskFreeRate, mid, type);
      delta = calculateDelta(stockPrice, strike, T, CONFIG.riskFreeRate, iv, type);
      theta = calculateTheta(stockPrice, strike, T, CONFIG.riskFreeRate, iv, type);
      vega = calculateVega(stockPrice, strike, T, CONFIG.riskFreeRate, iv);
    }

    const absDelta = Math.abs(delta);

    // Intrinsic and extrinsic value calculations
    const intrinsic = type === 'call' ? Math.max(0, stockPrice - strike) : Math.max(0, strike - stockPrice);
    const timeValue = Math.max(0, mid - intrinsic);
    const breakevenPrice = type === 'call' ? strike + mid : strike - mid;

    const candidate: OptionContract = {
      symbol: optSymbol,
      underlying: symbol,
      type,
      strike,
      expiry,
      bid,
      ask,
      mid,
      spreadPercent,
      iv,
      delta,
      theta,
      vega,
      intrinsic,
      timeValue,
      breakevenPrice
    };

    if (strategy === 'csp') {
      // Return on Capital normalized to a monthly return (30 days)
      const monthlyReturn = (mid / strike) * (30 / dte) * 100;
      candidate.monthlyReturnPercent = monthlyReturn;

      // CSP Filters:
      // - Delta: absolute value 0.25 to 0.35
      // - Strike Price: at least 10% below stock price
      // - IV: >= 50% (displayed for user, we can relax filter slightly to show best options)
      // - Spread: Bid-Ask spread < 10% of mid
      const deltaOk = absDelta >= CONFIG.cspMinDelta && absDelta <= CONFIG.cspMaxDelta;
      const safetyOk = strike <= stockPrice * (1 - CONFIG.cspMinSafetyMargin);
      const spreadOk = spreadPercent <= CONFIG.cspMaxSpreadPercent;

      if (deltaOk && safetyOk && spreadOk) {
        candidates.push(candidate);
      }
    } else {
      // LEAPS Filters:
      // - Delta: 0.65 to 0.85
      // - Spread: <= 10% (tight spreads are preferred)
      const deltaOk = absDelta >= CONFIG.leapsMinDelta && absDelta <= CONFIG.leapsMaxDelta;
      const spreadOk = spreadPercent <= CONFIG.leapsMaxSpreadPercent;

      if (deltaOk && spreadOk) {
        candidates.push(candidate);
      }
    }
  }

  if (candidates.length === 0) {
    console.log(`${colors.yellow}⚠️ No contracts passed the strict filtering criteria (Delta, Margin of Safety, or Bid/Ask Spread limits).${colors.reset}\n`);
    return;
  }

  // Sort and rank candidates:
  if (strategy === 'csp') {
    // For CSPs, we want to maximize the Monthly Return Percent (ROC)
    candidates.sort((a, b) => (b.monthlyReturnPercent || 0) - (a.monthlyReturnPercent || 0));
  } else {
    // For LEAPS, we want to prioritize the ones closest to our target Delta of 0.75 and tightest spread
    candidates.sort((a, b) => {
      const devA = Math.abs(Math.abs(a.delta) - CONFIG.leapsTargetDelta);
      const devB = Math.abs(Math.abs(b.delta) - CONFIG.leapsTargetDelta);
      if (Math.abs(devA - devB) < 0.01) {
        return a.spreadPercent - b.spreadPercent; // Break ties with tighter spreads
      }
      return devA - devB;
    });
  }

  // Print highly premium candidates table
  console.log(`\n${colors.bright}TOP OPTION CONTRACT CANDIDATES (Ranked by Strategy Preference):${colors.reset}`);
  console.log(`${colors.bright}---------------------------------------------------------------------------------------------------------------------------------------${colors.reset}`);
  
  if (strategy === 'csp') {
    console.log(`${colors.bright}${"Symbol".padEnd(20)} | ${"Expiry".padEnd(10)} | ${"DTE".padEnd(5)} | ${"Strike".padEnd(8)} | ${"Delta".padEnd(6)} | ${"Mid".padEnd(7)} | ${"Bid / Ask".padEnd(15)} | ${"Spread%".padEnd(7)} | ${"IV%".padEnd(6)} | ${"Theta/day".padEnd(9)} | ${"Monthly ROC".padEnd(12)} | ${"Safety Margin"}${colors.reset}`);
    console.log(`${colors.bright}---------------------------------------------------------------------------------------------------------------------------------------${colors.reset}`);
    
    for (const c of candidates.slice(0, 10)) {
      const spreadColor = c.spreadPercent <= 0.05 ? colors.green : colors.yellow;
      const ivColor = c.iv >= 0.50 ? colors.green : "";
      const deltaColor = Math.abs(c.delta) <= 0.30 ? colors.green : "";
      const safetyMargin = ((stockPrice - c.strike) / stockPrice) * 100;

      console.log(
        `${colors.bright}${padEndVisible(c.symbol, 20)}${colors.reset} | ` +
        `${c.expiry} | ` +
        `${c.expiry ? padEndVisible(getDTE(c.expiry).toString(), 5) : padEndVisible("", 5)} | ` +
        `$${padEndVisible(c.strike.toFixed(2), 7)} | ` +
        `${deltaColor}${padEndVisible(c.delta.toFixed(3), 6)}${colors.reset} | ` +
        `$${padEndVisible(c.mid.toFixed(2), 6)} | ` +
        `padEndVisible("$" + c.bid.toFixed(2) + " / $" + c.ask.toFixed(2), 15)` + ` | ` +
        `${padEndVisible(spreadColor + (c.spreadPercent * 100).toFixed(1) + "%" + colors.reset, 7)} | ` +
        `${padEndVisible(ivColor + (c.iv * 100).toFixed(1) + "%" + colors.reset, 6)} | ` +
        `${padEndVisible(c.theta.toFixed(3), 9)} | ` +
        `${padEndVisible(colors.bright + colors.green + (c.monthlyReturnPercent || 0).toFixed(2) + "%" + colors.reset, 12)} | ` +
        `${safetyMargin.toFixed(1)}% below`
      );
    }
  } else {
    console.log(`${colors.bright}${"Symbol".padEnd(20)} | ${"Expiry".padEnd(10)} | ${"DTE".padEnd(5)} | ${"Strike".padEnd(8)} | ${"Delta".padEnd(6)} | ${"Mid".padEnd(7)} | ${"Bid / Ask".padEnd(15)} | ${"Spread%".padEnd(7)} | ${"IV%".padEnd(6)} | ${"Theta/day".padEnd(9)} | ${"Intrinsic".padEnd(9)} | ${"Extrinsic (Time Value)"}${colors.reset}`);
    console.log(`${colors.bright}---------------------------------------------------------------------------------------------------------------------------------------${colors.reset}`);
    
    for (const c of candidates.slice(0, 10)) {
      const spreadColor = c.spreadPercent <= 0.03 ? colors.green : colors.yellow;
      const deltaDev = Math.abs(Math.abs(c.delta) - CONFIG.leapsTargetDelta);
      const deltaColor = deltaDev <= 0.02 ? colors.green : colors.bright;

      console.log(
        `${colors.bright}${padEndVisible(c.symbol, 20)}${colors.reset} | ` +
        `${c.expiry} | ` +
        `${c.expiry ? padEndVisible(getDTE(c.expiry).toString(), 5) : padEndVisible("", 5)} | ` +
        `$${padEndVisible(c.strike.toFixed(2), 7)} | ` +
        `${deltaColor}${padEndVisible(c.delta.toFixed(3), 6)}${colors.reset} | ` +
        `$${padEndVisible(c.mid.toFixed(2), 6)} | ` +
        `padEndVisible("$" + c.bid.toFixed(2) + " / $" + c.ask.toFixed(2), 15)` + ` | ` +
        `${padEndVisible(spreadColor + (c.spreadPercent * 100).toFixed(1) + "%" + colors.reset, 7)} | ` +
        `${padEndVisible((c.iv * 100).toFixed(1) + "%", 6)} | ` +
        `${padEndVisible(c.theta.toFixed(3), 9)} | ` +
        `$${padEndVisible(c.intrinsic.toFixed(2), 8)} | ` +
        `$${c.timeValue.toFixed(2)}`
      );
    }
  }
  console.log(`${colors.bright}---------------------------------------------------------------------------------------------------------------------------------------${colors.reset}\n`);
}

/**
 * Prints help instructions.
 */
function printHelp() {
  console.log(`\n${colors.bright}${colors.blue}=== INVESTING SCREENER CLI TOOL ===${colors.reset}`);
  console.log(`Usage:`);
  console.log(`  bun run src/index.ts screen [symbols]                  Screen stock symbols (comma-separated list, e.g. AAPL,MSFT)`);
  console.log(`  bun run src/index.ts options <symbol> --strategy <str> Screen option chain for puts (csp) or LEAPS calls (leaps)`);
  console.log(`\nExamples:`);
  console.log(`  bun run src/index.ts screen`);
  console.log(`  bun run src/index.ts screen INTU,ZS`);
  console.log(`  bun run src/index.ts options INTU --strategy leaps`);
  console.log(`  bun run src/index.ts options ZS --strategy leaps`);
  console.log(`  bun run src/index.ts options AAPL --strategy csp\n`);
}

/**
 * Main parser entry point.
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    const { launchTUI } = await import("./tui.ts");
    await launchTUI();
    return;
  }

  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === 'screen') {
    const customSymbols = args[1] ? args[1].split(',') : [];
    await runStockScreener(customSymbols);
  } else if (command === 'options') {
    const symbol = args[1];
    if (!symbol) {
      console.error(`${colors.red}Error: Please specify an underlying stock symbol (e.g. INTU).${colors.reset}`);
      printHelp();
      return;
    }

    let strategy: 'csp' | 'leaps' = 'csp';
    const strategyIdx = args.indexOf('--strategy');
    if (strategyIdx !== -1 && args[strategyIdx + 1]) {
      const val = args[strategyIdx + 1]!.toLowerCase();
      if (val === 'csp' || val === 'leaps') {
        strategy = val;
      }
    }

    await runOptionScreener(symbol.toUpperCase(), strategy);
  } else {
    console.error(`${colors.red}Error: Unknown command "${command}"${colors.reset}`);
    printHelp();
  }
}

main().catch(console.error);

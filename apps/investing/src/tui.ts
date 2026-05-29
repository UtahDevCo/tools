import { createCliRenderer, Box, Text, Input } from "@opentui/core";
import { runStockScreener, runOptionScreener } from "./index.ts";

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
  cyan: "\x1b[36m"
};

/**
 * Launches the interactive OpenTUI Stock & Options Screener Dashboard.
 */
export async function launchTUI() {
  console.clear();
  console.log(`${colors.bright}${colors.cyan}Initializing OpenTUI Dashboard...${colors.reset}`);

  // Create the main OpenTUI CLI renderer
  const renderer = await createCliRenderer({
    exitOnCtrlC: true
  });

  // Main Dashboard Box layout
  const dashboard = Box({
    width: 120,
    height: 35,
    borderStyle: "rounded",
    title: " INVESTING SCREENER INTERACTIVE DASHBOARD ",
    borderColor: "#00FFFF",
    padding: 1,
    flexDirection: "column",
    gap: 1
  });

  // Welcome & Instructions Header
  dashboard.add(
    Text({
      content: "Welcome, Wealth Strategist! Control your green soldiers and trade with absolute discipline.",
      fg: "#FF00FF",
      style: "bold"
    })
  );

  // Command Shortcuts Box
  const commandPanel = Box({
    flexDirection: "row",
    gap: 4,
    marginBottom: 1
  });

  commandPanel.add(Text({ content: "[S] Screen Stock Trends", fg: "#FFFF00", style: "bold" }));
  commandPanel.add(Text({ content: "[C] Find Cash-Secured Puts", fg: "#00FF00", style: "bold" }));
  commandPanel.add(Text({ content: "[L] Find LEAPS Call Options", fg: "#FF8800", style: "bold" }));
  commandPanel.add(Text({ content: "[Q] Quit Dashboard", fg: "#FF0000", style: "bold" }));

  dashboard.add(commandPanel);

  // Console output log panel
  const resultsBox = Box({
    width: 116,
    height: 25,
    borderStyle: "single",
    borderColor: "#444444",
    title: " Screening Console Output ",
    padding: 1,
    flexDirection: "column",
    overflow: "scroll"
  });

  // Initial welcome message in the console
  resultsBox.add(Text({ content: "System status: Idle. Waiting for input.", fg: "#888888" }));
  resultsBox.add(Text({ content: "Press [S] to check current technical clouds across the watchlist.", fg: "#888888" }));
  resultsBox.add(Text({ content: "Press [C] or [L] to search for custom options contracts.", fg: "#888888" }));

  dashboard.add(resultsBox);

  // Add the dashboard root to OpenTUI renderer
  renderer.root.add(dashboard);

  // Global key listener
  renderer.keyInput.on("keypress", async (key) => {
    const keyName = key.name.toLowerCase();

    if (keyName === "q") {
      renderer.destroy();
      console.clear();
      console.log(`${colors.bright}${colors.green}Thank you for using the Investing Screener. Keep putting in the reps!${colors.reset}\n`);
      process.exit(0);
    }

    if (keyName === "s") {
      resultsBox.clear();
      resultsBox.add(Text({ content: "🔄 Fetching market data and running indicators screen... please wait.", fg: "#FFFF00" }));
      
      // Temporarily intercept console logs to display inside the TUI console Box
      const lines: string[] = [];
      const origLog = console.log;
      console.log = (...args) => lines.push(args.join(' '));
      
      try {
        await runStockScreener();
      } catch (err: any) {
        lines.push(`Error: ${err.message}`);
      } finally {
        console.log = origLog;
      }

      resultsBox.clear();
      for (const line of lines) {
        resultsBox.add(Text({ content: line }));
      }
    }

    if (keyName === "c" || keyName === "l") {
      const strategy = keyName === "c" ? "csp" : "leaps";
      const stratName = strategy === "csp" ? "CASH-SECURED PUTS" : "LEAPS CALLS";

      resultsBox.clear();
      resultsBox.add(
        Text({
          content: `🔍 ENTER STOCK TICKER SYMBOL FOR ${stratName} (e.g. INTU, ZS, SOXL):`,
          fg: "#00FFFF",
          style: "bold"
        })
      );

      // Create an interactive OpenTUI Text Input box inside the results console
      const tickerInput = Input({
        width: 20,
        placeholder: "Ticker Symbol...",
        backgroundColor: "#222222",
        focusedBackgroundColor: "#333333",
        textColor: "#FFFFFF",
        cursorColor: "#00FF00"
      });

      resultsBox.add(tickerInput);
      tickerInput.focus();

      // Handle the form submit ENTER event inside the TUI
      tickerInput.on("enter", async (value) => {
        const ticker = value.trim().toUpperCase();
        if (!ticker) {
          resultsBox.clear();
          resultsBox.add(Text({ content: "⚠️ Error: Ticker cannot be empty. Press [C] or [L] to try again.", fg: "#FF0000" }));
          return;
        }

        resultsBox.clear();
        resultsBox.add(Text({ content: `🔄 Querying ${ticker} option chain via Alpaca... please wait.`, fg: "#FFFF00" }));

        // Capture options screener logs
        const lines: string[] = [];
        const origLog = console.log;
        const origErr = console.error;
        console.log = (...args) => lines.push(args.join(' '));
        console.error = (...args) => lines.push(args.join(' '));

        try {
          await runOptionScreener(ticker, strategy);
        } catch (err: any) {
          lines.push(`Error: ${err.message}`);
        } finally {
          console.log = origLog;
          console.error = origErr;
        }

        resultsBox.clear();
        for (const line of lines) {
          resultsBox.add(Text({ content: line }));
        }
      });
    }
  });
}

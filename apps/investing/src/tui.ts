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

  // Helper to clear all children from an OpenTUI Box VNode
  function clearBox(boxVNode: any) {
    if (boxVNode && boxVNode.children) {
      boxVNode.children = [];
    }
    if (boxVNode && boxVNode.props && boxVNode.props.id) {
      const instance = renderer.root.findDescendantById(boxVNode.props.id);
      if (instance) {
        const ids = instance.getChildren().map((c: any) => c.id);
        for (const childId of ids) {
          instance.remove(childId);
        }
      }
    }
  }

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
    id: "resultsBox",
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

  // State variable to disable concurrent operations
  let isBusy = false;

  // Global key listener
  renderer.keyInput.on("keypress", async (key) => {
    const keyName = key.name.toLowerCase();

    // Standard Exit shortcut
    if (keyName === "q") {
      renderer.destroy();
      console.clear();
      console.log(`${colors.bright}${colors.green}Thank you for using the Investing Screener. Keep putting in the reps!${colors.reset}\n`);
      process.exit(0);
    }

    // Ignore other commands if currently processing an action
    if (isBusy) {
      return;
    }

    if (keyName === "s") {
      isBusy = true;
      clearBox(resultsBox);
      resultsBox.add(Text({ content: "🔄 Initializing stock trend clouds screener...", fg: "#FFFF00", style: "bold" }));
      renderer.root.requestRender();

      // Intercept console.log to display output line-by-line in real-time
      const origLog = console.log;
      console.log = (...args) => {
        const line = args.join(' ');
        resultsBox.add(Text({ content: line }));
        renderer.root.requestRender();
      };

      try {
        await runStockScreener();
      } catch (err: any) {
        resultsBox.add(Text({ content: `⚠️ Error: ${err.message}`, fg: "#FF0000", style: "bold" }));
      } finally {
        console.log = origLog;
        isBusy = false;
        renderer.root.requestRender();
      }
    }

    if (keyName === "c" || keyName === "l") {
      isBusy = true;
      const strategy = keyName === "c" ? "csp" : "leaps";
      const stratName = strategy === "csp" ? "CASH-SECURED PUTS" : "LEAPS CALLS";

      clearBox(resultsBox);
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
      renderer.root.requestRender();

      // Handle the form submit ENTER event inside the TUI
      tickerInput.on("enter", async (value) => {
        const ticker = value.trim().toUpperCase();
        if (!ticker) {
          clearBox(resultsBox);
          resultsBox.add(Text({ content: "⚠️ Error: Ticker cannot be empty. Press [C] or [L] to try again.", fg: "#FF0000" }));
          isBusy = false;
          renderer.root.requestRender();
          return;
        }

        clearBox(resultsBox);
        resultsBox.add(Text({ content: `🔄 Querying ${ticker} options chain via Alpaca... please wait.`, fg: "#FFFF00" }));
        renderer.root.requestRender();

        // Intercept console.log and console.error in real-time
        const origLog = console.log;
        const origErr = console.error;
        console.log = (...args) => {
          const line = args.join(' ');
          resultsBox.add(Text({ content: line }));
          renderer.root.requestRender();
        };
        console.error = (...args) => {
          const line = args.join(' ');
          resultsBox.add(Text({ content: line, fg: "#FF0000" }));
          renderer.root.requestRender();
        };

        try {
          await runOptionScreener(ticker, strategy);
        } catch (err: any) {
          resultsBox.add(Text({ content: `⚠️ Error: ${err.message}`, fg: "#FF0000", style: "bold" }));
        } finally {
          console.log = origLog;
          console.error = origErr;
          isBusy = false;
          renderer.root.requestRender();
        }
      });
    }
  });
}

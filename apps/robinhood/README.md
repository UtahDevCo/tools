# Robinhood History Parser

Parses Robinhood CSV transaction history and calculates gains/losses by month and year.

## Usage

1. Export your transaction history from Robinhood:
   - Go to Account → Statements & History → Download
   - Select the date range and download as CSV

2. Place the CSV file at `temp/robinhood-history.csv` or provide a custom path

3. Run the app:

```bash
bun run index.ts
# or with a custom CSV path:
bun run index.ts /path/to/your/robinhood-history.csv
```

## What It Calculates

The app categorizes transactions and calculates gains/losses from:

- **Interest** - Interest payments on cash balances
- **Dividends** - Cash dividends (CDIV) and manufactured dividends (MDIV)
- **Capital Gains** - Short-term (SCAP) and long-term (LCAP) capital gains distributions
- **Stock Lending** - Income from Robinhood's stock lending program (SLIP)
- **Fees** - Gold subscription fees, margin interest

**Note:** Buy/Sell transactions are excluded from the P&L calculation because they represent cash flow, not realized gains. For actual trading gains/losses, you need the cost basis report from Robinhood (1099-B).

## Error Handling

If the CSV contains fewer than 3 months of data, the app throws an `InsufficientDataError` and requests that you run a report that goes farther back in time.

## Output

The app outputs:
1. A summary table showing yearly totals
2. Detailed yearly reports with monthly breakdowns

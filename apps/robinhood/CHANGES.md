# Robinhood App Updates - Transaction History Focus (2024-2025)

## Overview
Updated the robinhood app to focus on the last two years of transaction history (2024-2025) for incomplete transaction detection. The app now:

- **Ignores** transactions before 2024 completely (they won't affect reports)
- **Highlights critical issues** if 2025 data is incomplete
- **Uses historical data** (before 2024) as cost basis reference for FIFO calculations

## Changes Made

### 1. New Error Type: `MissingCriticalYearDataError`
Added to `src/types.ts` to specifically flag incomplete data for critical years (2025):
- Thrown when a critical year has fewer than 12 months of transaction data
- Clear error message emphasizing tax reporting urgency
- Includes specific counts (months found vs. expected)

### 2. Year Filtering in `calculateGainsLosses()`
Updated `src/calculator.ts` to:
- Filter transactions to only include 2024 and 2025
- Add constants for configuration:
  - `SUPPORTED_YEARS = [2024, 2025]` - only these years appear in reports
  - `CRITICAL_YEARS = [2025]` - missing data here throws an error
  - `MONTHS_PER_YEAR = 12` - 2025 must have all 12 months
- Validate critical years have complete data before processing
- Update error messages to reference only 2024-2025

### 3. FIFO Cost Basis Reference
Updated comment in `src/fifo-calculator.ts`:
- FIFO calculator **still processes all transactions** (including pre-2024)
- This allows it to track cost basis for purchases before 2024
- Essential for accurate gain/loss calculations on 2024-2025 sales

## Behavior

### Scenario 1: Complete 2025 Data
✅ App processes normally and generates reports for 2024-2025

### Scenario 2: Incomplete 2025 Data
❌ App throws `MissingCriticalYearDataError` with message:
```
CRITICAL: Missing transactions for 2025. Only X out of 12 months have data. 
2025 is critical for tax reporting - please verify your Robinhood export includes all transactions for this year.
```

### Scenario 3: Pre-2024 Transactions
- 2023, 2022, 2000 data: Loaded but **not included in reports**
- Still used for FIFO cost basis calculations to ensure accurate gain/loss tracking

## Testing
All existing tests pass. The app maintains backward compatibility while adding strict validation for critical year data completeness.

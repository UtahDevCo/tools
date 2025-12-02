export type TransactionCode =
  | 'INT' // Interest Payment
  | 'GOLD' // Gold Subscription Fee
  | 'SLIP' // Stock Lending
  | 'ACH' // ACH Deposit/Withdrawal
  | 'CDIV' // Cash Dividend
  | 'MDIV' // Manufactured Dividend
  | 'SCAP' // Short-term Capital Gains
  | 'LCAP' // Long-term Capital Gains
  | 'Buy'
  | 'Sell'
  | 'ITRF' // Internal Transfer
  | 'OEXP' // Option Expiration
  | 'MINT' // Margin Interest
  | string;

export type Transaction = {
  activityDate: Date;
  processDate: Date;
  settleDate: Date;
  instrument: string;
  description: string;
  transCode: TransactionCode;
  quantity: number | null;
  price: number | null;
  amount: number;
  cusip: string | null;
};

export type MonthlyReport = {
  year: number;
  month: number;
  monthName: string;
  gains: number;
  losses: number;
  netGainLoss: number;
  breakdown: {
    interest: number;
    dividends: number;
    capitalGains: number;
    stockLending: number;
    fees: number;
    tradingGainLoss: number;
  };
};

export type YearlyReport = {
  year: number;
  gains: number;
  losses: number;
  netGainLoss: number;
  breakdown: {
    interest: number;
    dividends: number;
    capitalGains: number;
    stockLending: number;
    fees: number;
    tradingGainLoss: number;
  };
  months: MonthlyReport[];
};

// Lot for FIFO tracking
export type Lot = {
  date: Date;
  quantity: number;
  costBasis: number; // Total cost for this lot
  pricePerShare: number;
};

// Realized gain/loss from a sale
export type RealizedGainLoss = {
  saleDate: Date;
  instrument: string;
  cusip: string;
  quantitySold: number;
  proceeds: number;
  costBasis: number;
  gainLoss: number;
  lots: {
    purchaseDate: Date;
    quantity: number;
    costBasis: number;
    proceeds: number;
    gainLoss: number;
  }[];
};

// Position summary by CUSIP
export type PositionSummary = {
  cusip: string;
  instrument: string;
  totalBought: number;
  totalSold: number;
  currentShares: number;
  totalCostBasis: number;
  totalProceeds: number;
  realizedGainLoss: number;
  unrealizedCostBasis: number;
  sales: RealizedGainLoss[];
  hasInsufficientCostBasis: boolean;
};

export class InsufficientCostBasisError extends Error {
  constructor(
    public readonly cusip: string,
    public readonly instrument: string,
    public readonly saleDate: Date,
    public readonly quantityNeeded: number,
    public readonly quantityAvailable: number
  ) {
    const dateStr = saleDate.toLocaleDateString();
    super(
      `Insufficient cost basis for ${instrument} (CUSIP: ${cusip}) on ${dateStr}: ` +
      `tried to sell ${quantityNeeded} shares but only ${quantityAvailable} shares available in lots. ` +
      `Please run another Robinhood report that goes farther back in time to include the original purchase.`
    );
    this.name = 'InsufficientCostBasisError';
  }
}

export class MissingCriticalYearDataError extends Error {
  constructor(
    public readonly year: number,
    public readonly monthsCovered: number,
    public readonly expectedMonths: number
  ) {
    super(
      `CRITICAL: Missing transactions for ${year}. Only ${monthsCovered} out of ${expectedMonths} months have data. ` +
      `${year} is critical for tax reporting - please verify your Robinhood export includes all transactions for this year.`
    );
    this.name = 'MissingCriticalYearDataError';
  }
}

// Yearly P&L report
export type YearlyPnLReport = {
  year: number;
  totalProceeds: number;
  totalCostBasis: number;
  realizedGainLoss: number;
  salesCount: number;
  byPosition: {
    cusip: string;
    instrument: string;
    proceeds: number;
    costBasis: number;
    gainLoss: number;
    salesCount: number;
  }[];
};

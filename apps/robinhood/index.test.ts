import { describe, test, expect } from 'bun:test';
import { parseCSV } from './src/parser';
import { calculateFIFOGainsLosses } from './src/fifo-calculator';
import { InsufficientCostBasisError } from './src/types';

describe('parseCSV', () => {
  test('parses valid CSV content', () => {
    const csv = `"Activity Date","Process Date","Settle Date","Instrument","Description","Trans Code","Quantity","Price","Amount"
"1/15/2025","1/15/2025","1/15/2025","","Interest Payment","INT","","","$10.00"
"1/17/2025","1/17/2025","1/17/2025","","Gold Subscription Fee","GOLD","","","($5.00)"`;

    const transactions = parseCSV(csv);

    expect(transactions).toHaveLength(2);
    expect(transactions[0]!.transCode).toBe('INT');
    expect(transactions[0]!.amount).toBe(10);
    expect(transactions[1]!.transCode).toBe('GOLD');
    expect(transactions[1]!.amount).toBe(-5);
  });

  test('parses multi-line CSV fields with CUSIP', () => {
    const csv = `"Activity Date","Process Date","Settle Date","Instrument","Description","Trans Code","Quantity","Price","Amount"
"1/15/2025","1/15/2025","1/16/2025","QQQ","Invesco QQQ
CUSIP: 46090E103","Buy","10","$500.00","($5,000.00)"
"1/20/2025","1/20/2025","1/21/2025","QQQ","Invesco QQQ
CUSIP: 46090E103","Sell","10","$510.00","$5,100.00"`;

    const transactions = parseCSV(csv);

    expect(transactions).toHaveLength(2);
    expect(transactions[0]!.cusip).toBe('46090E103');
    expect(transactions[0]!.quantity).toBe(10);
    expect(transactions[0]!.price).toBe(500);
    expect(transactions[0]!.amount).toBe(-5000);
    expect(transactions[1]!.cusip).toBe('46090E103');
    expect(transactions[1]!.amount).toBe(5100);
  });

  test('skips footer/notes lines', () => {
    const csv = `"Activity Date","Process Date","Settle Date","Instrument","Description","Trans Code","Quantity","Price","Amount"
"1/15/2025","1/15/2025","1/15/2025","","Interest Payment","INT","","","$10.00"
""
"","","","","","","","","","Some disclaimer text"`;

    const transactions = parseCSV(csv);
    expect(transactions).toHaveLength(1);
  });
});

describe('calculateFIFOGainsLosses', () => {
  test('calculates FIFO gains correctly for simple buy/sell', () => {
    const csv = `"Activity Date","Process Date","Settle Date","Instrument","Description","Trans Code","Quantity","Price","Amount"
"1/10/2025","1/10/2025","1/11/2025","QQQ","Invesco QQQ
CUSIP: 46090E103","Buy","10","$100.00","($1,000.00)"
"1/20/2025","1/20/2025","1/21/2025","QQQ","Invesco QQQ
CUSIP: 46090E103","Sell","10","$110.00","$1,100.00"`;

    const transactions = parseCSV(csv);
    const { positions, errors } = calculateFIFOGainsLosses(transactions);

    expect(errors).toHaveLength(0);
    const qqqPosition = positions.get('46090E103')!;
    expect(qqqPosition.realizedGainLoss).toBeCloseTo(100, 2);
    expect(qqqPosition.totalProceeds).toBeCloseTo(1100, 2);
    expect(qqqPosition.currentShares).toBeCloseTo(0, 4);
  });

  test('uses FIFO order for multiple lots', () => {
    const csv = `"Activity Date","Process Date","Settle Date","Instrument","Description","Trans Code","Quantity","Price","Amount"
"1/10/2025","1/10/2025","1/11/2025","QQQ","Invesco QQQ
CUSIP: 46090E103","Buy","10","$100.00","($1,000.00)"
"1/15/2025","1/15/2025","1/16/2025","QQQ","Invesco QQQ
CUSIP: 46090E103","Buy","10","$120.00","($1,200.00)"
"1/20/2025","1/20/2025","1/21/2025","QQQ","Invesco QQQ
CUSIP: 46090E103","Sell","10","$110.00","$1,100.00"`;

    const transactions = parseCSV(csv);
    const { positions, errors } = calculateFIFOGainsLosses(transactions);

    expect(errors).toHaveLength(0);
    const qqqPosition = positions.get('46090E103')!;
    // Sold 10 shares at $110, FIFO uses first lot at $100 cost basis
    // Gain = $1100 - $1000 = $100
    expect(qqqPosition.realizedGainLoss).toBeCloseTo(100, 2);
    expect(qqqPosition.currentShares).toBeCloseTo(10, 4);
    expect(qqqPosition.unrealizedCostBasis).toBeCloseTo(1200, 2);
  });

  test('reports error when selling more than available cost basis', () => {
    const csv = `"Activity Date","Process Date","Settle Date","Instrument","Description","Trans Code","Quantity","Price","Amount"
"1/10/2025","1/10/2025","1/11/2025","QQQ","Invesco QQQ
CUSIP: 46090E103","Buy","5","$100.00","($500.00)"
"1/20/2025","1/20/2025","1/21/2025","QQQ","Invesco QQQ
CUSIP: 46090E103","Sell","10","$110.00","$1,100.00"`;

    const transactions = parseCSV(csv);
    const { positions, errors } = calculateFIFOGainsLosses(transactions);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(InsufficientCostBasisError);
    expect(errors[0]!.quantityNeeded).toBe(10);
    expect(errors[0]!.quantityAvailable).toBe(5);

    const qqqPosition = positions.get('46090E103')!;
    expect(qqqPosition.hasInsufficientCostBasis).toBe(true);
  });

  test('handles multiple CUSIPs independently', () => {
    const csv = `"Activity Date","Process Date","Settle Date","Instrument","Description","Trans Code","Quantity","Price","Amount"
"1/10/2025","1/10/2025","1/11/2025","QQQ","Invesco QQQ
CUSIP: 46090E103","Buy","10","$100.00","($1,000.00)"
"1/10/2025","1/10/2025","1/11/2025","SPY","SPDR S&P 500
CUSIP: 78462F103","Buy","10","$500.00","($5,000.00)"
"1/20/2025","1/20/2025","1/21/2025","QQQ","Invesco QQQ
CUSIP: 46090E103","Sell","10","$110.00","$1,100.00"
"1/20/2025","1/20/2025","1/21/2025","SPY","SPDR S&P 500
CUSIP: 78462F103","Sell","10","$490.00","$4,900.00"`;

    const transactions = parseCSV(csv);
    const { positions, errors } = calculateFIFOGainsLosses(transactions);

    expect(errors).toHaveLength(0);
    expect(positions.size).toBe(2);

    const qqqPosition = positions.get('46090E103')!;
    expect(qqqPosition.realizedGainLoss).toBeCloseTo(100, 2);

    const spyPosition = positions.get('78462F103')!;
    expect(spyPosition.realizedGainLoss).toBeCloseTo(-100, 2);
  });
});

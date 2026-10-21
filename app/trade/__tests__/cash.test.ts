/**
 * The cash difference of a trade offer (new trade and counter offer). Web reads the same field
 * from an `<input type="number" step="0.01">` + `parseFloat`: the browser accepts one decimal
 * separator (`,` on a Turkish locale, or `.`), turns anything it cannot read as a number
 * (thousands grouping, letters, two separators) into "", and only a value above 0 is sent.
 * The column is `Decimal(10, 2)`, so the stored amount is rounded half away from zero to cents.
 */
import { cashInputValue, nextCashInput, parseCashAmount, signedCashAmount } from '../_lib/cash';

describe('parseCashAmount', () => {
  it.each([
    ['12,50', 12.5],
    ['12.50', 12.5],
    ['12,5', 12.5],
    ['12', 12],
    ['1250', 1250],
    ['0,5', 0.5],
    [',5', 0.5],
    ['12,', 12],
    ['007', 7],
    [' 12,50 ', 12.5],
    // Rounded to cents like the Decimal(10, 2) column (half away from zero), exactly.
    ['12,505', 12.51],
    ['12,504', 12.5],
    ['1.005', 1.01],
    ['0,005', 0.01],
    ['99999999,99', 99999999.99],
    // A dot alone is a decimal separator, as in the web number input: 1.250 is 1.25, not 1250.
    ['1.250', 1.25],
  ])('%p -> %p', (raw, expected) => {
    expect(parseCashAmount(raw)).toBe(expected);
  });

  it.each([
    [''],
    ['   '],
    ['0'],
    ['0,00'],
    ['0.004'],
    ['-5'],
    ['abc'],
    ['12a'],
    [','],
    ['.'],
    // Thousands grouping is not a number on web (the input value is ""), so no cash is sent.
    ['1.250,50'],
    ['1,250.50'],
    ['1.2.3'],
    ['1e3'],
  ])('%p -> no amount', (raw) => {
    expect(parseCashAmount(raw)).toBeUndefined();
  });

  it('has no client maximum, like web: the API decides', () => {
    expect(parseCashAmount('1000000000000')).toBe(1e12);
    // Only a value too long to be a finite number (web: Infinity, sent as null) is no amount.
    expect(parseCashAmount('9'.repeat(400))).toBeUndefined();
  });

  it('treats a missing value as no amount', () => {
    expect(parseCashAmount(undefined)).toBeUndefined();
    expect(parseCashAmount(null)).toBeUndefined();
  });
});

describe('signedCashAmount', () => {
  it('is positive when I pay and negative when they pay', () => {
    expect(signedCashAmount('12,50', 'offer')).toBe(12.5);
    expect(signedCashAmount('12,50', 'request')).toBe(-12.5);
  });

  it('is undefined (never 0 or -0) without an amount, whoever pays', () => {
    for (const raw of ['', '0', '0,00', 'abc', '1.250,50']) {
      expect(signedCashAmount(raw, 'offer')).toBeUndefined();
      expect(signedCashAmount(raw, 'request')).toBeUndefined();
    }
  });
});

describe('cashInputValue', () => {
  it('prints an amount with a decimal comma, cents when there are any', () => {
    expect(cashInputValue(12.5)).toBe('12,50');
    expect(cashInputValue(0.05)).toBe('0,05');
    expect(cashInputValue(1250)).toBe('1250');
  });

  it('is empty for an amount that is not a positive number', () => {
    expect(cashInputValue(Number.NaN)).toBe('');
    expect(cashInputValue(0)).toBe('');
    expect(cashInputValue(Number.POSITIVE_INFINITY)).toBe('');
  });

  it('round-trips through the field and the parser', () => {
    for (const amount of [12.5, 0.05, 1250, 99999999.99]) {
      const text = cashInputValue(amount);
      expect(nextCashInput('', text)).toBe(text);
      expect(parseCashAmount(text)).toBe(amount);
    }
  });
});

describe('nextCashInput', () => {
  it('takes digits with one decimal separator and up to two decimals', () => {
    for (const typed of ['', '1', '12', '12,', '12,5', '12,50', '12.50', ',5', '0']) {
      expect(nextCashInput('prev', typed)).toBe(typed);
    }
  });

  it('drops other characters', () => {
    expect(nextCashInput('', '12a3,5x')).toBe('123,5');
    expect(nextCashInput('', '-5 TL')).toBe('5');
  });

  it('keeps the previous value when the change could not be sent as typed', () => {
    // A second separator: thousands grouping is no amount, so it cannot be typed.
    expect(nextCashInput('1.250', '1.250,')).toBe('1.250');
    expect(nextCashInput('1,250', '1,250.')).toBe('1,250');
    expect(nextCashInput('', '1.250,50')).toBe('');
    // A third decimal: "1.250" (meant as 1250) stops visibly at 1.25; 12,505 is not rounded.
    expect(nextCashInput('1.25', '1.250')).toBe('1.25');
    expect(nextCashInput('12,50', '12,505')).toBe('12,50');
  });

  it('every value it lets through parses to exactly what is shown', () => {
    expect(parseCashAmount(nextCashInput('', '12,50'))).toBe(12.5);
    expect(parseCashAmount(nextCashInput('', '12,'))).toBe(12);
  });
});

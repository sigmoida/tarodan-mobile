/**
 * The cash difference of a trade offer (new trade and counter offer). Web reads the same field
 * from an `<input type="number" step="0.01">` + `parseFloat`: the browser accepts one decimal
 * separator (`,` on a Turkish locale, or `.`), turns anything it cannot read as a number
 * (thousands grouping, letters, two separators) into "", and only a value above 0 is sent.
 * The column is `Decimal(10, 2)`, so the stored amount is rounded half away from zero to cents.
 */
import { parseCashAmount, sanitizeCashInput, signedCashAmount } from '../_lib/cash';

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

describe('sanitizeCashInput', () => {
  it('keeps digits and both decimal separators, drops everything else', () => {
    expect(sanitizeCashInput('12,50')).toBe('12,50');
    expect(sanitizeCashInput('12.50')).toBe('12.50');
    expect(sanitizeCashInput('12a3,5x')).toBe('123,5');
    expect(sanitizeCashInput('-5 TL')).toBe('5');
  });
});

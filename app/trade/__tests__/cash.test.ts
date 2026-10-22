/**
 * The cash difference of a trade offer (new trade and counter offer). The text is read by the
 * shared TL amount parser (`@/lib/shared/tlAmount`), as web reads its trade cash field: one
 * separator (`,` or `.`) and at most two decimals. Grouping, a third decimal, letters and an
 * amount too long to hold exactly are refused, never read as another amount, and only a value
 * above 0 is sent. The typing mask (`nextCashInput`) lets in only what the parser accepts.
 */
import { isTlAmountRefused } from '@/lib/shared/tlAmount';

import { cashInputValue, isCashInputRefused, nextCashInput, parseCashAmount, signedCashAmount } from '../_lib/cash';

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
    // The API's ceiling of an agreed amount (`TL_NEGOTIATED_AMOUNT_MAX`) itself.
    ['9999999', 9999999],
    ['9999999,00', 9999999],
    // A dot alone is a decimal separator: 1.25 is 1.25.
    ['1.25', 1.25],
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
    // A dot with three digits is Turkish grouping (one thousand), not 1 TL or 1.25 TL.
    ['1.000'],
    ['1.250'],
  ])('%p -> no amount', (raw) => {
    expect(parseCashAmount(raw)).toBeUndefined();
  });

  it("has the API's ceiling as its maximum, like web; a longer value is no amount either", () => {
    expect(parseCashAmount('1000000000000')).toBeUndefined();
    // A value too long to be held exactly in cents is no amount: never a wrong amount.
    expect(parseCashAmount('9'.repeat(17))).toBeUndefined();
    expect(parseCashAmount('9'.repeat(400))).toBeUndefined();
  });

  it.each([['12,505'], ['12,504'], ['1.005'], ['0,005'], ['0,995'], ['12,5049'], ['0,0049'], ['0.004']])(
    '%p has a third decimal: refused, not rounded (the field mask never lets one in)',
    (raw) => {
      expect(parseCashAmount(raw)).toBeUndefined();
    },
  );

  it('takes ASCII digits only (no other numeral systems, no spaces inside)', () => {
    expect(parseCashAmount('١٢')).toBeUndefined();
    expect(parseCashAmount('1 250')).toBeUndefined();
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

  it('signs the parsed amount exactly: they pay 0,01 is -0.01', () => {
    expect(signedCashAmount('0,01', 'request')).toBe(-0.01);
    expect(signedCashAmount('1250,50', 'request')).toBe(-1250.5);
  });

  it('is undefined (never 0 or -0) without an amount, whoever pays', () => {
    for (const raw of ['', '0', '0,00', '0,004', '-5', 'abc', '1.250,50', '1.000', '12,505']) {
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

  it('fixes the prefill to cents, so the parser never refuses it and the cash is never dropped', () => {
    expect(cashInputValue(0.1 + 0.2)).toBe('0,30');
    expect(cashInputValue(12.349)).toBe('12,35');
    for (const amount of [0.1 + 0.2, 12.349, 1250.5]) {
      expect(isTlAmountRefused(cashInputValue(amount))).toBe(false);
    }
  });

  it('round-trips through the field and the parser', () => {
    // Amounts as the API returns them (`parseFloat` of the Decimal(10, 2) column), including
    // cents whose binary form is not exact (0.1, 0.29, 19.99).
    for (const amount of [12.5, 0.05, 1250, 9999999, 9999998.99, 0.1, 0.29, 1.01, 1250.5, 19.99]) {
      const text = cashInputValue(amount);
      expect(nextCashInput('', text)).toBe(text);
      expect(parseCashAmount(text)).toBe(amount);
    }
  });
});

describe("parseCashAmount above the API's ceiling", () => {
  it.each(['10000000', '9999999,01', '99999999,99'])('%p is no amount to send (web: cashAmountValue)', (raw) => {
    expect(parseCashAmount(raw)).toBeUndefined();
    expect(signedCashAmount(raw, 'offer')).toBeUndefined();
    expect(signedCashAmount(raw, 'request')).toBeUndefined();
  });

  it('is not a typing refusal: the mask keeps the text so the field can say why', () => {
    expect(isCashInputRefused('10000000')).toBe(false);
    expect(nextCashInput('12', '10000000')).toBe('10000000');
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

describe('isCashInputRefused', () => {
  // `prev` holds letters, so no accepted (stripped) value can equal it.
  it.each([
    '1.250,50',
    '12,5,0',
    '12,505',
    '1.250',
    '1.000',
    '1,250.',
    '..',
    ',,',
    '1 . 2 , 3',
    '12,5😀05',
    // Too long to hold exactly in cents: refused at the field, never sent as a rounded amount.
    '9'.repeat(17),
  ])(
    'refuses %j and nextCashInput keeps the previous value',
    (typed) => {
      expect(isCashInputRefused(typed)).toBe(true);
      expect(nextCashInput('prev', typed)).toBe('prev');
    },
  );

  it.each(['', '12', '12,', '12,50', '12.50', ',5', '-', '-5', '12 TL', '12a3,5x', '😀', '١٢', '１２', '12,5-0'])(
    'accepts %j and nextCashInput takes the stripped text',
    (typed) => {
      expect(isCashInputRefused(typed)).toBe(false);
      expect(nextCashInput('prev', typed)).not.toBe('prev');
    },
  );

  it('lets in only text the parser reads: every accepted value is an amount or empty', () => {
    for (const typed of ['12', '12,', ',', '0', '12,50', '007', '99999999,99', '12 TL', '-5']) {
      expect(isTlAmountRefused(nextCashInput('prev', typed))).toBe(false);
    }
  });

  it('does not count stripped characters as a refusal: they are dropped', () => {
    expect(nextCashInput('prev', '-5 TL')).toBe('5');
    expect(nextCashInput('prev', '12,5-0')).toBe('12,50');
    // Only ASCII digits are amount digits; other scripts' digits and emoji are dropped.
    expect(nextCashInput('prev', '١٢')).toBe('');
    expect(nextCashInput('12', '12😀')).toBe('12');
  });
});

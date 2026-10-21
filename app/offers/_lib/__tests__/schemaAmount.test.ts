/**
 * Counter-offer amount text, read by the shared TL amount parser like web: "1.000" is Turkish
 * grouping and is refused (never 1 TL), a decimal comma is a decimal, blank or zero is no amount.
 * The format error is the only issue: no bound is checked against a refused amount.
 */
import i18n from '@/i18n/config';
import { buyerCounterSchema, sellerCounterSchema } from '../schema';

const t = i18n.getFixedT('tr');
const REFUSED = t('validation.amountFormatRefused');
const issues = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? [] : r.error!.issues.map((i) => i.message);

describe.each([
  ['seller counter', sellerCounterSchema(100, 5000, t)],
  ['buyer counter', buyerCounterSchema(5000, t)],
])('%s amount', (_name, schema) => {
  it.each(['1.000', '1.250,50', '12,505', '1 000', 'abc'])('refuses %p with the format copy only', (text) => {
    expect(issues(schema.safeParse({ amount: text }))).toEqual([REFUSED]);
  });

  it.each([
    ['1000', 1000],
    ['1250,50', 1250.5],
    ['1250.50', 1250.5],
    [' 300 ', 300],
  ])('reads %p as %p', (text, amount) => {
    expect(schema.parse({ amount: text })).toEqual({ amount });
  });

  it.each(['', '  ', '0', '0,00'])('%p is no amount', (text) => {
    expect(issues(schema.safeParse({ amount: text }))).toEqual([t('validation.enterValidAmount')]);
  });
});

/** The bounds compare the parsed amount to the cent: a decimal comma is never cut to whole TL. */
describe('counter bounds on decimal-comma amounts', () => {
  const firstIssue = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
    r.success ? null : r.error!.issues[0]!.message;

  it('seller counter: above the current offer and at most the product price, to the cent', () => {
    const schema = sellerCounterSchema(100, 400, t);
    expect(schema.parse({ amount: '100,01' })).toEqual({ amount: 100.01 });
    expect(schema.parse({ amount: '400,00' })).toEqual({ amount: 400 });
    expect(firstIssue(schema.safeParse({ amount: '100,00' }))).toBe(
      t('offer.counterMustBeHigher', { amount: '100,00 TL' }),
    );
    expect(firstIssue(schema.safeParse({ amount: '400,01' }))).toBe(
      t('offer.counterMustNotExceedPrice', { amount: '400,00 TL' }),
    );
  });

  it('buyer counter: below the seller amount, to the cent', () => {
    const schema = buyerCounterSchema(400, t);
    expect(schema.parse({ amount: '399,99' })).toEqual({ amount: 399.99 });
    expect(schema.safeParse({ amount: '400,00' }).success).toBe(false);
  });

  it('floor: a cent below the floor is refused', () => {
    expect(sellerCounterSchema(100, 400, t, 250).safeParse({ amount: '249,99' }).success).toBe(false);
    expect(buyerCounterSchema(400, t, 250).parse({ amount: '250,00' })).toEqual({ amount: 250 });
  });
});

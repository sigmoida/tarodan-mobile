/**
 * Installment rules of the pay screen (ADR 0019, plan 5.1 / 6.3 / 7). Money: the amounts are the
 * server's; these pins cover what is sent back (`installment` of direct-form), when the selector
 * is offered (D6 exclusions, switch, minimum) and how an options answer is read (fail closed).
 */
import {
  initiatedPaymentIdOf,
  installmentBinOf,
  installmentOfferOf,
  installmentSelectionOf,
  installmentSelectorModeOf,
  installmentSigningErrorOf,
  installmentSourceKey,
} from '../installments';
import type { InstallmentOptionsResponse } from '@/types/installments';

const ON = { enabled: true, minAmount: 500 };

const OPTIONS: InstallmentOptionsResponse = {
  enabled: true,
  card: { bank: 'Test Bank', family: 'world', type: 'credit' },
  baseAmount: 1000,
  options: [
    { count: 1, totalAmount: 1000, feeAmount: 0, monthlyAmount: 1000 },
    { count: 3, totalAmount: 1066.38, feeAmount: 66.38, monthlyAmount: 355.46 },
    { count: 2, totalAmount: 1000, feeAmount: 0, monthlyAmount: 500 },
  ],
};

describe('installmentBinOf (PCI: at most the first 8 digits)', () => {
  it('is null below 8 digits', () => {
    expect(installmentBinOf('')).toBeNull();
    expect(installmentBinOf('4546711')).toBeNull();
  });
  it('cuts exactly the first 8 digits of a full number', () => {
    expect(installmentBinOf('4546711234567890')).toBe('45467112');
    expect(installmentBinOf('4546 7112 3456')).toBe('45467112');
  });
});

describe('installmentSourceKey', () => {
  it('names the card source', () => {
    expect(installmentSourceKey(null)).toBeNull();
    expect(installmentSourceKey({ kind: 'bin', bin: '45467112' })).toBe('bin:45467112');
    expect(installmentSourceKey({ kind: 'saved', savedCardId: 'c-1' })).toBe('saved:c-1');
  });
});

describe('installmentSelectorModeOf (switch, D6, minimum)', () => {
  const base = { config: ON, amount: 1000, isMembership: false, isBoost: false, target: { orderId: 'o-1' } };
  const OFF = { kind: 'off' };
  it('order and cart group payments at or above the minimum: on', () => {
    expect(installmentSelectorModeOf(base)).toEqual({ kind: 'on' });
    expect(installmentSelectorModeOf({ ...base, target: { checkoutGroupId: 'g-1' } })).toEqual({ kind: 'on' });
    expect(installmentSelectorModeOf({ ...base, amount: 500 })).toEqual({ kind: 'on' });
  });
  it('below the minimum: the note, not hidden (plan 6.2, web parity)', () => {
    expect(installmentSelectorModeOf({ ...base, amount: 499.99 })).toEqual({ kind: 'belowMinimum', minAmount: 500 });
  });
  it('switch off or older API: off', () => {
    expect(installmentSelectorModeOf({ ...base, config: { enabled: false, minAmount: 0 } })).toEqual(OFF);
    expect(installmentSelectorModeOf({ ...base, amount: 100, config: { enabled: false, minAmount: 500 } })).toEqual(OFF);
  });
  it('unknown amount: off', () => {
    expect(installmentSelectorModeOf({ ...base, amount: undefined })).toEqual(OFF);
    expect(installmentSelectorModeOf({ ...base, amount: Number.NaN })).toEqual(OFF);
  });
  it('membership, boost and trade cash: off, also below the minimum (D6)', () => {
    expect(installmentSelectorModeOf({ ...base, isMembership: true })).toEqual(OFF);
    expect(installmentSelectorModeOf({ ...base, isBoost: true })).toEqual(OFF);
    expect(installmentSelectorModeOf({ ...base, target: { tradeId: 't-1' } })).toEqual(OFF);
    expect(installmentSelectorModeOf({ ...base, amount: 100, target: { tradeId: 't-1' } })).toEqual(OFF);
    expect(installmentSelectorModeOf({ ...base, target: { orderId: 'o-1', tradeId: 't-1' } })).toEqual(OFF);
    expect(installmentSelectorModeOf({ ...base, target: {} })).toEqual(OFF);
  });
});

describe('installmentOfferOf (fail closed)', () => {
  it('single first, then the counts ascending; the card is kept', () => {
    const offer = installmentOfferOf(OPTIONS);
    expect(offer).toEqual({
      kind: 'options',
      card: OPTIONS.card,
      options: [OPTIONS.options[0], OPTIONS.options[2], OPTIONS.options[1]],
    });
  });
  it('reason disabled hides the selector', () => {
    expect(installmentOfferOf({ enabled: false, reason: 'disabled', baseAmount: 1000, options: [] })).toEqual({
      kind: 'hidden',
    });
  });
  it.each(['card_not_eligible', 'not_offered_for_payment', 'unavailable'] as const)('reason %s is a note', (reason) => {
    expect(installmentOfferOf({ enabled: false, reason, baseAmount: 1000, options: [OPTIONS.options[0]] })).toEqual({
      kind: 'single',
      reason,
    });
  });
  it('below_minimum carries the minimum amount', () => {
    expect(
      installmentOfferOf({ enabled: false, reason: 'below_minimum', minAmount: 500, baseAmount: 100, options: [] }),
    ).toEqual({ kind: 'single', reason: 'below_minimum', minAmount: 500 });
  });
  it('no answer, no reason or no count above 1: single payment, "cannot be shown" note', () => {
    expect(installmentOfferOf(null)).toEqual({ kind: 'single', reason: 'unavailable' });
    expect(installmentOfferOf({ enabled: false, baseAmount: 1000, options: [] })).toEqual({
      kind: 'single',
      reason: 'unavailable',
    });
    expect(installmentOfferOf({ ...OPTIONS, options: [OPTIONS.options[0]] })).toEqual({
      kind: 'single',
      reason: 'unavailable',
    });
    expect(installmentOfferOf({ ...OPTIONS, options: [] })).toEqual({ kind: 'single', reason: 'unavailable' });
  });
  it('drops malformed options and requires the single payment', () => {
    const bad = [
      { count: 13, totalAmount: 1200, feeAmount: 200, monthlyAmount: 100 },
      { count: 4, totalAmount: '1100', feeAmount: 100, monthlyAmount: 275 },
      { count: 6, totalAmount: -1, feeAmount: 0, monthlyAmount: 1 },
      { count: 2.5, totalAmount: 1000, feeAmount: 0, monthlyAmount: 400 },
    ] as never[];
    expect(installmentOfferOf({ ...OPTIONS, options: [OPTIONS.options[0], ...bad] })).toEqual({
      kind: 'single',
      reason: 'unavailable',
    });
    expect(installmentOfferOf({ ...OPTIONS, options: [OPTIONS.options[1]] }).kind).toBe('single');
  });
});

describe('installmentSelectionOf (the direct-form `installment` field)', () => {
  const three = OPTIONS.options[1];
  it('single payment sends no field (old behaviour)', () => {
    expect(installmentSelectionOf(OPTIONS.options[0], { kind: 'bin', bin: '45467112' })).toBeUndefined();
    expect(installmentSelectionOf(null, { kind: 'bin', bin: '45467112' })).toBeUndefined();
    expect(installmentSelectionOf(three, null)).toBeUndefined();
  });
  it('new card: count, the 8-digit BIN and the total the buyer saw', () => {
    expect(installmentSelectionOf(three, { kind: 'bin', bin: '45467112' })).toEqual({
      count: 3,
      bin: '45467112',
      expectedTotal: 1066.38,
    });
  });
  it('saved card: never a BIN (the API refuses it next to savedCardId)', () => {
    const selection = installmentSelectionOf(three, { kind: 'saved', savedCardId: 'c-1' });
    expect(selection).toEqual({ count: 3, expectedTotal: 1066.38 });
    expect(selection).not.toHaveProperty('bin');
  });
  it('a zero-fee count sends its total (= goods total)', () => {
    expect(installmentSelectionOf(OPTIONS.options[2], { kind: 'bin', bin: '45467112' })).toEqual({
      count: 2,
      bin: '45467112',
      expectedTotal: 1000,
    });
  });
});

describe('installmentSigningErrorOf', () => {
  const err = (i18nKey: string) => ({ response: { status: 409, data: { i18nKey, message: 'x' } } });
  it('maps the A4 refusals by catalog key', () => {
    expect(installmentSigningErrorOf(err('server.payment.installmentPricingChanged'))).toBe('pricingChanged');
    expect(installmentSigningErrorOf(err('server.payment.installmentUnavailable'))).toBe('unavailable');
    expect(installmentSigningErrorOf(err('server.payment.installmentNotOffered'))).toBe('notOffered');
    expect(installmentSigningErrorOf(err('server.payment.paymentAmountOutOfDate'))).toBe('amountOutOfDate');
  });
  it('anything else is not an installment refusal', () => {
    expect(installmentSigningErrorOf(err('server.payment.savedCardNotFound'))).toBeNull();
    expect(installmentSigningErrorOf({ response: { status: 400, data: { message: ['bad'] } } })).toBeNull();
    expect(installmentSigningErrorOf(new Error('x'))).toBeNull();
    expect(installmentSigningErrorOf(undefined)).toBeNull();
  });
});

describe('initiatedPaymentIdOf (answer of POST /payments/initiate*)', () => {
  it('reads paymentId, id or payment.id, with or without the data envelope', () => {
    expect(initiatedPaymentIdOf({ paymentId: 'p-1' })).toBe('p-1');
    expect(initiatedPaymentIdOf({ id: 'p-2' })).toBe('p-2');
    expect(initiatedPaymentIdOf({ payment: { id: 'p-3' } })).toBe('p-3');
    expect(initiatedPaymentIdOf({ data: { paymentId: 'p-4' } })).toBe('p-4');
  });
  it('nothing usable: null', () => {
    expect(initiatedPaymentIdOf(undefined)).toBeNull();
    expect(initiatedPaymentIdOf({})).toBeNull();
    expect(initiatedPaymentIdOf({ paymentId: 42 })).toBeNull();
    expect(initiatedPaymentIdOf({ paymentId: '' })).toBeNull();
  });
});

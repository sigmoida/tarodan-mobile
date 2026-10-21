/**
 * The cash difference of a trade offer, shared by the new-trade wizard and the counter offer.
 * One source: both screens read and send the amount the same way, so they cannot drift apart.
 *
 * Web reads the field from an `<input type="number" step="0.01">` with `parseFloat`: the
 * browser takes one decimal separator (`,` on a Turkish keyboard, or `.`), turns anything it
 * cannot read as a number (thousands grouping, letters, a second separator) into "", and the
 * offer carries cash only when the value is above 0; otherwise `cashAmount` is left out. The
 * API stores the amount in a `Decimal(10, 2)` column, which rounds to cents (half away from
 * zero); rounding here first means the amount the user sees is the amount stored.
 */

/** Who pays the cash difference, seen from the user: `offer` = I pay, `request` = they pay. */
export type CashDirection = 'offer' | 'request';

/** Digits with at most one decimal separator (`,` or `.`); either side may be empty. */
const CASH_PATTERN = /^(\d*)(?:[.,](\d*))?$/;

/**
 * The cash amount typed into the field, rounded to cents, or `undefined` when there is no
 * amount to send: empty, zero (also after rounding), negative or not a number (web parity).
 */
export function parseCashAmount(raw: string | null | undefined): number | undefined {
  const match = CASH_PATTERN.exec((raw ?? '').trim());
  if (!match) return undefined;
  const whole = match[1] ?? '';
  const fraction = match[2] ?? '';
  if (!whole && !fraction) return undefined;
  // Whole cents from the digits themselves: no binary floating-point step before rounding.
  const roundUp = Number(fraction.charAt(2) || '0') >= 5 ? 1 : 0;
  const cents = Number(whole || '0') * 100 + Number(fraction.slice(0, 2).padEnd(2, '0')) + roundUp;
  // No client maximum, as on web: the API answers an amount too large for its column.
  if (!Number.isFinite(cents) || cents <= 0) return undefined;
  return cents / 100;
}

/**
 * The `cashAmount` of the offer payload: positive when I pay, negative when they pay, and
 * `undefined` (left out, never `0` or `-0`) when there is no amount, as on web.
 */
export function signedCashAmount(raw: string, direction: CashDirection): number | undefined {
  const amount = parseCashAmount(raw);
  if (amount === undefined) return undefined;
  return direction === 'offer' ? amount : -amount;
}

/** Keystroke filter for the field: digits and both decimal separators, nothing else. */
export function sanitizeCashInput(value: string): string {
  return value.replace(/[^\d.,]/g, '');
}

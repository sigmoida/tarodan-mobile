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
 *
 * The field itself only takes what can be sent (`nextCashInput`): one separator and at most two
 * decimals. So text that would be no amount ("1.250,50") or a rounded one ("12,505") cannot be
 * typed, and a dot typed as Turkish thousands grouping ("1.250") stops visibly at "1.25".
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
  // No client maximum, as on web: an amount too large for the column fails on the API.
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

/**
 * The field's text for an amount already in the offer (counter prefill): a decimal comma, as the
 * Turkish keyboard types it, so editing it needs no separator change. No thousands grouping
 * (unlike `formatPrice`): the field takes one separator only. Not a positive amount: empty.
 */
export function cashInputValue(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return (Number.isInteger(amount) ? String(amount) : amount.toFixed(2)).replace('.', ',');
}

/** What the field may hold while typing: digits, then one separator and up to two decimals. */
const CASH_TYPING_PATTERN = /^\d*(?:[.,]\d{0,2})?$/;

/** The typed text without other characters (letters, `-`, spaces). */
function stripCashInput(typed: string): string {
  return typed.replace(/[^\d.,]/g, '');
}

/**
 * The field's next value: the typed text without other characters (letters, `-`, spaces), or
 * the previous value when the change would not be a sendable amount (a second separator, a
 * third decimal), so what the field shows is always what is sent.
 */
export function nextCashInput(previous: string, typed: string): string {
  return isCashInputRefused(typed) ? previous : stripCashInput(typed);
}

/**
 * Whether `nextCashInput` refuses this typed or pasted text (and keeps the previous value), so a
 * field can tell the user instead of dropping the change silently. `nextCashInput` decides with
 * this function, so the two cannot disagree. It depends on the typed text only; stripped
 * characters (letters, spaces) are not a refusal.
 */
export function isCashInputRefused(typed: string): boolean {
  return !CASH_TYPING_PATTERN.test(stripCashInput(typed));
}

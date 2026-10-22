import { parseTlAmount } from '@/lib/shared/tlAmount';
import { exceedsTlNegotiatedAmountMax } from '@/types';

/**
 * The cash difference of a trade offer, shared by the new-trade wizard and the counter offer.
 * One source: both screens read and send the amount the same way, so they cannot drift apart.
 *
 * The typed text is read by the shared TL amount parser (`@/lib/shared/tlAmount`, the copy of
 * tarodan-app `@tarodan/shared` that web reads its trade cash field with): digits with at most
 * one separator (`,` or `.`) and at most two decimals. Grouping such as "1.000" or "1.250,50",
 * a third decimal and an amount too long to hold exactly are refused, never read as another
 * amount. As on web, the offer carries cash only for an amount above 0; otherwise `cashAmount`
 * is left out. This module adds only what is trade-specific: the sign and the typing mask.
 *
 * The field itself only takes what the parser accepts (`nextCashInput`), so a refused change
 * keeps the previous text: a dot typed as Turkish thousands grouping ("1.000") stops visibly at
 * "1.00". As on web, such a refused change also blocks sending until an accepted change
 * (`useCashAmount`), so "1.000" meant as one thousand is never sent as 1 TL.
 *
 * An amount above the API's ceiling (`TL_NEGOTIATED_AMOUNT_MAX`) stays in the field as typed,
 * shows `validation.amountAboveMax` and blocks sending (`useCashAmount().cashIssue`), as on web.
 */

/** Who pays the cash difference, seen from the user: `offer` = I pay, `request` = they pay. */
export type CashDirection = 'offer' | 'request';

/**
 * The cash amount typed into the field, or `undefined` when there is no amount to send: empty,
 * zero, refused by the shared parser or above the API's ceiling (web parity: `cashAmountValue`).
 * The summary and the cost preview read it, so the preview never asks for an amount the API
 * refuses; sending is blocked meanwhile (`useCashAmount().cashIssue`).
 */
export function parseCashAmount(raw: string | null | undefined): number | undefined {
  const parsed = parseTlAmount(raw ?? '');
  if (parsed.status !== 'ok' || exceedsTlNegotiatedAmountMax(parsed.amount)) return undefined;
  return parsed.amount;
}

/**
 * The `cashAmount` of the offer payload: positive when I pay, negative when they pay, and
 * `undefined` (left out, never `0` or `-0`) when there is no amount, as on web. An amount above
 * the API's ceiling throws instead of going out as "no cash": the screens block it first
 * (`useCashAmount().cashIssue`), so this only stops a caller that skipped that check.
 */
export function signedCashAmount(raw: string, direction: CashDirection): number | undefined {
  const parsed = parseTlAmount(raw);
  if (parsed.status === 'ok' && exceedsTlNegotiatedAmountMax(parsed.amount)) {
    throw new Error('cash amount is above the negotiated amount ceiling');
  }
  const amount = parseCashAmount(raw);
  if (amount === undefined) return undefined;
  return direction === 'offer' ? amount : -amount;
}

/**
 * The field's text for an amount already in the offer (counter prefill): a decimal comma, as the
 * Turkish keyboard types it, so editing it needs no separator change. No thousands grouping
 * (unlike `formatPrice`): the field takes one separator only. Not a positive amount: empty.
 *
 * Unlike the shared `tlAmountInputValue`, it fixes the amount to cents: the prefill skips the
 * typing mask, so text the parser refuses ("12,345", or a float artifact such as 0.1 + 0.2) would
 * block the counter. The API returns the `Decimal(10, 2)` column as exact cents, so for those
 * amounts this only drops float noise (`toFixed` rounds the binary value, not half away).
 */
export function cashInputValue(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return (Number.isInteger(amount) ? String(amount) : amount.toFixed(2)).replace('.', ',');
}

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
 * this function, so the two cannot disagree, and the shared parser decides here, so the field
 * never holds text the parser refuses. It may hold an amount above the API's ceiling, which
 * `parseCashAmount` reads as no amount and `useCashAmount().cashIssue` reports. It depends on the
 * typed text only; stripped characters (letters, spaces) are not a refusal.
 */
export function isCashInputRefused(typed: string): boolean {
  return parseTlAmount(stripCashInput(typed)).status === 'refused';
}

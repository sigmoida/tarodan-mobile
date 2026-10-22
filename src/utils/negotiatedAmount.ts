import type { TFunction } from 'i18next';
import { parseTlAmount } from '@/lib/shared/tlAmount';
import { exceedsTlNegotiatedAmountMax, TL_NEGOTIATED_AMOUNT_MAX } from '@/types';

/**
 * An amount two users agree on, typed into a text field: an offer, a counter-offer, the cash part
 * of a trade. The text is read by the shared TL amount parser, and the amount has the API's
 * ceiling (`TL_NEGOTIATED_AMOUNT_MAX`, vendored from tarodan-app `@tarodan/types`): the field
 * refuses a larger amount and blocks sending, as it does for text that is not an amount, so the
 * API's 400 is never the first the user hears of it. Same rule and copy as web
 * (`apps/web/src/lib/negotiatedAmount.ts`).
 */

/** Why the field cannot be sent: text that is not an amount, or an amount above the ceiling. */
export type NegotiatedAmountIssue = 'refused' | 'aboveMax';

/** Whether the typed text is an amount above the ceiling (blank or refused text is not). */
export function isNegotiatedAmountAboveMax(raw: string): boolean {
  const parsed = parseTlAmount(raw);
  return parsed.status === 'ok' && exceedsTlNegotiatedAmountMax(parsed.amount);
}

/** The field error for an amount above the ceiling. */
export function amountAboveMaxText(t: TFunction): string {
  return t('validation.amountAboveMax', { max: TL_NEGOTIATED_AMOUNT_MAX });
}

/** The field error for an issue: the shared format copy, or the ceiling copy. */
export function negotiatedAmountIssueText(issue: NegotiatedAmountIssue, t: TFunction): string {
  return issue === 'refused' ? t('validation.amountFormatRefused') : amountAboveMaxText(t);
}

/**
 * Installment payments on the pay screen (tarodan-ops ADR 0019, plan 5.1): the pure rules the
 * selector, the options hook and the direct-form body share. Money values come from the server
 * (`POST /payments/installment-options`); nothing here computes an amount.
 *
 * PCI: the only card data that may reach our API is the BIN, the first 8 digits of a new card.
 * `installmentBinOf` is the one place that cuts it; the full number never leaves the WebView form.
 */
import type {
  DirectFormInstallmentSelection,
  InstallmentOption,
  InstallmentOptionsReason,
  InstallmentOptionsResponse,
  PaymentsInstallmentsConfig,
} from '@/types/installments';
import { INSTALLMENT_COUNT_MAX } from '@/types/installments';
import type { DirectFormTarget } from './directFormBody';

/** Digits of a new card the options call needs (the API takes 6 to 8; 8 pins the issuer family). */
export const INSTALLMENT_BIN_LENGTH = 8;

/** Typing pause before the options call (plan 5.1: 300 ms). */
export const INSTALLMENT_OPTIONS_DEBOUNCE_MS = 300;

/** The card the options are priced for: a new card's BIN or a saved card. */
export type InstallmentCardSource = { kind: 'bin'; bin: string } | { kind: 'saved'; savedCardId: string };

/** First 8 digits of a typed card number, or `null` until 8 digits exist. Never more than 8. */
export function installmentBinOf(cardNumber: string): string | null {
  const digits = cardNumber.replace(/\D/g, '');
  return digits.length >= INSTALLMENT_BIN_LENGTH ? digits.slice(0, INSTALLMENT_BIN_LENGTH) : null;
}

/** Stable identity of a card source (query key part; a change resets the choice to single). */
export function installmentSourceKey(source: InstallmentCardSource | null): string | null {
  if (!source) return null;
  return source.kind === 'bin' ? `bin:${source.bin}` : `saved:${source.savedCardId}`;
}

/**
 * Whether the pay screen offers the selector at all. Off when the switch is off (or the API is
 * older), when the goods total is below the minimum (hidden, not a note: the screen already knows
 * the amount), and for the payment kinds D6 excludes: membership, boost and trade cash. The
 * server refuses them too (`not_offered_for_payment`); this only avoids a pointless call.
 */
export function installmentSelectorAllowed(input: {
  config: PaymentsInstallmentsConfig;
  amount: number | undefined;
  isMembership: boolean;
  isBoost: boolean;
  target: DirectFormTarget;
}): boolean {
  const { config, amount, isMembership, isBoost, target } = input;
  if (!config.enabled || isMembership || isBoost || target.tradeId) return false;
  if (!target.orderId && !target.checkoutGroupId) return false;
  return typeof amount === 'number' && Number.isFinite(amount) && amount >= config.minAmount;
}

function isMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isValidOption(option: unknown): option is InstallmentOption {
  const o = option as Partial<InstallmentOption> | null | undefined;
  return (
    !!o &&
    Number.isInteger(o.count) &&
    (o.count as number) >= 1 &&
    (o.count as number) <= INSTALLMENT_COUNT_MAX &&
    isMoney(o.totalAmount) &&
    o.totalAmount > 0 &&
    isMoney(o.feeAmount) &&
    isMoney(o.monthlyAmount)
  );
}

/** What the selector shows for one options answer (or a failed call). */
export type InstallmentOffer =
  /** Options to choose from: single payment first, then at least one count above 1. */
  | { kind: 'options'; options: InstallmentOption[]; card?: InstallmentOptionsResponse['card'] }
  /** Single payment only, with the one-line reason (6.6). */
  | { kind: 'single'; reason: Exclude<InstallmentOptionsReason, 'disabled'>; minAmount?: number }
  /** The switch went off between the config and this call: no selector at all. */
  | { kind: 'hidden' };

/**
 * Reads an options answer fail-closed. A malformed option is dropped; without a valid single
 * payment and at least one valid count above 1 the buyer gets the single payment and the
 * `unavailable` note.
 */
export function installmentOfferOf(response: InstallmentOptionsResponse | null | undefined): InstallmentOffer {
  if (!response || typeof response !== 'object') return { kind: 'single', reason: 'unavailable' };
  if (response.reason === 'disabled') return { kind: 'hidden' };
  if (!response.enabled) {
    const reason = response.reason ?? 'unavailable';
    if (reason === 'below_minimum') {
      return isMoney(response.minAmount)
        ? { kind: 'single', reason, minAmount: response.minAmount }
        : { kind: 'single', reason: 'not_offered_for_payment' };
    }
    return { kind: 'single', reason };
  }
  const options = (Array.isArray(response.options) ? response.options : []).filter(isValidOption);
  const single = options.find((o) => o.count === 1);
  const counts = options
    .filter((o) => o.count > 1)
    .filter((o, i, list) => list.findIndex((x) => x.count === o.count) === i)
    .sort((a, b) => a.count - b.count);
  // An enabled answer without a valid single payment and a count above 1 is malformed: the
  // card is not to blame, so the note is "cannot be shown right now".
  if (!single || counts.length === 0) return { kind: 'single', reason: 'unavailable' };
  return { kind: 'options', options: [single, ...counts], card: response.card };
}

/**
 * The `installment` field of `direct-form` (A4 contract): sent only for a count above 1, with the
 * total the buyer saw as `expectedTotal`; a new card adds its BIN, a saved card never does (the
 * API refuses `bin` next to `savedCardId`). Absent = single payment, exactly as before.
 */
export function installmentSelectionOf(
  option: InstallmentOption | null | undefined,
  source: InstallmentCardSource | null,
): DirectFormInstallmentSelection | undefined {
  if (!option || option.count <= 1 || !source) return undefined;
  return {
    count: option.count,
    ...(source.kind === 'bin' ? { bin: source.bin } : {}),
    expectedTotal: option.totalAmount,
  };
}

/** Direct-form refusals the pay screen handles itself (A4 contract). */
export type InstallmentSigningError = 'pricingChanged' | 'unavailable' | 'notOffered' | 'amountOutOfDate';

const SIGNING_ERRORS: Record<string, InstallmentSigningError> = {
  'server.payment.installmentPricingChanged': 'pricingChanged',
  'server.payment.installmentUnavailable': 'unavailable',
  'server.payment.installmentNotOffered': 'notOffered',
  'server.payment.paymentAmountOutOfDate': 'amountOutOfDate',
};

export function installmentSigningErrorOf(error: unknown): InstallmentSigningError | null {
  const key = (error as { response?: { data?: { i18nKey?: unknown } } } | null | undefined)?.response?.data
    ?.i18nKey;
  return typeof key === 'string' ? SIGNING_ERRORS[key] ?? null : null;
}

/**
 * Payment id of a `POST /payments/initiate*` answer: `{ paymentId }`, `{ id }` or
 * `{ payment: { id } }`, also inside a `data` envelope (the shapes the start calls accept).
 */
export function initiatedPaymentIdOf(body: unknown): string | null {
  const b = body as { data?: unknown } | null | undefined;
  const inner = (b && typeof b === 'object' && b.data && typeof b.data === 'object' ? b.data : b) as
    | { paymentId?: unknown; id?: unknown; payment?: { id?: unknown } | null }
    | null
    | undefined;
  const id = inner?.paymentId ?? inner?.id ?? inner?.payment?.id;
  return typeof id === 'string' && id ? id : null;
}

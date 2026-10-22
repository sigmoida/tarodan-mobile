import { useCallback, useState } from 'react';

import { isNegotiatedAmountAboveMax, type NegotiatedAmountIssue } from '@/utils/negotiatedAmount';
import { isCashInputRefused, nextCashInput } from '../_lib/cash';

/**
 * The cash amount field state of a trade offer, shared by the new-trade wizard and the counter
 * offer. Typed or pasted text goes through the `nextCashInput` mask, and `cashRefused` is true
 * while the last typed change was refused. A refused change keeps the previous (sendable) text,
 * so without a guard "1.000" typed key by key would stop at "1.00" and send 1 TL, so a refused
 * change is an issue until the user makes an accepted change. The payload still comes from
 * `cashAmount` only.
 *
 * An amount above the API's ceiling is kept as typed (it is an amount, only too large), so that
 * issue follows the text, not the last change. `cashIssue` is what blocks sending and what the
 * field shows: a refused change first, then the ceiling (`validation.amountAboveMax`). As on
 * web, the screens refuse to go on while it is set. `cashRefused` alone is not a send gate.
 */
export function useCashAmount() {
  const [cashAmount, setCashAmount] = useState('');
  const [cashRefused, setCashRefused] = useState(false);

  /** A change typed or pasted into the field. Each change builds on the latest value. */
  const changeCashText = useCallback((typed: string) => {
    setCashRefused(isCashInputRefused(typed));
    setCashAmount((previous) => nextCashInput(previous, typed));
  }, []);

  /**
   * An amount set by the screen, not typed (the counter prefill). It clears a typed refusal, but
   * text the parser refuses still blocks sending, so a bad prefill is never sent as no cash.
   */
  const resetCashAmount = useCallback((value: string) => {
    setCashAmount(value);
    setCashRefused(isCashInputRefused(value));
  }, []);

  const cashIssue: NegotiatedAmountIssue | null = cashRefused
    ? 'refused'
    : isNegotiatedAmountAboveMax(cashAmount)
      ? 'aboveMax'
      : null;

  return { cashAmount, cashRefused, cashIssue, changeCashText, resetCashAmount };
}

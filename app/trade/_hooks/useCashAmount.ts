import { useCallback, useState } from 'react';

import { isCashInputRefused, nextCashInput } from '../_lib/cash';

/**
 * The cash amount field state of a trade offer, shared by the new-trade wizard and the counter
 * offer. Typed or pasted text goes through the `nextCashInput` mask, and `cashRefused` is true
 * while the last typed change was refused. A refused change keeps the previous (sendable) text,
 * so without a guard "1.000" typed key by key would stop at "1.00" and send 1 TL. As on web, the
 * screens refuse to go on (`validation.amountFormatRefused`) while `cashRefused` is true, until the user
 * makes an accepted change. The payload still comes from `cashAmount` only.
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

  return { cashAmount, cashRefused, changeCashText, resetCashAmount };
}

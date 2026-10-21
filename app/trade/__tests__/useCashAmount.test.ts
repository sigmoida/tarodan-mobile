/**
 * The shared cash field state of the new-trade wizard and the counter offer: typed text goes
 * through the `nextCashInput` mask, `cashRefused` follows the last typed change, and a prefill
 * clears any refusal. The screens block sending while `cashRefused` is true (`new-trade-cash`,
 * `counter.test` J6.6).
 */
import { act, renderHook } from '@testing-library/react-native';
import { useCashAmount } from '../_hooks/useCashAmount';

describe('useCashAmount', () => {
  it('builds each change on the latest value, not the one of the last render', () => {
    const { result } = renderHook(() => useCashAmount());
    // Two changes in one batch: the second is refused and must keep the first, not the
    // rendered ''.
    act(() => {
      result.current.changeCashText('12,50');
      result.current.changeCashText('12,505');
    });
    expect(result.current.cashAmount).toBe('12,50');
    expect(result.current.cashRefused).toBe(true);
  });

  it('"1.000" typed key by key stops at "1.00" and stays refused until an accepted change', () => {
    const { result } = renderHook(() => useCashAmount());
    for (const typed of ['1', '1.', '1.0', '1.00', '1.000']) {
      act(() => result.current.changeCashText(typed));
    }
    expect(result.current).toMatchObject({ cashAmount: '1.00', cashRefused: true });
    act(() => result.current.changeCashText('1.000,5'));
    expect(result.current).toMatchObject({ cashAmount: '1.00', cashRefused: true });
    act(() => result.current.changeCashText('1000'));
    expect(result.current).toMatchObject({ cashAmount: '1000', cashRefused: false });
  });

  it('dropped characters are not a refusal', () => {
    const { result } = renderHook(() => useCashAmount());
    act(() => result.current.changeCashText('12 TL'));
    expect(result.current).toMatchObject({ cashAmount: '12', cashRefused: false });
  });

  it('a prefill sets the amount and clears a refusal', () => {
    const { result } = renderHook(() => useCashAmount());
    act(() => result.current.changeCashText('1.250,50'));
    expect(result.current.cashRefused).toBe(true);
    act(() => result.current.resetCashAmount('300'));
    expect(result.current).toMatchObject({ cashAmount: '300', cashRefused: false });
  });
});

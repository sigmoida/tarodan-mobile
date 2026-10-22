/**
 * The new-trade cash field (step 2) is the shared `CashAmountInput` driven by the shared
 * `useCashAmount` state, the same as the counter offer: a decimal comma is kept, a change that
 * could not be sent as typed keeps the previous value, and the refusal shows in the field's error
 * slot until an accepted change. The mask itself is pinned in `cash.test` and `useCashAmount.test`;
 * blocking the wizard while refused in `new-trade-cash.test`.
 */
import React from 'react';
import { AccessibilityInfo, TextInput } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import trCatalog from '@/i18n/lib/catalog/tr.json';
import { Step2TheirItems } from '../_components/NewTradeSteps';
import { useCashAmount } from '../../_hooks/useCashAmount';
import type { NewTradeController } from '../_hooks/useNewTrade';

jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);

const CASH_HELPER = trCatalog.trade.cashHelper;
const CASH_REFUSED = trCatalog.validation.amountFormatRefused;

/** Step 2 with the real cash state; the rest of the controller is a stub. */
function render() {
  let latest = '';
  function Step() {
    const cash = useCashAmount();
    latest = cash.cashAmount;
    const f = {
      loadingTheirProducts: false,
      theirProducts: [],
      selectedTheirItems: [],
      theirHasMore: false,
      theirLoadingMore: false,
      loadMoreTheirs: jest.fn(),
      cashDirection: 'offer',
      setCashDirection: jest.fn(),
      ...cash,
    } as unknown as NewTradeController;
    return <Step2TheirItems f={f} />;
  }
  renderWithProviders(<Step />);
  const input = screen.UNSAFE_getAllByType(TextInput).filter((n) => n.props.keyboardType === 'numeric');
  expect(input).toHaveLength(1);
  return { input: input[0]!, current: () => latest };
}

describe('new trade · cash field', () => {
  it('keeps a decimal comma and drops other characters', () => {
    const { input, current } = render();
    fireEvent.changeText(input, '12,50');
    expect(current()).toBe('12,50');
    fireEvent.changeText(input, '-12a,5x');
    expect(current()).toBe('12,5');
  });

  it.each([['12,505'], ['1.250,50'], ['12,5,0'], ['1.000']])('refuses %p and keeps the previous value', (typed) => {
    const { input, current } = render();
    fireEvent.changeText(input, '12,50');
    fireEvent.changeText(input, typed);
    expect(current()).toBe('12,50');
    expect(screen.getByText(CASH_REFUSED)).toBeOnTheScreen();
  });

  it('shows the helper, puts a refusal in its place (as on web) and clears it on an accepted change', () => {
    // The RN jest preset mocks it already, so spyOn returns that shared mock: start it from zero.
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    announce.mockClear();
    const { input, current } = render();
    fireEvent.changeText(input, '12,50');
    expect(screen.getByText(CASH_HELPER)).toBeOnTheScreen();
    expect(screen.queryByText(CASH_REFUSED)).toBeNull();

    fireEvent.changeText(input, '1.250,50');
    expect(screen.getByText(CASH_REFUSED)).toBeOnTheScreen();
    expect(screen.queryByText(CASH_HELPER)).toBeNull();
    expect(current()).toBe('12,50');
    // The field text does not change, so a screen reader is told once, not on every refused key.
    fireEvent.changeText(input, '12,5,0');
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(CASH_REFUSED);

    fireEvent.changeText(input, '12,5');
    expect(screen.queryByText(CASH_REFUSED)).toBeNull();
    expect(screen.getByText(CASH_HELPER)).toBeOnTheScreen();
    expect(current()).toBe('12,5');

    // A new refusal after an accepted change is news again: announced once more.
    fireEvent.changeText(input, '12,555');
    expect(screen.getByText(CASH_REFUSED)).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledTimes(2);
  });

  it("keeps an amount above the API's ceiling as typed and shows the ceiling copy in the error slot", () => {
    const { input, current } = render();
    fireEvent.changeText(input, '10000000');
    expect(current()).toBe('10000000');
    expect(screen.getByText("Tutar 9.999.999 TL'yi aşamaz.")).toBeOnTheScreen();
    expect(screen.queryByText(CASH_HELPER)).toBeNull();
    fireEvent.changeText(input, '9999999');
    expect(screen.queryByText("Tutar 9.999.999 TL'yi aşamaz.")).toBeNull();
    expect(screen.getByText(CASH_HELPER)).toBeOnTheScreen();
  });

  it('does not warn when only letters or spaces are dropped', () => {
    const { input } = render();
    fireEvent.changeText(input, '12 TL');
    expect(screen.queryByText(CASH_REFUSED)).toBeNull();
  });
});

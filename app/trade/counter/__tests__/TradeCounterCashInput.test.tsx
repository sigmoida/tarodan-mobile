/**
 * The counter-offer cash field is the shared `CashAmountInput` driven by the shared
 * `useCashAmount` state, the same as the new-trade field (`NewTradeCashInput.test`): a decimal
 * comma is kept, a change that could not be sent as typed keeps the previous value, and the
 * refusal shows in the field's error slot until an accepted change. Blocking the send while
 * refused is pinned in `counter.test` (J6.6).
 */
import React from 'react';
import { AccessibilityInfo, TextInput } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import trCatalog from '@/i18n/lib/catalog/tr.json';
import { TradeCounterBody } from '../[id]/_components/TradeCounterBody';
import { useCashAmount } from '../../_hooks/useCashAmount';
import type { TradeCounterController } from '../[id]/_hooks/useTradeCounter';

jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);

const CASH_HELPER = trCatalog.trade.cashHelper;
const CASH_REFUSED = trCatalog.trade.cashFormatRefused;

/** The counter body with the real cash state; the rest of the controller is a stub. */
function render() {
  let latest = '';
  function Body() {
    const cash = useCashAmount();
    latest = cash.cashAmount;
    const f = {
      trade: { id: 'trade-1', initiatorName: 'Ali', receiverName: 'Veli' },
      amIInitiator: false,
      myProducts: [],
      theirProducts: [],
      loadingMyProducts: false,
      loadingTheirProducts: false,
      selectedMine: [],
      selectedTheirs: [],
      toggleMine: jest.fn(),
      toggleTheirs: jest.fn(),
      myHasMore: false,
      theirHasMore: false,
      myLoadingMore: false,
      theirLoadingMore: false,
      loadMoreMine: jest.fn(),
      loadMoreTheirs: jest.fn(),
      cashDirection: 'offer',
      setCashDirection: jest.fn(),
      cashValue: 0,
      message: '',
      setMessage: jest.fn(),
      myTotal: 0,
      theirTotal: 0,
      submitPending: false,
      handleBack: jest.fn(),
      handleSubmit: jest.fn(),
      ...cash,
    } as unknown as TradeCounterController;
    return <TradeCounterBody f={f} />;
  }
  renderWithProviders(<Body />);
  const inputs = screen.UNSAFE_getAllByType(TextInput).filter((n) => n.props.keyboardType === 'numeric');
  expect(inputs).toHaveLength(1);
  return { input: inputs[0]!, current: () => latest };
}

describe('counter offer · cash field', () => {
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
  });

  it('does not warn when only letters or spaces are dropped', () => {
    const { input } = render();
    fireEvent.changeText(input, '12 TL');
    expect(screen.queryByText(CASH_REFUSED)).toBeNull();
  });
});

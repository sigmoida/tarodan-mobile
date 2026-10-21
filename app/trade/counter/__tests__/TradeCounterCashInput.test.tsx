/**
 * The counter-offer cash field goes through the shared `nextCashInput` mask with an updater, the
 * same as the new-trade field (`NewTradeCashInput.test`): two changes before a re-render each
 * build on the latest value, so a refused change keeps what was really typed last and not the
 * value of the last render. The screen test (`counter.test` J6.4) re-renders between changes and
 * cannot see this; here the controller's `cashAmount` stays at its first value.
 */
import React from 'react';
import { TextInput } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { TradeCounterBody } from '../[id]/_components/TradeCounterBody';
import type { TradeCounterController } from '../[id]/_hooks/useTradeCounter';

jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);

function renderBody(initial: string) {
  let value = initial;
  const setCashAmount = jest.fn((next: string | ((prev: string) => string)) => {
    value = typeof next === 'function' ? next(value) : next;
  });
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
    cashAmount: initial,
    setCashAmount,
    cashValue: 0,
    message: '',
    setMessage: jest.fn(),
    myTotal: 0,
    theirTotal: 0,
    submitPending: false,
    handleBack: jest.fn(),
    handleSubmit: jest.fn(),
  } as unknown as TradeCounterController;
  renderWithProviders(<TradeCounterBody f={f} />);
  const inputs = screen.UNSAFE_getAllByType(TextInput).filter((n) => n.props.keyboardType === 'numeric');
  expect(inputs).toHaveLength(1);
  return { input: inputs[0]!, current: () => value };
}

describe('counter offer · cash field', () => {
  it('keeps a decimal comma and drops other characters', () => {
    const { input, current } = renderBody('');
    fireEvent.changeText(input, '12,50');
    expect(current()).toBe('12,50');
    fireEvent.changeText(input, '-12a,5x');
    expect(current()).toBe('12,5');
  });

  it('builds each change on the latest value, not the one of the last render', () => {
    const { input, current } = renderBody('');
    fireEvent.changeText(input, '12,50');
    fireEvent.changeText(input, '12,505');
    expect(current()).toBe('12,50');
  });

  it.each([['12,505'], ['1.250,50'], ['12,5,0']])('refuses %p and keeps the prefilled value', (typed) => {
    const { input, current } = renderBody('12,50');
    fireEvent.changeText(input, typed);
    expect(current()).toBe('12,50');
  });
});

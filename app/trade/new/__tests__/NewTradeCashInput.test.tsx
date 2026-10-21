/**
 * The new-trade cash field (step 2) goes through the shared `nextCashInput` mask, the same as
 * the counter offer: a decimal comma is kept, and a change that could not be sent as typed (a
 * second separator, a third decimal) keeps the previous value. The setter gets an updater, so
 * two changes before a re-render each build on the latest value.
 */
import React from 'react';
import { TextInput } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { Step2TheirItems } from '../_components/NewTradeSteps';
import type { NewTradeController } from '../_hooks/useNewTrade';

jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);

const CASH_HELPER = 'Kuruş için virgül kullanın, örn. 1250,50';
const CASH_REFUSED =
  'Tutar kabul edilmedi. Binlik ayracı kullanmayın; kuruş için virgül kullanın, örn. 1250,50';

function renderStep(initial: string) {
  let value = initial;
  const setCashAmount = jest.fn((next: string | ((prev: string) => string)) => {
    value = typeof next === 'function' ? next(value) : next;
  });
  const f = {
    loadingTheirProducts: false,
    theirProducts: [],
    selectedTheirItems: [],
    theirHasMore: false,
    theirLoadingMore: false,
    loadMoreTheirs: jest.fn(),
    cashDirection: 'offer',
    setCashDirection: jest.fn(),
    cashAmount: initial,
    setCashAmount,
  } as unknown as NewTradeController;
  renderWithProviders(<Step2TheirItems f={f} />);
  const input = screen.UNSAFE_getAllByType(TextInput).filter((n) => n.props.keyboardType === 'numeric');
  expect(input).toHaveLength(1);
  return { input: input[0]!, current: () => value };
}

describe('new trade · cash field', () => {
  it('keeps a decimal comma and drops other characters', () => {
    const { input, current } = renderStep('');
    fireEvent.changeText(input, '12,50');
    expect(current()).toBe('12,50');
    fireEvent.changeText(input, '12a3,5x');
    expect(current()).toBe('123,5');
  });

  it('builds each change on the latest value, not the one of the last render', () => {
    // Two changes before a re-render: the second is refused and must keep the first, not fall
    // back to the rendered '' (the controller's `cashAmount` is not updated in between here).
    const { input, current } = renderStep('');
    fireEvent.changeText(input, '12,50');
    fireEvent.changeText(input, '12,505');
    expect(current()).toBe('12,50');
  });

  it.each([['12,505'], ['1.250,50'], ['12,5,0']])('refuses %p and keeps the previous value', (typed) => {
    const { input, current } = renderStep('12,50');
    fireEvent.changeText(input, typed);
    expect(current()).toBe('12,50');
  });

  it('always shows the helper, warns about a refused change and clears it on an accepted one', () => {
    const { input, current } = renderStep('12,50');
    expect(screen.getByText(CASH_HELPER)).toBeOnTheScreen();
    expect(screen.queryByText(CASH_REFUSED)).toBeNull();

    fireEvent.changeText(input, '1.250,50');
    expect(screen.getByText(CASH_REFUSED)).toBeOnTheScreen();
    expect(screen.getByText(CASH_HELPER)).toBeOnTheScreen();
    expect(current()).toBe('12,50');

    fireEvent.changeText(input, '12,5');
    expect(screen.queryByText(CASH_REFUSED)).toBeNull();
    expect(current()).toBe('12,5');
  });

  it('does not warn when only letters or spaces are dropped', () => {
    const { input } = renderStep('');
    fireEvent.changeText(input, '12 TL');
    expect(screen.queryByText(CASH_REFUSED)).toBeNull();
  });
});

/**
 * InstallmentOptions (plan 6.2 / 6.3): the loading row appears only after the shared loading
 * delay, and screen readers hear when options load or turn into a note (web aria-live).
 */
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { theme } from '@/ui';
import { InstallmentOptions } from '../InstallmentOptions';

const OPTIONS = {
  status: 'done' as const,
  offer: {
    kind: 'options' as const,
    options: [
      { count: 1, totalAmount: 1000, feeAmount: 0, monthlyAmount: 1000 },
      { count: 3, totalAmount: 1066.38, feeAmount: 66.38, monthlyAmount: 355.46 },
    ],
  },
};

let announce: jest.SpyInstance;
beforeEach(() => {
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
});
afterEach(() => announce.mockRestore());

it('loading: the skeleton row appears after the loading delay, with its label', () => {
  jest.useFakeTimers();
  render(<InstallmentOptions view={{ status: 'loading' }} selectedCount={1} onSelect={jest.fn()} />);
  expect(screen.queryByTestId('installment-options-loading')).toBeNull();
  act(() => jest.advanceTimersByTime(theme.loading.delayMs));
  expect(screen.getByLabelText('Taksit seçenekleri yükleniyor')).toBeOnTheScreen();
  jest.useRealTimers();
});

it('announces loaded options and a fallback note', () => {
  const { rerender } = render(<InstallmentOptions view={OPTIONS} selectedCount={1} onSelect={jest.fn()} />);
  expect(announce).toHaveBeenLastCalledWith('Taksit seçenekleri');
  rerender(
    <InstallmentOptions
      view={{ status: 'done', offer: { kind: 'single', reason: 'unavailable' } }}
      selectedCount={1}
      onSelect={jest.fn()}
    />,
  );
  expect(announce).toHaveBeenLastCalledWith('Taksit seçenekleri şu an gösterilemiyor. Tek çekim ile ödeyebilirsiniz.');
});

it('enter-card hint is shown but not announced; hidden renders nothing', () => {
  const { rerender } = render(<InstallmentOptions view={{ status: 'enterCard' }} selectedCount={1} onSelect={jest.fn()} />);
  expect(screen.getByText('Taksit seçeneklerini görmek için kart numaranızı girin.')).toBeOnTheScreen();
  expect(announce).not.toHaveBeenCalled();
  rerender(<InstallmentOptions view={{ status: 'done', offer: { kind: 'hidden' } }} selectedCount={1} onSelect={jest.fn()} />);
  expect(screen.queryByTestId('installment-options')).toBeNull();
});

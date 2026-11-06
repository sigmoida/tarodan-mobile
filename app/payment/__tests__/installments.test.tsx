/**
 * Pay screen -> card form: whether the installment selector is offered (ADR 0019, D6) and the
 * reload after a 409 `paymentAmountOutOfDate` (A4 contract).
 *
 * - On only with `installments.enabled` from `GET /payments/config`, a goods total at or above
 *   `minAmount`, and an order or cart payment (not membership, boost or trade cash); below the
 *   minimum the form shows the belowMinimum note (plan 6.2).
 * - An older API (no `installments` field) or a failed config call: off.
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

let mockParams: Record<string, string> = { id: 'pay-1' };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: jest.fn(),
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>REDIRECT:{href}</Text>;
  },
}));
jest.mock('@/lib/purchases', () => ({ CAN_BUY_DIGITAL: true }));
jest.mock('@/lib/api', () => ({
  paymentsApi: {
    getConfig: jest.fn(),
    getStatusLight: jest.fn(),
    getStatusLightGuest: jest.fn(),
    bypassComplete: jest.fn(),
    initiate: jest.fn(),
    initiateGuest: jest.fn(),
    initiateGroup: jest.fn(),
    initiateGroupGuest: jest.fn(),
    initiateTradeCash: jest.fn(),
  },
}));
import { paymentsApi } from '@/lib/api';
import { router } from 'expo-router';

type MockFormProps = { installments?: { kind: string }; amount?: number; onPaymentOutdated?: () => void };
jest.mock('@/components/CardPaymentForm', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: ({ installments, amount, onPaymentOutdated }: MockFormProps) =>
      React.createElement(
        Pressable,
        { testID: 'outdated', onPress: onPaymentOutdated },
        React.createElement(Text, { testID: 'card-payment-form' }, `installments:${installments?.kind} amount:${amount}`),
      ),
  };
});
jest.mock('@/services/sentry', () => ({ captureException: jest.fn() }));

import PaymentScreen from '../[id]';

const getConfigMock = paymentsApi.getConfig as jest.Mock;
const getStatusLightMock = paymentsApi.getStatusLight as jest.Mock;
const getStatusLightGuestMock = paymentsApi.getStatusLightGuest as jest.Mock;

const config = (installments?: unknown) => ({
  data: {
    bypassEnabled: false,
    cardStorageEnabled: true,
    recurringEnabled: false,
    ...(installments === undefined ? {} : { installments }),
  },
});

async function formText() {
  return (await screen.findByTestId('card-payment-form')).props.children as string;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 'pay-1' };
  getConfigMock.mockResolvedValue(config({ enabled: true, minAmount: 500 }));
  getStatusLightMock.mockResolvedValue({ data: { status: 'pending', orderId: 'order-1', amount: '1000.00' } });
});

it('order payment above the minimum: on', async () => {
  renderWithProviders(<PaymentScreen />);
  expect(await formText()).toBe('installments:on amount:1000');
});

it('guest cart payment: on (guest checkout is in scope, D6)', async () => {
  mockParams = { id: 'pay-1', guest: '1' };
  getStatusLightGuestMock.mockResolvedValue({ data: { status: 'pending', checkoutGroupId: 'g-1', amount: 800 } });
  renderWithProviders(<PaymentScreen />);
  expect(await formText()).toBe('installments:on amount:800');
});

it('below the minimum: the note (plan 6.2), not hidden', async () => {
  getStatusLightMock.mockResolvedValue({ data: { status: 'pending', orderId: 'order-1', amount: 499.99 } });
  renderWithProviders(<PaymentScreen />);
  expect(await formText()).toBe('installments:belowMinimum amount:499.99');
});

it('trade cash below the minimum: still off (D6)', async () => {
  getStatusLightMock.mockResolvedValue({ data: { status: 'pending', tradeId: 't-1', amount: 100 } });
  renderWithProviders(<PaymentScreen />);
  expect(await formText()).toBe('installments:off amount:100');
});

it.each([
  ['switch off', config({ enabled: false, minAmount: 500 })],
  ['older API without the field', config()],
])('%s: off', async (_label, cfg) => {
  getConfigMock.mockResolvedValue(cfg);
  renderWithProviders(<PaymentScreen />);
  expect(await formText()).toBe('installments:off amount:1000');
});

it('config call fails: off', async () => {
  getConfigMock.mockRejectedValue(new Error('net'));
  renderWithProviders(<PaymentScreen />);
  expect(await formText()).toBe('installments:off amount:1000');
});

it('trade cash payment: off (D6)', async () => {
  getStatusLightMock.mockResolvedValue({ data: { status: 'pending', tradeId: 't-1', amount: 1000 } });
  renderWithProviders(<PaymentScreen />);
  expect(await formText()).toBe('installments:off amount:1000');
});

it('boost payment: off (D6)', async () => {
  mockParams = { id: 'pay-1', type: 'boost' };
  renderWithProviders(<PaymentScreen />);
  expect(await formText()).toBe('installments:off amount:1000');
});

it('membership payment: off (D6)', async () => {
  getStatusLightMock.mockResolvedValue({
    data: { status: 'pending', orderId: 'order-m', amount: 1000, isMembershipOrder: true },
  });
  renderWithProviders(<PaymentScreen />);
  expect(await formText()).toBe('installments:off amount:1000');
});

it('paymentAmountOutOfDate: the order payment is initiated anew and reloaded at the new amount', async () => {
  (paymentsApi.initiate as jest.Mock).mockResolvedValue({ data: { paymentId: 'pay-1', amount: 1200 } });
  renderWithProviders(<PaymentScreen />);
  expect(await formText()).toBe('installments:on amount:1000');
  getStatusLightMock.mockResolvedValue({ data: { status: 'pending', orderId: 'order-1', amount: 1200 } });
  await act(async () => {
    fireEvent.press(screen.getByTestId('outdated'));
  });
  expect(paymentsApi.initiate).toHaveBeenCalledWith('order-1');
  await waitFor(() => expect(getStatusLightMock).toHaveBeenCalledTimes(2));
  expect(await formText()).toBe('installments:on amount:1200');
  expect(router.replace).not.toHaveBeenCalled();
});

it('paymentAmountOutOfDate on a guest cart: the guest cart call, then the new payment id opens', async () => {
  mockParams = { id: 'pay-1', guest: '1' };
  getStatusLightGuestMock.mockResolvedValue({ data: { status: 'pending', checkoutGroupId: 'g-1', amount: 800 } });
  // Answer shape `{ id }`, as the other start calls accept it.
  (paymentsApi.initiateGroupGuest as jest.Mock).mockResolvedValue({ data: { id: 'pay-2' } });
  renderWithProviders(<PaymentScreen />);
  await formText();
  await act(async () => {
    fireEvent.press(screen.getByTestId('outdated'));
  });
  expect(paymentsApi.initiateGroupGuest).toHaveBeenCalledWith('g-1');
  expect(paymentsApi.initiateGroup).not.toHaveBeenCalled();
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/payment/[id]', params: { id: 'pay-2', guest: '1' } });
});

it('paymentAmountOutOfDate and the new start fails: the buyer goes to the order', async () => {
  (paymentsApi.initiate as jest.Mock).mockRejectedValue({ response: { status: 400, data: {} } });
  renderWithProviders(<PaymentScreen />);
  await formText();
  await act(async () => {
    fireEvent.press(screen.getByTestId('outdated'));
  });
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/orders/[id]', params: { id: 'order-1' } }),
  );
});

it('paymentAmountOutOfDate twice on one screen: no second start, the buyer goes to the order', async () => {
  (paymentsApi.initiate as jest.Mock).mockResolvedValue({ data: { paymentId: 'pay-1' } });
  renderWithProviders(<PaymentScreen />);
  await formText();
  await act(async () => {
    fireEvent.press(screen.getByTestId('outdated'));
  });
  await formText();
  expect(router.replace).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.press(screen.getByTestId('outdated'));
  });
  expect(paymentsApi.initiate).toHaveBeenCalledTimes(1);
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/orders/[id]', params: { id: 'order-1' } });
});

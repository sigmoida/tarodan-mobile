/**
 * Payments ("Ödemelerim") card: the status badge and the date share one row, the date on the
 * right; the payment provider is never shown and there is no standalone date line.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { screen, within } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { PaymentCard } from '../payments/_components/PaymentCard';
import { formatDate } from '../payments/_lib/status';
import type { PaymentsController } from '../payments/_hooks/usePayments';

jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);

const controller = {
  handleCancel: jest.fn(),
  handleRetry: jest.fn(),
  retryBusy: false,
  retryPendingId: null,
} as unknown as PaymentsController;

it('shows the date right-aligned next to the status badge, without the provider', () => {
  const paidAt = '2026-03-04T10:00:00.000Z';
  // The API still sends `provider`; the card must not print it.
  const p = {
    id: 'pay-1',
    orderId: 'order-1',
    orderNumber: 'ORD-1',
    amount: 120,
    status: 'completed',
    provider: 'paytr',
    createdAt: '2026-03-01T10:00:00.000Z',
    paidAt,
  };
  renderWithProviders(<PaymentCard p={p} f={controller} />);

  const meta = screen.getByTestId('payment-meta-pay-1');
  expect(within(meta).getByText('Tamamlandı')).toBeOnTheScreen();
  const date = within(meta).getByText(formatDate(paidAt));
  expect(StyleSheet.flatten(date.props.style)).toMatchObject({ marginLeft: 'auto' });
  // One date on the card (no second, standalone line).
  expect(screen.getAllByText(formatDate(paidAt))).toHaveLength(1);
  expect(screen.queryByText(/paytr/i)).toBeNull();
});

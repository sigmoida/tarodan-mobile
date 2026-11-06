/**
 * Payment history (ADR 0016 screen): an installment payment shows its count, fee and the
 * charged total in the row details (plan 6.2, from `GET /payments/me`).
 */
import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { Accordion } from '@/ui';

jest.mock('@/hooks/useRefetchStaleOnFocus', () => ({ useRefetchStaleOnFocus: jest.fn() }));
jest.mock('@/lib/api', () => ({ paymentsApi: { getMyPayments: jest.fn() } }));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (select: (s: { isAuthenticated: boolean }) => unknown) => select({ isAuthenticated: true }),
}));
import { paymentsApi } from '@/lib/api';
import { usePaymentHistory } from '../_hooks/usePaymentHistory';
import { PaymentHistoryItem } from '../_components/PaymentHistoryItem';

function Probe() {
  const { payments } = usePaymentHistory();
  return (
    <Accordion type="single" defaultValue="pay-1">
      {payments.map((p) => (
        <PaymentHistoryItem key={p.id} item={p} />
      ))}
    </Accordion>
  );
}

it('maps the installment fields and prints the lines in the details', async () => {
  (paymentsApi.getMyPayments as jest.Mock).mockResolvedValue({
    data: [
      {
        id: 'pay-1',
        amount: 1000,
        status: 'completed',
        description: 'Model car',
        createdAt: '2026-11-05T10:00:00Z',
        installmentCount: 3,
        installmentFeeAmount: 66.38,
        chargedAmount: 1066.38,
      },
    ],
  });
  renderWithProviders(<Probe />);
  await waitFor(() => expect(screen.getByText('3 taksit')).toBeOnTheScreen());
  expect(screen.getByText('66,38 TL')).toBeOnTheScreen();
  expect(screen.getByText('1.066,38 TL')).toBeOnTheScreen();
});

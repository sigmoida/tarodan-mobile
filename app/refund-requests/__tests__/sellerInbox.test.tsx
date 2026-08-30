/**
 * Satıcı iade gelen kutusu — SALT OKUNUR.
 *
 * `GET /refund-requests/seller` tanımlıydı ve hiçbir yerden çağrılmıyordu;
 * satıcı kendisine açılan bir iade talebine yalnız push derin bağlantısıyla
 * ulaşabiliyordu. Uç canlı doğrulandı (staging, 2026-08-03): çalışıyor ve
 * gerçek veri dönüyor (`refundNumber`, `reason`, `amount`, `status`, iç içe
 * `order` + `requester`).
 *
 * ⚠️ **Aksiyon YOK ve olamaz.** Üretilen API kataloğunda yalnız beş iade ucu
 * var (`/refund-requests`, `/:id`, `/:id/cancel`, `/me`, `/seller`) — onay/ret
 * ucu HİÇ yok. Bu yüzden satıcı sekmesi bilgilendirir, buton göstermez;
 * göstermek kullanıcıya olmayan bir yetki vaat ederdi. `/:id/cancel` alıcıya
 * ait, satıcı sekmesinde çıkmamalı.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useFocusEffect: jest.fn(),
}));

const mockGetMine = jest.fn();
const mockGetSeller = jest.fn();
jest.mock('@/lib/api', () => ({
  refundsApi: {
    getMine: (...a: unknown[]) => mockGetMine(...a),
    getSeller: (...a: unknown[]) => mockGetSeller(...a),
    cancel: jest.fn(),
  },
}));

jest.mock('@/services/sentry', () => ({ captureException: jest.fn() }));

const mockAuth = { isAuthenticated: true };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (s: any) => unknown) => (sel ? sel(mockAuth) : mockAuth),
}));

import RefundRequestsScreen from '../index';

/** Canlı yanıttan alınan şekil (değerler uydurma). */
const sellerRow = {
  id: 'r1',
  refundNumber: 'RFD-AAAAAAAAAA',
  reason: 'not_as_described',
  amount: '693.88',
  status: 'pending_review',
  order: { id: 'o1', orderNumber: 'ORD-AAAAAAAAAA', product: { title: 'Model', images: [] } },
  requester: { id: 'u1', displayName: 'Alıcı Adı' },
};

const buyerRow = { ...sellerRow, id: 'r2', requester: undefined };

beforeEach(() => {
  mockGetMine.mockResolvedValue({ data: [buyerRow] });
  mockGetSeller.mockResolvedValue({ data: [sellerRow] });
});

describe('refund requests tabs', () => {
  it('opens on the buyer tab and does not fetch the seller list', async () => {
    renderWithProviders(<RefundRequestsScreen />);

    await waitFor(() => expect(mockGetMine).toHaveBeenCalled());
    expect(mockGetSeller).not.toHaveBeenCalled();
  });

  it('fetches the seller list when the seller tab is chosen', async () => {
    renderWithProviders(<RefundRequestsScreen />);
    fireEvent.press(await screen.findByTestId('refunds-tab-seller'));

    await waitFor(() => expect(mockGetSeller).toHaveBeenCalled());
  });

  it('names the buyer who opened the request', async () => {
    renderWithProviders(<RefundRequestsScreen />);
    fireEvent.press(await screen.findByTestId('refunds-tab-seller'));

    expect(await screen.findByText(/Alıcı Adı/)).toBeTruthy();
  });

  it('offers no cancel action on the seller tab — no such endpoint exists', async () => {
    renderWithProviders(<RefundRequestsScreen />);
    fireEvent.press(await screen.findByTestId('refunds-tab-seller'));
    await screen.findByText(/Alıcı Adı/);

    expect(screen.queryByText('Talebi İptal Et')).toBeNull();
  });

  it('says the seller cannot act from here yet', async () => {
    renderWithProviders(<RefundRequestsScreen />);
    fireEvent.press(await screen.findByTestId('refunds-tab-seller'));

    expect(await screen.findByTestId('refunds-seller-readonly-note')).toBeTruthy();
  });
});

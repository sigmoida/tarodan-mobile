/**
 * B4 · Bekleyen siparişin (teklif siparişi dahil) ödemesi kimlik kapısından
 * geçer. Teklif kartındaki "Öde" bu ekrana gelir; ödeme burada başlar.
 *
 * Gerçek `ensureLegalIdentity` + istek store'u: kimliği eksik üyede kapı
 * açılır, `paymentsApi.initiate` GİTMEZ; kaydedilince ödeme başlar,
 * "Vazgeç"te hiç başlamaz.
 */
import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { MISSING_LEGAL_IDENTITY } from '@/test-utils/legalIdentity';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({ id: 'order-1' }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  legalIdentityApi: { getStatus: jest.fn(), submit: jest.fn() },
  ordersApi: { cancel: jest.fn(), confirm: jest.fn(), confirmReceipt: jest.fn() },
  refundsApi: { create: jest.fn(), cancel: jest.fn() },
  mediaApi: { uploadRefundEvidence: jest.fn() },
  paymentsApi: {
    initiate: jest.fn(() => Promise.resolve({ data: { data: { paymentId: 'pay-1' } } })),
    bypassComplete: jest.fn(),
  },
  elogoInvoicesApi: { byOrderAll: jest.fn(() => Promise.resolve({ data: [] })), pdf: jest.fn() },
  sellerInvoiceApi: { status: jest.fn(() => Promise.resolve({ data: null })), download: jest.fn() },
}));

import { api, legalIdentityApi, paymentsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import {
  settleLegalIdentityRequest,
  useLegalIdentityRequestStore,
} from '@/stores/legalIdentityRequestStore';
import OrderDetailScreen from '../[id]';

const PENDING_ORDER = {
  id: 'order-1',
  orderNumber: 'ORD-1001000000',
  status: 'pending',
  totalAmount: 350,
  shippingCost: 30,
  product: { id: 'p1', title: 'Deri Ceket', price: 320, condition: 'used', images: [] },
  seller: { id: 'seller-1', displayName: 'Mehmet' },
  shippingAddress: { fullName: 'Ayşe', phone: '0500', address: 'Sokak 1', city: 'İstanbul' },
  createdAt: new Date('2026-01-01').toISOString(),
  isBuyer: true,
  payment: { status: 'pending' },
};

async function pressPay() {
  renderWithProviders(<OrderDetailScreen />);
  const button = await screen.findByTestId('order-pay-button');
  await act(async () => {
    fireEvent.press(button);
  });
}

describe('Sipariş ödemesi · yasal kimlik kapısı', () => {
  beforeEach(() => {
    (api.get as jest.Mock).mockReset().mockResolvedValue({ data: { data: PENDING_ORDER } });
    (paymentsApi.initiate as jest.Mock).mockClear();
    (legalIdentityApi.getStatus as jest.Mock).mockReset().mockResolvedValue({ data: MISSING_LEGAL_IDENTITY });
    useAuthStore.setState({ isAuthenticated: true, isLoading: false, user: { id: 'u1' } as any });
  });

  afterEach(() => {
    act(() => settleLegalIdentityRequest(false));
    useAuthStore.setState({ isAuthenticated: false, user: null });
  });

  it('kimlik eksik → kapı açılır, ödeme başlamaz; kaydedilince ödeme başlar', async () => {
    await pressPay();

    await waitFor(() => expect(useLegalIdentityRequestStore.getState().requested).toBe(true));
    expect(paymentsApi.initiate).not.toHaveBeenCalled();

    act(() => settleLegalIdentityRequest(true));
    await waitFor(() => expect(paymentsApi.initiate).toHaveBeenCalledWith('order-1'));
  });

  it('Vazgeç → ödeme başlamaz', async () => {
    await pressPay();

    await waitFor(() => expect(useLegalIdentityRequestStore.getState().requested).toBe(true));
    await act(async () => settleLegalIdentityRequest(false));
    expect(paymentsApi.initiate).not.toHaveBeenCalled();
  });

  it('kimliği tamam olan üyede kapı açılmadan ödeme başlar', async () => {
    (legalIdentityApi.getStatus as jest.Mock).mockResolvedValue({
      data: { ...MISSING_LEGAL_IDENTITY, missing: [] },
    });
    await pressPay();

    await waitFor(() => expect(paymentsApi.initiate).toHaveBeenCalledTimes(1));
    expect(useLegalIdentityRequestStore.getState().requested).toBe(false);
  });
});

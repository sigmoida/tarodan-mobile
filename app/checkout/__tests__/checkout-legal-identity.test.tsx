/**
 * checkout-legal-identity · B4: sepet ödemesi kimlik kapısından geçer.
 *
 * Gerçek `ensureLegalIdentity` + istek store'u: kimliği eksik üye "Onayla ve
 * Öde"ye basınca kapı açılır, sipariş isteği GİTMEZ; kaydedilince ödeme devam
 * eder, "Vazgeç"te hiçbir istek gitmez. Misafir dalında kapı yok.
 */
import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { MISSING_LEGAL_IDENTITY, settleGateAndWait } from '@/test-utils/legalIdentity';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

jest.mock('@/lib/api', () => ({
  toExpectedPricing: jest.requireActual('@/lib/api').toExpectedPricing,
  legalIdentityApi: { getStatus: jest.fn(), submit: jest.fn() },
  ordersApi: {
    checkout: jest.fn(() =>
      Promise.resolve({ data: { data: { checkoutGroupId: 'g1', orders: [{ orderId: 'o1' }] } } }),
    ),
    getQuote: jest.fn(() =>
      Promise.resolve({
        data: {
          pricingHash: 'h1',
          shippingTariffVersion: 1,
          commissionRuleSetId: 'rs-1',
          commissionRuleSetVersion: 1,
          pricing: { summary: { productAmount: 100, shippingAmount: 50, serviceFeeAmount: 15, total: 165 } },
        },
      }),
    ),
  },
  paymentsApi: {
    getPaymentMethods: jest.fn(() => Promise.resolve({ data: [] })),
    initiateGroup: jest.fn(() => Promise.resolve({ data: { data: { useBypass: true, paymentId: 'p1' } } })),
    initiateGroupGuest: jest.fn(),
    bypassComplete: jest.fn(() => Promise.resolve({ data: {} })),
  },
  addressesApi: {
    getAll: jest.fn(() =>
      Promise.resolve({
        data: [
          {
            id: 'addr-1',
            fullName: 'Ali Veli',
            phone: '+905321234567',
            city: 'İstanbul',
            district: 'Kadıköy',
            address: 'Test Sokak No:1',
            isDefault: true,
          },
        ],
      }),
    ),
  },
  discountsApi: { validate: jest.fn() },
  cartApi: { clear: jest.fn(() => Promise.resolve()) },
}));

import { legalIdentityApi, ordersApi } from '@/lib/api';
import { appAlert } from '@/ui'; // jest.setup'ta global jest.fn
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import {
  settleLegalIdentityRequest,
  useLegalIdentityRequestStore,
} from '@/stores/legalIdentityRequestStore';
import CheckoutScreen from '../index';

const mockGetStatus = legalIdentityApi.getStatus as jest.Mock;

const SAMPLE_ITEM = {
  id: 'cart-1',
  productId: 'prod-1234567890',
  title: 'Test Model Araba',
  price: 100,
  quantity: 1,
  imageUrl: 'https://x/y.jpg',
  brand: 'Bburago',
  scale: '1:18',
  seller: { id: 's1', displayName: 'Satıcı' },
  addedAt: Date.now(),
};

async function pressPayButton() {
  await act(async () => {
    fireEvent.press(screen.getByText(/Onayla ve Öde/));
  });
}

async function refetchQuote(queryClient: import('@tanstack/react-query').QueryClient) {
  await act(async () => {
    await queryClient.refetchQueries({ queryKey: ['checkout-quote'] });
  });
}

async function pressPay() {
  const { queryClient } = renderWithProviders(<CheckoutScreen />);
  await waitFor(() => expect(screen.getByText('Ali Veli')).toBeOnTheScreen());
  fireEvent.press(screen.getByText('Ali Veli'));
  fireEvent.press(screen.getByText('Devam Et'));
  await waitFor(() => expect(screen.getByText('Kargo Seçimi')).toBeOnTheScreen());
  fireEvent.press(screen.getByText('Devam Et'));
  await waitFor(() => expect(screen.getByText(/Onayla ve Öde/)).toBeOnTheScreen());
  const box = screen.queryByTestId('checkout-distance-sales-checkbox');
  if (box) fireEvent.press(box);
  await pressPayButton();
  return queryClient;
}

const QUOTE = (pricingHash?: string, total = 165, commissionRuleSetVersion = 1) => ({
  data: {
    ...(pricingHash ? { pricingHash } : {}),
    shippingTariffVersion: 1,
    commissionRuleSetId: 'rs-1',
    commissionRuleSetVersion,
    pricing: { summary: { productAmount: total - 65, shippingAmount: 50, serviceFeeAmount: 15, total } },
  },
});

describe('Sepet ödemesi · yasal kimlik kapısı', () => {
  beforeEach(() => {
    jest.mocked(ordersApi.checkout).mockClear();
    jest.mocked(ordersApi.getQuote).mockReset().mockResolvedValue(QUOTE('h1') as any);
    mockGetStatus.mockReset().mockResolvedValue({ data: MISSING_LEGAL_IDENTITY });
    useAuthStore.setState({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'u1', email: 'member@example.com' } as any,
    });
    useCartStore.setState({ items: [SAMPLE_ITEM] as any, lastUpdated: Date.now() });
  });

  afterEach(() => {
    act(() => settleLegalIdentityRequest(false));
    useCartStore.setState({ items: [] });
    useAuthStore.setState({ isAuthenticated: false, user: null });
  });

  it('kimlik eksik → kapı açılır, sipariş gitmez; kaydedilince ödeme devam eder', async () => {
    await pressPay();

    await waitFor(() => expect(useLegalIdentityRequestStore.getState().requested).toBe(true));
    expect(ordersApi.checkout).not.toHaveBeenCalled();
    // B4 inceleme 6: kontrol/kapı süresince ödeme düğmesi devre dışı.
    expect(screen.getByTestId('checkout-pay-button')).toBeDisabled();

    act(() => settleLegalIdentityRequest(true));
    await waitFor(() => expect(ordersApi.checkout).toHaveBeenCalledTimes(1));
  });

  it('Vazgeç → sipariş isteği gitmez', async () => {
    await pressPay();

    await waitFor(() => expect(useLegalIdentityRequestStore.getState().requested).toBe(true));
    await settleGateAndWait(false);
    expect(ordersApi.checkout).not.toHaveBeenCalled();
  });

  it('fiyat imzası hazır değilse kimlik SORULMAZ (ucuz yerel kontrol kapıdan önce)', async () => {
    jest.mocked(ordersApi.getQuote).mockResolvedValue(QUOTE(undefined) as any);
    await pressPay();

    await waitFor(() =>
      expect(appAlert).toHaveBeenCalledWith('Fiyat Bilgisi Hazır Değil', expect.any(String)),
    );
    expect(mockGetStatus).not.toHaveBeenCalled();
    expect(useLegalIdentityRequestStore.getState().requested).toBe(false);
    expect(ordersApi.checkout).not.toHaveBeenCalled();
  });

  describe('kapıdan sonra fiyat güvencesi (B4 inceleme 2 · 1)', () => {
    it('kapı açıkken quote DEĞİŞİRSE sipariş gitmez, yeni tutar gösterilip yeniden onay istenir', async () => {
      const queryClient = await pressPay();
      await waitFor(() => expect(useLegalIdentityRequestStore.getState().requested).toBe(true));

      // Kapı dakikalarca açık kalabilir; bu sırada fiyat değişir.
      jest.mocked(ordersApi.getQuote).mockResolvedValue(QUOTE('h2', 175) as any);
      await refetchQuote(queryClient);
      jest.mocked(appAlert).mockClear();

      act(() => settleLegalIdentityRequest(true));
      await waitFor(() =>
        expect(appAlert).toHaveBeenCalledWith(
          'Fiyatlar Güncellendi',
          expect.stringMatching(/Önceki toplam: 165,00.*\n.*Yeni toplam: 175,00/s),
          undefined,
        ),
      );
      expect(ordersApi.checkout).not.toHaveBeenCalled();

      // Yeniden onay: kullanıcı yeni tutarı görüp tekrar basar → YENİ imzayla gider.
      await pressPayButton();
      await waitFor(() => expect(useLegalIdentityRequestStore.getState().requested).toBe(true));
      act(() => settleLegalIdentityRequest(true));
      await waitFor(() => expect(ordersApi.checkout).toHaveBeenCalledTimes(1));
      expect(jest.mocked(ordersApi.checkout).mock.calls[0]![0]).toEqual(
        expect.objectContaining({ expectedPricing: expect.objectContaining({ expectedPricingHash: 'h2' }) }),
      );
    });

    it('komisyon seti değişirse komisyon uyarısı (409 ile aynı metin), sipariş gitmez', async () => {
      const queryClient = await pressPay();
      await waitFor(() => expect(useLegalIdentityRequestStore.getState().requested).toBe(true));

      jest.mocked(ordersApi.getQuote).mockResolvedValue(QUOTE('h1', 165, 2) as any);
      await refetchQuote(queryClient);

      act(() => settleLegalIdentityRequest(true));
      await waitFor(() =>
        expect(appAlert).toHaveBeenCalledWith('Komisyon oranları güncellendi', expect.any(String), undefined),
      );
      expect(ordersApi.checkout).not.toHaveBeenCalled();
    });

    it('kapı açıkken quote yenilenip DEĞİŞMEDİYSE sipariş aynı imzayla gider', async () => {
      const queryClient = await pressPay();
      await waitFor(() => expect(useLegalIdentityRequestStore.getState().requested).toBe(true));

      await refetchQuote(queryClient);
      const quoteCalls = jest.mocked(ordersApi.getQuote).mock.calls.length;
      expect(quoteCalls).toBeGreaterThan(1);

      act(() => settleLegalIdentityRequest(true));
      await waitFor(() => expect(ordersApi.checkout).toHaveBeenCalledTimes(1));
      expect(jest.mocked(ordersApi.checkout).mock.calls[0]![0]).toEqual(
        expect.objectContaining({
          expectedPricing: expect.objectContaining({ expectedPricingHash: 'h1' }),
          items: [{ productId: SAMPLE_ITEM.productId, quantity: 1 }],
        }),
      );
      expect(jest.mocked(appAlert).mock.calls.map((c) => c[0])).not.toContain('Fiyatlar Güncellendi');
    });

    it('kapı açıkken sepet boşalırsa satır kontrolü yeniden koşar, sipariş gitmez', async () => {
      await pressPay();
      await waitFor(() => expect(useLegalIdentityRequestStore.getState().requested).toBe(true));

      act(() => useCartStore.setState({ items: [] }));

      await settleGateAndWait(true);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      expect(ordersApi.checkout).not.toHaveBeenCalled();
    });

    it('kapı açıkken satır adedi değişirse sipariş gitmez', async () => {
      await pressPay();
      await waitFor(() => expect(useLegalIdentityRequestStore.getState().requested).toBe(true));

      act(() => useCartStore.setState({ items: [{ ...SAMPLE_ITEM, quantity: 2 }] as any }));

      jest.mocked(appAlert).mockClear();
      await settleGateAndWait(true);
      // Yeni satırların quote'u gelene dek "hazır değil", gelince "güncellendi" —
      // her iki durumda da sipariş GÖNDERİLMEZ.
      await waitFor(() => expect(appAlert).toHaveBeenCalled());
      expect(ordersApi.checkout).not.toHaveBeenCalled();
    });
  });

  it('muaf hesap (required:false) → kapı açılmaz, ödeme doğrudan başlar', async () => {
    mockGetStatus.mockResolvedValue({ data: { ...MISSING_LEGAL_IDENTITY, required: false, missing: [] } });
    await pressPay();

    await waitFor(() => expect(ordersApi.checkout).toHaveBeenCalledTimes(1));
    expect(useLegalIdentityRequestStore.getState().requested).toBe(false);
  });
});

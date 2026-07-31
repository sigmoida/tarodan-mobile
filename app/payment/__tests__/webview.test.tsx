/**
 * J75 · Ödeme ekranı — mobil UI dilimi.
 * İframe/WebView tabanlı eski akış kaldırıldı (bkz. app/payment/[id].tsx başlık
 * yorumu, commit 4b066cd): ekran artık ödeme durumunu (getStatusLight[Guest])
 * yükler, tamamlandı/başarısız ise yönlendirir, aksi halde hedefi (orderId/
 * checkoutGroupId/tradeId) türetip PayTR Direct API kart formunu
 * (CardPaymentForm) gösterir. CardPaymentForm'un kendi davranışı (direct-form
 * gövdesi, imzalı alanlar, 3DS) src/components/__tests__/CardPaymentForm.directForm.test.tsx'te
 * ayrıca doğrulanıyor; burada yalnızca [id].tsx'in orkestrasyonu (yükleniyor/
 * hata/hedef türetme/yönlendirme) test edilir.
 * Backend initiate/verify/callback/idempotency backend-only.
 */
import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

let mockParams: Record<string, string> = { id: 'pay-1' };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
}));
import { router } from 'expo-router';
const replaceMock = router.replace as jest.Mock;

jest.mock('@/lib/api', () => ({
  paymentsApi: {
    getConfig: jest.fn(),
    getStatusLight: jest.fn(),
    getStatusLightGuest: jest.fn(),
    bypassComplete: jest.fn(),
  },
}));
import { paymentsApi } from '@/lib/api';

// [id].tsx'in kendi davranışına odaklanmak için CardPaymentForm'u geçilen
// hedef/tutarı yansıtan basit bir stub'a indiriyoruz — form içi mantık
// (kart alanları, direct-form, 3DS) CardPaymentForm.directForm.test.tsx'te.
jest.mock('@/components/CardPaymentForm', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ target, amount }: any) =>
      React.createElement(
        Text,
        { testID: 'card-payment-form' },
        `target:${JSON.stringify(target)} amount:${amount ?? ''}`,
      ),
  };
});

jest.mock('@/services/sentry', () => ({ captureException: jest.fn() }));

import PaymentScreen from '../[id]';

const getConfigMock = paymentsApi.getConfig as jest.Mock;
const getStatusLightMock = paymentsApi.getStatusLight as jest.Mock;

describe('J75 · Ödeme ekranı', () => {
  beforeEach(() => {
    getConfigMock.mockReset();
    getStatusLightMock.mockReset();
    replaceMock.mockReset();
    mockParams = { id: 'pay-1' };
    getConfigMock.mockResolvedValue({ data: { bypassEnabled: false, recurringEnabled: false } });
  });

  it('J75.1 ödeme beklemedeyse hedef türetilir ve kart formu (CardPaymentForm) gösterilir', async () => {
    getStatusLightMock.mockResolvedValue({
      data: { status: 'pending', orderId: 'order-1', amount: 350 },
    });
    renderWithProviders(<PaymentScreen />);
    await waitFor(() => expect(screen.getByTestId('card-payment-form')).toBeOnTheScreen());
    expect(screen.getByText(/target:\{"orderId":"order-1"\}/)).toBeOnTheScreen();
  });

  it('J75.2 güvenli ödeme başlığı ve SSL bilgilendirmesi gösterilir', async () => {
    getStatusLightMock.mockResolvedValue({
      data: { status: 'pending', orderId: 'order-1', amount: 350 },
    });
    renderWithProviders(<PaymentScreen />);
    expect(await screen.findByText('Güvenli Ödeme')).toBeOnTheScreen();
    expect(screen.getByText(/SSL şifrelemeyle korunmaktadır/)).toBeOnTheScreen();
  });

  it('J75.3 ödeme durumu tamamlandıysa /payment/success sayfasına yönlendirilir', async () => {
    getStatusLightMock.mockResolvedValue({ data: { status: 'completed' } });
    renderWithProviders(<PaymentScreen />);
    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: '/payment/success' }),
      ),
    );
    expect(screen.queryByTestId('card-payment-form')).toBeNull();
  });

  it('J75.4 durum yüklenemezse ErrorState ve "Geri Dön" gösterilir', async () => {
    getStatusLightMock.mockRejectedValue({
      response: { data: { message: 'Ödeme bilgisi alınamadı.' } },
    });
    renderWithProviders(<PaymentScreen />);
    expect(await screen.findByText('Ödeme bilgisi alınamadı.')).toBeOnTheScreen();
    expect(screen.getByText('Geri Dön')).toBeOnTheScreen();
  });
});

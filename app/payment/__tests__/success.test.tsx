/**
 * J71/J72/J90 · Ödeme başarılı sonuç ekranı — mobil UI dilimi.
 * Başarı mesajı render, sipariş özeti (sipariş no/tutar/durum), "Siparişimi Görüntüle" ve
 * "Ana Sayfaya Dön" nav butonları. Backend verify/callback/idempotency backend-only.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

let mockParams: Record<string, string> = { paymentId: 'pay-1' };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/lib/api', () => ({
  paymentsApi: {
    verify: jest.fn(() => Promise.resolve({})),
    verifyGuest: jest.fn(() => Promise.resolve({})),
    getStatus: jest.fn(),
    getStatusLight: jest.fn(),
    getStatusLightGuest: jest.fn(),
  },
}));
import { paymentsApi } from '@/lib/api';
import { router } from 'expo-router';
import { __resetVerifyPacer } from '@/lib/payment/verifyPacer';

import PaymentSuccessScreen from '../success';

// Üye durumu `/status`'tan (public + yetki belirteci); JWT'li getStatus kullanılmaz.
const getStatusMock = paymentsApi.getStatusLight as jest.Mock;
const replaceMock = router.replace as jest.Mock;

function infoFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pay-1',
    amount: 350,
    status: 'paid',
    order: { id: 'order-1', orderNumber: 'ORD-1001000000' },
    ...overrides,
  };
}

describe('J71 · Ödeme başarılı render', () => {
  beforeEach(() => {
    __resetVerifyPacer(); // verify bütçesi modül düzeyinde: testler arasında taşınmasın
    getStatusMock.mockReset();
    replaceMock.mockReset();
    (paymentsApi.verify as jest.Mock).mockResolvedValue({});
    mockParams = { paymentId: 'pay-1' };
  });

  it('J71.1 başarı başlığı ve alt mesaj gösterilir', async () => {
    getStatusMock.mockResolvedValue({ data: { data: infoFixture() } });
    renderWithProviders(<PaymentSuccessScreen />);
    expect(await screen.findByText('Ödemeniz Başarılı!')).toBeOnTheScreen();
    expect(
      screen.getByText('Siparişiniz alındı. Detayları e-posta adresinize gönderdik.'),
    ).toBeOnTheScreen();
  });

  it('J71.2 sipariş özeti: sipariş no, tutar ve durum rozeti', async () => {
    getStatusMock.mockResolvedValue({ data: { data: infoFixture() } });
    renderWithProviders(<PaymentSuccessScreen />);
    expect(await screen.findByText('ORD-1001000000')).toBeOnTheScreen();
    expect(screen.getByText('Sipariş No')).toBeOnTheScreen();
    expect(screen.getByText('Tutar')).toBeOnTheScreen();
    // status 'paid' → 'Ödendi' etiketi
    expect(screen.getByText('Ödendi')).toBeOnTheScreen();
  });
});

describe('J72 · Ödeme başarılı navigasyon wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetVerifyPacer();
    getStatusMock.mockReset();
    replaceMock.mockReset();
    (paymentsApi.verify as jest.Mock).mockResolvedValue({});
    mockParams = { paymentId: 'pay-1' };
  });

  it('J72.1 "Siparişimi Görüntüle" → ilgili sipariş detayına replace eder', async () => {
    getStatusMock.mockResolvedValue({ data: { data: infoFixture() } });
    renderWithProviders(<PaymentSuccessScreen />);
    const btn = await screen.findByText('Siparişimi Görüntüle');
    fireEvent.press(btn);
    expect(replaceMock).toHaveBeenCalledWith('/orders/order-1');
  });

  it('J72.2 "Ana Sayfaya Dön" → köke replace eder', async () => {
    getStatusMock.mockResolvedValue({ data: { data: infoFixture() } });
    renderWithProviders(<PaymentSuccessScreen />);
    const btn = await screen.findByText('Ana Sayfaya Dön');
    fireEvent.press(btn);
    expect(replaceMock).toHaveBeenCalledWith('/');
  });

  it('J72.4 takas nakit farkı ödemesinde takas detayına replace eder (URL paramı ile)', async () => {
    mockParams = { paymentId: 'pay-1', tradeCash: '1', tradeId: 'trade-9' };
    getStatusMock.mockResolvedValue({
      data: { data: infoFixture({ order: undefined, tradeId: 'trade-9' }) },
    });
    renderWithProviders(<PaymentSuccessScreen />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/trade/trade-9'));
  });

  it('J72.5 URL paramları kaybolsa bile API yanıtındaki tradeId ile takasa döner', async () => {
    mockParams = { paymentId: 'pay-1' };
    getStatusMock.mockResolvedValue({
      data: { data: infoFixture({ order: undefined, tradeId: 'trade-9' }) },
    });
    renderWithProviders(<PaymentSuccessScreen />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/trade/trade-9'));
    expect(screen.queryByText('Siparişimi Görüntüle')).toBeNull();
  });

  it('J72.3 misafir ödemede "Siparişimi Görüntüle" butonu gösterilmez', async () => {
    mockParams = { paymentId: 'pay-1', guest: '1' };
    (paymentsApi.getStatusLightGuest as jest.Mock).mockResolvedValue({
      data: { data: infoFixture() },
    });
    renderWithProviders(<PaymentSuccessScreen />);
    expect(await screen.findByText('Ana Sayfaya Dön')).toBeOnTheScreen();
    expect(screen.queryByText('Siparişimi Görüntüle')).toBeNull();
  });

  it('J72.6 misafir: verify guestApi yolundan (verifyGuest), üye verify çağrılmaz', async () => {
    mockParams = { paymentId: 'pay-1', guest: '1' };
    // İlk okuma pending (verify gider), sonra ödendi.
    (paymentsApi.getStatusLightGuest as jest.Mock)
      .mockResolvedValueOnce({ data: { data: infoFixture({ status: 'pending' }) } })
      .mockResolvedValue({ data: { data: infoFixture() } });
    renderWithProviders(<PaymentSuccessScreen />);
    await waitFor(() => expect(paymentsApi.verifyGuest).toHaveBeenCalledWith('pay-1', expect.anything()));
    expect(paymentsApi.verify).not.toHaveBeenCalled();
  });
});

describe('J90 · Yavaş verify (durum okuması beklemez, sonuç kaybolmaz)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetVerifyPacer();
    replaceMock.mockReset();
    mockParams = { paymentId: 'pay-1' };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('J90.1 verify 8 sn sürer: döngü onu beklemeden okur, bitince uçuştaki verify beklenip durum yeniden okunur', async () => {
    jest.useFakeTimers();
    let verified = false;
    (paymentsApi.verify as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            verified = true;
            resolve({ data: { completed: true, status: 'completed_now' } });
          }, 8000),
        ),
    );
    getStatusMock.mockImplementation(() =>
      Promise.resolve({ data: { data: infoFixture({ status: verified ? 'completed' : 'pending' }) } }),
    );
    renderWithProviders(<PaymentSuccessScreen />);

    await jest.advanceTimersByTimeAsync(6100);
    // 5 deneme (0 / 1,5 / 3 / 4,5 / 6. sn) verify'ı beklemeden durum okudu.
    expect(getStatusMock).toHaveBeenCalledTimes(5);
    expect(paymentsApi.verify).toHaveBeenCalledTimes(1); // uçuştayken yenisi gönderilmez

    await jest.advanceTimersByTimeAsync(2000);
    expect(await screen.findByText('Ödemeniz Başarılı!')).toBeOnTheScreen();
    expect(getStatusMock).toHaveBeenCalledTimes(6);
  });
});

describe('J92 · Geç verify: son durum okumasından sonra biten verify kaybolmaz', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetVerifyPacer();
    replaceMock.mockReset();
    mockParams = { paymentId: 'pay-1' };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('J92.1 verify son okuma sürerken completed:true döner → durum bir kez daha okunur, ekran başarıya geçer', async () => {
    jest.useFakeTimers();
    let verified = false;
    // Durum okuması 1 sn sürer ve sunucu DB'yi istek anında okur.
    getStatusMock.mockImplementation(() => {
      const status = verified ? 'completed' : 'pending';
      return new Promise((resolve) =>
        setTimeout(() => resolve({ data: { data: infoFixture({ status }) } }), 1000),
      );
    });
    // Okumalar 0 / 2,5 / 5 / 7,5 / 10. sn'de başlar. İlk verify 1. sn'de gider ve
    // 10,5. sn'de (son okuma sürerken) ödemeyi tamamlar; sonraki verify 429 alır.
    (paymentsApi.verify as jest.Mock)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(() => {
              verified = true;
              resolve({ data: { completed: true, status: 'completed_now' } });
            }, 9500),
          ),
      )
      .mockImplementation(() => Promise.reject(Object.assign(new Error('429'), { response: { status: 429 } })));

    renderWithProviders(<PaymentSuccessScreen />);
    await jest.advanceTimersByTimeAsync(10_600);
    // Verify bitti (10,5. sn) ama 5. okuma 10. sn'de başladı: pending dönecek.
    expect(verified).toBe(true);
    expect(getStatusMock).toHaveBeenCalledTimes(5);
    expect(screen.queryByText('Ödemeniz Başarılı!')).toBeNull();

    await jest.advanceTimersByTimeAsync(2000);
    expect(await screen.findByText('Ödemeniz Başarılı!')).toBeOnTheScreen();
    expect(getStatusMock).toHaveBeenCalledTimes(6);
  });

  it('J92.2 verify ödemeyi tamamlamadıysa ek okuma yapılmaz', async () => {
    jest.useFakeTimers();
    getStatusMock.mockResolvedValue({ data: { data: infoFixture({ status: 'pending' }) } });
    (paymentsApi.verify as jest.Mock).mockResolvedValue({ data: { completed: false, status: 'process_skipped' } });
    renderWithProviders(<PaymentSuccessScreen />);
    await jest.advanceTimersByTimeAsync(20_000);
    expect(getStatusMock).toHaveBeenCalledTimes(5);
    expect(screen.queryByText('Ödemeniz Başarılı!')).toBeNull();
  });
});

describe('J91 · Başarısız ödemede verify gönderilmez', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetVerifyPacer();
    replaceMock.mockReset();
    mockParams = { paymentId: 'pay-1' };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('J91.1 durum failed → döngü verify göndermeden çıkar (tek okuma)', async () => {
    jest.useFakeTimers();
    getStatusMock.mockResolvedValue({ data: { data: infoFixture({ status: 'failed' }) } });
    renderWithProviders(<PaymentSuccessScreen />);
    await jest.advanceTimersByTimeAsync(20_000);
    expect(getStatusMock).toHaveBeenCalledTimes(1);
    expect(paymentsApi.verify).not.toHaveBeenCalled();
    expect(screen.queryByText('Ödemeniz Başarılı!')).toBeNull();
  });

  it('J91.2 misafir, durum failed → verifyGuest de gönderilmez', async () => {
    jest.useFakeTimers();
    mockParams = { paymentId: 'pay-1', guest: '1' };
    (paymentsApi.getStatusLightGuest as jest.Mock).mockResolvedValue({
      data: { data: infoFixture({ status: 'failed' }) },
    });
    renderWithProviders(<PaymentSuccessScreen />);
    await jest.advanceTimersByTimeAsync(20_000);
    expect(paymentsApi.getStatusLightGuest).toHaveBeenCalledTimes(1);
    expect(paymentsApi.verifyGuest).not.toHaveBeenCalled();
  });

  it('J91.3 durum okunamazsa (hata) verify yine gider', async () => {
    jest.useFakeTimers();
    getStatusMock.mockRejectedValue(new Error('network'));
    renderWithProviders(<PaymentSuccessScreen />);
    await jest.advanceTimersByTimeAsync(100);
    expect(paymentsApi.verify).toHaveBeenCalledWith('pay-1', expect.anything());
  });
});

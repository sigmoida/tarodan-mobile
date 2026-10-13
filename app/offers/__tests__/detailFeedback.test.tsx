/**
 * Teklif detayı geri bildirimi: reddet / iptal sonucu `appAlert('common.info')` DEĞİL toast;
 * iptalde ÖNCE geri dön, toast SONRA; karşı teklif `CounterOfferModal` ile (kopya CounterDialog yok):
 * modal kapanır, SONRA mutation; hata toast.error.
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { appAlert, toast } from '@/ui';
import { renderWithProviders } from '@/test-utils';
import i18n from '@/i18n/config';

jest.mock('@/ui', () => ({
  ...jest.requireActual('@/ui'),
  appAlert: jest.fn(),
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({ id: 'offer-1' }),
}));
import { router as mockRouter } from 'expo-router';

jest.mock('@/lib/api', () => ({
  offersApi: {
    getOne: jest.fn(),
    accept: jest.fn(),
    reject: jest.fn(),
    cancel: jest.fn(),
    counter: jest.fn(),
  },
  timingRulesApi: { getPolicy: jest.fn(() => Promise.resolve({ data: {} })) },
}));
import { offersApi } from '@/lib/api';

let mockUser: { id: string } | null = { id: 'seller-1' };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = { user: mockUser };
    return sel ? sel(state) : state;
  },
}));

import OfferDetailScreen from '../[id]';

const api = offersApi as unknown as Record<string, jest.Mock>;
const successMock = toast.success as jest.Mock;
const errorMock = toast.error as jest.Mock;
const alertMock = appAlert as jest.Mock;

const offerFixture = (over: Record<string, unknown> = {}) => ({
  id: 'offer-1',
  productId: 'p1',
  amount: 250,
  status: 'pending',
  createdAt: new Date().toISOString(),
  buyer: { id: 'buyer-1', displayName: 'Ayşe' },
  seller: { id: 'seller-1', displayName: 'Mehmet' },
  product: { id: 'p1', title: 'Deri Ceket', price: 500 },
  ...over,
});

/** Onay diyaloğunun "Onayla" düğmesini basar (appAlert düğmeleri: [İptal, Onay]). */
const pressConfirm = async () => {
  const buttons = alertMock.mock.calls.at(-1)![2] as { onPress?: () => void; onSelect?: () => void }[];
  await act(async () => {
    buttons[1].onSelect?.();
    buttons[1].onPress?.();
  });
};

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset());
  successMock.mockClear();
  errorMock.mockClear();
  (mockRouter.back as jest.Mock).mockReset();
  (mockRouter.replace as jest.Mock).mockReset();
  mockUser = { id: 'seller-1' };
  api.getOne.mockResolvedValue({ data: { data: offerFixture() } });
});

describe('teklif detayı — reddet / iptal', () => {
  it('reddet başarılı: toast.success, appAlert(common.info) YOK', async () => {
    api.reject.mockResolvedValue({});
    renderWithProviders(<OfferDetailScreen />);
    fireEvent.press(await screen.findByText(i18n.t('offer.rejectOffer')));
    await pressConfirm();

    await waitFor(() => expect(successMock).toHaveBeenCalledWith(i18n.t('offer.offerRejected')));
    // Tek appAlert: onay diyaloğunun kendisi.
    expect(alertMock).toHaveBeenCalledTimes(1);
  });

  it('reddet hata: toast.error(sunucu mesajı)', async () => {
    api.reject.mockRejectedValue({ response: { data: { message: 'Teklif süresi dolmuş' } } });
    renderWithProviders(<OfferDetailScreen />);
    fireEvent.press(await screen.findByText(i18n.t('offer.rejectOffer')));
    await pressConfirm();

    await waitFor(() => expect(errorMock).toHaveBeenCalledWith('Teklif süresi dolmuş'));
    expect(alertMock).toHaveBeenCalledTimes(1);
  });

  it('iptal: ÖNCE router.back(), toast SONRA', async () => {
    mockUser = { id: 'buyer-1' };
    api.cancel.mockResolvedValue({});
    const order: string[] = [];
    (mockRouter.back as jest.Mock).mockImplementation(() => order.push('back'));
    successMock.mockImplementation(() => order.push('toast'));
    renderWithProviders(<OfferDetailScreen />);
    fireEvent.press(await screen.findByText(i18n.t('trade.cancel.offerCta')));
    await pressConfirm();

    await waitFor(() => expect(successMock).toHaveBeenCalledWith(i18n.t('offer.offerCancelled')));
    expect(order).toEqual(['back', 'toast']);
    expect(alertMock).toHaveBeenCalledTimes(1);
    successMock.mockReset();
  });
});

describe('teklif detayı — karşı teklif (CounterOfferModal)', () => {
  it('geçersiz tutar: modal AÇIK kalır, satır içi hata, appAlert/toast yok, istek yok', async () => {
    renderWithProviders(<OfferDetailScreen />);
    fireEvent.press(await screen.findByText(i18n.t('offer.counterOfferCta')));
    // mevcut tekliften (250) düşük
    fireEvent.changeText(await screen.findByPlaceholderText(i18n.t('offer.amountPlaceholderTl')), '100');
    fireEvent.press(screen.getByText(i18n.t('common.submit')));

    await waitFor(() => expect(screen.getByText(/Karşı teklif, mevcut tekliften/)).toBeTruthy());
    expect(api.counter).not.toHaveBeenCalled();
    expect(alertMock).not.toHaveBeenCalled();
    expect(errorMock).not.toHaveBeenCalled();
  });

  it('geçerli tutar: modal kapanır, istek gider, başarıda toast.success', async () => {
    api.counter.mockResolvedValue({});
    renderWithProviders(<OfferDetailScreen />);
    fireEvent.press(await screen.findByText(i18n.t('offer.counterOfferCta')));
    fireEvent.changeText(await screen.findByPlaceholderText(i18n.t('offer.amountPlaceholderTl')), '300');
    fireEvent.press(screen.getByText(i18n.t('common.submit')));

    await waitFor(() => expect(api.counter).toHaveBeenCalledWith('offer-1', 300));
    await waitFor(() => expect(successMock).toHaveBeenCalledWith(i18n.t('offer.counterSent')));
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('sunucu hatası: toast.error, appAlert yok', async () => {
    api.counter.mockRejectedValue({ response: { data: { message: 'Karşı teklif verilemez' } } });
    renderWithProviders(<OfferDetailScreen />);
    fireEvent.press(await screen.findByText(i18n.t('offer.counterOfferCta')));
    fireEvent.changeText(await screen.findByPlaceholderText(i18n.t('offer.amountPlaceholderTl')), '300');
    fireEvent.press(screen.getByText(i18n.t('common.submit')));

    await waitFor(() => expect(errorMock).toHaveBeenCalledWith('Karşı teklif verilemez'));
    expect(alertMock).not.toHaveBeenCalled();
  });
});

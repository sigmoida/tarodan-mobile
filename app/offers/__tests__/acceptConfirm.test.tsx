/**
 * Teklif KABUL onayı (web `useOffers.run` + `useConfirm`): kabul önce onay diyaloğu
 * gösterir (satıcı / alıcı metni, ödeme süresi politikadan), onaylanınca API'ye gider;
 * vazgeçilirse gitmez. Kabul edilmiş ödenmemiş teklifte "ilk ödeyen alır" notu.
 * Diyalog `appAlert`'tir (jest.setup'ta global mock): önce kapanır, mutasyon yalnız onay
 * düğmesinin `onPress`'inden sonra çalışır (ModalFreeze: açık diyalogla çakışmaz).
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { appAlert, MODAL_CLOSE_DELAY_MS } from '@/ui';
import { renderWithProviders } from '@/test-utils';

jest.mock('@/lib/api', () => ({
  offersApi: { getAll: jest.fn(), getOne: jest.fn(), accept: jest.fn(), reject: jest.fn(), cancel: jest.fn(), counter: jest.fn() },
  ordersApi: { getCommissionPreviewBatch: jest.fn(() => Promise.resolve({ data: { results: [] } })) },
  timingRulesApi: { getPolicy: jest.fn(() => Promise.resolve({ data: { orderPaymentWindowHours: { value: 36 } } })) },
}));
import { offersApi } from '@/lib/api';

let mockUser: { id: string } | null = { id: 's1' };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = { isAuthenticated: true, isLoading: false, user: mockUser };
    return sel ? sel(state) : state;
  },
}));

let mockTab: string | undefined;
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({ id: 'o1', tab: mockTab }),
}));

import OffersScreen from '../index';
import OfferDetailScreen from '../[id]';

const getAll = offersApi.getAll as jest.Mock;
const getOne = offersApi.getOne as jest.Mock;
const accept = offersApi.accept as jest.Mock;

const base = (over: Record<string, unknown> = {}) => ({
  id: 'o1',
  productId: 'p1',
  amount: 200,
  status: 'pending',
  expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  createdAt: new Date().toISOString(),
  product: { id: 'p1', title: 'Vintage Kamera', price: 400 },
  buyer: { id: 'b1', displayName: 'Ali Veli' },
  seller: { id: 's1', displayName: 'Mehmet' },
  ...over,
});

const mount = (ui: React.ReactElement) => renderWithProviders(ui);
const alertMock = appAlert as jest.Mock;

/** Son `appAlert` çağrısı: başlık, mesaj ve düğmeler. */
const lastConfirm = () => {
  const [title, message, buttons] = alertMock.mock.calls.at(-1)!;
  return {
    title: title as string,
    message: message as string,
    cancel: buttons[0] as { text: string; onPress?: () => void },
    confirm: buttons[1] as { text: string; onPress: () => void },
  };
};

/** Politika (36 saat) gelsin: sorgu çözülmeden diyalog 24 saatlik yedekle açılırdı. */
const flushPolicy = () => act(async () => {});

beforeEach(() => {
  getAll.mockReset();
  getOne.mockReset();
  accept.mockReset().mockResolvedValue({ data: {} });
  mockUser = { id: 's1' };
  mockTab = undefined;
});

describe('liste: satıcı gelen teklifi kabul eder', () => {
  beforeEach(() => getAll.mockResolvedValue({ data: { data: [base()] } }));

  it('onaysız API çağrısı yok; onay metni satıcı sürümü ve politikadan 36 saat', async () => {
    mount(<OffersScreen />);
    await screen.findByText('Vintage Kamera');
    await flushPolicy();

    fireEvent.press(screen.getByText('Kabul Et'));
    const c = lastConfirm();
    expect(c.title).toBe('Teklifi kabul et');
    expect(c.message).toMatch(/alıcının 36 saatlik ödeme süresi başlar/);
    expect(c.message).toMatch(/ürünü ilk ödeyen alır/);
    expect(c.confirm.text).toBe('Onayla');
    expect(c.cancel.text).toBe('İptal');
    expect(accept).not.toHaveBeenCalled();
  });

  it('Onayla -> kabul API\'sine id ile gider', async () => {
    mount(<OffersScreen />);
    await screen.findByText('Vintage Kamera');
    await flushPolicy();
    fireEvent.press(screen.getByText('Kabul Et'));
    act(() => lastConfirm().confirm.onPress());
    await waitFor(() => expect(accept).toHaveBeenCalledWith('o1'));
  });

  it('İptal -> kabul API\'sine gitmez', async () => {
    mount(<OffersScreen />);
    await screen.findByText('Vintage Kamera');
    await flushPolicy();
    fireEvent.press(screen.getByText('Kabul Et'));
    lastConfirm().cancel.onPress?.();
    await act(async () => {});
    expect(accept).not.toHaveBeenCalled();
  });
});

/**
 * ModalFreeze: `AlertDialogHost.close()` `onPress`'i diyalog kapanırken aynı tick'te çağırır.
 * Mutasyon hemen başlarsa hızlı bir hatanın `appAlert`'i kapanmakta olan diyaloğun üstüne
 * yeni modal açıp iOS'u dondurur -> onaydan sonra mutasyon modal kapanma süresi kadar gecikir.
 */
describe('onay sonrası mutasyon gecikmeli başlar (ModalFreeze)', () => {
  afterEach(() => jest.useRealTimers());

  const confirmThen = async (press: () => void) => {
    jest.useFakeTimers();
    press();
    act(() => lastConfirm().confirm.onPress());
    // Aynı tick'te çalışmaz.
    await act(async () => {});
    expect(accept).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS - 1);
    });
    expect(accept).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(accept).toHaveBeenCalledWith('o1');
  };

  it('liste', async () => {
    getAll.mockResolvedValue({ data: { data: [base()] } });
    mount(<OffersScreen />);
    await screen.findByText('Vintage Kamera');
    await flushPolicy();
    await confirmThen(() => fireEvent.press(screen.getByText('Kabul Et')));
  });

  it('detay', async () => {
    getOne.mockResolvedValue({ data: { data: base() } });
    mount(<OfferDetailScreen />);
    await screen.findByText('Vintage Kamera');
    await flushPolicy();
    await confirmThen(() => fireEvent.press(screen.getByText('Kabul Et')));
  });
});

describe('liste: alıcı karşı teklifi kabul eder', () => {
  it('alıcı sürümü metni gösterilir', async () => {
    mockTab = 'sent';
    getAll.mockResolvedValue({ data: { data: [base({ buyerMustAccept: true })] } });
    mount(<OffersScreen />);
    await screen.findByText('Vintage Kamera');
    await flushPolicy();
    fireEvent.press(screen.getByText('Karşı teklifi kabul et'));
    expect(lastConfirm().message).toMatch(/36 saat içinde ödemeniz gerekir/);
    expect(lastConfirm().message).toMatch(/başka bir alıcı önce öderse/);
    expect(accept).not.toHaveBeenCalled();
    act(() => lastConfirm().confirm.onPress());
    await waitFor(() => expect(accept).toHaveBeenCalledWith('o1'));
  });
});

describe('"ilk ödeyen alır" notu', () => {
  const acceptedUnpaid = (over: Record<string, unknown> = {}) =>
    base({ status: 'accepted', orderId: 'ord1', orderStatus: 'pending_payment', ...over });

  it('satıcıya (gelen sekme) ödeme süresiyle', async () => {
    getAll.mockResolvedValue({ data: { data: [acceptedUnpaid()] } });
    mount(<OffersScreen />);
    await screen.findByText('Vintage Kamera');
    await flushPolicy();
    expect(await screen.findByText(/Alıcının 36 saatlik ödeme süresi var/)).toBeOnTheScreen();
  });

  it('alıcıya (gönderilen sekme) "henüz size ayrılmadı"', async () => {
    mockTab = 'sent';
    getAll.mockResolvedValue({ data: { data: [acceptedUnpaid()] } });
    mount(<OffersScreen />);
    await screen.findByText('Vintage Kamera');
    expect(await screen.findByText(/Ürün henüz size ayrılmadı/)).toBeOnTheScreen();
  });

  it('ödenmiş siparişte not yok', async () => {
    getAll.mockResolvedValue({ data: { data: [acceptedUnpaid({ orderStatus: 'paid' })] } });
    mount(<OffersScreen />);
    await screen.findByText('Vintage Kamera');
    expect(screen.queryByTestId('first-to-pay-note')).toBeNull();
  });

  it.each(['cancelled', 'expired', 'refunded', null, undefined])(
    'ödeme beklenmeyen sipariş durumunda (%s) not yok (Öde düğmesiyle aynı kural)',
    async (orderStatus) => {
      getAll.mockResolvedValue({ data: { data: [acceptedUnpaid({ orderStatus })] } });
      mount(<OffersScreen />);
      await screen.findByText('Vintage Kamera');
      await flushPolicy();
      expect(screen.queryByTestId('first-to-pay-note')).toBeNull();
    },
  );

  it('detayda da iptal edilmiş siparişte not yok', async () => {
    getOne.mockResolvedValue({ data: { data: base({ status: 'accepted', orderStatus: 'cancelled' }) } });
    mount(<OfferDetailScreen />);
    await screen.findByText('Vintage Kamera');
    await flushPolicy();
    expect(screen.queryByTestId('first-to-pay-note')).toBeNull();
  });

  it('bekleyen (kabul edilmemiş) teklifte not yok', async () => {
    getAll.mockResolvedValue({ data: { data: [base()] } });
    mount(<OffersScreen />);
    await screen.findByText('Vintage Kamera');
    expect(screen.queryByTestId('first-to-pay-note')).toBeNull();
  });
});

describe('detay: satıcı kabul eder', () => {
  it('onay ister; Onayla ile gider', async () => {
    getOne.mockResolvedValue({ data: { data: base() } });
    mount(<OfferDetailScreen />);
    await screen.findByText('Vintage Kamera');
    await flushPolicy();

    fireEvent.press(screen.getByText('Kabul Et'));
    expect(lastConfirm().message).toMatch(/alıcının 36 saatlik ödeme süresi başlar/);
    expect(accept).not.toHaveBeenCalled();
    act(() => lastConfirm().confirm.onPress());
    await waitFor(() => expect(accept).toHaveBeenCalledWith('o1'));
  });

  it('kabul edilmiş ödenmemiş teklifte satıcıya not görünür', async () => {
    getOne.mockResolvedValue({ data: { data: base({ status: 'accepted', orderStatus: 'pending_payment' }) } });
    mount(<OfferDetailScreen />);
    expect(await screen.findByText(/Alıcının 36 saatlik ödeme süresi var/)).toBeOnTheScreen();
  });
});

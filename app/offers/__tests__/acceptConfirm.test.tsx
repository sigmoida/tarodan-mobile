/**
 * Teklif KABUL onayı (web `useOffers.run` + `useConfirm`): kabul önce onay diyaloğu
 * gösterir (satıcı / alıcı metni, ödeme süresi politikadan), onaylanınca API'ye gider;
 * vazgeçilirse gitmez. Kabul edilmiş ödenmemiş teklifte "ilk ödeyen alır" notu.
 * Diyalog `appAlert`'tir (jest.setup'ta global mock): önce kapanır, mutasyon yalnız onay
 * düğmesinin `onPress`'inden sonra çalışır. ModalFreeze gecikmesi `AlertDialogHost`'tadır
 * (`src/ui/components/__tests__/alertDialogModalFreeze.test.tsx`); çağrı yeri ayrıca beklemez.
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { appAlert } from '@/ui';
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
const reject = offersApi.reject as jest.Mock;
const cancel = offersApi.cancel as jest.Mock;

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
  reject.mockReset().mockResolvedValue({ data: {} });
  cancel.mockReset().mockResolvedValue({ data: {} });
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
 * Onaydan sonraki boşluk: diyalog kapanışı bitene dek mutasyon başlamaz (`AlertDialogHost`).
 * Bu arada kart "bekliyor" olmalı: onay basıldığı AN (`onSelect`) spinner + devre dışı;
 * ikinci basış ikinci onay/mutasyon açmaz.
 */
describe('onay basıldığı an bekliyor durumu (çift basış yok)', () => {
  it('liste: onSelect -> spinner, ikinci basış yeni diyalog açmaz, tek mutasyon', async () => {
    getAll.mockResolvedValue({ data: { data: [base()] } });
    let resolveAccept!: () => void;
    accept.mockImplementation(() => new Promise<void>((r) => (resolveAccept = () => r())));
    mount(<OffersScreen />);
    await screen.findByText('Vintage Kamera');
    await flushPolicy();

    fireEvent.press(screen.getByText('Kabul Et'));
    const c = lastConfirm();
    const callsAfterFirst = alertMock.mock.calls.length;
    act(() => (c.confirm as { onSelect?: () => void }).onSelect?.());

    // mutasyon henüz başlamadı ama kart bekliyor
    expect(accept).not.toHaveBeenCalled();
    expect(screen.queryByText('Kabul Et')).toBeNull();
    fireEvent.press(screen.getByText('Reddet')); // devre dışı düğme
    expect(alertMock.mock.calls.length).toBe(callsAfterFirst);

    act(() => c.confirm.onPress());
    await waitFor(() => expect(accept).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Kabul Et')).toBeNull(); // mutasyon sürerken de bekliyor

    await act(async () => resolveAccept());
    await waitFor(() => expect(screen.getByText('Kabul Et')).toBeOnTheScreen());
  });

  it('liste: mutasyon hata verince bekliyor kalkar', async () => {
    getAll.mockResolvedValue({ data: { data: [base()] } });
    accept.mockRejectedValue(new Error('x'));
    mount(<OffersScreen />);
    await screen.findByText('Vintage Kamera');
    await flushPolicy();
    fireEvent.press(screen.getByText('Kabul Et'));
    const c = lastConfirm();
    act(() => (c.confirm as { onSelect?: () => void }).onSelect?.());
    act(() => c.confirm.onPress());
    await waitFor(() => expect(screen.getByText('Kabul Et')).toBeOnTheScreen());
  });

  it('detay: onSelect -> düğmeler devre dışı/spinner, ikinci basış yeni diyalog açmaz', async () => {
    getOne.mockResolvedValue({ data: { data: base() } });
    mount(<OfferDetailScreen />);
    await screen.findByText('Vintage Kamera');
    await flushPolicy();

    fireEvent.press(screen.getByText('Kabul Et'));
    const c = lastConfirm();
    const callsAfterFirst = alertMock.mock.calls.length;
    act(() => (c.confirm as { onSelect?: () => void }).onSelect?.());

    expect(accept).not.toHaveBeenCalled();
    expect(screen.queryByText('Kabul Et')).toBeNull(); // spinner
    fireEvent.press(screen.getByText('Reddet'));
    expect(alertMock.mock.calls.length).toBe(callsAfterFirst);

    act(() => c.confirm.onPress());
    await waitFor(() => expect(accept).toHaveBeenCalledTimes(1));
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

/**
 * Reddet / iptal de GERİ ALINAMAZ (web `useOfferAction.run` üçünde de onay ister): liste
 * kartı ve detay aynı diyaloğu (başlık, metin, yıkıcı Onayla) ve aynı gecikmeli
 * mutasyonu kullanır.
 */
describe('reddet ve iptal onay ister (liste = detay = web)', () => {
  const expectConfirmedAfterDelay = async (
    press: () => void,
    api: jest.Mock,
    title: string,
    body: RegExp,
  ) => {
    press();
    const c = lastConfirm();
    expect(c.title).toBe(title);
    expect(c.message).toMatch(body);
    expect(c.message).toMatch(/geri alınamaz/);
    expect(c.confirm.text).toBe('Onayla');
    expect(c.cancel.text).toBe('İptal');
    expect((c.confirm as { style?: string }).style).toBe('destructive');
    expect(api).not.toHaveBeenCalled();

    // Gecikme `AlertDialogHost`'ta: onPress çağrıldığında diyalog zaten kapanmıştır.
    act(() => c.confirm.onPress());
    await waitFor(() => expect(api).toHaveBeenCalledWith('o1'));
  };

  it('liste (gelen): Reddet', async () => {
    getAll.mockResolvedValue({ data: { data: [base()] } });
    mount(<OffersScreen />);
    await screen.findByText('Vintage Kamera');
    await flushPolicy();
    await expectConfirmedAfterDelay(
      () => fireEvent.press(screen.getByText('Reddet')),
      reject,
      'Teklifi reddet',
      /reddetmek istediğinizden emin misiniz/,
    );
  });

  it('liste (gönderilen, karşı teklif): Reddet', async () => {
    mockTab = 'sent';
    getAll.mockResolvedValue({ data: { data: [base({ buyerMustAccept: true })] } });
    mount(<OffersScreen />);
    await screen.findByText('Vintage Kamera');
    await flushPolicy();
    await expectConfirmedAfterDelay(
      () => fireEvent.press(screen.getByText('Reddet')),
      reject,
      'Teklifi reddet',
      /reddetmek istediğinizden emin misiniz/,
    );
  });

  it('liste (gönderilen): İptal Et', async () => {
    mockTab = 'sent';
    getAll.mockResolvedValue({ data: { data: [base()] } });
    mount(<OffersScreen />);
    await screen.findByText('Vintage Kamera');
    await flushPolicy();
    await expectConfirmedAfterDelay(
      () => fireEvent.press(screen.getByText('İptal Et')),
      cancel,
      'Teklifi iptal et',
      /iptal etmek istediğinizden emin misiniz/,
    );
  });

  it('liste: vazgeçilirse API çağrılmaz', async () => {
    getAll.mockResolvedValue({ data: { data: [base()] } });
    mount(<OffersScreen />);
    await screen.findByText('Vintage Kamera');
    fireEvent.press(screen.getByText('Reddet'));
    lastConfirm().cancel.onPress?.();
    await act(async () => {});
    expect(reject).not.toHaveBeenCalled();
  });

  it('detay (satıcı): Reddet', async () => {
    getOne.mockResolvedValue({ data: { data: base() } });
    mount(<OfferDetailScreen />);
    await screen.findByText('Vintage Kamera');
    await flushPolicy();
    await expectConfirmedAfterDelay(
      () => fireEvent.press(screen.getByText('Reddet')),
      reject,
      'Teklifi reddet',
      /reddetmek istediğinizden emin misiniz/,
    );
  });

  it('detay (alıcı): Teklifi İptal Et', async () => {
    mockUser = { id: 'b1' };
    getOne.mockResolvedValue({ data: { data: base() } });
    mount(<OfferDetailScreen />);
    await screen.findByText('Vintage Kamera');
    await flushPolicy();
    await expectConfirmedAfterDelay(
      () => fireEvent.press(screen.getByText('Teklifi İptal Et')),
      cancel,
      'Teklifi iptal et',
      /iptal etmek istediğinizden emin misiniz/,
    );
  });
});

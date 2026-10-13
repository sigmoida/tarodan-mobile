/**
 * Teklif başına bekleme durumu: bekleyen teklifler BİR SET'tir. A'nın kabulü sürerken B onaylanırsa
 * A'nın butonları açılmaz (ikinci kabul gönderilemez); A bitince yalnız A'nın durumu temizlenir,
 * B hâlâ bekliyor görünür.
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


const two = () => [
  base({ id: 'o1', product: { id: 'p1', title: 'Kamera Bir', price: 400 } }),
  base({ id: 'o2', productId: 'p2', product: { id: 'p2', title: 'Kamera İki', price: 300 } }),
];

/** İlk bekleyen onay diyaloğunu onayla: onSelect (an) + onPress (kapanış sonrası). */
const confirmLast = () => {
  const { confirm } = lastConfirm();
  act(() => (confirm as { onSelect?: () => void }).onSelect?.());
  act(() => confirm.onPress());
};

describe('liste: teklif başına bekleme', () => {
  beforeEach(() => getAll.mockResolvedValue({ data: { data: two() } }));

  it('A sürerken B onaylanınca A\'ya ikinci kabul gitmez; A bitince B hâlâ bekliyor', async () => {
    const resolvers: Record<string, () => void> = {};
    accept.mockImplementation(
      (id: string) => new Promise<void>((r) => (resolvers[id] = () => r())),
    );
    mount(<OffersScreen />);
    await screen.findByText('Kamera Bir');
    await flushPolicy();

    // A (o1) kabul edilir
    fireEvent.press(screen.getAllByText('Kabul Et')[0]!);
    confirmLast();
    await waitFor(() => expect(accept).toHaveBeenCalledWith('o1'));
    expect(screen.getAllByText('Kabul Et')).toHaveLength(1); // yalnız B'nin düğmesi kaldı

    // A sürerken B (o2) onaylanır
    fireEvent.press(screen.getByText('Kabul Et'));
    confirmLast();
    await waitFor(() => expect(accept).toHaveBeenCalledWith('o2'));
    expect(screen.queryByText('Kabul Et')).toBeNull(); // ikisi de bekliyor: A'nın butonları AÇILMADI

    // A'nın Reddet'ine basmak yeni onay açmaz, A'ya ikinci kabul gitmez
    const alertsBefore = alertMock.mock.calls.length;
    fireEvent.press(screen.getAllByText('Reddet')[0]!);
    expect(alertMock.mock.calls.length).toBe(alertsBefore);
    expect(accept.mock.calls.filter(([id]) => id === 'o1')).toHaveLength(1);

    // A biter: yalnız A açılır, B hâlâ bekliyor
    await act(async () => resolvers.o1!());
    await waitFor(() => expect(screen.getAllByText('Kabul Et')).toHaveLength(1));
    // kalan düğme o1'in (ilk kart), o2 hâlâ spinner: o2'nin Reddet'i devre dışı
    const alertsAfterA = alertMock.mock.calls.length;
    fireEvent.press(screen.getAllByText('Reddet')[1]!);
    expect(alertMock.mock.calls.length).toBe(alertsAfterA);

    // B de biter: ikisi de açık
    await act(async () => resolvers.o2!());
    await waitFor(() => expect(screen.getAllByText('Kabul Et')).toHaveLength(2));
  });

  it('A\'nın hatası B\'nin bekleme durumunu temizlemez', async () => {
    let rejectA!: (e: Error) => void;
    let resolveB!: () => void;
    accept.mockImplementation(
      (id: string) =>
        new Promise<void>((res, rej) => {
          if (id === 'o1') rejectA = rej;
          else resolveB = res;
        }),
    );
    mount(<OffersScreen />);
    await screen.findByText('Kamera Bir');
    await flushPolicy();
    fireEvent.press(screen.getAllByText('Kabul Et')[0]!);
    confirmLast();
    fireEvent.press(screen.getByText('Kabul Et'));
    confirmLast();
    await waitFor(() => expect(accept).toHaveBeenCalledTimes(2));

    await act(async () => rejectA(new Error('x')));
    await waitFor(() => expect(screen.getAllByText('Kabul Et')).toHaveLength(1)); // yalnız A açıldı
    await act(async () => resolveB());
    await waitFor(() => expect(screen.getAllByText('Kabul Et')).toHaveLength(2));
  });
});

/**
 * J6 · Takas karşı teklif formu — mobil UI dilimi.
 * Nakit fark girişi (tutar + yön chip), mesaj alanı, özet render,
 * "Karşı Teklif Gönder" buton enable/disable (ürün seçimi), ürün seçince
 * counter mutation (tradesApi.counter) çağrısı, hata/yükleme durumu.
 * Backend takas rolleri/escrow backend-only.
 */
import React from 'react';
import { appAlert } from '@/ui';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

let mockParams: Record<string, string> = { id: 'trade-1' };
// The shared router mock carries `useFocusEffect` (the pickers refetch on screen focus).
jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => mockParams,
}));

// The screen tests assert what the loaded screen shows, not the skeleton timing: without this
// the delayed-skeleton timer can re-show the skeleton over found content on a busy machine.
jest.mock('@/ui/loading/useDelayedLoading', () => require('@/test-utils/loading').immediateLoadingMock);

jest.mock('@/lib/api', () => ({
  tradesApi: { getOne: jest.fn(), counter: jest.fn() },
  productsApi: { getAll: jest.fn(), getMyListings: jest.fn() },
}));
import { tradesApi, productsApi } from '@/lib/api';

let mockUser: { id: string } | null = { id: 'user-initiator' };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = ({ user: mockUser });
    return sel ? sel(state) : state;
  },
}));

// Kapı bu testin konusu değil (bkz. legal-identity-gate.test): geçti say.
jest.mock('@/hooks/useLegalIdentity', () =>
  require('@/test-utils/legalIdentity').legalIdentityGatePassMock);

import TradeCounterScreen from '../[id]';

const getOneMock = tradesApi.getOne as jest.Mock;
const counterMock = tradesApi.counter as jest.Mock;
const getAllMock = productsApi.getAll as jest.Mock;
const getMyMock = productsApi.getMyListings as jest.Mock;

function tradeFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trade-1',
    status: 'pending',
    initiatorId: 'user-initiator',
    receiverId: 'user-other',
    initiatorName: 'Ali',
    receiverName: 'Veli',
    cashAmount: 0,
    cashPayerId: null,
    initiatorItems: [],
    receiverItems: [],
    ...overrides,
  };
}

const myProduct = {
  id: 'prod-mine', title: 'Benim Ürünüm', price: 200,
  isTradeEnabled: true, status: 'active', images: [],
};
const theirProduct = {
  id: 'prod-theirs', title: 'Karşı Ürün', price: 300,
  isTradeEnabled: true, status: 'active', images: [],
};

function mountWithProducts(trade = tradeFixture()) {
  getOneMock.mockResolvedValue({ data: { data: trade } });
  // My side is `GET /products/my`; their side is the public list.
  getMyMock.mockResolvedValue({ data: { data: [myProduct] } });
  getAllMock.mockResolvedValue({ data: { data: [theirProduct] } });
}

describe('J6 · Karşı teklif formu', () => {
  beforeEach(() => {
    getOneMock.mockReset();
    counterMock.mockReset();
    getAllMock.mockReset();
    getMyMock.mockReset();
    mockParams = { id: 'trade-1' };
    mockUser = { id: 'user-initiator' };
    (appAlert as jest.Mock).mockImplementation(() => {});
  });

  it('J6.1 form bölümleri render edilir (nakit fark + mesaj + özet)', async () => {
    mountWithProducts();
    renderWithProviders(<TradeCounterScreen />);
    await waitFor(() => expect(screen.getByText('Nakit fark')).toBeOnTheScreen());
    expect(screen.getByText('Ben ödeyeceğim')).toBeOnTheScreen();
    expect(screen.getByText('Karşı taraf ödeyecek')).toBeOnTheScreen();
    expect(screen.getByText('Özet')).toBeOnTheScreen();
  });

  it('J6.2 ürün seçili değilken "Karşı Teklif Gönder" disabled', async () => {
    mountWithProducts();
    renderWithProviders(<TradeCounterScreen />);
    await waitFor(() => expect(screen.getByText('Vereceğim Ürünler')).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Karşı Teklif Gönder'));
    // Boş seçimde mutation tetiklenmez (disabled + handleSubmit guard).
    expect(counterMock).not.toHaveBeenCalled();
  });

  it('J6.3 ürün seçilince ve gönderince tradesApi.counter çağrılır', async () => {
    mountWithProducts();
    counterMock.mockResolvedValue({ data: {} });
    renderWithProviders(<TradeCounterScreen />);
    await waitFor(() => expect(screen.getByText('Benim Ürünüm')).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Benim Ürünüm'));
    // Yalnız bir taraf seçiliyken gönder pasif (API iki tarafta da en az 1 ürün ister).
    fireEvent.press(screen.getByText('Karşı Teklif Gönder'));
    expect(counterMock).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('Karşı Ürün'));
    fireEvent.press(screen.getByText('Karşı Teklif Gönder'));
    await waitFor(() => expect(counterMock).toHaveBeenCalled());
    const [tradeId, body] = counterMock.mock.calls[0];
    expect(tradeId).toBe('trade-1');
    expect(body.initiatorItems).toEqual([{ productId: 'prod-mine', quantity: 1 }]);
  });

  it('J6.4 nakit tutar girişi sadece rakam/nokta kabul eder', async () => {
    mountWithProducts();
    renderWithProviders(<TradeCounterScreen />);
    await waitFor(() => expect(screen.getByText('Nakit fark')).toBeOnTheScreen());
    // Nakit alanı tek numeric input'tur; keyboardType ile ayırt et.
    const numericInputs = screen
      .UNSAFE_getAllByType(require('react-native').TextInput)
      .filter((n: any) => n.props.keyboardType === 'numeric');
    expect(numericInputs.length).toBe(1);
    const input = numericInputs[0];
    fireEvent.changeText(input, '12a3.5x');
    expect(screen.getByDisplayValue('123.5')).toBeOnTheScreen();
  });

  it('J6.5 both pickers show loading, not the empty state, until their lists settle', async () => {
    getOneMock.mockResolvedValue({ data: { data: tradeFixture() } });
    const pending: Array<(v: unknown) => void> = [];
    getMyMock.mockImplementation(() => new Promise((r) => pending.push(r)));
    getAllMock.mockImplementation(() => new Promise((r) => pending.push(r)));
    renderWithProviders(<TradeCounterScreen />);

    await waitFor(() => expect(pending).toHaveLength(2));
    expect(screen.getByText('Vereceğim Ürünler')).toBeOnTheScreen();
    expect(screen.getAllByTestId('loading-indicator').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('Takasa uygun ürün bulunamadı.')).toBeNull();

    pending.forEach((resolve) => resolve({ data: { data: [] } }));
    await waitFor(() => expect(screen.getAllByText('Takasa uygun ürün bulunamadı.')).toHaveLength(2));
  });
});

/**
 * J6 · Takas karşı teklif formu — mobil UI dilimi.
 * Nakit fark girişi (tutar + yön chip), mesaj alanı, özet render,
 * "Karşı Teklif Gönder" buton enable/disable (ürün seçimi), ürün seçince
 * counter mutation (tradesApi.counter) çağrısı, hata/yükleme durumu.
 * Backend takas rolleri/escrow backend-only.
 */
import React from 'react';
import { TextInput } from 'react-native';
import { appAlert } from '@/ui';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { formatPrice } from '@/utils/format';

let mockParams: Record<string, string> = { id: 'trade-1' };
// The shared router mock carries `useFocusEffect` (the pickers refetch on screen focus).
jest.mock('expo-router', () => ({
  ...jest.requireActual('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => mockParams,
}));

// The screen tests assert what the loaded screen shows, not the skeleton timing: without this
// the delayed-skeleton timer can re-show the skeleton over found content on a busy machine.
jest.mock('@/ui/loading/useDelayedLoading', () => jest.requireActual('@/test-utils/loading').immediateLoadingMock);

jest.mock('@/lib/api', () => ({
  tradesApi: { getOne: jest.fn(), counter: jest.fn() },
  productsApi: { getAll: jest.fn(), getMyListings: jest.fn() },
}));
import { tradesApi, productsApi } from '@/lib/api';

let mockUser: { id: string } | null = { id: 'user-initiator' };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: { user: typeof mockUser }) => unknown) => {
    const state = { user: mockUser };
    return sel ? sel(state) : state;
  },
}));

// Kapı bu testin konusu değil (bkz. legal-identity-gate.test): geçti say.
jest.mock('@/hooks/useLegalIdentity', () =>
  jest.requireActual('@/test-utils/legalIdentity').legalIdentityGatePassMock);

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

/** The cash field: the only numeric input on the screen. */
function cashInput() {
  const numericInputs = screen
    .UNSAFE_getAllByType(TextInput)
    .filter((n) => n.props.keyboardType === 'numeric');
  expect(numericInputs).toHaveLength(1);
  return numericInputs[0];
}

/** A trade whose items are already picked on both sides (the counter starts from them). */
const tradeWithItems = (overrides: Record<string, unknown> = {}) =>
  tradeFixture({
    initiatorItems: [{ id: 'ti-1', productId: 'prod-mine', productTitle: 'Benim Ürünüm', valueAtTrade: 200, quantity: 1 }],
    receiverItems: [{ id: 'ti-2', productId: 'prod-theirs', productTitle: 'Karşı Ürün', valueAtTrade: 300, quantity: 1 }],
    ...overrides,
  });

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
    (appAlert as jest.Mock).mockImplementation(() => undefined);
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
    // Their list starts only once the trade names the other party, so it can render after mine:
    // wait for both before pressing either.
    await waitFor(() => {
      expect(screen.getByText('Benim Ürünüm')).toBeOnTheScreen();
      expect(screen.getByText('Karşı Ürün')).toBeOnTheScreen();
    });
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

  it('J6.4 the cash field keeps digits and both decimal separators only', async () => {
    mountWithProducts();
    renderWithProviders(<TradeCounterScreen />);
    await waitFor(() => expect(screen.getByText('Nakit fark')).toBeOnTheScreen());
    const input = cashInput();
    fireEvent.changeText(input, '12a3.5x');
    expect(screen.getByDisplayValue('123.5')).toBeOnTheScreen();
    // A Turkish keyboard types a decimal comma: it stays (it used to be dropped, 12,50 -> 1250).
    fireEvent.changeText(input, '12,50');
    expect(screen.getByDisplayValue('12,50')).toBeOnTheScreen();
  });

  describe('J6.6 cash difference in the submitted payload (web parity)', () => {
    /** Opens the counter with both items picked, types the cash, optionally flips the payer, sends. */
    async function submitWithCash(text: string, payer?: 'Ben ödeyeceğim' | 'Karşı taraf ödeyecek') {
      mountWithProducts(tradeWithItems());
      counterMock.mockResolvedValue({ data: {} });
      renderWithProviders(<TradeCounterScreen />);
      await waitFor(() => {
        expect(screen.getByText('Benim Ürünüm')).toBeOnTheScreen();
        expect(screen.getByText('Karşı Ürün')).toBeOnTheScreen();
      });
      // Both the trade's own items are preselected; a change in the cash terms is the new offer.
      fireEvent.changeText(cashInput(), text);
      if (payer) fireEvent.press(screen.getByText(payer));
      fireEvent.press(screen.getByText('Karşı Teklif Gönder'));
    }

    async function sentBody() {
      await waitFor(() => expect(counterMock).toHaveBeenCalledTimes(1));
      return counterMock.mock.calls[0][1];
    }

    it.each([
      ['12,50', 12.5],
      ['12.50', 12.5],
      ['12,505', 12.51],
    ])('%p that I pay is sent as %p', async (text, amount) => {
      await submitWithCash(text);
      const body = await sentBody();
      expect(body).toEqual({
        initiatorItems: [{ productId: 'prod-mine', quantity: 1 }],
        receiverItems: [{ productId: 'prod-theirs', quantity: 1 }],
        cashAmount: amount,
        message: undefined,
      });
      // The summary shows the same amount that is sent.
      expect(screen.getByText('Ödeyeceğim nakit')).toBeOnTheScreen();
      expect(screen.getByText(formatPrice(amount))).toBeOnTheScreen();
    });

    it('a decimal comma that they pay is sent negative', async () => {
      await submitWithCash('12,50', 'Karşı taraf ödeyecek');
      expect((await sentBody()).cashAmount).toBe(-12.5);
    });

    it.each([['0'], ['0,00'], ['1.250,50']])(
      '%p sends no cashAmount (never 0 or -0), as on web',
      async (text) => {
        // Change the items so the offer differs without cash: drop their item, keep mine.
        mountWithProducts(tradeWithItems({ receiverItems: [] }));
        counterMock.mockResolvedValue({ data: {} });
        renderWithProviders(<TradeCounterScreen />);
        await waitFor(() => expect(screen.getByText('Karşı Ürün')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Karşı Ürün'));
        fireEvent.changeText(cashInput(), text);
        fireEvent.press(screen.getByText('Karşı taraf ödeyecek'));
        fireEvent.press(screen.getByText('Karşı Teklif Gönder'));
        const body = await sentBody();
        expect(body.cashAmount).toBeUndefined();
        expect(Object.is(body.cashAmount, -0)).toBe(false);
      },
    );

    it('an empty field sends no cashAmount', async () => {
      mountWithProducts(tradeWithItems({ receiverItems: [] }));
      counterMock.mockResolvedValue({ data: {} });
      renderWithProviders(<TradeCounterScreen />);
      await waitFor(() => expect(screen.getByText('Karşı Ürün')).toBeOnTheScreen());
      fireEvent.press(screen.getByText('Karşı Ürün'));
      fireEvent.press(screen.getByText('Karşı Teklif Gönder'));
      expect((await sentBody()).cashAmount).toBeUndefined();
    });

    it('the current amount typed with a comma is the same offer, not a new one', async () => {
      // Trade: 12.50 that I (the initiator) pay. Typing 12,50 again changes nothing.
      mountWithProducts(tradeWithItems({ cashAmount: 12.5, cashPayerId: 'user-initiator' }));
      renderWithProviders(<TradeCounterScreen />);
      await waitFor(() => expect(screen.getByDisplayValue('12.5')).toBeOnTheScreen());
      fireEvent.changeText(cashInput(), '12,50');
      fireEvent.press(screen.getByText('Karşı Teklif Gönder'));
      await waitFor(() => expect(appAlert).toHaveBeenCalled());
      expect(counterMock).not.toHaveBeenCalled();
    });

    it('flipping the payer with no amount is the same offer (no payer is sent)', async () => {
      mountWithProducts(tradeWithItems());
      renderWithProviders(<TradeCounterScreen />);
      await waitFor(() => expect(screen.getByText('Karşı Ürün')).toBeOnTheScreen());
      fireEvent.press(screen.getByText('Karşı taraf ödeyecek'));
      fireEvent.press(screen.getByText('Karşı Teklif Gönder'));
      await waitFor(() => expect(appAlert).toHaveBeenCalled());
      expect(counterMock).not.toHaveBeenCalled();
    });
  });

  it('J6.5 both pickers show loading, not the empty state, until their lists settle', async () => {
    getOneMock.mockResolvedValue({ data: { data: tradeFixture() } });
    const pending: Array<(v: unknown) => void> = [];
    getMyMock.mockImplementation(() => new Promise((r) => pending.push(r)));
    getAllMock.mockImplementation(() => new Promise((r) => pending.push(r)));
    renderWithProviders(<TradeCounterScreen />);

    await waitFor(() => expect(pending).toHaveLength(2));
    // Their fetch starts in the commit that loads the trade; the editor shows one render later.
    await waitFor(() => expect(screen.getByText('Vereceğim Ürünler')).toBeOnTheScreen());
    expect(screen.getAllByTestId('loading-indicator').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('Takasa uygun ürün bulunamadı.')).toBeNull();

    pending.forEach((resolve) => resolve({ data: { data: [] } }));
    await waitFor(() => expect(screen.getAllByText('Takasa uygun ürün bulunamadı.')).toHaveLength(2));
  });
});

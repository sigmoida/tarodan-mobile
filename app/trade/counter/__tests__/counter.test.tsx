/**
 * J6 · Trade counter-offer form, the mobile UI slice: the cash difference (amount + payer
 * chips), the message field, the summary, the send button enable/disable (item selection), the
 * counter mutation (`tradesApi.counter`) and its payload, and the loading state. Trade roles and
 * escrow are backend-only.
 */
import React from 'react';
import { TextInput } from 'react-native';
import { appAlert, toast } from '@/ui';
import { act, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import trCatalog from '@/i18n/lib/catalog/tr.json';
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

// The gate is not under test here (see legal-identity-gate.test): it passes.
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

const CASH_HELPER = trCatalog.trade.cashHelper;
const CASH_REFUSED = trCatalog.validation.amountFormatRefused;

/** The cash field: the only numeric input on the screen. */
function cashInput() {
  const numericInputs = screen
    .UNSAFE_getAllByType(TextInput)
    .filter((n) => n.props.keyboardType === 'numeric');
  expect(numericInputs).toHaveLength(1);
  return numericInputs[0];
}

/**
 * A trade as its receiver sees it (only the receiver may counter, API `counter`): the items are
 * already picked on both sides; mine are the receiver items, theirs the initiator items.
 */
const RECEIVER = { id: 'user-other' };
const tradeForReceiver = (overrides: Record<string, unknown> = {}) =>
  tradeFixture({
    initiatorItems: [{ id: 'ti-1', productId: 'prod-theirs', productTitle: 'Karşı Ürün', valueAtTrade: 300, quantity: 1 }],
    receiverItems: [{ id: 'ti-2', productId: 'prod-mine', productTitle: 'Benim Ürünüm', valueAtTrade: 200, quantity: 1 }],
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

  it('J6.4 the cash field only takes what can be sent: one separator, two decimals', async () => {
    mountWithProducts();
    renderWithProviders(<TradeCounterScreen />);
    await waitFor(() => expect(screen.getByText('Nakit fark')).toBeOnTheScreen());
    const input = cashInput();
    fireEvent.changeText(input, '12a3.5x');
    expect(screen.getByDisplayValue('123.5')).toBeOnTheScreen();
    // A Turkish keyboard types a decimal comma: it stays (it used to be dropped, 12,50 -> 1250).
    fireEvent.changeText(input, '12,50');
    expect(screen.getByDisplayValue('12,50')).toBeOnTheScreen();
    // A third decimal or a second separator (thousands grouping) is refused, not sent silently
    // rounded or dropped.
    fireEvent.changeText(input, '12,505');
    expect(screen.getByDisplayValue('12,50')).toBeOnTheScreen();
    fireEvent.changeText(input, '1.250,50');
    expect(screen.getByDisplayValue('12,50')).toBeOnTheScreen();
  });

  it('J6.4b the cash field shows its helper, shows a refused paste in its place and clears it on the next accepted change', async () => {
    mountWithProducts();
    renderWithProviders(<TradeCounterScreen />);
    await waitFor(() => expect(screen.getByText('Nakit fark')).toBeOnTheScreen());
    expect(screen.getByText(CASH_HELPER)).toBeOnTheScreen();
    expect(screen.queryByText(CASH_REFUSED)).toBeNull();

    const input = cashInput();
    fireEvent.changeText(input, '12,50');
    fireEvent.changeText(input, '1.250,50');
    expect(screen.getByText(CASH_REFUSED)).toBeOnTheScreen();
    expect(screen.getByDisplayValue('12,50')).toBeOnTheScreen();
    // As on web, the refusal takes the helper's place while it shows.
    expect(screen.queryByText(CASH_HELPER)).toBeNull();

    fireEvent.changeText(input, '12,5');
    expect(screen.queryByText(CASH_REFUSED)).toBeNull();
    expect(screen.getByDisplayValue('12,5')).toBeOnTheScreen();
  });

  describe('J6.6 cash difference in the submitted payload (web parity), as the receiver', () => {
    beforeEach(() => {
      mockUser = RECEIVER;
    });

    /** Opens the counter with both items picked, types the cash, optionally flips the payer, sends. */
    async function submitWithCash(text: string, payer?: 'Ben ödeyeceğim' | 'Karşı taraf ödeyecek') {
      mountWithProducts(tradeForReceiver());
      counterMock.mockResolvedValue({ data: {} });
      renderWithProviders(<TradeCounterScreen />);
      await waitFor(() => {
        expect(screen.getByText('Benim Ürünüm')).toBeOnTheScreen();
        expect(screen.getByText('Karşı Ürün')).toBeOnTheScreen();
      });
      // Both of the trade's own items are preselected; a change in the cash terms is the new offer.
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
      ['12,5', 12.5],
      ['1250', 1250],
    ])('%p that I pay is sent as %p (positive: the counterer pays)', async (text, amount) => {
      await submitWithCash(text);
      const body = await sentBody();
      expect(body).toEqual({
        // Model B: what I give becomes initiatorItems.
        initiatorItems: [{ productId: 'prod-mine', quantity: 1 }],
        receiverItems: [{ productId: 'prod-theirs', quantity: 1 }],
        cashAmount: amount,
        message: undefined,
      });
      // The summary shows the same amount that is sent.
      expect(screen.getByText('Ödeyeceğim nakit')).toBeOnTheScreen();
      expect(screen.getByText(formatPrice(amount))).toBeOnTheScreen();
    });

    it('"1.000" typed key by key (one thousand) is not sent as 1 TL: send is blocked until an accepted change', async () => {
      const errorToast = jest.spyOn(toast, 'error').mockImplementation(() => 1);
      mountWithProducts(tradeForReceiver());
      counterMock.mockResolvedValue({ data: {} });
      renderWithProviders(<TradeCounterScreen />);
      await waitFor(() => expect(screen.getByText('Karşı Ürün')).toBeOnTheScreen());
      for (const typed of ['1', '1.', '1.0', '1.00', '1.000']) fireEvent.changeText(cashInput(), typed);
      expect(screen.getByDisplayValue('1.00')).toBeOnTheScreen();
      expect(screen.getByText(CASH_REFUSED)).toBeOnTheScreen();

      fireEvent.press(screen.getByText('Karşı Teklif Gönder'));
      expect(errorToast).toHaveBeenCalledWith(CASH_REFUSED);
      // The refusal is still on screen, and nothing was sent.
      expect(screen.getByText(CASH_REFUSED)).toBeOnTheScreen();
      await act(() => Promise.resolve());
      expect(counterMock).not.toHaveBeenCalled();

      // An accepted change clears the refusal and sends that amount.
      fireEvent.changeText(cashInput(), '1000');
      expect(screen.queryByText(CASH_REFUSED)).toBeNull();
      fireEvent.press(screen.getByText('Karşı Teklif Gönder'));
      expect((await sentBody()).cashAmount).toBe(1000);
      errorToast.mockRestore();
    });

    it('another trade opening here starts from its own cash terms: no amount, payer or refusal left over', async () => {
      const first = tradeForReceiver({ id: 'trade-1', cashAmount: 12.5, cashPayerId: 'user-initiator' });
      // No cash in the second trade: before this fix its prefill kept the first trade's amount.
      const second = tradeForReceiver({ id: 'trade-2', cashAmount: 0, cashPayerId: null });
      mountWithProducts(first);
      getOneMock.mockImplementation((id: string) =>
        Promise.resolve({ data: { data: id === 'trade-2' ? second : first } }));
      counterMock.mockResolvedValue({ data: {} });
      const view = renderWithProviders(<TradeCounterScreen />);
      await waitFor(() => expect(screen.getByDisplayValue('12,50')).toBeOnTheScreen());
      fireEvent.changeText(cashInput(), '1.250,50');
      expect(screen.getByText(CASH_REFUSED)).toBeOnTheScreen();

      mockParams = { id: 'trade-2' };
      view.rerender(<TradeCounterScreen />);
      await waitFor(() => expect(getOneMock).toHaveBeenCalledWith('trade-2'));
      await waitFor(() => expect(cashInput().props.value).toBe(''));
      expect(screen.queryByText(CASH_REFUSED)).toBeNull();
      expect(screen.getByText(CASH_HELPER)).toBeOnTheScreen();

      // The payer is back to "I pay" (the first trade had "they pay"): 5 goes out positive.
      fireEvent.changeText(cashInput(), '5');
      fireEvent.press(screen.getByText('Karşı Teklif Gönder'));
      expect((await sentBody()).cashAmount).toBe(5);
      expect(counterMock.mock.calls[0][0]).toBe('trade-2');
    });

    it('a decimal comma that they pay is sent negative', async () => {
      await submitWithCash('12,50', 'Karşı taraf ödeyecek');
      expect((await sentBody()).cashAmount).toBe(-12.5);
    });

    it.each([[''], ['0'], ['0,00']])(
      '%p sends no cashAmount (never 0 or -0), as on web',
      async (text) => {
        // Change the items so the offer differs without cash: their item unpicked at first.
        mountWithProducts(tradeForReceiver({ initiatorItems: [] }));
        counterMock.mockResolvedValue({ data: {} });
        renderWithProviders(<TradeCounterScreen />);
        await waitFor(() => expect(screen.getByText('Karşı Ürün')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Karşı Ürün'));
        fireEvent.changeText(cashInput(), text);
        fireEvent.press(screen.getByText('Karşı taraf ödeyecek'));
        fireEvent.press(screen.getByText('Karşı Teklif Gönder'));
        const body = await sentBody();
        expect('cashAmount' in body ? body.cashAmount : undefined).toBeUndefined();
        expect(Object.is(body.cashAmount, -0)).toBe(false);
      },
    );

    it.each([
      // I (the receiver) pay 12.50: prefilled as "I pay".
      ['user-other'],
      // They (the initiator) pay 12.50: prefilled as "they pay".
      ['user-initiator'],
    ])('the current amount (payer %p) retyped another way is the same offer', async (payerId) => {
      mountWithProducts(tradeForReceiver({ cashAmount: 12.5, cashPayerId: payerId }));
      renderWithProviders(<TradeCounterScreen />);
      // Prefilled with a decimal comma, as the keyboard types it.
      await waitFor(() => expect(screen.getByDisplayValue('12,50')).toBeOnTheScreen());
      fireEvent.changeText(cashInput(), '12.5');
      fireEvent.press(screen.getByText('Karşı Teklif Gönder'));
      await waitFor(() => expect(appAlert).toHaveBeenCalled());
      expect(counterMock).not.toHaveBeenCalled();
    });

    it('the prefilled payer is mine when I pay: the same amount they pay is a new offer', async () => {
      mountWithProducts(tradeForReceiver({ cashAmount: 12.5, cashPayerId: 'user-other' }));
      counterMock.mockResolvedValue({ data: {} });
      renderWithProviders(<TradeCounterScreen />);
      await waitFor(() => expect(screen.getByDisplayValue('12,50')).toBeOnTheScreen());
      fireEvent.press(screen.getByText('Karşı taraf ödeyecek'));
      fireEvent.press(screen.getByText('Karşı Teklif Gönder'));
      // Negative: the original initiator pays (API `counter`, cashAmount < 0).
      expect((await sentBody()).cashAmount).toBe(-12.5);
    });

    it('the prefilled payer is theirs when they pay: switching to me sends it positive', async () => {
      mountWithProducts(tradeForReceiver({ cashAmount: 12.5, cashPayerId: 'user-initiator' }));
      counterMock.mockResolvedValue({ data: {} });
      renderWithProviders(<TradeCounterScreen />);
      await waitFor(() => expect(screen.getByDisplayValue('12,50')).toBeOnTheScreen());
      fireEvent.press(screen.getByText('Ben ödeyeceğim'));
      fireEvent.press(screen.getByText('Karşı Teklif Gönder'));
      expect((await sentBody()).cashAmount).toBe(12.5);
    });

    it.each([
      // [amount in the trade, payer, field text, sent cashAmount]
      [12.5, 'user-initiator', '12,50', -12.5],
      [12.5, 'user-other', '12,50', 12.5],
      [1250, 'user-other', '1250', 1250],
      [0.29, 'user-initiator', '0,29', -0.29],
    ])(
      'an untouched prefilled amount (%p, payer %p) goes back unchanged when only the items change',
      async (amount, payerId, text, sent) => {
        // Their item unpicked at first, so picking it is the change; the cash terms stay as they were.
        mountWithProducts(tradeForReceiver({ cashAmount: amount, cashPayerId: payerId, initiatorItems: [] }));
        counterMock.mockResolvedValue({ data: {} });
        renderWithProviders(<TradeCounterScreen />);
        await waitFor(() => expect(screen.getByDisplayValue(text)).toBeOnTheScreen());
        await waitFor(() => expect(screen.getByText('Karşı Ürün')).toBeOnTheScreen());
        fireEvent.press(screen.getByText('Karşı Ürün'));
        fireEvent.press(screen.getByText('Karşı Teklif Gönder'));
        expect((await sentBody()).cashAmount).toBe(sent);
      },
    );

    it('flipping the payer with no amount is the same offer (no payer is sent)', async () => {
      mountWithProducts(tradeForReceiver());
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

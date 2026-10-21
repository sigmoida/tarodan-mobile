/**
 * The new-trade wizard as a whole screen (critical path 12): the real `useNewTrade` controller,
 * the real steps and footer. A cash amount the field refused ("1.000" typed key by key as one
 * thousand stops at "1.00") keeps the wizard on step 2 with the refusal in the field, so 1 TL is
 * never sent for one thousand; an accepted change opens the review and that amount is sent.
 * The controller rules alone are pinned in `new-trade-cash.test`, the field in
 * `NewTradeCashInput.test`.
 */
import React from 'react';
import { TextInput } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { toast } from '@/ui';
import trCatalog from '@/i18n/lib/catalog/tr.json';
import { formatPrice } from '@/utils/format';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  ...jest.requireActual('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => mockParams,
}));

// What the loaded screen shows is under test, not the skeleton timing.
jest.mock('@/ui/loading/useDelayedLoading', () => jest.requireActual('@/test-utils/loading').immediateLoadingMock);

jest.mock('@/hooks/useFeatureAccess', () => ({
  useFeatureAccess: () => ({ canTrade: true }),
}));

// The identity gate is not under test here (see legal-identity-gate.test): it passes.
jest.mock('@/hooks/useLegalIdentity', () =>
  jest.requireActual('@/test-utils/legalIdentity').legalIdentityGatePassMock);

jest.mock('@/lib/api', () => ({
  tradesApi: {
    create: jest.fn(() => Promise.resolve({ data: { id: 'trade-1' } })),
    previewPaymentQuote: jest.fn(() => Promise.resolve({ data: {} })),
  },
  productsApi: {
    getOne: jest.fn(() => Promise.resolve({ data: {} })),
    getMyListings: jest.fn(),
    getAll: jest.fn(),
  },
  addressesApi: {
    getAll: jest.fn(() =>
      Promise.resolve({
        data: [{ id: 'addr-1', fullName: 'Ali', phone: '5550000000', city: 'Ankara', district: 'Cankaya', address: 'Demo 1', isDefault: true }],
      })),
  },
}));

import { productsApi, tradesApi } from '@/lib/api';
import { useAuthStore, type User } from '@/stores/authStore';
import NewTradeScreen from '../index';

const CASH_HELPER = trCatalog.trade.cashHelper;
const CASH_REFUSED = trCatalog.trade.cashFormatRefused;
const REVIEW_TITLE = trCatalog.trade.productsYouOffer;
const createMock = tradesApi.create as jest.Mock;

function cashInput() {
  const inputs = screen.UNSAFE_getAllByType(TextInput).filter((n) => n.props.keyboardType === 'numeric');
  expect(inputs).toHaveLength(1);
  return inputs[0]!;
}

/** Opens the wizard, picks one item on each side and lands on step 2 (the cash field). */
async function openOnStep2() {
  renderWithProviders(<NewTradeScreen />);
  fireEvent.press(await screen.findByText('Mine'));
  fireEvent.press(screen.getByTestId('new-trade-step1-continue'));
  fireEvent.press(await screen.findByText('Theirs'));
  expect(screen.getByText(CASH_HELPER)).toBeOnTheScreen();
}

let errorToast: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  errorToast = jest.spyOn(toast, 'error').mockImplementation(() => 1);
  useAuthStore.setState({ isAuthenticated: true, isLoading: false, user: { id: 'u1' } as User });
  mockParams = { targetSellerId: 'seller-1' };
  (productsApi.getMyListings as jest.Mock).mockResolvedValue({
    data: { data: [{ id: 'mine-1', title: 'Mine', price: 100, status: 'active' }] },
  });
  (productsApi.getAll as jest.Mock).mockResolvedValue({
    data: { data: [{ id: 'theirs-1', title: 'Theirs', price: 120, status: 'active' }] },
  });
});

afterEach(() => {
  errorToast.mockRestore();
  useAuthStore.setState({ isAuthenticated: false, user: null });
});

describe('new-trade wizard screen · a refused cash amount (web parity)', () => {
  it('"1.000" typed key by key stays on step 2 with the refusal shown; an accepted change reviews and sends it', async () => {
    await openOnStep2();
    for (const typed of ['1', '1.', '1.0', '1.00', '1.000']) fireEvent.changeText(cashInput(), typed);
    expect(screen.getByDisplayValue('1.00')).toBeOnTheScreen();
    expect(screen.getByText(CASH_REFUSED)).toBeOnTheScreen();
    expect(screen.queryByText(CASH_HELPER)).toBeNull();

    // "Continue" is refused with the same copy: still step 2, no review, nothing sent.
    fireEvent.press(screen.getByTestId('new-trade-step2-continue'));
    expect(errorToast).toHaveBeenCalledTimes(1);
    expect(errorToast).toHaveBeenCalledWith(CASH_REFUSED);
    expect(screen.queryByText(REVIEW_TITLE)).toBeNull();
    expect(screen.queryByTestId('new-trade-submit')).toBeNull();
    expect(screen.getByText(CASH_REFUSED)).toBeOnTheScreen();

    // Back to step 1 and forward again: the refusal is kept, so "Continue" still refuses.
    fireEvent.press(screen.getByText(trCatalog.common.back));
    fireEvent.press(screen.getByTestId('new-trade-step1-continue'));
    expect(screen.getByDisplayValue('1.00')).toBeOnTheScreen();
    expect(screen.getByText(CASH_REFUSED)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('new-trade-step2-continue'));
    expect(errorToast).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(REVIEW_TITLE)).toBeNull();

    // An accepted change clears the refusal; the review shows and sends that amount.
    fireEvent.changeText(cashInput(), '1000');
    expect(screen.queryByText(CASH_REFUSED)).toBeNull();
    expect(screen.getByText(CASH_HELPER)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('new-trade-step2-continue'));
    expect(await screen.findByText(REVIEW_TITLE)).toBeOnTheScreen();
    expect(screen.getByText(trCatalog.trade.youWillPayLabel)).toBeOnTheScreen();
    expect(screen.getByText(formatPrice(1000))).toBeOnTheScreen();
    // The default address is picked before sending.
    await screen.findByText('Demo 1');
    await act(async () => {
      fireEvent.press(screen.getByTestId('new-trade-submit'));
    });
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock.mock.calls[0][0]).toEqual({
      receiverId: 'seller-1',
      initiatorItems: [{ productId: 'mine-1', quantity: 1 }],
      receiverItems: [{ productId: 'theirs-1', quantity: 1 }],
      cashAmount: 1000,
      message: undefined,
      shippingAddressId: 'addr-1',
    });
    expect(errorToast).toHaveBeenCalledTimes(2);
  });

  it('a refused paste keeps the previous amount: the review and the payload use that amount, signed by the payer', async () => {
    await openOnStep2();
    fireEvent.press(screen.getByText(trCatalog.trade.theyWillPay));
    fireEvent.changeText(cashInput(), '12,50');
    fireEvent.changeText(cashInput(), '1.250,50');
    expect(screen.getByText(CASH_REFUSED)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('new-trade-step2-continue'));
    expect(screen.queryByText(REVIEW_TITLE)).toBeNull();

    // Deleting a key is an accepted change: the review opens with 12,5.
    fireEvent.changeText(cashInput(), '12,5');
    fireEvent.press(screen.getByTestId('new-trade-step2-continue'));
    expect(await screen.findByText(REVIEW_TITLE)).toBeOnTheScreen();
    expect(screen.getByText(formatPrice(12.5))).toBeOnTheScreen();
    await screen.findByText('Demo 1');
    await act(async () => {
      fireEvent.press(screen.getByTestId('new-trade-submit'));
    });
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    // They pay: negative, as before this change (`signedCashAmount`).
    expect(createMock.mock.calls[0][0].cashAmount).toBe(-12.5);
  });
});

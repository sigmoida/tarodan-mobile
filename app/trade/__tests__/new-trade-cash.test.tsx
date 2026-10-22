/**
 * The cash difference in the new-trade payload (`useNewTrade`): read with the shared
 * `parseCashAmount` (same as the counter offer and web), so a decimal comma is a decimal and an
 * amount that is not a number sends no `cashAmount` at all.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeTestQueryClient } from '@/test-utils';
import { toast } from '@/ui';
import trCatalog from '@/i18n/lib/catalog/tr.json';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  ...jest.requireActual('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => mockParams,
}));

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
}));

import { productsApi, tradesApi } from '@/lib/api';
import { useAuthStore, type User } from '@/stores/authStore';
import { useNewTrade } from '../new/_hooks/useNewTrade';

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={makeTestQueryClient()}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
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
  useAuthStore.setState({ isAuthenticated: false, user: null });
});

/** The wizard with one item picked on each side and an address, ready to send. */
async function openReady() {
  const hook = renderHook(() => useNewTrade(), { wrapper });
  await waitFor(() => expect(hook.result.current.myProducts).toHaveLength(1));
  await waitFor(() => expect(hook.result.current.theirProducts).toHaveLength(1));
  act(() => {
    hook.result.current.toggleMyItem(hook.result.current.myProducts[0]!);
    hook.result.current.toggleTheirItem(hook.result.current.theirProducts[0]!);
    hook.result.current.setTradeAddressId('addr-1');
  });
  return hook;
}

async function submitWithCash(text: string, direction: 'offer' | 'request' = 'offer') {
  const hook = await openReady();
  act(() => {
    hook.result.current.changeCashText(text);
    hook.result.current.setCashDirection(direction);
  });
  await act(async () => {
    await hook.result.current.handleSubmit();
  });
  await waitFor(() => expect(tradesApi.create).toHaveBeenCalledTimes(1));
  return { hook, body: (tradesApi.create as jest.Mock).mock.calls[0][0] };
}

describe('new trade · cash difference in the payload', () => {
  it('a decimal comma is a decimal: 12,50 that I pay is sent as 12.5', async () => {
    const { hook, body } = await submitWithCash('12,50');
    expect(body).toEqual({
      receiverId: 'seller-1',
      initiatorItems: [{ productId: 'mine-1', quantity: 1 }],
      receiverItems: [{ productId: 'theirs-1', quantity: 1 }],
      cashAmount: 12.5,
      message: undefined,
      shippingAddressId: 'addr-1',
    });
    // The cost preview is priced with the same amount.
    expect(hook.result.current.cashValue).toBe(12.5);
    await waitFor(() =>
      expect(tradesApi.previewPaymentQuote).toHaveBeenLastCalledWith(
        expect.objectContaining({ cashAmount: 12.5, cashPayer: 'initiator' }),
      ),
    );
  });

  it('they pay: sent negative', async () => {
    const { body } = await submitWithCash('12,50', 'request');
    expect(body.cashAmount).toBe(-12.5);
  });

  it.each([[''], ['0'], ['0,00']])('%p sends no cashAmount, as on web', async (text) => {
    const { body } = await submitWithCash(text, 'request');
    expect(body.cashAmount).toBeUndefined();
  });
});

describe('new trade · a refused cash amount blocks the wizard (web parity)', () => {
  let errorToast: jest.SpyInstance;
  beforeEach(() => {
    errorToast = jest.spyOn(toast, 'error').mockImplementation(() => 1);
  });
  afterEach(() => errorToast.mockRestore());

  it('"1.000" typed key by key (one thousand) is not sent as 1 TL, until an accepted change', async () => {
    const hook = await openReady();
    act(() => hook.result.current.setStep(2));
    for (const typed of ['1', '1.', '1.0', '1.00', '1.000']) {
      act(() => hook.result.current.changeCashText(typed));
    }
    expect(hook.result.current.cashAmount).toBe('1.00');
    expect(hook.result.current.cashRefused).toBe(true);

    // Step 2 does not go on to the review, and sending is refused too.
    act(() => hook.result.current.goToReview());
    expect(hook.result.current.step).toBe(2);
    await act(async () => {
      await hook.result.current.handleSubmit();
    });
    expect(errorToast).toHaveBeenCalledTimes(2);
    expect(errorToast).toHaveBeenCalledWith(trCatalog.validation.amountFormatRefused);
    expect(tradesApi.create).not.toHaveBeenCalled();
    expect(hook.result.current.cashRefused).toBe(true);

    // An accepted change clears the refusal: the review opens and that amount is sent.
    act(() => hook.result.current.changeCashText('1000'));
    expect(hook.result.current.cashRefused).toBe(false);
    act(() => hook.result.current.goToReview());
    expect(hook.result.current.step).toBe(3);
    await act(async () => {
      await hook.result.current.handleSubmit();
    });
    await waitFor(() => expect(tradesApi.create).toHaveBeenCalledTimes(1));
    expect((tradesApi.create as jest.Mock).mock.calls[0][0].cashAmount).toBe(1000);
  });

  it("an amount above the API's ceiling blocks the wizard with the ceiling copy, and is not priced", async () => {
    const hook = await openReady();
    act(() => hook.result.current.setStep(2));
    act(() => hook.result.current.changeCashText('10000000'));
    expect(hook.result.current.cashAmount).toBe('10000000');
    expect(hook.result.current.cashIssue).toBe('aboveMax');
    expect(hook.result.current.cashValue).toBe(0);

    act(() => hook.result.current.goToReview());
    expect(hook.result.current.step).toBe(2);
    await act(async () => {
      await hook.result.current.handleSubmit();
    });
    expect(errorToast).toHaveBeenCalledWith("Tutar 9.999.999 TL'yi aşamaz.");
    expect(tradesApi.create).not.toHaveBeenCalled();
    expect(tradesApi.previewPaymentQuote).not.toHaveBeenCalledWith(
      expect.objectContaining({ cashAmount: 10000000 }),
    );

    // The ceiling itself goes out.
    act(() => hook.result.current.changeCashText('9999999'));
    expect(hook.result.current.cashIssue).toBeNull();
    act(() => hook.result.current.goToReview());
    expect(hook.result.current.step).toBe(3);
    await act(async () => {
      await hook.result.current.handleSubmit();
    });
    await waitFor(() => expect(tradesApi.create).toHaveBeenCalledTimes(1));
    expect((tradesApi.create as jest.Mock).mock.calls[0][0].cashAmount).toBe(9999999);
  });

  it.each([['1.005'], ['1.250,50']])('a pasted %p is refused, keeps the previous amount and blocks sending', async (typed) => {
    const hook = await openReady();
    act(() => hook.result.current.changeCashText('12,50'));
    act(() => hook.result.current.changeCashText(typed));
    expect(hook.result.current.cashAmount).toBe('12,50');
    expect(hook.result.current.cashRefused).toBe(true);
    await act(async () => {
      await hook.result.current.handleSubmit();
    });
    expect(tradesApi.create).not.toHaveBeenCalled();
  });
});

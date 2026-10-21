/**
 * Trade picker freshness (B1): a listing created, edited or approved while the app runs shows
 * in the new-trade and counter-offer pickers (both sides) without a restart. The query client
 * below uses the app's 5 min `staleTime`, so only the picker's own `staleTime: 0` +
 * `refetchOnMount` (and the refetch on screen focus) can make the cached list refetch.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { qk } from '@/lib/query';

let mockParams: Record<string, string> = {};
/** Focus callbacks of the mounted screens; `refocus()` simulates coming back to the screen. */
let mockFocusCallbacks: Array<() => void> = [];
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    ...require('@/test-utils/router-mock').routerMock,
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (cb: () => void) => {
      useEffect(() => {
        mockFocusCallbacks.push(cb);
        cb();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
    },
  };
});
const refocus = () => mockFocusCallbacks.forEach((cb) => cb());

jest.mock('@/hooks/useFeatureAccess', () => ({
  useFeatureAccess: () => ({ canTrade: true }),
}));

jest.mock('@/lib/api', () => ({
  legalIdentityApi: { getStatus: jest.fn(), submit: jest.fn() },
  tradesApi: {
    create: jest.fn(),
    getOne: jest.fn(() => Promise.resolve({ data: null })),
    previewPaymentQuote: jest.fn(() => Promise.resolve({ data: {} })),
  },
  productsApi: {
    getOne: jest.fn(() => Promise.resolve({ data: {} })),
    getMyListings: jest.fn(),
    getAll: jest.fn(() => Promise.resolve({ data: [] })),
  },
}));

import { productsApi, tradesApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useNewTrade } from '../new/_hooks/useNewTrade';
import { useTradeCounter } from '../counter/[id]/_hooks/useTradeCounter';
import { isPickerLoading } from '../_lib/picker';

const mockedMy = productsApi.getMyListings as jest.Mock;
const mockedAll = productsApi.getAll as jest.Mock;

const listing = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  title: `Car ${id}`,
  price: 100,
  status: 'active',
  isTradeEnabled: true,
  ...over,
});

/** App-like defaults: a 5 min staleTime would hide a changed list on reopen. */
function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, networkMode: 'always', staleTime: 5 * 60 * 1000 },
      mutations: { retry: false, networkMode: 'always' },
    },
  });
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockFocusCallbacks = [];
  mockedMy.mockResolvedValue({ data: { data: [] } });
  mockedAll.mockResolvedValue({ data: { data: [] } });
  useAuthStore.setState({ isAuthenticated: true, isLoading: false, user: { id: 'u1' } as never });
});

afterEach(() => {
  useAuthStore.setState({ isAuthenticated: false, user: null });
});

describe('isPickerLoading', () => {
  it('first load, or a refetch of an empty list, is loading; a non-empty list or a settled empty list is not', () => {
    expect(isPickerLoading({ isLoading: true, isFetching: true })).toBe(true);
    expect(isPickerLoading({ isLoading: false, isFetching: true, data: [] })).toBe(true);
    expect(isPickerLoading({ isLoading: false, isFetching: true, data: [1] })).toBe(false);
    expect(isPickerLoading({ isLoading: false, isFetching: false, data: [] })).toBe(false);
  });
});

describe('new-trade picker', () => {
  it('refetches on open although the cached (empty) list is fresh, and shows loading, not empty, meanwhile', async () => {
    const client = makeClient();
    client.setQueryData(qk.trades.myTradeable('u1', undefined), []);
    let resolve!: (v: unknown) => void;
    mockedMy.mockReturnValueOnce(new Promise((r) => (resolve = r)));

    const { result } = renderHook(() => useNewTrade(), { wrapper: wrapperFor(client) });

    // Cached empty list + a refetch in flight: loading, never the empty state.
    expect(result.current.myProducts).toEqual([]);
    expect(result.current.loadingMyProducts).toBe(true);

    await act(async () => resolve({ data: { data: [listing('new-1')] } }));
    await waitFor(() => expect(result.current.myProducts?.map((p: { id: string }) => p.id)).toEqual(['new-1']));
    expect(result.current.loadingMyProducts).toBe(false);
    expect(mockedMy).toHaveBeenCalledTimes(1);
  });

  it('the empty state is reachable only after the fetch returns empty', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useNewTrade(), { wrapper: wrapperFor(client) });
    expect(result.current.loadingMyProducts).toBe(true);
    await waitFor(() => expect(result.current.loadingMyProducts).toBe(false));
    expect(result.current.myProducts).toEqual([]);
  });

  it('without a listing id (targetSellerId entry) the eligible listings still show', async () => {
    mockParams = { targetSellerId: 'seller-1' };
    mockedMy.mockResolvedValue({ data: { data: [listing('a'), listing('b', { isTradeEnabled: false })] } });
    const { result } = renderHook(() => useNewTrade(), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.myProducts?.map((p: { id: string }) => p.id)).toEqual(['a']));
  });

  it('with a target listing id that listing is excluded', async () => {
    mockParams = { listing: 'a' };
    mockedMy.mockResolvedValue({ data: { data: [listing('a'), listing('b')] } });
    const { result } = renderHook(() => useNewTrade(), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.myProducts?.map((p: { id: string }) => p.id)).toEqual(['b']));
  });
});

describe('picker refetch on screen focus', () => {
  it('new trade: coming back to the mounted screen refetches my listings (approval with no client mutation)', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useNewTrade(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.loadingMyProducts).toBe(false));
    expect(result.current.myProducts).toEqual([]);
    expect(mockedMy).toHaveBeenCalledTimes(1);

    // The listing is approved server-side while the user is on another screen.
    mockedMy.mockResolvedValue({ data: { data: [listing('approved-1')] } });
    await act(async () => refocus());
    await waitFor(() => expect(result.current.myProducts?.map((p: { id: string }) => p.id)).toEqual(['approved-1']));
    expect(mockedMy).toHaveBeenCalledTimes(2);
  });

  it('counter offer: coming back to the mounted screen refetches my listings', async () => {
    mockParams = { id: 'trade-1' };
    const client = makeClient();
    const { result } = renderHook(() => useTradeCounter(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.loadingMyProducts).toBe(false));
    const callsBefore = mockedAll.mock.calls.length;

    mockedAll.mockResolvedValue({ data: { data: [listing('approved-2')] } });
    await act(async () => refocus());
    await waitFor(() => expect(result.current.myProducts.map((p: { id: string }) => p.id)).toEqual(['approved-2']));
    expect(mockedAll.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

describe('new-trade picker, seller side', () => {
  it('refetches the seller list on open, so a listing missing from the cache shows and is preselected', async () => {
    mockParams = { listing: 't1', targetSellerId: 'seller-1' };
    const client = makeClient();
    // Fresh cache from an earlier visit, taken before the target listing existed.
    client.setQueryData(qk.trades.sellerTradeable('seller-1'), [listing('old')]);
    mockedAll.mockResolvedValue({ data: { data: [listing('old'), listing('t1')] } });

    const { result } = renderHook(() => useNewTrade(), { wrapper: wrapperFor(client) });

    await waitFor(() => expect(result.current.theirProducts?.map((p: { id: string }) => p.id)).toEqual(['old', 't1']));
    await waitFor(() => expect(result.current.selectedTheirItems.map((p) => p.id)).toEqual(['t1']));
    expect(mockedAll).toHaveBeenCalledWith(expect.objectContaining({ sellerId: 'seller-1' }));
  });

  it('shows loading, not empty, while a cached empty seller list refetches', async () => {
    mockParams = { targetSellerId: 'seller-1' };
    const client = makeClient();
    client.setQueryData(qk.trades.sellerTradeable('seller-1'), []);
    let resolve!: (v: unknown) => void;
    mockedAll.mockReturnValueOnce(new Promise((r) => (resolve = r)));

    const { result } = renderHook(() => useNewTrade(), { wrapper: wrapperFor(client) });
    expect(result.current.loadingTheirProducts).toBe(true);

    await act(async () => resolve({ data: { data: [listing('s1')] } }));
    await waitFor(() => expect(result.current.loadingTheirProducts).toBe(false));
    expect(result.current.theirProducts?.map((p: { id: string }) => p.id)).toEqual(['s1']);
  });

  it('a later refetch with a changed list keeps the user\'s selection (the target is preselected once)', async () => {
    mockParams = { listing: 't1', targetSellerId: 'seller-1' };
    const client = makeClient();
    mockedAll.mockResolvedValue({ data: { data: [listing('t1'), listing('t2')] } });
    const { result } = renderHook(() => useNewTrade(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.selectedTheirItems.map((p) => p.id)).toEqual(['t1']));

    // The user swaps the target for another listing.
    const [t1, t2] = result.current.theirProducts!;
    act(() => result.current.toggleTheirItem(t1));
    act(() => result.current.toggleTheirItem(t2));
    expect(result.current.selectedTheirItems.map((p) => p.id)).toEqual(['t2']);

    // A foreground refetch brings a changed list (new reference): the selection stays.
    mockedAll.mockResolvedValue({ data: { data: [listing('t1', { price: 90 }), listing('t2')] } });
    await act(async () => {
      await client.refetchQueries({ queryKey: qk.trades.sellerTradeable('seller-1') });
    });
    await waitFor(() => expect(result.current.theirProducts?.[0]?.price).toBe(90));
    expect(result.current.selectedTheirItems.map((p) => p.id)).toEqual(['t2']);
  });
});

describe('counter-offer picker', () => {
  it('refetches my listings on open although the cached list is fresh, with loading instead of empty', async () => {
    mockParams = { id: 'trade-1' };
    const client = makeClient();
    client.setQueryData(qk.trades.myTradeableForCounter('u1'), []);
    let resolve!: (v: unknown) => void;
    mockedAll.mockReturnValueOnce(new Promise((r) => (resolve = r)));

    const { result } = renderHook(() => useTradeCounter(), { wrapper: wrapperFor(client) });

    expect(result.current.myProducts).toEqual([]);
    expect(result.current.loadingMyProducts).toBe(true);

    await act(async () => resolve({ data: { data: [listing('new-2')] } }));
    await waitFor(() => expect(result.current.myProducts.map((p: { id: string }) => p.id)).toEqual(['new-2']));
    expect(result.current.loadingMyProducts).toBe(false);
  });

  it('refetches the other party\'s listings on open too, with loading instead of empty', async () => {
    mockParams = { id: 'trade-1' };
    (tradesApi.getOne as jest.Mock).mockResolvedValueOnce({
      data: { id: 'trade-1', initiatorId: 'u1', receiverId: 'u2', initiatorItems: [], receiverItems: [] },
    });
    const client = makeClient();
    client.setQueryData(qk.trades.sellerTradeableForCounter('u2'), []);
    let resolve!: (v: unknown) => void;
    mockedAll.mockImplementation(({ sellerId }: { sellerId: string }) =>
      sellerId === 'u2' ? new Promise((r) => (resolve = r)) : Promise.resolve({ data: { data: [] } }),
    );

    const { result } = renderHook(() => useTradeCounter(), { wrapper: wrapperFor(client) });

    await waitFor(() => expect(mockedAll).toHaveBeenCalledWith(expect.objectContaining({ sellerId: 'u2' })));
    expect(result.current.theirProducts).toEqual([]);
    expect(result.current.loadingTheirProducts).toBe(true);

    await act(async () => resolve({ data: { data: [listing('theirs-1')] } }));
    await waitFor(() => expect(result.current.theirProducts.map((p: { id: string }) => p.id)).toEqual(['theirs-1']));
    expect(result.current.loadingTheirProducts).toBe(false);
  });
});

describe('isPickerLoading on a failed fetch', () => {
  it('settles after the error, so the spinner cannot stay forever', async () => {
    const client = makeClient();
    client.setQueryData(qk.trades.myTradeable('u1', undefined), []);
    mockedMy.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useNewTrade(), { wrapper: wrapperFor(client) });
    expect(result.current.loadingMyProducts).toBe(true);
    await waitFor(() => expect(result.current.loadingMyProducts).toBe(false));
  });
});

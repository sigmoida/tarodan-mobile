/**
 * Trade picker freshness (B1): a listing created, edited or approved while the app runs shows
 * in the new-trade and counter-offer pickers without a restart. The query client below uses
 * the app's 5 min `staleTime`, so only the picker's own `staleTime: 0` + `refetchOnMount`
 * can make the cached list refetch.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { qk } from '@/lib/query';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => mockParams,
}));

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

import { productsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useNewTrade } from '../_hooks/useNewTrade';
import { useTradeCounter } from '../../counter/[id]/_hooks/useTradeCounter';
import { isPickerLoading } from '../../_lib/picker';

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
});

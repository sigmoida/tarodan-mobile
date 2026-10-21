/**
 * New-trade pickers, paged (B6, mirrors web B5): server params, pages of 20 without duplicates,
 * "Show more", picks kept across pages (pruned only when every page is loaded; otherwise
 * pinned and sent), the exact submit payload, reloading every loaded page on open and focus,
 * a failed "Show more", the user in the keys and the listing invalidation.
 * Bodies are the measured envelope `{ data, meta: { total, page, limit, totalPages } }`.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { qk } from '@/lib/query';
import { invalidateListingCaches } from '@/components/listing/_lib/invalidate';

let mockParams: Record<string, string> = {};
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
jest.mock('@/hooks/useLegalIdentity', () => require('@/test-utils/legalIdentity').legalIdentityGatePassMock);

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
import { useAuthStore } from '@/stores/authStore';
import { useNewTrade } from '../new/_hooks/useNewTrade';

const mockedMy = productsApi.getMyListings as jest.Mock;
const mockedAll = productsApi.getAll as jest.Mock;
const mockedCreate = tradesApi.create as jest.Mock;
const mockedGetOne = productsApi.getOne as jest.Mock;

type Row = { id: string; title: string; price: number; status: string; isTradeEnabled: boolean };
const row = (id: string): Row => ({ id, title: `Car ${id}`, price: 100, status: 'active', isTradeEnabled: true });
const range = (prefix: string, from: number, to: number): Row[] =>
  Array.from({ length: to - from + 1 }, (_, i) => row(`${prefix}${from + i}`));
const body = (data: Row[], page: number, totalPages: number) => ({
  data: { data, meta: { total: data.length, page, limit: 20, totalPages } },
});
/** Serves `total` rows named `<prefix>1..total`, 20 per page, like the server. */
const server = (prefix: string, total: () => number) => (params: { page: number }) => {
  const all = range(prefix, 1, total());
  const totalPages = Math.max(1, Math.ceil(all.length / 20));
  const start = (params.page - 1) * 20;
  return Promise.resolve(body(all.slice(start, start + 20), params.page, totalPages));
};

const ids = (rows: Array<{ id: string }>) => rows.map((r) => r.id);

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, networkMode: 'always', staleTime: 5 * 60 * 1000 },
      mutations: { retry: false, networkMode: 'always' },
    },
  });
}
const wrapperFor = (client: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockFocusCallbacks = [];
  mockedMy.mockResolvedValue(body([], 1, 1));
  mockedAll.mockResolvedValue(body([], 1, 1));
  mockedGetOne.mockResolvedValue({ data: {} });
  useAuthStore.setState({ isAuthenticated: true, isLoading: false, user: { id: 'u1' } as never });
});

afterEach(() => {
  useAuthStore.setState({ isAuthenticated: false, user: null });
});

describe('new-trade my picker, server params', () => {
  it('sends the server filters and the page size, with no client eligibility filter', async () => {
    mockedMy.mockResolvedValue(body([row('a'), { ...row('b'), isTradeEnabled: false }], 1, 1));
    const { result } = renderHook(() => useNewTrade(), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(ids(result.current.myProducts)).toEqual(['a', 'b']));
    expect(mockedMy).toHaveBeenCalledWith({
      status: 'active',
      tradeEligible: true,
      tradeOnly: true,
      page: 1,
      limit: 20,
    });
  });

  it('their side: the public list of the seller, open to trade, newest first', async () => {
    mockParams = { targetSellerId: 'seller-1' };
    renderHook(() => useNewTrade(), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(mockedAll).toHaveBeenCalled());
    expect(mockedAll).toHaveBeenCalledWith({
      sellerId: 'seller-1',
      tradeOnly: true,
      status: 'active',
      sortBy: 'created_desc',
      page: 1,
      limit: 20,
    });
  });
});

describe('new-trade my picker, paging', () => {
  it('loads 20, then 20, then 5, and stops offering more', async () => {
    mockedMy.mockImplementation(server('m', () => 45));
    const { result } = renderHook(() => useNewTrade(), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.myProducts).toHaveLength(20));
    expect(result.current.myHasMore).toBe(true);

    await act(async () => result.current.loadMoreMine());
    await waitFor(() => expect(result.current.myProducts).toHaveLength(40));
    expect(result.current.myHasMore).toBe(true);

    await act(async () => result.current.loadMoreMine());
    await waitFor(() => expect(result.current.myProducts).toHaveLength(45));
    expect(result.current.myHasMore).toBe(false);
    expect(mockedMy.mock.calls.map(([p]) => p.page)).toEqual([1, 2, 3]);
  });

  it('keeps the target excluded on every page', async () => {
    mockParams = { listing: 'm3' };
    mockedMy.mockImplementation(server('m', () => 45));
    const { result } = renderHook(() => useNewTrade(), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.myProducts).toHaveLength(19));
    expect(ids(result.current.myProducts)).not.toContain('m3');
    await act(async () => result.current.loadMoreMine());
    await waitFor(() => expect(result.current.myProducts).toHaveLength(39));
    expect(ids(result.current.myProducts)).not.toContain('m3');
  });

  it('their side pages independently of my side', async () => {
    mockParams = { targetSellerId: 'seller-1' };
    mockedMy.mockImplementation(server('m', () => 5));
    mockedAll.mockImplementation(server('t', () => 25));
    const { result } = renderHook(() => useNewTrade(), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.theirProducts).toHaveLength(20));
    await waitFor(() => expect(result.current.myProducts).toHaveLength(5));
    expect(result.current.myHasMore).toBe(false);
    expect(result.current.theirHasMore).toBe(true);

    await act(async () => result.current.loadMoreTheirs());
    await waitFor(() => expect(result.current.theirProducts).toHaveLength(25));
    expect(result.current.theirHasMore).toBe(false);
    expect(result.current.myProducts).toHaveLength(5);
  });

  it('shows no duplicate when a refetch shifts a row across a page boundary', async () => {
    let shifted = false;
    mockedMy.mockImplementation((params: { page: number }) =>
      Promise.resolve(
        params.page === 1
          ? body(range('m', 1, 20), 1, 2)
          : body(shifted ? [row('m20'), ...range('m', 21, 24)] : range('m', 21, 25), 2, 2),
      ),
    );
    const { result } = renderHook(() => useNewTrade(), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.myProducts).toHaveLength(20));
    await act(async () => result.current.loadMoreMine());
    await waitFor(() => expect(result.current.myProducts).toHaveLength(25));

    shifted = true;
    await act(async () => refocus());
    await waitFor(() => expect(result.current.myProducts).toHaveLength(24));
    expect(new Set(ids(result.current.myProducts)).size).toBe(24);
  });

  it('an error on "Show more" keeps the list and the picks, and the button stays', async () => {
    mockedMy.mockImplementation((params: { page: number }) =>
      params.page === 1 ? Promise.resolve(body(range('m', 1, 20), 1, 2)) : Promise.reject(new Error('network')),
    );
    const { result } = renderHook(() => useNewTrade(), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.myProducts).toHaveLength(20));
    act(() => result.current.toggleMyItem(result.current.myProducts[0]!));

    await act(async () => result.current.loadMoreMine());
    await waitFor(() => expect(result.current.myLoadingMore).toBe(false));
    expect(result.current.myProducts).toHaveLength(20);
    expect(result.current.loadingMyProducts).toBe(false);
    expect(result.current.myHasMore).toBe(true);
    expect(ids(result.current.selectedMyItems)).toEqual(['m1']);
  });
});

describe('new-trade picks across pages', () => {
  it('keeps picks from different pages and sends the exact payload', async () => {
    mockParams = { targetSellerId: 'seller-1' };
    mockedMy.mockImplementation(server('m', () => 25));
    mockedAll.mockImplementation(server('t', () => 25));
    const { result } = renderHook(() => useNewTrade(), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.myProducts).toHaveLength(20));
    await waitFor(() => expect(result.current.theirProducts).toHaveLength(20));

    act(() => result.current.toggleMyItem(result.current.myProducts[0]!));
    await act(async () => result.current.loadMoreMine());
    await waitFor(() => expect(result.current.myProducts).toHaveLength(25));
    act(() => result.current.toggleMyItem(result.current.myProducts.find((p) => p.id === 'm23')!));
    act(() => result.current.toggleTheirItem(result.current.theirProducts[1]!));
    act(() => result.current.setTradeAddressId('addr-1'));
    expect(ids(result.current.selectedMyItems)).toEqual(['m1', 'm23']);

    await act(async () => {
      await result.current.handleSubmit();
    });
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate).toHaveBeenCalledWith({
      receiverId: 'seller-1',
      initiatorItems: [
        { productId: 'm1', quantity: 1 },
        { productId: 'm23', quantity: 1 },
      ],
      receiverItems: [{ productId: 't2', quantity: 1 }],
      cashAmount: undefined,
      message: undefined,
      shippingAddressId: 'addr-1',
    });
  });

  it('a pick that slid past the loaded pages stays checked, pinned at the top, and is sent', async () => {
    mockParams = { targetSellerId: 'seller-1' };
    mockedAll.mockImplementation(server('t', () => 1));
    let mine = range('m', 1, 45);
    mockedMy.mockImplementation((params: { page: number }) => {
      const start = (params.page - 1) * 20;
      return Promise.resolve(body(mine.slice(start, start + 20), params.page, Math.ceil(mine.length / 20)));
    });
    const { result } = renderHook(() => useNewTrade(), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.myProducts).toHaveLength(20));
    await waitFor(() => expect(result.current.theirProducts).toHaveLength(1));
    act(() => result.current.toggleMyItem(result.current.myProducts.find((p) => p.id === 'm20')!));
    act(() => result.current.toggleTheirItem(result.current.theirProducts[0]!));
    act(() => result.current.setTradeAddressId('addr-1'));

    // Twenty new rows are pushed in front: m20 now lives on page 2, which is not loaded.
    mine = [...range('n', 1, 20), ...mine];
    await act(async () => refocus());
    await waitFor(() => expect(result.current.myProducts.some((p) => p.id === 'n1')).toBe(true));
    expect(result.current.myHasMore).toBe(true);
    expect(ids(result.current.selectedMyItems)).toEqual(['m20']);
    expect(result.current.myProducts[0]!.id).toBe('m20');

    await act(async () => {
      await result.current.handleSubmit();
    });
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate.mock.calls[0][0].initiatorItems).toEqual([{ productId: 'm20', quantity: 1 }]);
  });

  it('a pick that is gone is pruned once every page is loaded, and never sent', async () => {
    mockParams = { targetSellerId: 'seller-1' };
    mockedAll.mockImplementation(server('t', () => 1));
    let mine = range('m', 1, 25);
    mockedMy.mockImplementation((params: { page: number }) => {
      const start = (params.page - 1) * 20;
      return Promise.resolve(body(mine.slice(start, start + 20), params.page, Math.ceil(mine.length / 20)));
    });
    const { result } = renderHook(() => useNewTrade(), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.myProducts).toHaveLength(20));
    await act(async () => result.current.loadMoreMine());
    await waitFor(() => expect(result.current.myProducts).toHaveLength(25));
    await waitFor(() => expect(result.current.theirProducts).toHaveLength(1));
    act(() => result.current.toggleMyItem(result.current.myProducts.find((p) => p.id === 'm22')!));
    act(() => result.current.toggleMyItem(result.current.myProducts[0]!));
    act(() => result.current.toggleTheirItem(result.current.theirProducts[0]!));
    act(() => result.current.setTradeAddressId('addr-1'));

    // m22 is sold or put in another trade: the next listing no longer returns it.
    mine = mine.filter((p) => p.id !== 'm22');
    await act(async () => refocus());
    await waitFor(() => expect(result.current.myProducts).toHaveLength(24));
    expect(result.current.myHasMore).toBe(false);
    expect(ids(result.current.selectedMyItems)).toEqual(['m1']);

    await act(async () => {
      await result.current.handleSubmit();
    });
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate.mock.calls[0][0].initiatorItems).toEqual([{ productId: 'm1', quantity: 1 }]);
  });
});

describe('new-trade pickers reload every loaded page', () => {
  it('on open: a cached two-page list is fetched again, page 1 and page 2', async () => {
    const client = makeClient();
    client.setQueryData(qk.trades.myTradeable('u1', undefined), {
      pages: [
        { items: range('old', 1, 20), page: 1, totalPages: 2 },
        { items: range('old', 21, 25), page: 2, totalPages: 2 },
      ],
      pageParams: [1, 2],
    });
    mockedMy.mockImplementation(server('new', () => 25));
    const { result } = renderHook(() => useNewTrade(), { wrapper: wrapperFor(client) });
    // The cached rows show while the refetch is in flight.
    expect(result.current.myProducts).toHaveLength(25);
    await waitFor(() => expect(result.current.myProducts[0]!.id).toBe('new1'));
    expect(mockedMy.mock.calls.map(([p]) => p.page)).toEqual([1, 2]);
    expect(result.current.myProducts).toHaveLength(25);
  });

  it('on screen focus: both loaded pages are fetched again', async () => {
    mockedMy.mockImplementation(server('m', () => 45));
    const { result } = renderHook(() => useNewTrade(), { wrapper: wrapperFor(makeClient()) });
    await waitFor(() => expect(result.current.myProducts).toHaveLength(20));
    await act(async () => result.current.loadMoreMine());
    await waitFor(() => expect(result.current.myProducts).toHaveLength(40));
    mockedMy.mockClear();

    await act(async () => refocus());
    await waitFor(() => expect(mockedMy).toHaveBeenCalledTimes(2));
    expect(mockedMy.mock.calls.map(([p]) => p.page)).toEqual([1, 2]);
    expect(result.current.myProducts).toHaveLength(40);
  });
});

describe('new-trade picker keys and invalidation', () => {
  it('keys the cache by user: a user switch never shows another user\'s list', async () => {
    const client = makeClient();
    mockedMy.mockImplementation(server('u1-', () => 3));
    const first = renderHook(() => useNewTrade(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(first.result.current.myProducts).toHaveLength(3));
    first.unmount();

    useAuthStore.setState({ user: { id: 'u2' } as never });
    mockedMy.mockImplementation(server('u2-', () => 1));
    const second = renderHook(() => useNewTrade(), { wrapper: wrapperFor(client) });
    // u1's cached rows are not served to u2, not even for one render.
    expect(second.result.current.myProducts).toEqual([]);
    await waitFor(() => expect(ids(second.result.current.myProducts)).toEqual(['u2-1']));
    expect(client.getQueryData(qk.trades.myTradeable('u1', undefined))).toBeDefined();
  });

  it('a listing change (listing cache set) reloads the infinite my picker', async () => {
    const client = makeClient();
    let total = 25;
    mockedMy.mockImplementation(server('m', () => total));
    const { result } = renderHook(() => useNewTrade(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.myProducts).toHaveLength(20));
    await act(async () => result.current.loadMoreMine());
    await waitFor(() => expect(result.current.myProducts).toHaveLength(25));

    total = 26;
    await act(async () => {
      invalidateListingCaches(client);
    });
    await waitFor(() => expect(result.current.myProducts).toHaveLength(26));
  });
});

describe('new-trade target preselection, paged seller list', () => {
  /** `GET /products/:id` of the target: the 25th newest of the seller, so on page 2. */
  const target = { ...row('t25'), seller: { id: 'seller-1' } };
  const targetKey = qk.trades.targetListing('t25');

  /** Mounts the wizard for `t25` and waits until this open's target row and page 1 settled. */
  async function openForTarget(client = makeClient()) {
    mockParams = { targetProductId: 't25', targetSellerId: 'seller-1' };
    const hook = renderHook(() => useNewTrade(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(hook.result.current.loadingTheirProducts).toBe(false));
    await waitFor(() => expect(mockedGetOne).toHaveBeenCalledWith('t25'));
    await waitFor(() => expect(client.getQueryState(targetKey)?.fetchStatus).toBe('idle'));
    await act(() => Promise.resolve());
    return hook;
  }

  it('a target on a page not loaded yet is preselected from its own row, pinned, then refreshed', async () => {
    mockedGetOne.mockResolvedValue({ data: { data: target } });
    mockedAll.mockImplementation(server('t', () => 25));
    const { result } = await openForTarget();
    expect(result.current.theirProducts).toHaveLength(21);
    expect(ids(result.current.selectedTheirItems)).toEqual(['t25']);
    expect(result.current.theirProducts[0]!.id).toBe('t25');
    expect(result.current.theirHasMore).toBe(true);

    // Its page loads: one row, no duplicate, still picked, now the list row.
    await act(async () => result.current.loadMoreTheirs());
    await waitFor(() => expect(result.current.theirHasMore).toBe(false));
    expect(result.current.theirProducts).toHaveLength(25);
    expect(ids(result.current.theirProducts).filter((id) => id === 't25')).toHaveLength(1);
    expect(result.current.selectedTheirItems).toEqual([row('t25')]);
  });

  it.each([
    ['not open to trade', { isTradeEnabled: false }],
    ['not active', { status: 'sold' }],
    ['of another seller', { seller: { id: 'seller-2' } }],
  ])('a target %s is not preselected from its own row', async (_name, patch) => {
    mockedGetOne.mockResolvedValue({ data: { data: { ...target, ...patch } } });
    mockedAll.mockImplementation(server('t', () => 25));
    const { result } = await openForTarget();
    expect(result.current.theirHasMore).toBe(true);
    expect(result.current.selectedTheirItems).toEqual([]);
  });

  it('a cached row from an earlier open does not preselect: the fresh row says sold', async () => {
    const client = makeClient();
    client.setQueryData(targetKey, target);
    client.setQueryData(qk.trades.sellerTradeable('u1', 'seller-1'), {
      pages: [{ items: range('t', 1, 20), page: 1, totalPages: 2 }],
      pageParams: [1],
    });
    mockedGetOne.mockResolvedValue({ data: { data: { ...target, status: 'sold' } } });
    mockedAll.mockImplementation(server('t', () => 24));
    const { result } = await openForTarget(client);
    expect(result.current.theirHasMore).toBe(true);
    expect(result.current.selectedTheirItems).toEqual([]);
  });

  it('a cached seller list from an earlier open does not preselect: the fresh list lacks it', async () => {
    const client = makeClient();
    client.setQueryData(qk.trades.sellerTradeable('u1', 'seller-1'), {
      pages: [{ items: [row('t25'), ...range('t', 1, 19)], page: 1, totalPages: 2 }],
      pageParams: [1],
    });
    // t25 is sold since: its fresh row says so, and the fresh list (more pages) lacks it.
    mockedGetOne.mockResolvedValue({ data: { data: { ...target, status: 'sold' } } });
    mockedAll.mockImplementation(server('t', () => 24));
    const { result } = await openForTarget(client);
    await waitFor(() => expect(ids(result.current.theirProducts)).not.toContain('t25'));
    expect(result.current.theirHasMore).toBe(true);
    expect(result.current.selectedTheirItems).toEqual([]);
  });

  it('a pinned target that every loaded page lacks is pruned and never sent', async () => {
    let total = 25;
    mockedGetOne.mockResolvedValue({ data: { data: target } });
    mockedAll.mockImplementation(server('t', () => total));
    const { result } = await openForTarget();
    expect(ids(result.current.selectedTheirItems)).toEqual(['t25']);
    act(() => result.current.toggleTheirItem(result.current.theirProducts.find((p) => p.id === 't1')!));
    expect(ids(result.current.selectedTheirItems)).toEqual(['t25', 't1']);

    // The target leaves the seller's list (sold): page 2 now ends at t24.
    total = 24;
    await act(async () => result.current.loadMoreTheirs());
    await waitFor(() => expect(result.current.theirHasMore).toBe(false));
    await waitFor(() => expect(ids(result.current.selectedTheirItems)).toEqual(['t1']));
    expect(ids(result.current.theirProducts)).not.toContain('t25');

    act(() => result.current.setCashAmount('10'));
    act(() => result.current.setTradeAddressId('addr-1'));
    await act(async () => {
      await result.current.handleSubmit();
    });
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate.mock.calls[0][0].receiverItems).toEqual([{ productId: 't1', quantity: 1 }]);
  });

  it('a complete seller list without the target gets no pick', async () => {
    mockedGetOne.mockResolvedValue({ data: { data: target } });
    mockedAll.mockImplementation(server('t', () => 3));
    const { result } = await openForTarget();
    expect(result.current.theirProducts).toHaveLength(3);
    expect(result.current.theirHasMore).toBe(false);
    expect(result.current.selectedTheirItems).toEqual([]);
  });
});

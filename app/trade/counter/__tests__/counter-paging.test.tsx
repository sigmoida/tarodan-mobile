/**
 * Counter-offer pickers, paged (B6, mirrors web B5): server params for both sides, the trade's own
 * items first, pages of 20 without duplicates, picks kept across pages (pruned only when every
 * page is loaded; otherwise pinned and sent), the exact counter payload, reloading every loaded
 * page on focus, a failed "Show more", the user in the keys and the listing invalidation.
 */
import React from 'react';
import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithProviders } from '@/test-utils';
import i18n from '@/i18n/config';
import { qk } from '@/lib/query';
import { invalidateListingCaches } from '@/components/listing/_lib/invalidate';

let mockParams: Record<string, string> = { id: 'trade-1' };
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

// The screen tests assert what the loaded screen shows, not the skeleton timing: without this
// the delayed-skeleton timer can re-show the skeleton over found content on a busy machine.
jest.mock('@/ui/loading/useDelayedLoading', () => require('@/test-utils/loading').immediateLoadingMock);

jest.mock('@/hooks/useLegalIdentity', () => require('@/test-utils/legalIdentity').legalIdentityGatePassMock);

jest.mock('@/lib/api', () => ({
  tradesApi: { getOne: jest.fn(), counter: jest.fn(() => Promise.resolve({ data: {} })) },
  productsApi: { getAll: jest.fn(), getMyListings: jest.fn() },
}));

import { productsApi, tradesApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useTradeCounter } from '../[id]/_hooks/useTradeCounter';
import TradeCounterScreen from '../[id]';

const mockedMy = productsApi.getMyListings as jest.Mock;
const mockedAll = productsApi.getAll as jest.Mock;
const mockedGetOne = tradesApi.getOne as jest.Mock;
const mockedCounter = tradesApi.counter as jest.Mock;

type Row = { id: string; title: string; price: number; status: string; isTradeEnabled: boolean };
const row = (id: string): Row => ({ id, title: `Car ${id}`, price: 100, status: 'active', isTradeEnabled: true });
const range = (prefix: string, from: number, to: number): Row[] =>
  Array.from({ length: to - from + 1 }, (_, i) => row(`${prefix}${from + i}`));
const body = (data: Row[], page: number, totalPages: number) => ({
  data: { data, meta: { total: data.length, page, limit: 20, totalPages } },
});
/** Serves the current rows of `source()`, 20 per page, like the server. */
const server = (source: () => Row[]) => (params: { page: number }) => {
  const all = source();
  const start = (params.page - 1) * 20;
  return Promise.resolve(body(all.slice(start, start + 20), params.page, Math.max(1, Math.ceil(all.length / 20))));
};
const ids = (rows: Array<{ id: string }>) => rows.map((r) => r.id);

/** I am the initiator (u1) of a trade where I give `mine-t` and want `theirs-t`. */
const tradeFixture = () => ({
  id: 'trade-1',
  status: 'pending',
  initiatorId: 'u1',
  receiverId: 'u2',
  initiatorName: 'Ali',
  receiverName: 'Veli',
  cashAmount: 0,
  cashPayerId: null,
  initiatorItems: [{ id: 'ti1', productId: 'mine-t', productTitle: 'My trade item', valueAtTrade: 150, quantity: 1 }],
  receiverItems: [{ id: 'ti2', productId: 'theirs-t', productTitle: 'Their trade item', valueAtTrade: 250, quantity: 1 }],
});

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

/** Mounts the controller and waits for the trade to initialise its selections. */
async function mount(client = makeClient()) {
  const hook = renderHook(() => useTradeCounter(), { wrapper: wrapperFor(client) });
  await waitFor(() => expect(hook.result.current.initializedId).toBe('trade-1'));
  return { ...hook, client };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 'trade-1' };
  mockFocusCallbacks = [];
  mockedGetOne.mockResolvedValue({ data: { data: tradeFixture() } });
  mockedMy.mockImplementation(server(() => []));
  mockedAll.mockImplementation(server(() => []));
  useAuthStore.setState({ isAuthenticated: true, isLoading: false, user: { id: 'u1' } as never });
});

afterEach(() => {
  useAuthStore.setState({ isAuthenticated: false, user: null });
});

describe('counter pickers, server params and the trade\'s own items', () => {
  it('sends the server filters for both sides (no tradeEligible on my side)', async () => {
    const { result } = await mount();
    await waitFor(() => expect(result.current.loadingMyProducts).toBe(false));
    await waitFor(() => expect(result.current.loadingTheirProducts).toBe(false));
    expect(mockedMy).toHaveBeenCalledWith({ status: 'active', tradeOnly: true, page: 1, limit: 20 });
    expect(mockedAll).toHaveBeenCalledWith({
      sellerId: 'u2',
      status: 'active',
      tradeOnly: true,
      sortBy: 'created_desc',
      page: 1,
      limit: 20,
    });
  });

  it('lists the trade\'s own items first, preselected, with the value at trade time', async () => {
    mockedMy.mockImplementation(server(() => range('m', 1, 3)));
    mockedAll.mockImplementation(server(() => range('t', 1, 2)));
    const { result } = await mount();
    await waitFor(() => expect(result.current.myProducts).toHaveLength(4));
    await waitFor(() => expect(result.current.theirProducts).toHaveLength(3));
    expect(ids(result.current.myProducts)).toEqual(['mine-t', 'm1', 'm2', 'm3']);
    expect(ids(result.current.theirProducts)).toEqual(['theirs-t', 't1', 't2']);
    expect(result.current.myProducts[0]).toMatchObject({ title: 'My trade item', price: 150 });
    expect(ids(result.current.selectedMine)).toEqual(['mine-t']);
    expect(ids(result.current.selectedTheirs)).toEqual(['theirs-t']);
    expect(result.current.myTotal).toBe(150);
    expect(result.current.theirTotal).toBe(250);
  });

  it('does not list a trade item twice when the server also returns it', async () => {
    mockedMy.mockImplementation(server(() => [row('mine-t'), row('m1')]));
    const { result } = await mount();
    await waitFor(() => expect(result.current.myProducts).toHaveLength(2));
    expect(ids(result.current.myProducts)).toEqual(['mine-t', 'm1']);
    expect(result.current.myProducts[0]!.title).toBe('My trade item');
  });
});

describe('counter pickers, paging', () => {
  it('pages my side 20, 20, 5 with no duplicates; their side pages independently', async () => {
    mockedMy.mockImplementation(server(() => range('m', 1, 45)));
    mockedAll.mockImplementation(server(() => range('t', 1, 25)));
    const { result } = await mount();
    await waitFor(() => expect(result.current.myProducts).toHaveLength(21));
    expect(result.current.myHasMore).toBe(true);
    expect(result.current.theirHasMore).toBe(true);

    await act(async () => result.current.loadMoreMine());
    await waitFor(() => expect(result.current.myProducts).toHaveLength(41));
    await act(async () => result.current.loadMoreMine());
    await waitFor(() => expect(result.current.myProducts).toHaveLength(46));
    expect(result.current.myHasMore).toBe(false);
    expect(new Set(ids(result.current.myProducts)).size).toBe(46);
    expect(result.current.theirProducts).toHaveLength(21);

    await act(async () => result.current.loadMoreTheirs());
    await waitFor(() => expect(result.current.theirProducts).toHaveLength(26));
    expect(result.current.theirHasMore).toBe(false);
  });

  it('an error on "Show more" keeps the lists and the picks, and the button stays', async () => {
    mockedMy.mockImplementation((params: { page: number }) =>
      params.page === 1 ? Promise.resolve(body(range('m', 1, 20), 1, 2)) : Promise.reject(new Error('network')),
    );
    const { result } = await mount();
    await waitFor(() => expect(result.current.myProducts).toHaveLength(21));
    await act(async () => result.current.loadMoreMine());
    await waitFor(() => expect(result.current.myLoadingMore).toBe(false));
    expect(result.current.myProducts).toHaveLength(21);
    expect(result.current.myHasMore).toBe(true);
    expect(ids(result.current.selectedMine)).toEqual(['mine-t']);
  });

  it('the Show more button on the screen loads the next page', async () => {
    mockedMy.mockImplementation(server(() => range('m', 1, 25)));
    renderWithProviders(<TradeCounterScreen />);
    await waitFor(() => expect(screen.getByTestId('counter-my-show-more')).toBeOnTheScreen());
    expect(screen.queryByTestId('counter-their-show-more')).toBeNull();
    expect(screen.queryByText('Car m25')).toBeNull();

    fireEvent.press(screen.getByTestId('counter-my-show-more'));
    await waitFor(() => expect(screen.getByText('Car m25')).toBeOnTheScreen());
    expect(screen.queryByTestId('counter-my-show-more')).toBeNull();
  });
});

describe('counter picks across pages', () => {
  it('keeps picks from different pages and sends the exact payload', async () => {
    mockedMy.mockImplementation(server(() => range('m', 1, 25)));
    mockedAll.mockImplementation(server(() => range('t', 1, 3)));
    const { result } = await mount();
    await waitFor(() => expect(result.current.myProducts).toHaveLength(21));
    await waitFor(() => expect(result.current.theirProducts).toHaveLength(4));

    act(() => result.current.toggleMine(result.current.myProducts.find((p) => p.id === 'm2')!));
    await act(async () => result.current.loadMoreMine());
    await waitFor(() => expect(result.current.myProducts).toHaveLength(26));
    act(() => result.current.toggleMine(result.current.myProducts.find((p) => p.id === 'm24')!));
    act(() => result.current.toggleTheirs(result.current.theirProducts.find((p) => p.id === 't1')!));
    expect(ids(result.current.selectedMine)).toEqual(['mine-t', 'm2', 'm24']);

    await act(async () => {
      await result.current.handleSubmit();
    });
    await waitFor(() => expect(mockedCounter).toHaveBeenCalledTimes(1));
    expect(mockedCounter).toHaveBeenCalledWith('trade-1', {
      initiatorItems: [
        { productId: 'mine-t', quantity: 1 },
        { productId: 'm2', quantity: 1 },
        { productId: 'm24', quantity: 1 },
      ],
      receiverItems: [
        { productId: 'theirs-t', quantity: 1 },
        { productId: 't1', quantity: 1 },
      ],
      cashAmount: 0,
      message: undefined,
    });
  });

  it('a pick that slid past the loaded pages stays checked, pinned at the top, and is sent', async () => {
    let mine = range('m', 1, 45);
    mockedMy.mockImplementation(server(() => mine));
    const { result } = await mount();
    await waitFor(() => expect(result.current.myProducts).toHaveLength(21));
    act(() => result.current.toggleMine(result.current.myProducts.find((p) => p.id === 'm20')!));

    // Twenty new rows are pushed in front: m20 now lives on page 2, which is not loaded.
    mine = [...range('n', 1, 20), ...mine];
    await act(async () => refocus());
    await waitFor(() => expect(result.current.myProducts.some((p) => p.id === 'n1')).toBe(true));
    expect(result.current.myHasMore).toBe(true);
    expect(ids(result.current.selectedMine)).toEqual(['mine-t', 'm20']);
    // Pinned picks come before the loaded rows (the trade's own item is one of them).
    expect(ids(result.current.myProducts).slice(0, 2)).toEqual(['m20', 'mine-t']);

    await act(async () => {
      await result.current.handleSubmit();
    });
    await waitFor(() => expect(mockedCounter).toHaveBeenCalledTimes(1));
    expect(mockedCounter.mock.calls[0][1].initiatorItems).toEqual([
      { productId: 'mine-t', quantity: 1 },
      { productId: 'm20', quantity: 1 },
    ]);
  });

  it('a pick that is gone is pruned once every page is loaded, and never sent', async () => {
    let mine = range('m', 1, 25);
    mockedMy.mockImplementation(server(() => mine));
    const { result } = await mount();
    await waitFor(() => expect(result.current.myProducts).toHaveLength(21));
    await act(async () => result.current.loadMoreMine());
    await waitFor(() => expect(result.current.myProducts).toHaveLength(26));
    act(() => result.current.toggleMine(result.current.myProducts.find((p) => p.id === 'm22')!));

    // m22 is sold: the next listing no longer returns it.
    mine = mine.filter((p) => p.id !== 'm22');
    await act(async () => refocus());
    await waitFor(() => expect(result.current.myProducts).toHaveLength(25));
    expect(result.current.myHasMore).toBe(false);
    expect(ids(result.current.selectedMine)).toEqual(['mine-t']);

    // Change the offer so the identical-offer guard lets it through, then send.
    act(() => result.current.toggleMine(result.current.myProducts.find((p) => p.id === 'm1')!));
    await act(async () => {
      await result.current.handleSubmit();
    });
    await waitFor(() => expect(mockedCounter).toHaveBeenCalledTimes(1));
    expect(mockedCounter.mock.calls[0][1].initiatorItems).toEqual([
      { productId: 'mine-t', quantity: 1 },
      { productId: 'm1', quantity: 1 },
    ]);
  });

  it('a trade item the lists do not return is never pruned', async () => {
    const { result } = await mount();
    await waitFor(() => expect(result.current.loadingMyProducts).toBe(false));
    await act(async () => refocus());
    await waitFor(() => expect(result.current.loadingMyProducts).toBe(false));
    expect(ids(result.current.selectedMine)).toEqual(['mine-t']);
    expect(ids(result.current.selectedTheirs)).toEqual(['theirs-t']);
  });
});

describe('counter pickers reload every loaded page', () => {
  it('on screen focus: both loaded pages are fetched again', async () => {
    mockedMy.mockImplementation(server(() => range('m', 1, 45)));
    const { result } = await mount();
    await waitFor(() => expect(result.current.myProducts).toHaveLength(21));
    await act(async () => result.current.loadMoreMine());
    await waitFor(() => expect(result.current.myProducts).toHaveLength(41));
    mockedMy.mockClear();

    await act(async () => refocus());
    await waitFor(() => expect(mockedMy).toHaveBeenCalledTimes(2));
    expect(mockedMy.mock.calls.map(([p]) => p.page)).toEqual([1, 2]);
    expect(result.current.myProducts).toHaveLength(41);
  });

  it('on open: a cached two-page list is fetched again, page 1 and page 2', async () => {
    const client = makeClient();
    client.setQueryData(qk.trades.myTradeableForCounter('u1'), {
      pages: [
        { items: range('old', 1, 20), page: 1, totalPages: 2 },
        { items: range('old', 21, 25), page: 2, totalPages: 2 },
      ],
      pageParams: [1, 2],
    });
    mockedMy.mockImplementation(server(() => range('new', 1, 25)));
    const { result } = await mount(client);
    await waitFor(() => expect(result.current.myProducts.some((p) => p.id === 'new1')).toBe(true));
    expect(mockedMy.mock.calls.map(([p]) => p.page)).toEqual([1, 2]);
    expect(result.current.myProducts.some((p) => p.id === 'old1')).toBe(false);
  });
});

describe('counter picker keys and invalidation', () => {
  it('keys both pickers by the signed-in user', async () => {
    const client = makeClient();
    mockedMy.mockImplementation(server(() => range('a', 1, 2)));
    mockedAll.mockImplementation(server(() => range('b', 1, 2)));
    const first = await mount(client);
    await waitFor(() => expect(first.result.current.myProducts).toHaveLength(3));
    await waitFor(() => expect(first.result.current.theirProducts).toHaveLength(3));
    first.unmount();

    useAuthStore.setState({ user: { id: 'u3' } as never });
    mockedGetOne.mockResolvedValue({ data: { data: { ...tradeFixture(), initiatorId: 'u3' } } });
    // The cached trade is u3's too, so the first render already pages the same other party (u2)
    // that u1 paged: only the user id in the key keeps u1's view of u2's list away from u3.
    client.setQueryData(qk.trades.detail('trade-1'), { ...tradeFixture(), initiatorId: 'u3' });
    mockedMy.mockImplementation(server(() => range('c', 1, 1)));
    mockedAll.mockImplementation(server(() => range('d', 1, 1)));
    const second = renderHook(() => useTradeCounter(), { wrapper: wrapperFor(client) });
    // u1's cached picker rows are not served to u3, not even for one render (the cached trade
    // still contributes its own items).
    expect(ids(second.result.current.myProducts).filter((id) => id.startsWith('a'))).toEqual([]);
    expect(ids(second.result.current.theirProducts).filter((id) => id.startsWith('b'))).toEqual([]);
    await waitFor(() => expect(second.result.current.myProducts.some((p) => p.id === 'c1')).toBe(true));
    await waitFor(() => expect(second.result.current.theirProducts.some((p) => p.id === 'd1')).toBe(true));
    expect(client.getQueryData(qk.trades.myTradeableForCounter('u1'))).toBeDefined();
  });

  it('a listing change (listing cache set) reloads the infinite my picker', async () => {
    let mine = range('m', 1, 25);
    mockedMy.mockImplementation(server(() => mine));
    const { result, client } = await mount();
    await waitFor(() => expect(result.current.myProducts).toHaveLength(21));
    await act(async () => result.current.loadMoreMine());
    await waitFor(() => expect(result.current.myProducts).toHaveLength(26));

    mine = range('m', 1, 26);
    await act(async () => {
      invalidateListingCaches(client);
    });
    await waitFor(() => expect(result.current.myProducts).toHaveLength(27));
  });
});

/** TanStack notifies observers on a timer (`notifyManager`): let the screen re-render. */
const flushQueryNotifications = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

describe('counter pickers, loading on open and load errors (web B5 rules)', () => {
  it('a cached list from an earlier open is not pickable until this open\'s fetch settles', async () => {
    const client = makeClient();
    client.setQueryData(qk.trades.myTradeableForCounter('u1'), {
      pages: [{ items: range('old', 1, 3), page: 1, totalPages: 1 }],
      pageParams: [1],
    });
    let resolveMine!: (value: unknown) => void;
    mockedMy.mockImplementation(() => new Promise((resolve) => (resolveMine = resolve)));
    const { result } = await mount(client);
    // The cached rows exist, but the picker reads as loading (web: `dataUpdatedAt < openedAt`).
    expect(result.current.myProducts.some((p) => p.id === 'old1')).toBe(true);
    expect(result.current.loadingMyProducts).toBe(true);

    await act(async () => resolveMine(body(range('new', 1, 2), 1, 1)));
    await waitFor(() => expect(result.current.loadingMyProducts).toBe(false));
    expect(ids(result.current.myProducts)).toEqual(['mine-t', 'new1', 'new2']);
  });

  it('a later background refetch keeps the list on screen (no spinner)', async () => {
    mockedMy.mockImplementation(server(() => range('m', 1, 2)));
    const { result } = await mount();
    await waitFor(() => expect(result.current.loadingMyProducts).toBe(false));
    mockedMy.mockImplementation(() => new Promise(() => undefined));
    await act(async () => refocus());
    expect(mockedMy).toHaveBeenCalledTimes(2);
    expect(result.current.loadingMyProducts).toBe(false);
    expect(ids(result.current.myProducts)).toEqual(['mine-t', 'm1', 'm2']);
  });

  it('a failed first load shows the error state with the load-failed copy; retry loads the list', async () => {
    mockedMy.mockImplementation(server(() => range('m', 1, 2)));
    mockedMy.mockRejectedValueOnce(new Error('network'));
    renderWithProviders(<TradeCounterScreen />);
    expect(await screen.findByText(i18n.t('collection.productsLoadFailed'))).toBeOnTheScreen();
    expect(screen.queryByText('Car m1')).toBeNull();

    fireEvent.press(screen.getByText(i18n.t('mobile.errorRetry')));
    expect(await screen.findByText('Car m1')).toBeOnTheScreen();
    expect(screen.queryByTestId('error-state')).toBeNull();
    expect(mockedMy).toHaveBeenCalledTimes(2);
  });

  it('a failed refetch keeps the lists and the picks, with no error state', async () => {
    mockedMy.mockImplementation(server(() => range('m', 1, 2)));
    const { result } = await mount();
    await waitFor(() => expect(result.current.myProducts).toHaveLength(3));
    act(() => result.current.toggleMine(result.current.myProducts.find((p) => p.id === 'm1')!));

    mockedMy.mockRejectedValue(new Error('network'));
    await act(async () => refocus());
    await waitFor(() => expect(mockedMy).toHaveBeenCalledTimes(2));
    await act(() => Promise.resolve());
    expect(result.current.pickersFailed).toBe(false);
    expect(result.current.loadingMyProducts).toBe(false);
    expect(ids(result.current.myProducts)).toEqual(['mine-t', 'm1', 'm2']);
    expect(ids(result.current.selectedMine)).toEqual(['mine-t', 'm1']);
  });

  it('a failed background refetch of the trade keeps the editor on screen', async () => {
    mockedMy.mockImplementation(server(() => range('m', 1, 2)));
    const { queryClient } = renderWithProviders(<TradeCounterScreen />);
    expect(await screen.findByText('Car m1')).toBeOnTheScreen();

    mockedGetOne.mockRejectedValue(new Error('network'));
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: qk.trades.detail('trade-1') });
    });
    await flushQueryNotifications();
    expect(queryClient.getQueryState(qk.trades.detail('trade-1'))?.status).toBe('error');
    expect(screen.queryByTestId('error-state')).toBeNull();
    expect(screen.getByText('Car m1')).toBeOnTheScreen();
  });

  it('a 404 on a refetch of the trade (it is gone) shows "not found", not the editor', async () => {
    mockedMy.mockImplementation(server(() => range('m', 1, 2)));
    const { queryClient } = renderWithProviders(<TradeCounterScreen />);
    expect(await screen.findByText('Car m1')).toBeOnTheScreen();

    mockedGetOne.mockRejectedValue(Object.assign(new Error('not found'), { response: { status: 404 } }));
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: qk.trades.detail('trade-1') });
    });
    await flushQueryNotifications();
    expect(screen.getByText(i18n.t('trade.notFoundTitle'))).toBeOnTheScreen();
    expect(screen.queryByTestId('error-state')).toBeNull();
    expect(screen.queryByText('Car m1')).toBeNull();
  });

  it('a trade that never loaded (403 on open) fails the screen with the generic copy; retry loads it', async () => {
    mockedMy.mockImplementation(server(() => range('m', 1, 2)));
    mockedGetOne.mockRejectedValueOnce(Object.assign(new Error('forbidden'), { response: { status: 403 } }));
    const { queryClient } = renderWithProviders(<TradeCounterScreen />);
    expect(await screen.findByTestId('error-state')).toBeOnTheScreen();
    // The my picker loaded fine: the failure is the trade's, so not the picker copy.
    await waitFor(() =>
      expect(queryClient.getQueryState(qk.trades.myTradeableForCounter('u1'))?.status).toBe('success'),
    );
    await flushQueryNotifications();
    expect(screen.queryByText(i18n.t('collection.productsLoadFailed'))).toBeNull();
    expect(screen.getByText(i18n.t('mobile.errorSomethingWrong'))).toBeOnTheScreen();
    expect(screen.queryByTestId('trade-counter-submit')).toBeNull();

    fireEvent.press(screen.getByText(i18n.t('mobile.errorRetry')));
    expect(await screen.findByText('Car m1')).toBeOnTheScreen();
    expect(screen.queryByTestId('error-state')).toBeNull();
    expect(mockedGetOne).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('trade-counter-submit')).toBeOnTheScreen();
  });

  it('a 404 on open (the trade is gone) shows "not found" with no editor and no submit', async () => {
    mockedMy.mockImplementation(server(() => range('m', 1, 2)));
    mockedGetOne.mockRejectedValue(Object.assign(new Error('not found'), { response: { status: 404 } }));
    const { queryClient } = renderWithProviders(<TradeCounterScreen />);
    expect(await screen.findByText(i18n.t('trade.notFoundTitle'))).toBeOnTheScreen();
    await waitFor(() =>
      expect(queryClient.getQueryState(qk.trades.myTradeableForCounter('u1'))?.status).toBe('success'),
    );
    await flushQueryNotifications();
    expect(screen.getByText(i18n.t('trade.notFoundTitle'))).toBeOnTheScreen();
    expect(screen.queryByTestId('error-state')).toBeNull();
    expect(screen.queryByText('Car m1')).toBeNull();
    expect(screen.queryByTestId('trade-counter-submit')).toBeNull();
    expect(mockedCounter).not.toHaveBeenCalled();
  });

  it('when the trade and a picker both failed, one retry reloads both', async () => {
    mockedGetOne.mockRejectedValueOnce(new Error('network'));
    mockedMy.mockImplementation(server(() => range('m', 1, 2)));
    mockedMy.mockRejectedValueOnce(new Error('network'));
    const { queryClient } = renderWithProviders(<TradeCounterScreen />);
    // The my picker does not wait for the trade, so both fail on the first open.
    await waitFor(() => expect(queryClient.getQueryState(qk.trades.myTradeableForCounter('u1'))?.status).toBe('error'));
    expect(await screen.findByTestId('error-state')).toBeOnTheScreen();

    fireEvent.press(screen.getByText(i18n.t('mobile.errorRetry')));
    expect(await screen.findByText('Car m1')).toBeOnTheScreen();
    expect(screen.queryByTestId('error-state')).toBeNull();
    expect(mockedGetOne).toHaveBeenCalledTimes(2);
    expect(mockedMy).toHaveBeenCalledTimes(2);
  });
});

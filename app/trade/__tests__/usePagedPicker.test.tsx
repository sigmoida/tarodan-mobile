/**
 * The shared paged picker query: pages of 20 flattened without duplicates, "Show more" until
 * `meta.totalPages`, a refetch reloads every loaded page, a failed page keeps the list, and a
 * listing invalidation (`qk.trades.myTradeableAll`) reaches the infinite keys.
 * The response shape is the measured `GET /products/my` body (`{ data, meta }`).
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { qk } from '@/lib/query';
import { usePagedPicker } from '../_hooks/usePagedPicker';

type Row = { id: string };
const ids = (from: number, to: number): Row[] => Array.from({ length: to - from + 1 }, (_, i) => ({ id: `p${from + i}` }));
const body = (data: Row[], page: number, totalPages: number) => ({
  data: { data, meta: { total: 45, page, limit: 20, totalPages } },
});

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, networkMode: 'always', staleTime: 5 * 60 * 1000 },
    },
  });
}
const wrapperFor = (client: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

const KEY = qk.trades.myTradeable('u1', undefined);

describe('usePagedPicker', () => {
  it('loads 20, then 20, then 5 and stops offering more', async () => {
    const fetchPage = jest.fn((page: number) =>
      Promise.resolve(body(page === 3 ? ids(41, 45) : ids((page - 1) * 20 + 1, page * 20), page, 3)),
    );
    const { result } = renderHook(() => usePagedPicker<Row>({ queryKey: KEY, fetchPage, enabled: true }), {
      wrapper: wrapperFor(makeClient()),
    });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.rows).toHaveLength(20));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasMore).toBe(true);

    await act(async () => result.current.loadMore());
    await waitFor(() => expect(result.current.rows).toHaveLength(40));
    expect(result.current.hasMore).toBe(true);

    await act(async () => result.current.loadMore());
    await waitFor(() => expect(result.current.rows).toHaveLength(45));
    expect(result.current.hasMore).toBe(false);
    expect(fetchPage.mock.calls.map(([p]) => p)).toEqual([1, 2, 3]);
  });

  it('drops a duplicate row when a refetch shifts one across a page boundary', async () => {
    // Page 1 is read, then a row is added before it: page 2 starts with a row page 1 already had.
    let shifted = false;
    const fetchPage = jest.fn((page: number) =>
      Promise.resolve(
        page === 1
          ? body(ids(1, 20), 1, 2)
          : body(shifted ? [{ id: 'p20' }, ...ids(21, 24)] : ids(21, 25), 2, 2),
      ),
    );
    const client = makeClient();
    const { result } = renderHook(() => usePagedPicker<Row>({ queryKey: KEY, fetchPage, enabled: true }), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(result.current.rows).toHaveLength(20));
    await act(async () => result.current.loadMore());
    await waitFor(() => expect(result.current.rows).toHaveLength(25));

    shifted = true;
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.rows).toHaveLength(24));
    const rowIds = result.current.rows.map((r) => r.id);
    expect(new Set(rowIds).size).toBe(rowIds.length);
    expect(rowIds.filter((id) => id === 'p20')).toHaveLength(1);
  });

  it('a refetch reloads every loaded page, not only the first', async () => {
    const fetchPage = jest.fn((page: number) => Promise.resolve(body(ids((page - 1) * 20 + 1, page * 20), page, 3)));
    const client = makeClient();
    const { result } = renderHook(() => usePagedPicker<Row>({ queryKey: KEY, fetchPage, enabled: true }), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(result.current.rows).toHaveLength(20));
    await act(async () => result.current.loadMore());
    await waitFor(() => expect(result.current.rows).toHaveLength(40));
    fetchPage.mockClear();

    await act(async () => {
      await result.current.refetch();
    });
    expect(fetchPage.mock.calls.map(([p]) => p)).toEqual([1, 2]);
    expect(result.current.rows).toHaveLength(40);
  });

  it('keeps the list on screen and stops the more-spinner when loading more fails', async () => {
    const fetchPage = jest.fn((page: number) =>
      page === 1 ? Promise.resolve(body(ids(1, 20), 1, 2)) : Promise.reject(new Error('network')),
    );
    const { result } = renderHook(() => usePagedPicker<Row>({ queryKey: KEY, fetchPage, enabled: true }), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(result.current.rows).toHaveLength(20));

    await act(async () => result.current.loadMore());
    await waitFor(() => expect(result.current.isLoadingMore).toBe(false));
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(result.current.rows).toHaveLength(20);
    expect(result.current.isLoading).toBe(false);
    // The button stays, so the user can try again.
    expect(result.current.hasMore).toBe(true);
  });

  it('settles to the empty state when the first fetch fails (no endless spinner)', async () => {
    const fetchPage = jest.fn(() => Promise.reject(new Error('network')));
    const { result } = renderHook(() => usePagedPicker<Row>({ queryKey: KEY, fetchPage, enabled: true }), {
      wrapper: wrapperFor(makeClient()),
    });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.rows).toEqual([]);
  });

  it('a body without meta is a single page', async () => {
    const fetchPage = jest.fn(() => Promise.resolve({ data: { data: ids(1, 3) } }));
    const { result } = renderHook(() => usePagedPicker<Row>({ queryKey: KEY, fetchPage, enabled: true }), {
      wrapper: wrapperFor(makeClient()),
    });
    await waitFor(() => expect(result.current.rows).toHaveLength(3));
    expect(result.current.hasMore).toBe(false);
  });

  it('stays idle while disabled', async () => {
    const fetchPage = jest.fn(() => Promise.resolve(body([], 1, 1)));
    const { result } = renderHook(() => usePagedPicker<Row>({ queryKey: KEY, fetchPage, enabled: false }), {
      wrapper: wrapperFor(makeClient()),
    });
    expect(result.current.isLoading).toBe(false);
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('a listing invalidation (the my-tradeable prefix) refetches the loaded pages of the infinite key', async () => {
    let title = 1;
    const fetchPage = jest.fn((page: number) => Promise.resolve(body([{ id: `v${title}-${page}` }], page, 2)));
    const client = makeClient();
    const { result } = renderHook(() => usePagedPicker<Row>({ queryKey: KEY, fetchPage, enabled: true }), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    await act(async () => result.current.loadMore());
    await waitFor(() => expect(result.current.rows).toHaveLength(2));

    title = 2;
    await act(async () => {
      await client.invalidateQueries({ queryKey: qk.trades.myTradeableAll });
    });
    await waitFor(() => expect(result.current.rows.map((r) => r.id)).toEqual(['v2-1', 'v2-2']));
  });
});

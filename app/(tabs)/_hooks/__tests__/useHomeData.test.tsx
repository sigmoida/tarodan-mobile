/**
 * Home product rails keep the last good list when a refetch fails (a failure throws instead of
 * being swallowed into `[]`), and a rail that never loaded reports `failedPopular` so the screen
 * hides it. A genuine empty 200 stays an empty, non-failed rail.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeTestQueryClient } from '@/test-utils';
import { qk } from '@/lib/query';

const mockGetAll = jest.fn();
const mockGetPopular = jest.fn();
jest.mock('@/lib/api', () => ({
  manufacturersApi: { findAll: () => Promise.resolve({ data: [] }) },
  productsApi: {
    getAll: (params: unknown) => mockGetAll(params),
    getPopular: (params: unknown) => mockGetPopular(params),
  },
  userApi: new Proxy({}, { get: () => () => Promise.resolve({ data: [] }) }),
}));

import { useHomeData } from '../useHomeData';

const product = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  title: `Product ${id}`,
  price: 100,
  ...extra,
});

const onSaleProduct = (id: string) => product(id, { price: 80, originalPrice: 100, comparePrice: 100 });

/** `getAll` serves three rails; route by the filter each one sends. */
const serveRails = () =>
  mockGetAll.mockImplementation((params: Record<string, unknown>) => {
    if (params.homeShowcase) return Promise.resolve({ data: { data: [product('f1'), product('f2')] } });
    if (params.discountOnly) return Promise.resolve({ data: { data: [onSaleProduct('s1')] } });
    if (params.tradeOnly) return Promise.resolve({ data: { data: [product('t1')] } });
    return Promise.resolve({ data: { data: [] } });
  });

const setup = () => {
  const client = makeTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...renderHook(() => useHomeData(), { wrapper }) };
};

const serverError = () => Object.assign(new Error('Request failed with status code 500'), { response: { status: 500 } });

describe('useHomeData product rails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    serveRails();
    mockGetPopular.mockResolvedValue({ data: { data: [product('p1')] } });
  });

  it('keeps the last good rails when a refetch fails', async () => {
    const { result, client } = setup();
    await waitFor(() => expect(result.current.featured).toHaveLength(2));
    await waitFor(() => expect(result.current.popular).toHaveLength(1));
    expect(result.current.trade).toHaveLength(1);

    mockGetAll.mockRejectedValue(serverError());
    mockGetPopular.mockRejectedValue(serverError());
    await act(async () => {
      await result.current.refetchAll();
    });

    // The refetch really failed...
    expect(client.getQueryState(qk.products.homeFeatured)?.status).toBe('error');
    expect(client.getQueryState(qk.products.popular)?.status).toBe('error');
    // ...yet every rail still shows its previous list, and nothing reads as "never loaded".
    expect(result.current.featured.map((p: { id: string }) => p.id)).toEqual(['f1', 'f2']);
    expect(result.current.onSale).toHaveLength(1);
    expect(result.current.trade).toHaveLength(1);
    expect(result.current.popular).toHaveLength(1);
    expect(result.current.failedPopular).toBe(false);
  });

  it('recovers on a later successful refetch after a failed one', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.trade).toHaveLength(1));

    mockGetAll.mockRejectedValue(serverError());
    await act(async () => {
      await result.current.refetchAll();
    });
    expect(result.current.trade).toHaveLength(1);

    mockGetAll.mockImplementation(() => Promise.resolve({ data: { data: [product('t9'), product('t8')] } }));
    await act(async () => {
      await result.current.refetchAll();
    });
    await waitFor(() => expect(result.current.trade.map((p: { id: string }) => p.id)).toEqual(['t9', 't8']));
  });

  it('first-load failure: queries end in error with no data, rails are empty, popular reports failed', async () => {
    mockGetAll.mockRejectedValue(serverError());
    mockGetPopular.mockRejectedValue(serverError());
    const { result, client } = setup();

    await waitFor(() => expect(client.getQueryState(qk.products.popular)?.status).toBe('error'));
    await waitFor(() => expect(client.getQueryState(qk.products.homeFeatured)?.status).toBe('error'));

    // A failure is not written to the cache as an empty "success".
    expect(client.getQueryData(qk.products.homeFeatured)).toBeUndefined();
    expect(client.getQueryData(qk.products.popular)).toBeUndefined();
    expect(result.current.featured).toEqual([]);
    expect(result.current.onSale).toEqual([]);
    expect(result.current.trade).toEqual([]);
    expect(result.current.popular).toEqual([]);
    expect(result.current.loadingFeatured).toBe(false);
    expect(result.current.loadingPopular).toBe(false);
    expect(result.current.failedPopular).toBe(true);
  });

  it('a successful empty result is an empty, non-failed rail', async () => {
    mockGetAll.mockResolvedValue({ data: { data: [] } });
    mockGetPopular.mockResolvedValue({ data: { data: [] } });
    const { result, client } = setup();

    await waitFor(() => expect(client.getQueryState(qk.products.popular)?.status).toBe('success'));
    await waitFor(() => expect(client.getQueryState(qk.products.homeTrade)?.status).toBe('success'));

    expect(result.current.popular).toEqual([]);
    expect(result.current.trade).toEqual([]);
    expect(result.current.failedPopular).toBe(false);
  });

  it('a first-load failure that later refetches successfully fills the rail', async () => {
    mockGetPopular.mockRejectedValue(serverError());
    const { result, client } = setup();
    await waitFor(() => expect(client.getQueryState(qk.products.popular)?.status).toBe('error'));
    expect(result.current.failedPopular).toBe(true);

    mockGetPopular.mockResolvedValue({ data: { data: [product('p2')] } });
    await act(async () => {
      await result.current.refetchAll();
    });
    await waitFor(() => expect(result.current.popular).toHaveLength(1));
    expect(result.current.failedPopular).toBe(false);
  });
});

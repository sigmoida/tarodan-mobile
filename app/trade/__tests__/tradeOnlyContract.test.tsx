/**
 * Contract fixtures for the paged trade pickers (tarodan-ops
 * `contracts/deltas/2026-10-21-products-my-trade-only.md`).
 *
 * The requests go through the real axios client (`@/lib/api`), so the test pins the query string
 * the server reads: `tradeOnly` and `tradeEligible` as the string "true" (`@QueryBoolean` counts
 * only that), `status=active`, `page` and `limit` within the max of 100, and no `tradeEligible`
 * on the counter's my side. The bodies are the delta's envelope
 * `{ data, meta: { total, page, limit, totalPages } }`: `meta.totalPages` alone drives "Show more".
 */
import React from 'react';
import type { InternalAxiosRequestConfig } from 'axios';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => mockParams,
  useFocusEffect: jest.fn(),
}));
jest.mock('@/hooks/useFeatureAccess', () => ({
  useFeatureAccess: () => ({ canTrade: true }),
}));
jest.mock('@/hooks/useLegalIdentity', () => require('@/test-utils/legalIdentity').legalIdentityGatePassMock);

import { useAuthStore } from '@/stores/authStore';
import { useNewTrade } from '../new/_hooks/useNewTrade';
import { useTradeCounter } from '../counter/[id]/_hooks/useTradeCounter';

/** Rows the fake server holds per path; 20 per page like the API default. */
let rowsByPath: Record<string, number> = {};
let requests: Array<{ path: string; query: Record<string, string> }> = [];

const row = (path: string, n: number) => ({
  id: `${path === '/products/my' ? 'mine' : 'theirs'}-${n}`,
  title: `Car ${n}`,
  price: 100,
  status: 'active',
  isTradeEnabled: true,
});

beforeEach(() => {
  mockParams = {};
  rowsByPath = {};
  requests = [];
  useAuthStore.setState({ isAuthenticated: true, isLoading: false, user: { id: 'u1' } as never });
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const url = new URL(api.getUri(config), 'https://api.invalid');
    const path = url.pathname.replace(/^\/api/, '');
    const query = Object.fromEntries(url.searchParams.entries());
    requests.push({ path, query });
    let data: unknown = {};
    if (path === '/trades/trade-1') {
      data = {
        data: {
          id: 'trade-1',
          status: 'pending',
          initiatorId: 'u1',
          receiverId: 'u2',
          initiatorItems: [{ id: 'ti1', productId: 'mine-t', productTitle: 'Mine', valueAtTrade: 1, quantity: 1 }],
          receiverItems: [{ id: 'ti2', productId: 'theirs-t', productTitle: 'Theirs', valueAtTrade: 1, quantity: 1 }],
        },
      };
    } else if (path in rowsByPath) {
      const total = rowsByPath[path]!;
      const page = Number(query.page);
      const limit = Number(query.limit);
      const all = Array.from({ length: total }, (_, i) => row(path, i + 1));
      data = {
        data: all.slice((page - 1) * limit, page * limit),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }
    return { status: 200, data, headers: {}, config, statusText: '' };
  };
});

afterEach(() => {
  useAuthStore.setState({ isAuthenticated: false, user: null });
});

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, networkMode: 'always' } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const requestsTo = (path: string) => requests.filter((r) => r.path === path).map((r) => r.query);

describe('GET /products/my with tradeOnly (new trade, my side)', () => {
  it('sends the delta query and pages by meta.totalPages', async () => {
    mockParams = { targetSellerId: 'u2' };
    rowsByPath = { '/products/my': 45, '/products': 0 };
    const { result } = renderHook(() => useNewTrade(), { wrapper });
    await waitFor(() => expect(result.current.myProducts).toHaveLength(20));

    expect(requestsTo('/products/my')).toEqual([
      { status: 'active', tradeEligible: 'true', tradeOnly: 'true', page: '1', limit: '20' },
    ]);
    expect(result.current.myHasMore).toBe(true);

    await act(async () => result.current.loadMoreMine());
    await waitFor(() => expect(result.current.myProducts).toHaveLength(40));
    await act(async () => result.current.loadMoreMine());
    await waitFor(() => expect(result.current.myProducts).toHaveLength(45));
    expect(result.current.myHasMore).toBe(false);
    expect(requestsTo('/products/my').map((q) => q.page)).toEqual(['1', '2', '3']);
    for (const q of requestsTo('/products/my')) expect(Number(q.limit)).toBeLessThanOrEqual(100);
  });

  it('their side reads the public list, newest first, with the same envelope', async () => {
    mockParams = { targetSellerId: 'u2' };
    rowsByPath = { '/products/my': 0, '/products': 21 };
    const { result } = renderHook(() => useNewTrade(), { wrapper });
    await waitFor(() => expect(result.current.theirProducts).toHaveLength(20));
    expect(requestsTo('/products')).toEqual([
      { sellerId: 'u2', tradeOnly: 'true', status: 'active', sortBy: 'created_desc', page: '1', limit: '20' },
    ]);
    expect(result.current.theirHasMore).toBe(true);
  });
});

describe('GET /products/my with tradeOnly (counter offer, my side)', () => {
  it('sends tradeOnly without tradeEligible', async () => {
    mockParams = { id: 'trade-1' };
    rowsByPath = { '/products/my': 3, '/products': 0 };
    const { result } = renderHook(() => useTradeCounter(), { wrapper });
    await waitFor(() => expect(result.current.myProducts).toHaveLength(4));
    expect(requestsTo('/products/my')).toEqual([{ status: 'active', tradeOnly: 'true', page: '1', limit: '20' }]);
    expect(requestsTo('/products')).toEqual([
      { sellerId: 'u2', status: 'active', tradeOnly: 'true', sortBy: 'created_desc', page: '1', limit: '20' },
    ]);
    expect(result.current.myHasMore).toBe(false);
  });
});

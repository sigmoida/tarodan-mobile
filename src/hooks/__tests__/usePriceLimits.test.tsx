/**
 * `usePriceLimits` — `GET /admin/settings/public` ilan fiyat sınırları. Merkezi anahtar,
 * eksik alan = sınır yok, istek düşerse form bloklanmaz (null).
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeTestQueryClient } from '@/test-utils/render';

jest.mock('@/lib/api', () => ({
  publicSettingsApi: { getPublicSettings: jest.fn() },
}));
import { publicSettingsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { usePriceLimits } from '../usePriceLimits';

const settingsMock = publicSettingsApi.getPublicSettings as jest.Mock;

function setup() {
  const client = makeTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => settingsMock.mockReset());

it('min ve max değerlerini okur ve merkezi anahtarla önbelleğe alır', async () => {
  settingsMock.mockResolvedValue({ data: { min_product_price: 250, max_product_price: 90000, max_message_length: 500 } });
  const { client, wrapper } = setup();
  const { result } = renderHook(() => usePriceLimits(), { wrapper });
  expect(result.current).toMatchObject({ minPrice: null, maxPrice: null, isLoading: true });
  await waitFor(() => expect(result.current.minPrice).toBe(250));
  expect(result.current).toMatchObject({ maxPrice: 90000, isLoading: false });
  expect(client.getQueryData(qk.publicSettings.all)).toEqual({ minPrice: 250, maxPrice: 90000 });
});

it('yanıtta olmayan ayar = sınır yok', async () => {
  settingsMock.mockResolvedValue({ data: { max_message_length: 500 } });
  const { wrapper } = setup();
  const { result } = renderHook(() => usePriceLimits(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current).toMatchObject({ minPrice: null, maxPrice: null });
});

it('istek düşerse sınır null kalır (form bloklanmaz)', async () => {
  settingsMock.mockRejectedValue(new Error('500'));
  const { client, wrapper } = setup();
  const { result } = renderHook(() => usePriceLimits(), { wrapper });
  await waitFor(() => expect(client.getQueryState(qk.publicSettings.all)?.status).toBe('error'), { timeout: 4000 });
  expect(result.current).toMatchObject({ minPrice: null, maxPrice: null });
});

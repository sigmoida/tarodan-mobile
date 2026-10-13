/**
 * Parite A-3.1 · `useTimingPolicy` — `GET /timing-rules`'ın tek istemci okuması.
 * Merkezi anahtar (`qk.timingPolicy.all`), ayrıştırma; hata önbelleğe yazılmaz,
 * yalnız gösterim geri düşer (web `retry: 1`).
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeTestQueryClient } from '@/test-utils/render';

jest.mock('@/lib/api', () => ({
  timingRulesApi: { getPolicy: jest.fn() },
}));
import { timingRulesApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useTimingPolicy, useTimingValues } from '../useTimingPolicy';

const policyMock = timingRulesApi.getPolicy as jest.Mock;

function setup() {
  const client = makeTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => policyMock.mockReset());

it('sunucu değerlerini merkezi anahtarla önbelleğe alır', async () => {
  policyMock.mockResolvedValue({ data: { returnWindowDays: { value: 30, unit: 'days' } } });
  const { client, wrapper } = setup();
  const { result } = renderHook(() => useTimingValues(), { wrapper });
  expect(result.current.returnWindowDays).toBe(14); // yüklenirken geri düşüş
  await waitFor(() => expect(result.current.returnWindowDays).toBe(30));
  expect(client.getQueryData(qk.timingPolicy.all)).toMatchObject({
    returnWindowDays: { value: 30, unit: 'days' },
  });
  expect(policyMock).toHaveBeenCalledTimes(1);
});

it('istek düşerse: bir kez yeniden dener, önbelleğe YAZMAZ, gösterim geri düşüşte kalır', async () => {
  policyMock.mockRejectedValue(new Error('500'));
  const { client, wrapper } = setup();
  const { result } = renderHook(() => useTimingPolicy(), { wrapper });
  await waitFor(() => expect(client.getQueryState(qk.timingPolicy.all)?.status).toBe('error'), {
    timeout: 4000,
  });
  // web gibi `retry: 1` → toplam iki istek
  expect(policyMock).toHaveBeenCalledTimes(2);
  // Başarısız sonuç önbelleğe "veri" olarak yazılmadı
  expect(client.getQueryData(qk.timingPolicy.all)).toBeUndefined();
  // Ekran yine varsayılanlarla çizilir (yalnız gösterim)
  expect(result.current.returnWindowDays.value).toBe(14);
  expect(result.current.orderPaymentWindowHours.value).toBe(24);
});

it('hatadan sonra yeniden çekimde sunucu değeri gelir (geri düşüş önbellekte takılı kalmaz)', async () => {
  policyMock.mockRejectedValue(new Error('500'));
  const { client, wrapper } = setup();
  const { result } = renderHook(() => useTimingValues(), { wrapper });
  await waitFor(() => expect(client.getQueryState(qk.timingPolicy.all)?.status).toBe('error'), {
    timeout: 4000,
  });
  policyMock.mockResolvedValue({ data: { returnWindowDays: { value: 21, unit: 'days' } } });
  await client.refetchQueries({ queryKey: qk.timingPolicy.all });
  await waitFor(() => expect(result.current.returnWindowDays).toBe(21));
});

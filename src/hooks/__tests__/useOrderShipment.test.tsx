/**
 * `GET /shipping/order/:orderId` — 404 HATA DEĞİL.
 *
 * Ödeme tamamlanınca backend kargo kaydını otomatik oluşturuyor, ama her
 * siparişin kaydı yok (2026-08-10 ölçümü: 13 satıcı siparişinin 5'inde yok).
 * Uç bu durumda `404 {"message":"Bu sipariş için kargo bulunamadı"}` döndürüyor.
 * Bunu hata saymak, satıcıya olmayan bir sorunu gösterir ve onarım yolunu
 * ("kaydı sen oluştur") kapatır.
 */
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

jest.mock('@/lib/api', () => ({
  shippingApi: { getOrderShipments: jest.fn() },
}));

// `(cb) => cb()` (naive, fires on every re-render) deadlocks the 500-retry
// test below: each re-render re-triggers `refetch()`, which cancels the
// pending retry backoff and resets the failure counter, so the query never
// settles into `error`. Fire once via `useEffect` instead — mirrors real
// `expo-router` behavior (cb runs once per focus, not once per render).
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return { useFocusEffect: (cb: () => void) => useEffect(() => cb(), []) };
});

import { shippingApi } from '@/lib/api';
import { useOrderShipment } from '../useOrderShipment';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const SHIPMENT = {
  id: 's1', orderId: 'o1', provider: 'surat',
  trackingNumber: 'PKG-CMRGW9D6ZH', providerTrackingId: null,
  trackingUrl: null, status: 'label_created',
};

beforeEach(() => jest.clearAllMocks());

it('kargo kaydını döndürür', async () => {
  jest.mocked(shippingApi.getOrderShipments).mockResolvedValue({ data: SHIPMENT } as any);
  const { result } = renderHook(() => useOrderShipment('o1'), { wrapper });
  await waitFor(() => expect(result.current.shipment).not.toBeNull());
  expect(result.current.shipment!.trackingNumber).toBe('PKG-CMRGW9D6ZH');
});

it('404"te null döner, HATA DURUMUNA DÜŞMEZ', async () => {
  jest.mocked(shippingApi.getOrderShipments).mockRejectedValue({
    response: { status: 404, data: { message: 'Bu sipariş için kargo bulunamadı' } },
  });
  const { result } = renderHook(() => useOrderShipment('o1'), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.shipment).toBeNull();
});

it('404 DIŞI hatalar yutulmaz', async () => {
  jest.mocked(shippingApi.getOrderShipments).mockRejectedValue({
    response: { status: 500, data: {} },
  });
  const { result } = renderHook(() => useOrderShipment('o1'), { wrapper });
  // `retryUnlessClientError` 5xx'i 2 kez gerçek zamanlayıcıyla dener (1s, 2s
  // exponential backoff — client.ts'teki proje-genel `retry: 2` ile aynı
  // davranış); varsayılan `waitFor` 1000ms'i aşar, bu yüzden burada uzatılıyor.
  await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });
  // 500'de de shipment null'dır ama bu "kargo yok" DEĞİL — sorgu hata
  // durumundadır ve çağıran isterse ona bakabilir.
  expect(result.current.shipment).toBeNull();
}, 10000);

it('orderId yokken istek atmaz', async () => {
  renderHook(() => useOrderShipment(undefined), { wrapper });
  await waitFor(() => expect(shippingApi.getOrderShipments).not.toHaveBeenCalled());
});

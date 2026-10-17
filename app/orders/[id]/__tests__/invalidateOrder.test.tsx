/**
 * A-3 inceleme #5 · İade/iptal mutasyonlarının ortak invalidation seti e-Arşiv
 * listesini de kapsar (iade/iptal yeni belge doğurabilir).
 */
import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeTestQueryClient } from '@/test-utils/render';
import { qk } from '@/lib/query';
import { useInvalidateOrder } from '../_hooks/useInvalidateOrder';

it('detay + listeler + e-Arşiv belgeleri invalidate edilir', () => {
  const client = makeTestQueryClient();
  const spy = jest.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useInvalidateOrder('order-9'), { wrapper });
  result.current();
  const keys = spy.mock.calls.map(([filters]) => filters?.queryKey);
  expect(keys).toEqual(
    expect.arrayContaining([qk.orders.detail('order-9'), qk.orders.all, qk.orders.elogoInvoices('order-9')]),
  );
});

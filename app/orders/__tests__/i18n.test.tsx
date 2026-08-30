/**
 * Siparişler ekranı i18n.
 *
 * `t` anahtarı aynen döndürecek şekilde mock'lanıyor: ekranda anahtar
 * görünüyorsa metin katalogdan geliyor demektir. Durum rozetlerinin etiketleri
 * de dahil — onlar saf bir `_lib` modülünde sabit Türkçe olarak duruyordu.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useFocusEffect: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(() => Promise.resolve({ data: [] })) },
  ordersApi: { getAll: jest.fn(() => Promise.resolve({ data: [] })) },
  refundsApi: { getMine: jest.fn(() => Promise.resolve({ data: [] })) },
}));

const mockAuth = { isAuthenticated: false, user: null };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (s: any) => unknown) => (sel ? sel(mockAuth) : mockAuth),
}));

import OrdersScreen from '../index';
import { useOrderStatusConfig } from '../_lib/ordersStatus';
import { renderHook } from '@testing-library/react-native';

describe('orders screen i18n', () => {
  it('takes the signed-out prompt from the catalogue', async () => {
    renderWithProviders(<OrdersScreen />);

    expect(await screen.findByText('order.myOrders')).toBeTruthy();
    expect(screen.getByText('order.signInToView')).toBeTruthy();
  });

  it('leaves no hardcoded Turkish in the signed-out prompt', () => {
    renderWithProviders(<OrdersScreen />);

    expect(screen.queryByText(/Siparişlerinizi görmek için/)).toBeNull();
  });
});

describe('order status labels', () => {
  it('reads every badge label from the catalogue', () => {
    const { result } = renderHook(() => useOrderStatusConfig());

    expect(result.current.paid!.label).toBe('order.statusPaid');
    expect(result.current.shipped!.label).toBe('order.statusShipped');
    expect(result.current.cancelled!.label).toBe('order.statusCancelled');
  });

  it('keeps the semantic variant alongside the translated label', () => {
    const { result } = renderHook(() => useOrderStatusConfig());

    expect(result.current.delivered!.variant).toBe('success');
    expect(result.current.cancelled!.variant).toBe('danger');
  });
});

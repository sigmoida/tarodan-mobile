/**
 * J78/J79/J89 · Payment history, mobile UI slice.
 * List render, inline details (accordion, one open at a time, no dialog, no provider), status
 * badges (completed/failed/pending), empty and login-required states.
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { appAlert, theme } from '@/ui';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useFocusEffect: (cb: () => void) => {
    const React = require('react');
    React.useEffect(() => cb(), []);
  },
}));

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  paymentsApi: { getMyPayments: jest.fn() },
}));
import { paymentsApi } from '@/lib/api';

let mockIsAuthenticated = true;
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = ({ isAuthenticated: mockIsAuthenticated });
    return sel ? sel(state) : state;
  },
}));

import PaymentHistoryScreen from '../payment-history';

const getMock = paymentsApi.getMyPayments as jest.Mock;

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pay-1',
    amount: 199.9,
    status: 'completed',
    method: 'Kredi Kartı',
    description: 'Premium Üyelik',
    createdAt: new Date('2026-01-15').toISOString(),
    ...overrides,
  };
}

describe('J78 · Ödeme geçmişi liste render', () => {
  beforeEach(() => {
    getMock.mockReset();
    mockIsAuthenticated = true;
  });

  it('J78.1 ödemeler listelenir (açıklama + tutar)', async () => {
    getMock.mockResolvedValue({ data: { data: [payment()] } });
    renderWithProviders(<PaymentHistoryScreen />);
    await waitFor(() =>
      expect(screen.getByText('Premium Üyelik')).toBeOnTheScreen(),
    );
    expect(screen.getByText('199,90 TL')).toBeOnTheScreen();
    // The method is a detail: not in the closed row.
    expect(screen.queryByText('Kredi Kartı')).toBeNull();
  });

  it('J78.2 birden çok ödeme render edilir', async () => {
    getMock.mockResolvedValue({
      data: { data: [
        payment({ id: 'p1', description: 'Ödeme A' }),
        payment({ id: 'p2', description: 'Ödeme B' }),
      ] },
    });
    renderWithProviders(<PaymentHistoryScreen />);
    await waitFor(() => expect(screen.getByText('Ödeme A')).toBeOnTheScreen());
    expect(screen.getByText('Ödeme B')).toBeOnTheScreen();
  });
});

describe('J78 · Inline details (accordion)', () => {
  beforeEach(() => {
    getMock.mockReset();
    mockIsAuthenticated = true;
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  const row = (id: string) => screen.getByTestId(`payment-history-row-${id}`);
  const details = (id: string) => screen.queryByTestId(`payment-history-details-${id}`);
  /** Lets the close animation finish so the closed details unmount. */
  const settle = () =>
    act(() => {
      jest.advanceTimersByTime(theme.duration.normal + 100);
    });

  it('a tap opens the details under the row, another row closes it, a second tap closes it', async () => {
    getMock.mockResolvedValue({
      data: {
        payments: [
          payment({ id: 'p1', description: 'Ödeme A' }),
          payment({ id: 'p2', description: 'Ödeme B', method: undefined, provider: 'paytr' }),
        ],
      },
    });
    renderWithProviders(<PaymentHistoryScreen />);
    await waitFor(() => expect(screen.getByText('Ödeme A')).toBeOnTheScreen());
    expect(details('p1')).toBeNull();
    expect(row('p1').props.accessibilityState).toMatchObject({ expanded: false });

    fireEvent.press(row('p1'));
    expect(row('p1').props.accessibilityState).toMatchObject({ expanded: true });
    expect(details('p1')).toBeOnTheScreen();
    expect(screen.getByText('Ödeme Yöntemi')).toBeOnTheScreen();
    expect(screen.getByText('Kredi Kartı')).toBeOnTheScreen();
    expect(appAlert).not.toHaveBeenCalled();

    fireEvent.press(row('p2'));
    expect(row('p1').props.accessibilityState).toMatchObject({ expanded: false });
    expect(row('p2').props.accessibilityState).toMatchObject({ expanded: true });
    settle();
    expect(details('p1')).toBeNull();
    expect(details('p2')).toBeOnTheScreen();
    // No method from the API: a generic "Kart", never the provider.
    expect(screen.getByText('Kart')).toBeOnTheScreen();
    expect(screen.queryByText(/paytr/i, { includeHiddenElements: true })).toBeNull();

    fireEvent.press(row('p2'));
    expect(row('p2').props.accessibilityState).toMatchObject({ expanded: false });
    settle();
    expect(details('p2')).toBeNull();
    expect(appAlert).not.toHaveBeenCalled();
  });
});

describe('J79 · Durum rozetleri', () => {
  beforeEach(() => {
    getMock.mockReset();
    mockIsAuthenticated = true;
  });

  it('J79.1 başarılı ödeme → "Tamamlandı" rozeti', async () => {
    getMock.mockResolvedValue({ data: { data: [payment({ status: 'completed' })] } });
    renderWithProviders(<PaymentHistoryScreen />);
    await waitFor(() => expect(screen.getByText('Tamamlandı')).toBeOnTheScreen());
  });

  it('J79.2 başarısız ödeme → "Başarısız" rozeti', async () => {
    getMock.mockResolvedValue({ data: { data: [payment({ status: 'failed' })] } });
    renderWithProviders(<PaymentHistoryScreen />);
    await waitFor(() => expect(screen.getByText('Başarısız')).toBeOnTheScreen());
  });

  it('J79.3 bekleyen ödeme → "Bekliyor" rozeti', async () => {
    getMock.mockResolvedValue({ data: { data: [payment({ status: 'pending' })] } });
    renderWithProviders(<PaymentHistoryScreen />);
    await waitFor(() => expect(screen.getByText('Bekliyor')).toBeOnTheScreen());
  });
});

describe('J89 · Boş / giriş gerekli durumu', () => {
  beforeEach(() => {
    getMock.mockReset();
    mockIsAuthenticated = true;
  });

  it('J89.1 ödeme yoksa boş durum mesajı gösterilir', async () => {
    getMock.mockResolvedValue({ data: { data: [] } });
    renderWithProviders(<PaymentHistoryScreen />);
    // i18n slice: reuses payment.noHistory ("Henüz ödeme geçmişiniz bulunmuyor"),
    // adds "Henüz" vs. the screen's previous hardcoded "Ödeme geçmişiniz bulunmuyor".
    await waitFor(() =>
      expect(screen.getByText('Henüz ödeme geçmişiniz bulunmuyor')).toBeOnTheScreen(),
    );
  });

  it('J89.2 misafir kullanıcı → giriş yap çağrısı gösterilir', async () => {
    mockIsAuthenticated = false;
    renderWithProviders(<PaymentHistoryScreen />);
    expect(screen.getByText('Giriş Yapın')).toBeOnTheScreen();
    expect(screen.getByText('Giriş Yap')).toBeOnTheScreen();
  });
});

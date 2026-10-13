/**
 * B4 · Takas başlatma (`useNewTrade.handleSubmit`) ve takas nakit ödemesi
 * (`useTradeActions.cashPay`) yasal kimlik kapısından geçer.
 *
 * Gerçek `ensureLegalIdentity` + istek store'u: kimliği eksik üyede kapı
 * açılır, istek GİTMEZ; kaydedilince işlem devam eder, "Vazgeç"te hiç
 * başlamaz.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeTestQueryClient } from '@/test-utils';
import { MISSING_LEGAL_IDENTITY, settleGateAndWait } from '@/test-utils/legalIdentity';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

jest.mock('@/hooks/useFeatureAccess', () => ({
  useFeatureAccess: () => ({ canTrade: true }),
}));

jest.mock('@/lib/api', () => ({
  legalIdentityApi: { getStatus: jest.fn(), submit: jest.fn() },
  tradesApi: {
    accept: jest.fn(() => Promise.resolve({ data: {} })),
    create: jest.fn(() => Promise.resolve({ data: { id: 'trade-1' } })),
    previewPaymentQuote: jest.fn(() => Promise.resolve({ data: {} })),
  },
  productsApi: {
    getOne: jest.fn(() => Promise.resolve({ data: {} })),
    getMyListings: jest.fn(() => Promise.resolve({ data: [] })),
    getAll: jest.fn(() => Promise.resolve({ data: [] })),
  },
  paymentsApi: {
    initiateTradeCash: jest.fn(() => Promise.resolve({ data: { data: { paymentId: 'pay-1' } } })),
  },
}));

import { legalIdentityApi, paymentsApi, tradesApi } from '@/lib/api';
import { appAlert } from '@/ui'; // jest.setup'ta global jest.fn
import { useAuthStore } from '@/stores/authStore';
import {
  settleLegalIdentityRequest,
  useLegalIdentityRequestStore,
} from '@/stores/legalIdentityRequestStore';
import { useNewTrade } from '../new/_hooks/useNewTrade';
import { useTradeActions } from '../[id]/_hooks/useTradeActions';

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={makeTestQueryClient()}>{children}</QueryClientProvider>;
}

const gateOpened = () =>
  waitFor(() => expect(useLegalIdentityRequestStore.getState().requested).toBe(true));

beforeEach(() => {
  jest.clearAllMocks();
  (legalIdentityApi.getStatus as jest.Mock).mockResolvedValue({ data: MISSING_LEGAL_IDENTITY });
  useAuthStore.setState({ isAuthenticated: true, isLoading: false, user: { id: 'u1' } as any });
});

afterEach(() => {
  act(() => settleLegalIdentityRequest(false));
  useAuthStore.setState({ isAuthenticated: false, user: null });
});

describe('Takas başlatma · yasal kimlik kapısı', () => {
  function readyToSubmit() {
    const hook = renderHook(() => useNewTrade(), { wrapper });
    act(() => {
      hook.result.current.toggleMyItem({ id: 'mine-1', price: 100 } as any);
      hook.result.current.toggleTheirItem({ id: 'theirs-1', price: 120 } as any);
      hook.result.current.setTradeAddressId('addr-1');
    });
    return hook;
  }

  it('kimlik eksik → kapı açılır, teklif gitmez; kaydedilince takas oluşturulur', async () => {
    const { result } = readyToSubmit();
    act(() => {
      void result.current.handleSubmit();
    });

    await gateOpened();
    expect(tradesApi.create).not.toHaveBeenCalled();
    // Kapı süresince gönder düğmesi yükleniyor/devre dışı.
    expect(result.current.submitPending).toBe(true);

    act(() => settleLegalIdentityRequest(true));
    await waitFor(() =>
      expect(tradesApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          initiatorItems: [{ productId: 'mine-1', quantity: 1 }],
          receiverItems: [{ productId: 'theirs-1', quantity: 1 }],
          shippingAddressId: 'addr-1',
        }),
      ),
    );
  });

  it('Vazgeç → takas oluşturulmaz', async () => {
    const { result } = readyToSubmit();
    act(() => {
      void result.current.handleSubmit();
    });

    await gateOpened();
    await settleGateAndWait(false);
    expect(tradesApi.create).not.toHaveBeenCalled();
    expect(result.current.submitPending).toBe(false);
  });

  it('form eksikse (adres yok) kimlik sorulmaz', async () => {
    const { result } = renderHook(() => useNewTrade(), { wrapper });
    act(() => {
      result.current.toggleMyItem({ id: 'mine-1', price: 100 } as any);
      result.current.toggleTheirItem({ id: 'theirs-1', price: 120 } as any);
    });
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(legalIdentityApi.getStatus).not.toHaveBeenCalled();
    expect(useLegalIdentityRequestStore.getState().requested).toBe(false);
  });
});

describe('Takas nakit ödemesi · yasal kimlik kapısı', () => {
  it('kimlik eksik → kapı açılır, ödeme başlamaz; kaydedilince ödeme başlar', async () => {
    const { result } = renderHook(() => useTradeActions('trade-1'), { wrapper });
    act(() => {
      void result.current.cashPay();
    });

    await gateOpened();
    expect(paymentsApi.initiateTradeCash).not.toHaveBeenCalled();
    expect(result.current.cashPayPending).toBe(true);

    act(() => settleLegalIdentityRequest(true));
    await waitFor(() => expect(paymentsApi.initiateTradeCash).toHaveBeenCalledWith('trade-1'));
  });

  it('Vazgeç → nakit ödeme başlamaz', async () => {
    const { result } = renderHook(() => useTradeActions('trade-1'), { wrapper });
    act(() => {
      void result.current.cashPay();
    });

    await gateOpened();
    await settleGateAndWait(false);
    expect(paymentsApi.initiateTradeCash).not.toHaveBeenCalled();
    expect(result.current.cashPayPending).toBe(false);
  });

  it('muaf hesapta kapı açılmadan ödeme başlar', async () => {
    (legalIdentityApi.getStatus as jest.Mock).mockResolvedValue({
      data: { ...MISSING_LEGAL_IDENTITY, required: false, missing: [] },
    });
    const { result } = renderHook(() => useTradeActions('trade-1'), { wrapper });
    await act(async () => {
      await result.current.cashPay();
    });
    expect(paymentsApi.initiateTradeCash).toHaveBeenCalledTimes(1);
    expect(useLegalIdentityRequestStore.getState().requested).toBe(false);
  });
});

describe('Takas kabulü · yasal kimlik kapısı (B4 inceleme 5)', () => {
  function readyToAccept() {
    const hook = renderHook(() => useTradeActions('trade-1'), { wrapper });
    act(() => hook.result.current.setTradeAddressId('addr-1'));
    return hook;
  }

  /** Onay penceresindeki "Takası Kabul Et" düğmesine bas. */
  const pressConfirm = () => {
    const buttons = (appAlert as jest.Mock).mock.calls.at(-1)![2] as Array<{ style?: string; onPress?: () => void }>;
    act(() => buttons.find((b) => b.style !== 'cancel')!.onPress!());
  };

  it('kimlik eksik → onaydan ÖNCE kapı açılır; kaydedilince onay, sonra kabul isteği', async () => {
    const { result } = readyToAccept();
    act(() => {
      void result.current.handleAccept();
    });

    await gateOpened();
    // Kapı açıkken onay penceresi yok (iOS iki modalı aynı anda sunamaz).
    expect(appAlert).not.toHaveBeenCalled();
    expect(result.current.acceptPending).toBe(true);

    await settleGateAndWait(true);
    expect(appAlert).toHaveBeenCalledTimes(1);
    pressConfirm();
    await waitFor(() => expect(tradesApi.accept).toHaveBeenCalledWith('trade-1', undefined, 'addr-1'));
  });

  it('Vazgeç → onay penceresi de kabul isteği de yok', async () => {
    const { result } = readyToAccept();
    act(() => {
      void result.current.handleAccept();
    });

    await gateOpened();
    await settleGateAndWait(false);
    expect(appAlert).not.toHaveBeenCalled();
    expect(tradesApi.accept).not.toHaveBeenCalled();
    expect(result.current.acceptPending).toBe(false);
  });

  it('teslimat adresi seçilmemişse kimlik sorulmaz', async () => {
    const { result } = renderHook(() => useTradeActions('trade-1'), { wrapper });
    await act(async () => {
      await result.current.handleAccept();
    });
    expect(legalIdentityApi.getStatus).not.toHaveBeenCalled();
    expect(useLegalIdentityRequestStore.getState().requested).toBe(false);
  });
});

describe('Takas aksiyonları · aksiyon başına kimlik hedefi (B4 inceleme tur 2 · 5)', () => {
  it('nakit ödeme kontrol edilirken kabul yükleniyor görünmez; kabul basışı yok sayılır', async () => {
    const { result } = renderHook(() => useTradeActions('trade-1'), { wrapper });
    act(() => result.current.setTradeAddressId('addr-1'));
    act(() => {
      void result.current.cashPay();
    });
    await gateOpened();
    expect(result.current.cashPayPending).toBe(true);
    expect(result.current.acceptPending).toBe(false);

    // Kontrol sürerken kabule basış: hedef değişmez, onay penceresi açılmaz.
    await act(async () => {
      await result.current.handleAccept();
    });
    expect(result.current.cashPayPending).toBe(true);
    expect(result.current.acceptPending).toBe(false);

    act(() => settleLegalIdentityRequest(true));
    await waitFor(() => expect(paymentsApi.initiateTradeCash).toHaveBeenCalledWith('trade-1'));
    expect(appAlert).not.toHaveBeenCalled();
    expect(tradesApi.accept).not.toHaveBeenCalled();
  });

  it('kabul kontrol edilirken nakit ödeme yükleniyor görünmez', async () => {
    const { result } = renderHook(() => useTradeActions('trade-1'), { wrapper });
    act(() => result.current.setTradeAddressId('addr-1'));
    act(() => {
      void result.current.handleAccept();
    });
    await gateOpened();
    expect(result.current.acceptPending).toBe(true);
    expect(result.current.cashPayPending).toBe(false);

    await settleGateAndWait(false);
    expect(result.current.acceptPending).toBe(false);
    expect(result.current.cashPayPending).toBe(false);
  });
});

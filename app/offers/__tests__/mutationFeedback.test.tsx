/**
 * Teklif mutation hook'ları (`useAppMutation` pilotları): başarıda toast.success + OFFER_INVALIDATES,
 * hatada toast.error(sunucu mesajı | yedek) — `appAlert` ARTIK çağrılmaz (modal-altı/donma riski yok).
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { appAlert, toast } from '@/ui';
import i18n from '@/i18n/config';

jest.mock('@/ui', () => ({
  appAlert: jest.fn(),
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
}));
jest.mock('@/lib/api', () => ({
  offersApi: {
    accept: jest.fn(),
    reject: jest.fn(),
    cancel: jest.fn(),
    counter: jest.fn(),
    buyerCounter: jest.fn(),
  },
}));
jest.mock('../_hooks/useConfirmOffer', () => ({ useConfirmOffer: () => jest.fn() }));

import { offersApi } from '@/lib/api';
import { OFFER_INVALIDATES } from '../_lib/invalidates';
import { useOfferActions } from '../_hooks/useOfferActions';
import { useDoCounterOffer } from '../_hooks/useDoCounterOffer';
import { useDoBuyerCounter } from '../_hooks/useDoBuyerCounter';

const api = offersApi as unknown as Record<string, jest.Mock>;
const successMock = toast.success as jest.Mock;
const errorMock = toast.error as jest.Mock;

function mountHook<T>(hook: () => T) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(hook, { wrapper }), invalidate };
}

const serverError = (message: string) => ({ response: { data: { message } } });

beforeEach(() => {
  successMock.mockClear();
  errorMock.mockClear();
  Object.values(api).forEach((m) => m.mockReset());
});

describe('useOfferActions', () => {
  it.each([
    ['accept', 'offer.offerAccepted', 'offer.acceptFailed'],
    ['reject', 'offer.offerRejected', 'offer.rejectFailed'],
    ['cancel', 'offer.offerCancelled', 'offer.cancelFailed'],
  ] as const)('%s: başarıda invalidate + toast.success', async (name, okKey) => {
    api[name].mockResolvedValue({});
    const { result, invalidate } = mountHook(() => useOfferActions());
    await act(async () => {
      result.current[name]('o1');
    });
    expect(api[name]).toHaveBeenCalledWith('o1');
    expect(successMock).toHaveBeenCalledWith(i18n.t(okKey));
    for (const key of OFFER_INVALIDATES) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: key });
    }
    expect(appAlert).not.toHaveBeenCalled();
  });

  it.each([
    ['accept', 'offer.acceptFailed'],
    ['reject', 'offer.rejectFailed'],
    ['cancel', 'offer.cancelFailed'],
  ] as const)('%s: hatada toast.error(sunucu mesajı), yoksa yedek; appAlert yok', async (name, failKey) => {
    api[name].mockRejectedValueOnce(serverError('Süre doldu'));
    const { result } = mountHook(() => useOfferActions());
    await act(async () => {
      result.current[name]('o1');
    });
    expect(errorMock).toHaveBeenLastCalledWith('Süre doldu');

    api[name].mockRejectedValueOnce({ response: { data: {} } });
    await act(async () => {
      result.current[name]('o2');
    });
    expect(errorMock).toHaveBeenLastCalledWith(i18n.t(failKey));
    expect(successMock).not.toHaveBeenCalled();
    expect(appAlert).not.toHaveBeenCalled();
  });

  it('pendingOfferIds: mutasyon bitince (başarıda da hatada da) id çıkar', async () => {
    api.accept.mockRejectedValueOnce(serverError('x'));
    const { result } = mountHook(() => useOfferActions());
    await act(async () => {
      result.current.accept('o1');
    });
    expect(result.current.pendingOfferIds.has('o1')).toBe(false);
  });
});

describe.each([
  ['useDoCounterOffer', useDoCounterOffer, 'counter', 'offer.counterSent'],
  ['useDoBuyerCounter', useDoBuyerCounter, 'buyerCounter', 'offer.buyerCounterSent'],
] as const)('%s', (_n, useHook, apiName, okKey) => {
  it('başarı: invalidate + toast.success', async () => {
    api[apiName].mockResolvedValue({});
    const { result, invalidate } = mountHook(() => useHook());
    await act(async () => {
      result.current.mutate({ id: 'o1', amount: 150 });
    });
    expect(api[apiName]).toHaveBeenCalledWith('o1', 150);
    expect(successMock).toHaveBeenCalledWith(i18n.t(okKey));
    expect(invalidate).toHaveBeenCalledTimes(OFFER_INVALIDATES.length);
  });

  it('hata: toast.error(sunucu mesajı | yedek), appAlert yok', async () => {
    api[apiName].mockRejectedValueOnce(serverError('Tutar çok düşük'));
    const { result } = mountHook(() => useHook());
    await act(async () => {
      result.current.mutate({ id: 'o1', amount: 1 });
    });
    expect(errorMock).toHaveBeenLastCalledWith('Tutar çok düşük');

    api[apiName].mockRejectedValueOnce({ response: { data: {} } });
    await act(async () => {
      result.current.mutate({ id: 'o1', amount: 1 });
    });
    expect(errorMock).toHaveBeenLastCalledWith(i18n.t('offer.counterFailed'));
    expect(appAlert).not.toHaveBeenCalled();
  });
});

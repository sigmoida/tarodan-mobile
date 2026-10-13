/**
 * B2 inceleme 8 · Ön plana dönüşte yalnız verilen sorgu yenilenir; global
 * focusManager AppState'e bağlanmaz. iOS'un kısa `inactive` sıçramaları
 * (Face ID, giriş penceresi, "Parolayı kaydet") yenileme sayılmaz.
 */
import React from 'react';
import { AppState } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { makeTestQueryClient } from '@/test-utils';
import { useRefetchOnForeground } from '../useRefetchOnForeground';

let listeners: ((s: string) => void)[] = [];
const emit = (...states: string[]) =>
  act(() => states.forEach((s) => listeners.forEach((l) => l(s))));

beforeEach(() => {
  listeners = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((type, fn) => {
    if (type === 'change') listeners.push(fn as (s: string) => void);
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
});
afterEach(() => jest.restoreAllMocks());

function setup(opts: { enabled?: boolean; withFn?: jest.Mock } = {}) {
  const client = makeTestQueryClient();
  const target = jest.fn(() => Promise.resolve('ok'));
  const other = jest.fn(() => Promise.resolve('other'));
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const view = renderHook(
    ({ enabled }: { enabled: boolean }) => {
      useQuery({ queryKey: ['target'], queryFn: target, staleTime: Infinity });
      useQuery({ queryKey: ['other'], queryFn: other, staleTime: Infinity });
      useRefetchOnForeground(opts.withFn ?? ['target'], { enabled });
    },
    { wrapper, initialProps: { enabled: opts.enabled ?? true } },
  );
  return { view, target, other };
}

describe('useRefetchOnForeground', () => {
  it('arka plandan dönüşte yalnız hedef sorguyu yeniler', async () => {
    const { target, other } = setup();
    await act(async () => {});
    expect(target).toHaveBeenCalledTimes(1);
    emit('background', 'active');
    await act(async () => {});
    expect(target).toHaveBeenCalledTimes(2);
    expect(other).toHaveBeenCalledTimes(1);
  });

  it('iOS inactive → active sıçraması yenileme sayılmaz', async () => {
    const { target } = setup();
    await act(async () => {});
    emit('inactive', 'active');
    await act(async () => {});
    expect(target).toHaveBeenCalledTimes(1);
  });

  it('background → inactive → active de dönüş sayılır (iOS geçişi)', async () => {
    const { target } = setup();
    await act(async () => {});
    emit('inactive', 'background', 'inactive', 'active');
    await act(async () => {});
    expect(target).toHaveBeenCalledTimes(2);
  });

  it('devre dışıyken görülen arka plan geçişi sonradan yenileme doğurmaz', async () => {
    const { view, target } = setup({ enabled: false });
    await act(async () => {});
    emit('background', 'active');
    view.rerender({ enabled: true });
    emit('inactive', 'active');
    await act(async () => {});
    expect(target).toHaveBeenCalledTimes(1);
  });

  it('fonksiyon hedefi de kabul eder', async () => {
    const refetch = jest.fn();
    setup({ withFn: refetch });
    emit('background', 'active');
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});

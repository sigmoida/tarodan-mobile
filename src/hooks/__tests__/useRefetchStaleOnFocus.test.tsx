/**
 * Ekrana dönüşte yalnız BAYAT sorgu tazelenir: ilk odak (mount yüklemesi sürüyor) ikinci istek
 * atmaz, taze veride istek gitmez, kapalı sorgu ve verilmeyen anahtar etkilenmez.
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { makeTestQueryClient } from '@/test-utils';
import { useRefetchStaleOnFocus } from '../useRefetchStaleOnFocus';

// Gerçek davranışın eşi: geri çağrı odakta (mount) ve odaktayken kimliği değişince çalışır;
// `refocus()` ekrana geri dönüşü taklit eder.
let latestFocusCb: (() => void) | null = null;
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useFocusEffect: (cb: () => void) => {
      latestFocusCb = cb;
      useEffect(() => cb(), [cb]);
    },
  };
});
const refocus = () => act(() => latestFocusCb?.());
// notifyManager bildirimleri setTimeout(0) ile toplar — act içinde bir tur bekle.
const flush = () => act(() => new Promise<void>((r) => setTimeout(r, 0)));

function setup(opts: { staleTime?: number; enabled?: boolean; maxAgeMs?: number } = {}) {
  const client = makeTestQueryClient();
  const target = jest.fn(() => Promise.resolve('ok'));
  const other = jest.fn(() => Promise.resolve('other'));
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const view = renderHook(
    ({ enabled }: { enabled: boolean }) => {
      useQuery({ queryKey: ['target', 'list'], queryFn: target, staleTime: opts.staleTime ?? 0, enabled });
      useQuery({ queryKey: ['other'], queryFn: other, staleTime: 0 });
      useRefetchStaleOnFocus([['target']], enabled, { maxAgeMs: opts.maxAgeMs });
    },
    { wrapper, initialProps: { enabled: opts.enabled ?? true } },
  );
  return { view, client, target, other };
}

beforeEach(() => {
  latestFocusCb = null;
});

describe('useRefetchStaleOnFocus', () => {
  it('ilk odakta ikinci istek atmaz (sorgu kendi yüklemesini yapar)', async () => {
    const { target } = setup();
    await flush();
    expect(target).toHaveBeenCalledTimes(1);
  });

  it('dönüşte bayat sorguyu önekle eşleyip tazeler; verilmeyen anahtara dokunmaz', async () => {
    const { target, other } = setup({ staleTime: 0 });
    await flush();
    refocus();
    await flush();
    expect(target).toHaveBeenCalledTimes(2);
    expect(other).toHaveBeenCalledTimes(1);
  });

  it('taze veride dönüş istek atmaz; invalidate sonrası dönüş tazeler', async () => {
    const { target, client } = setup({ staleTime: 60_000 });
    await flush();
    refocus();
    await flush();
    expect(target).toHaveBeenCalledTimes(1);

    // Yazma sonrası invalidate kendisi tazeler (aktif sorgu); ardından dönüş yeni istek atmaz.
    await act(() => client.invalidateQueries({ queryKey: ['target'] }));
    expect(target).toHaveBeenCalledTimes(2);
    refocus();
    await flush();
    expect(target).toHaveBeenCalledTimes(2);
  });

  it('kapalıyken odak tazelemez; açılınca ilk çalışma yine atlanır', async () => {
    const { view, target } = setup({ enabled: false });
    await flush();
    refocus();
    await flush();
    expect(target).not.toHaveBeenCalled();

    // Giriş yapılınca sorgu kendi yüklemesini yapar; odak etkisi ikinci istek eklemez.
    view.rerender({ enabled: true });
    await flush();
    expect(target).toHaveBeenCalledTimes(1);
    refocus();
    await flush();
    expect(target).toHaveBeenCalledTimes(2);
  });

  it('maxAgeMs: taze (staleTime içinde) ama süreden eski veri dönüşte tazelenir; yeni veri tazelenmez', async () => {
    const { target } = setup({ staleTime: 5 * 60_000, maxAgeMs: 30_000 });
    await flush();
    refocus();
    await flush();
    expect(target).toHaveBeenCalledTimes(1);

    const realNow = Date.now();
    const spy = jest.spyOn(Date, 'now').mockReturnValue(realNow + 31_000);
    try {
      refocus();
      await flush();
      expect(target).toHaveBeenCalledTimes(2);
    } finally {
      spy.mockRestore();
    }
  });
});

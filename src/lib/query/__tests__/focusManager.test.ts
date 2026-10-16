/**
 * TanStack `focusManager` ↔ React Native `AppState` köprüsü:
 * - arka plan → odak yok; gerçek dönüş (araya `background` girmiş) → odak var,
 * - iOS `inactive` sıçraması odağı değiştirmez ve yenileme doğurmaz,
 * - ön plana dönüşte yalnız ESKİMİŞ ekran sorguları yenilenir (taze olan değil),
 * - 60 sn'lik rozet yoklamaları arka planda durur (`refetchIntervalInBackground` false).
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { AppState } from 'react-native';
import { QueryClient, QueryObserver, focusManager } from '@tanstack/react-query';
import { createForegroundTracker, installFocusManager } from '../focusManager';
import { queryClient as appQueryClient } from '../client';

let listeners: ((s: string) => void)[] = [];
const noop = (): void => undefined;
const emit = (...states: string[]) => states.forEach((s) => listeners.forEach((l) => l(s)));

beforeEach(() => {
  listeners = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((type, fn) => {
    if (type === 'change') listeners.push(fn as (s: string) => void);
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
  installFocusManager(); // casus altında yeniden bağla (dinleyiciyi yakala)
  focusManager.setFocused(undefined);
});

afterEach(() => {
  focusManager.setFocused(undefined);
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('createForegroundTracker', () => {
  it('yalnız background → active dönüş sayılır', () => {
    const track = createForegroundTracker('active');
    expect(track('inactive')).toBeNull();
    expect(track('active')).toBeNull(); // iOS sıçraması
    expect(track('background')).toBe('background');
    expect(track('inactive')).toBeNull();
    expect(track('active')).toBe('foreground');
    expect(track('active')).toBeNull();
  });

  it('arka planda başlayan oturumun ilk active’i dönüş sayılır', () => {
    expect(createForegroundTracker('background')('active')).toBe('foreground');
  });
});

describe('installFocusManager', () => {
  it('uygulama sorgu istemcisi kurulurken AppState köprüsü + odakta yenileme açık', () => {
    expect(appQueryClient.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(true);
  });

  it('arka plan → odak yok; gerçek dönüş → odak var; inactive sıçraması dokunmaz', () => {
    expect(listeners).toHaveLength(1);
    expect(focusManager.isFocused()).toBe(true);
    emit('inactive');
    expect(focusManager.isFocused()).toBe(true);
    emit('background');
    expect(focusManager.isFocused()).toBe(false);
    emit('inactive', 'active');
    expect(focusManager.isFocused()).toBe(true);
  });

  it('ön plana dönüşte yalnız ESKİMİŞ etkin sorgu yenilenir; inactive sıçraması yenilemez', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { refetchOnWindowFocus: true, retry: false } },
    });
    client.mount();
    const fresh = jest.fn(async () => 'fresh');
    const stale = jest.fn(async () => 'stale');
    const freshObs = new QueryObserver(client, { queryKey: ['fresh'], queryFn: fresh, staleTime: 5 * 60_000 });
    const staleObs = new QueryObserver(client, { queryKey: ['stale'], queryFn: stale, staleTime: 0 });
    const unsubs = [freshObs.subscribe(noop), staleObs.subscribe(noop)];
    await new Promise((r) => setTimeout(r, 0));
    expect(fresh).toHaveBeenCalledTimes(1);
    expect(stale).toHaveBeenCalledTimes(1);

    emit('inactive', 'active'); // iOS sıçraması: hiçbir şey
    await new Promise((r) => setTimeout(r, 0));
    expect(stale).toHaveBeenCalledTimes(1);

    emit('background', 'active');
    await new Promise((r) => setTimeout(r, 0));
    expect(stale).toHaveBeenCalledTimes(2);
    expect(fresh).toHaveBeenCalledTimes(1); // taze sorgu her dönüşte çekilmez

    unsubs.forEach((u) => u());
    client.unmount();
    client.clear();
  });

  it('60 sn yoklama arka planda durur, ön plana dönünce sürer', async () => {
    jest.useFakeTimers();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.mount();
    const poll = jest.fn(async () => 1);
    // useNotificationUnreadCount / useHomeBadges ile aynı seçenekler (refetchIntervalInBackground yok).
    const obs = new QueryObserver(client, { queryKey: ['badge'], queryFn: poll, refetchInterval: 60_000 });
    const unsub = obs.subscribe(noop);
    await jest.advanceTimersByTimeAsync(0);
    expect(poll).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(60_000);
    expect(poll).toHaveBeenCalledTimes(2); // ön planda yoklar

    emit('background');
    await jest.advanceTimersByTimeAsync(180_000);
    expect(poll).toHaveBeenCalledTimes(2); // arka planda istek yok

    emit('active');
    await jest.advanceTimersByTimeAsync(60_000);
    expect(poll.mock.calls.length).toBeGreaterThanOrEqual(3);

    unsub();
    client.unmount();
    client.clear();
  });
});

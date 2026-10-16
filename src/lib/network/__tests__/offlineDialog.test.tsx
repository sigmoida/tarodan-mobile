/**
 * Entegrasyon: NetworkMonitor + gerçek AlertDialogHost + offlineDialog bağlaması.
 * Metin, düğmeler, "Tekrar dene", bağlantı dönünce kapanış, modal açıkken (iOS) erteleme,
 * ağ-hatası toast bastırma.
 */
import React from 'react';
import { Platform } from 'react-native';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';

const mockNetInfo = {
  addEventListener: jest.fn(),
  fetch: jest.fn(),
  refresh: jest.fn(),
};
jest.mock('@react-native-community/netinfo', () => mockNetInfo);

// jest.setup `@/ui`'deki appAlert'i jest.fn yapar (her testte mockReset); burada gerçek host'u
// çalıştırmak için `beforeEach`te gerçek uygulamaya yönlendirilir.
jest.mock('@/ui', () => {
  const actual = jest.requireActual('@/ui');
  return { ...actual, appAlert: jest.fn() };
});

import { AlertDialogHost, appAlert } from '@/ui';
import {
  appAlert as realAppAlert,
  resetAlertQueueForTests,
} from '@/ui/components/AlertDialog';
import { MODAL_CLOSE_DELAY_MS } from '@/ui/lib/modal-timing';
import { resetNetInfoForTests } from '../netinfo';
import { isOnline, resetNetworkStatusForTests } from '../networkStatus';
import { NetworkMonitor } from '../NetworkMonitor';
import { OFFLINE_DIALOG_DEBOUNCE_MS } from '../offlineDialogController';
import { isOfflineDialogActive } from '../offlineDialog';
import { shouldSuppressNetworkErrorToast } from '../networkError';

const MESSAGE = 'Lütfen internet bağlantınızı kontrol ediniz.';
type S = { isConnected: boolean | null; isInternetReachable?: boolean | null };
let emit: (s: S) => void;
const OFFLINE: S = { isConnected: false, isInternetReachable: false };
const ONLINE: S = { isConnected: true, isInternetReachable: true };

const originalOS = Platform.OS;
beforeEach(() => {
  jest.useFakeTimers();
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
  (appAlert as jest.Mock).mockImplementation(realAppAlert);
  resetNetworkStatusForTests();
  resetNetInfoForTests();
  mockNetInfo.addEventListener.mockReset().mockImplementation((cb) => {
    emit = cb;
    return jest.fn();
  });
  mockNetInfo.fetch.mockReset().mockResolvedValue(ONLINE);
  mockNetInfo.refresh.mockReset().mockResolvedValue(ONLINE);
});
afterEach(() => {
  cleanup();
  resetAlertQueueForTests();
  jest.useRealTimers();
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => originalOS });
});

function mount() {
  return render(
    <>
      <AlertDialogHost />
      <NetworkMonitor />
    </>,
  );
}
const flush = () =>
  act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
const goOffline = () => {
  act(() => emit(OFFLINE));
  act(() => jest.advanceTimersByTime(OFFLINE_DIALOG_DEBOUNCE_MS));
};

describe('NetworkMonitor + offline diyaloğu', () => {
  it('çevrimdışı geçişinde debounce sonrası başlık + mesaj + düğmelerle bir kez çıkar', () => {
    mount();
    act(() => emit(OFFLINE));
    expect(screen.queryByText(MESSAGE)).toBeNull(); // debounce
    act(() => jest.advanceTimersByTime(OFFLINE_DIALOG_DEBOUNCE_MS));
    expect(screen.getByText('Bağlantı Hatası')).toBeTruthy();
    expect(screen.getByText(MESSAGE)).toBeTruthy();
    expect(screen.getByText('Tamam')).toBeTruthy();
    expect(screen.getByText('Tekrar Dene')).toBeTruthy();
  });

  it('çevrimdışı AÇILIŞ: ilk ölçüm çevrimdışıysa gösterilir', async () => {
    mockNetInfo.fetch.mockResolvedValue(OFFLINE);
    mount();
    await flush();
    act(() => jest.advanceTimersByTime(OFFLINE_DIALOG_DEBOUNCE_MS));
    expect(screen.getByText(MESSAGE)).toBeTruthy();
  });

  it('Tamam sonrası aynı süreçte tekrar çıkmaz; bağlantı gelip yeniden gidince çıkar', () => {
    mount();
    goOffline();
    fireEvent.press(screen.getByText('Tamam'));
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    expect(screen.queryByText(MESSAGE)).toBeNull();
    act(() => jest.advanceTimersByTime(30_000));
    expect(screen.queryByText(MESSAGE)).toBeNull();

    act(() => emit(ONLINE));
    goOffline();
    expect(screen.getByText(MESSAGE)).toBeTruthy();
  });

  it('bağlantı gelince açık diyalog kendiliğinden kapanır', () => {
    mount();
    goOffline();
    expect(screen.getByText(MESSAGE)).toBeTruthy();
    act(() => emit(ONLINE));
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    expect(screen.queryByText(MESSAGE)).toBeNull();
    expect(isOnline()).toBe(true);
  });

  it('Tekrar dene: hâlâ çevrimdışıysa diyalog (kapanış sonrası) yeniden çıkar', async () => {
    mount();
    goOffline();
    mockNetInfo.refresh.mockResolvedValue(OFFLINE);
    fireEvent.press(screen.getByText('Tekrar Dene'));
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS)); // kapanış bitti -> onPress
    await flush();
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    expect(mockNetInfo.refresh).toHaveBeenCalled();
    expect(screen.getByText(MESSAGE)).toBeTruthy();
  });

  it('Tekrar dene: bağlantı varsa diyalog bir daha çıkmaz', async () => {
    mount();
    goOffline();
    fireEvent.press(screen.getByText('Tekrar Dene'));
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    await flush();
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    expect(screen.queryByText(MESSAGE)).toBeNull();
    expect(isOnline()).toBe(true);
  });

  it('modül yoksa (izleme kapalı) hiçbir şey göstermez', () => {
    mockNetInfo.addEventListener.mockImplementation(() => {
      throw new Error('native yok');
    });
    mount();
    act(() => jest.advanceTimersByTime(60_000));
    expect(screen.queryByText(MESSAGE)).toBeNull();
  });
});

describe('ağ-hatası bildirimi bastırma', () => {
  const networkError = { isAxiosError: true, code: 'ERR_NETWORK', message: 'Network Error' };
  const serverError = { isAxiosError: true, response: { status: 500 } };

  it('çevrimiçiyken bastırmaz', () => {
    mount();
    expect(shouldSuppressNetworkErrorToast(networkError)).toBe(false);
  });

  it('çevrimdışı + diyalog bekliyor/ekranda: ağ hatasını bastırır, sunucu hatasını bastırmaz', () => {
    mount();
    act(() => emit(OFFLINE));
    expect(isOfflineDialogActive()).toBe(true); // debounce penceresi
    expect(shouldSuppressNetworkErrorToast(networkError)).toBe(true);
    expect(shouldSuppressNetworkErrorToast(serverError)).toBe(false);
    expect(shouldSuppressNetworkErrorToast({ isAxiosError: true, code: 'ERR_CANCELED' })).toBe(
      false,
    );
    expect(shouldSuppressNetworkErrorToast(new Error('x'))).toBe(false);
  });

  it('kullanıcı diyaloğu kapattıktan sonra bastırmaz (sessiz kalınmaz)', () => {
    mount();
    goOffline();
    fireEvent.press(screen.getByText('Tamam'));
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    expect(isOnline()).toBe(false);
    expect(shouldSuppressNetworkErrorToast(networkError)).toBe(false);
  });
});

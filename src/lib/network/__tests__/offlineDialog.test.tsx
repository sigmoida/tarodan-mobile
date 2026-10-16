/**
 * Entegrasyon: NetworkMonitor + gerçek AlertDialogHost + offlineDialog bağlaması.
 * Metin, düğmeler, "Tekrar dene", bağlantı dönünce kapanış, açık modal / splash kapısı altında
 * erteleme, çift bildirim (toast süzgeci).
 */
import React from 'react';
import { Platform, Text as RNText } from 'react-native';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';

const mockNetInfo = {
  addEventListener: jest.fn(),
  refresh: jest.fn(),
  configure: jest.fn(),
};
jest.mock('@react-native-community/netinfo', () => mockNetInfo);

// jest.setup `@/ui`'deki appAlert'i jest.fn yapar (her testte mockReset); burada gerçek host'u
// çalıştırmak için `beforeEach`te gerçek uygulamaya yönlendirilir.
jest.mock('@/ui', () => {
  const actual = jest.requireActual('@/ui');
  return { ...actual, appAlert: jest.fn() };
});

import { AlertDialogHost, appAlert, Modal, toast } from '@/ui';
import {
  appAlert as realAppAlert,
  resetAlertQueueForTests,
} from '@/ui/components/AlertDialog';
import { MODAL_CLOSE_DELAY_MS } from '@/ui/lib/modal-timing';
import { resetModalPresenceForTests } from '@/ui/lib/modalPresence';
import { getToastSnapshot, resetToastStoreForTests } from '@/ui/lib/toastStore';
import { resetNetInfoForTests } from '../netinfo';
import { isOnline, OFFLINE_CONFIRM_MS, resetNetworkStatusForTests } from '../networkStatus';
import { hadRecentNetworkFailure, noteNetworkFailure, resetNetworkFailureForTests } from '../networkFailure';
import { NetworkMonitor } from '../NetworkMonitor';
import { offlineDialog, setOfflineDialogExternallyBlocked } from '../offlineDialog';

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
  resetNetworkFailureForTests();
  resetModalPresenceForTests();
  resetToastStoreForTests();
  setOfflineDialogExternallyBlocked(true);
  mockNetInfo.addEventListener.mockReset().mockImplementation((cb) => {
    emit = cb;
    return jest.fn();
  });
  mockNetInfo.refresh.mockReset().mockResolvedValue(ONLINE);
  mockNetInfo.configure.mockReset();
});
afterEach(() => {
  cleanup();
  resetAlertQueueForTests();
  jest.useRealTimers();
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => originalOS });
});

function Tree({ ready = true, modalOpen = false }: { ready?: boolean; modalOpen?: boolean }) {
  return (
    <>
      <AlertDialogHost />
      <NetworkMonitor ready={ready} />
      <Modal isOpen={modalOpen} onClose={() => undefined} title="Form">
        <RNText>modal-icerik</RNText>
      </Modal>
    </>
  );
}
const mount = (props?: React.ComponentProps<typeof Tree>) => render(<Tree {...props} />);
const flush = () =>
  act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
const goOffline = () => {
  act(() => emit(OFFLINE));
  act(() => jest.advanceTimersByTime(OFFLINE_CONFIRM_MS));
};
const networkError = { isAxiosError: true, code: 'ERR_NETWORK', message: 'Network Error' };

describe('NetworkMonitor + offline diyaloğu', () => {
  it('çevrimdışı kararında başlık + mesaj + düğmelerle bir kez çıkar; titreşimde çıkmaz', () => {
    mount();
    act(() => emit(OFFLINE));
    act(() => jest.advanceTimersByTime(500));
    act(() => emit(ONLINE)); // titreşim
    act(() => jest.advanceTimersByTime(30_000));
    expect(screen.queryByText(MESSAGE)).toBeNull();

    goOffline();
    expect(screen.getByText('Bağlantı Hatası')).toBeTruthy();
    expect(screen.getByText(MESSAGE)).toBeTruthy();
    expect(screen.getByText('Tamam')).toBeTruthy();
    expect(screen.getByText('Tekrar Dene')).toBeTruthy();
  });

  it('çevrimdışı AÇILIŞ: abonelikte hemen çevrimdışı gelirse gösterilir', () => {
    mockNetInfo.addEventListener.mockImplementation((cb) => {
      emit = cb;
      cb(OFFLINE);
      return jest.fn();
    });
    mount();
    act(() => jest.advanceTimersByTime(OFFLINE_CONFIRM_MS));
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
    mockNetInfo.refresh.mockResolvedValue({ isConnected: true, isInternetReachable: false });
    fireEvent.press(screen.getByText('Tekrar Dene'));
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS)); // kapanış bitti -> onPress
    await flush();
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    expect(mockNetInfo.refresh).toHaveBeenCalled();
    expect(screen.getByText(MESSAGE)).toBeTruthy();
  });

  it('Tekrar dene: refresh sonrası reachability null → önceki durum korunur, diyalog yeniden çıkar', async () => {
    mount();
    goOffline();
    mockNetInfo.refresh.mockResolvedValue({ isConnected: true, isInternetReachable: null });
    fireEvent.press(screen.getByText('Tekrar Dene'));
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    await flush();
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    expect(isOnline()).toBe(false);
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
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockNetInfo.addEventListener.mockImplementation(() => {
      throw new Error('native yok');
    });
    mount();
    act(() => jest.advanceTimersByTime(60_000));
    expect(screen.queryByText(MESSAGE)).toBeNull();
    warn.mockRestore();
  });
});

describe('engeller altında erteleme', () => {
  it('açık @/ui Modal varken AÇILMAZ (appAlert\'e hiç verilmez); modal kapanınca (kapanış penceresi sonrası) açılır', () => {
    const view = mount({ modalOpen: true });
    expect(screen.getByText('modal-icerik')).toBeTruthy();
    goOffline();
    expect(screen.queryByText(MESSAGE)).toBeNull();
    expect(appAlert).not.toHaveBeenCalled(); // kuyruğa girip diğer alert'leri bloklamaz

    view.rerender(<Tree modalOpen={false} />);
    // kapanış animasyonu / iOS oturma penceresi bitmeden hâlâ yok
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS - 1));
    expect(appAlert).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    expect(screen.getByText(MESSAGE)).toBeTruthy();
    expect(appAlert).toHaveBeenCalledTimes(1);
  });

  it('ertelenmişken bağlantı dönerse diyalog HİÇ gösterilmez', () => {
    const view = mount({ modalOpen: true });
    goOffline();
    act(() => emit(ONLINE));
    view.rerender(<Tree modalOpen={false} />);
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS * 3));
    expect(appAlert).not.toHaveBeenCalled();
    expect(screen.queryByText(MESSAGE)).toBeNull();
  });

  it('ertelenmiş offline diyaloğu başka appAlert\'leri bloklamaz', () => {
    mount({ modalOpen: true });
    goOffline();
    act(() => appAlert('Başka', 'x', [{ text: 'Peki' }]));
    expect(screen.getByText('Başka')).toBeTruthy();
  });

  it('splash / kapı (ready=false) bitene dek ertelenir; sonra gösterilir', () => {
    const view = mount({ ready: false });
    goOffline();
    expect(screen.queryByText(MESSAGE)).toBeNull();
    expect(appAlert).not.toHaveBeenCalled();
    view.rerender(<Tree ready />);
    expect(screen.getByText(MESSAGE)).toBeTruthy();
  });

  it('splash bitmeden bağlantı dönerse hiç gösterilmez', () => {
    const view = mount({ ready: false });
    goOffline();
    act(() => emit(ONLINE));
    view.rerender(<Tree ready />);
    expect(appAlert).not.toHaveBeenCalled();
  });
});

describe('çift bildirim: hata toast\'ı süzgeci (merkezî, toast.error)', () => {
  it('diyalog açıkken, az önce ağ hatası olduysa toast.error gösterilmez', () => {
    mount();
    goOffline();
    act(() => noteNetworkFailure(networkError));
    expect(hadRecentNetworkFailure()).toBe(true);
    act(() => {
      toast.error('İşlem başarısız');
    });
    expect(getToastSnapshot().current).toBeNull();
  });

  it('ağ hatası yoksa (ör. sunucu hatası) toast gösterilir', () => {
    mount();
    goOffline();
    act(() => noteNetworkFailure({ isAxiosError: true, response: { status: 500 } }));
    act(() => {
      toast.error('Sunucu hatası');
    });
    expect(getToastSnapshot().current?.message).toBe('Sunucu hatası');
  });

  it('çevrimdışı karar bekleniyorken (doğrulama penceresi) de bastırılır', () => {
    mount();
    act(() => emit(OFFLINE));
    act(() => noteNetworkFailure(networkError));
    act(() => {
      toast.error('İşlem başarısız');
    });
    expect(getToastSnapshot().current).toBeNull();
  });

  it('engel yüzünden ertelenmiş diyalogda da bastırılır (kullanıcı henüz diyalog görmedi)', () => {
    mount({ modalOpen: true });
    goOffline();
    act(() => noteNetworkFailure(networkError));
    act(() => {
      toast.error('İşlem başarısız');
    });
    expect(getToastSnapshot().current).toBeNull();
  });

  it('kullanıcı diyaloğu kapattıktan sonra bastırılmaz (sessiz kalınmaz)', () => {
    mount();
    goOffline();
    fireEvent.press(screen.getByText('Tamam'));
    act(() => jest.advanceTimersByTime(MODAL_CLOSE_DELAY_MS));
    act(() => noteNetworkFailure(networkError));
    act(() => {
      toast.error('İşlem başarısız');
    });
    expect(getToastSnapshot().current?.message).toBe('İşlem başarısız');
  });

  it('çevrimiçiyken bastırılmaz; başarı/bilgi toast\'ları hiç süzülmez', () => {
    mount();
    act(() => noteNetworkFailure(networkError));
    act(() => {
      toast.error('Hata');
    });
    expect(getToastSnapshot().current?.message).toBe('Hata');

    goOffline();
    act(() => noteNetworkFailure(networkError));
    act(() => {
      toast.success('Kaydedildi');
    });
    expect(getToastSnapshot().current?.message).toBe('Kaydedildi');
  });

  it('izleyici sökülünce süzgeç kalkar', () => {
    const view = mount();
    goOffline();
    view.unmount();
    act(() => noteNetworkFailure(networkError));
    act(() => {
      toast.error('Hata');
    });
    expect(getToastSnapshot().current?.message).toBe('Hata');
    expect(offlineDialog.isVisible()).toBe(false);
  });
});

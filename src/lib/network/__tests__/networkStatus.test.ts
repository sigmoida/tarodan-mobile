import { onlineManager } from '@tanstack/react-query';

const mockNetInfo = {
  addEventListener: jest.fn(),
  fetch: jest.fn(),
  refresh: jest.fn(),
};
jest.mock('@react-native-community/netinfo', () => mockNetInfo);

import { resetNetInfoForTests } from '../netinfo';
import {
  deriveOnline,
  isOnline,
  recheckNetwork,
  resetNetworkStatusForTests,
  startNetworkTracking,
  subscribeOnline,
} from '../networkStatus';
import { installOnlineManager } from '../onlineManager';

let emit: (s: { isConnected: boolean | null; isInternetReachable?: boolean | null }) => void;

beforeEach(() => {
  resetNetworkStatusForTests();
  resetNetInfoForTests();
  mockNetInfo.addEventListener.mockReset().mockImplementation((cb) => {
    emit = cb;
    return jest.fn();
  });
  mockNetInfo.fetch.mockReset().mockResolvedValue({ isConnected: true, isInternetReachable: true });
  mockNetInfo.refresh.mockReset().mockResolvedValue({ isConnected: true, isInternetReachable: true });
});

describe('deriveOnline', () => {
  it.each([
    [{ isConnected: true, isInternetReachable: true }, true],
    [{ isConnected: true, isInternetReachable: null }, true], // bilinmiyor -> çevrimiçi
    [{ isConnected: null, isInternetReachable: null }, true],
    [{ isConnected: false, isInternetReachable: false }, false],
    [{ isConnected: false, isInternetReachable: null }, false],
    [{ isConnected: true, isInternetReachable: false }, false], // Wi-Fi var, internet yok
  ])('%j -> %s', (state, expected) => {
    expect(deriveOnline(state)).toBe(expected);
  });
});

describe('startNetworkTracking', () => {
  it('çevrimdışı AÇILIŞ: ilk ölçüm bir geçiş olarak yayınlanır', async () => {
    mockNetInfo.fetch.mockResolvedValue({ isConnected: false, isInternetReachable: false });
    const seen = jest.fn();
    subscribeOnline(seen);
    startNetworkTracking();
    await Promise.resolve();
    await Promise.resolve();
    expect(isOnline()).toBe(false);
    expect(seen).toHaveBeenCalledTimes(1);
    expect(seen).toHaveBeenCalledWith(false);
  });

  it('yalnız değişimde yayınlar; durum döngüsü', () => {
    const seen = jest.fn();
    subscribeOnline(seen);
    startNetworkTracking();
    emit({ isConnected: true, isInternetReachable: true });
    expect(seen).not.toHaveBeenCalled();
    emit({ isConnected: false, isInternetReachable: false });
    emit({ isConnected: false, isInternetReachable: false });
    emit({ isConnected: true, isInternetReachable: true });
    expect(seen.mock.calls).toEqual([[false], [true]]);
  });

  it('sayaçlı: son durduran native aboneliği keser', () => {
    const unsubscribe = jest.fn();
    mockNetInfo.addEventListener.mockReturnValue(unsubscribe);
    const stopA = startNetworkTracking();
    const stopB = startNetworkTracking();
    expect(mockNetInfo.addEventListener).toHaveBeenCalledTimes(1);
    stopA();
    stopA(); // çift çağrı zararsız
    expect(unsubscribe).not.toHaveBeenCalled();
    stopB();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('recheckNetwork: refresh sonucunu uygular; hata fırlatmaz', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    startNetworkTracking();
    mockNetInfo.refresh.mockResolvedValueOnce({ isConnected: false, isInternetReachable: false });
    await expect(recheckNetwork()).resolves.toBe(false);
    expect(isOnline()).toBe(false);
    mockNetInfo.refresh.mockRejectedValueOnce(new Error('boom'));
    await expect(recheckNetwork()).resolves.toBe(false); // mevcut durum
    warn.mockRestore();
  });
});

describe('native modül yok (yeniden derlenmemiş dev-client)', () => {
  it('require fırlatırsa çökmez; çevrimiçi varsayılır', async () => {
    jest.resetModules();
    jest.doMock('@react-native-community/netinfo', () => {
      throw new Error('RNCNetInfo is null');
    });
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- modül yeniden yüklenir
    const status = require('../networkStatus') as typeof import('../networkStatus');
    const stop = status.startNetworkTracking();
    expect(status.isOnline()).toBe(true);
    await expect(status.recheckNetwork()).resolves.toBe(true);
    expect(() => stop()).not.toThrow();
    jest.doMock('@react-native-community/netinfo', () => mockNetInfo); // sonraki testler için geri yükle
  });

  it('modül var ama addEventListener fırlatırsa çökmez', () => {
    mockNetInfo.addEventListener.mockImplementation(() => {
      throw new Error('native yok');
    });
    expect(() => startNetworkTracking()).not.toThrow();
    expect(isOnline()).toBe(true);
  });
});

describe('TanStack onlineManager entegrasyonu', () => {
  afterEach(() => {
    onlineManager.setOnline(true);
  });

  it('bağlantı durumunu onlineManager\'a taşır (kopunca false, dönünce true)', () => {
    installOnlineManager();
    startNetworkTracking();
    const seen = jest.fn();
    const unsub = onlineManager.subscribe(seen);
    expect(onlineManager.isOnline()).toBe(true);

    emit({ isConnected: false, isInternetReachable: false });
    expect(onlineManager.isOnline()).toBe(false);
    emit({ isConnected: true, isInternetReachable: true });
    expect(onlineManager.isOnline()).toBe(true);
    expect(seen.mock.calls).toEqual([[false], [true]]);
    unsub();
  });

  it('kurulum anında mevcut (çevrimdışı) durumu hemen uygular', () => {
    startNetworkTracking();
    emit({ isConnected: false, isInternetReachable: false });
    installOnlineManager();
    expect(onlineManager.isOnline()).toBe(false);
  });
});

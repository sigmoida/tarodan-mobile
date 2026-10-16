import { onlineManager } from '@tanstack/react-query';

const mockNetInfo = {
  addEventListener: jest.fn(),
  refresh: jest.fn(),
  configure: jest.fn(),
};
jest.mock('@react-native-community/netinfo', () => mockNetInfo);

import { buildReachabilityConfig, resetNetInfoForTests } from '../netinfo';
import {
  isOfflinePending,
  isOnline,
  OFFLINE_CONFIRM_MS,
  recheckNetwork,
  REACHABILITY_PERSISTENCE_MS,
  resetNetworkStatusForTests,
  startNetworkTracking,
  subscribeOnline,
} from '../networkStatus';
import { installOnlineManager } from '../onlineManager';

type S = { isConnected: boolean | null; isInternetReachable?: boolean | null };
const ONLINE: S = { isConnected: true, isInternetReachable: true };
const NO_NETWORK: S = { isConnected: false, isInternetReachable: false };
const PROBE_FAIL: S = { isConnected: true, isInternetReachable: false };

let emit: (s: S) => void;
const flush = async () => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
};

beforeEach(() => {
  jest.useFakeTimers();
  resetNetworkStatusForTests();
  resetNetInfoForTests();
  mockNetInfo.addEventListener.mockReset().mockImplementation((cb) => {
    emit = cb;
    return jest.fn();
  });
  mockNetInfo.refresh.mockReset().mockResolvedValue(ONLINE);
  mockNetInfo.configure.mockReset();
});
afterEach(() => {
  resetNetworkStatusForTests();
  jest.useRealTimers();
});

describe('karar kuralı', () => {
  it('ağ yok: OFFLINE_CONFIRM_MS kesintisiz sürerse çevrimdışı; öncesinde değil', () => {
    const seen = jest.fn();
    subscribeOnline(seen);
    startNetworkTracking();
    emit(NO_NETWORK);
    expect(isOfflinePending()).toBe(true);
    jest.advanceTimersByTime(OFFLINE_CONFIRM_MS - 1);
    expect(isOnline()).toBe(true);
    jest.advanceTimersByTime(1);
    expect(isOnline()).toBe(false);
    expect(seen.mock.calls).toEqual([[false]]);
  });

  it('kısa titreşim (debounce içinde geri geldi): hiçbir yayın yok', () => {
    const seen = jest.fn();
    subscribeOnline(seen);
    startNetworkTracking();
    emit(NO_NETWORK);
    jest.advanceTimersByTime(500);
    emit(ONLINE);
    jest.advanceTimersByTime(60_000);
    expect(seen).not.toHaveBeenCalled();
    expect(isOfflinePending()).toBe(false);
  });

  it('tek başarısız probe (ağ var): kalıcılık sonrası İKİNCİ sınama da başarısızsa çevrimdışı', async () => {
    mockNetInfo.refresh.mockResolvedValue(PROBE_FAIL);
    const seen = jest.fn();
    subscribeOnline(seen);
    startNetworkTracking();
    emit(PROBE_FAIL);
    jest.advanceTimersByTime(REACHABILITY_PERSISTENCE_MS - 1);
    expect(mockNetInfo.refresh).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await flush();
    expect(mockNetInfo.refresh).toHaveBeenCalledTimes(1);
    expect(seen.mock.calls).toEqual([[false]]);
  });

  it('probe titreşimi: kalıcılık içinde düzelirse yayın yok', async () => {
    const seen = jest.fn();
    subscribeOnline(seen);
    startNetworkTracking();
    emit(PROBE_FAIL);
    jest.advanceTimersByTime(2000);
    emit(ONLINE);
    jest.advanceTimersByTime(60_000);
    await flush();
    expect(mockNetInfo.refresh).not.toHaveBeenCalled();
    expect(seen).not.toHaveBeenCalled();
  });

  it('ikinci sınama başarılıysa (yavaş ilk probe) çevrimdışı denmez', async () => {
    mockNetInfo.refresh.mockResolvedValue(ONLINE);
    const seen = jest.fn();
    subscribeOnline(seen);
    startNetworkTracking();
    emit(PROBE_FAIL);
    jest.advanceTimersByTime(REACHABILITY_PERSISTENCE_MS);
    await flush();
    expect(seen).not.toHaveBeenCalled();
    expect(isOnline()).toBe(true);
  });

  it('ikinci sınama belirsiz (null) ise önceki karar (çevrimiçi) korunur', async () => {
    mockNetInfo.refresh.mockResolvedValue({ isConnected: true, isInternetReachable: null });
    startNetworkTracking();
    emit(PROBE_FAIL);
    jest.advanceTimersByTime(REACHABILITY_PERSISTENCE_MS);
    await flush();
    expect(isOnline()).toBe(true);
  });

  it('çevrimiçine dönüş ANINDA yayınlanır; null (bilinmiyor) olay akışında çevrimiçi sayılır', () => {
    startNetworkTracking();
    emit(NO_NETWORK);
    jest.advanceTimersByTime(OFFLINE_CONFIRM_MS);
    expect(isOnline()).toBe(false);
    emit({ isConnected: true, isInternetReachable: null });
    expect(isOnline()).toBe(true);
  });

  it('çevrimdışı AÇILIŞ: ilk olay çevrimdışıysa aynı kuraldan geçip yayınlanır', () => {
    mockNetInfo.addEventListener.mockImplementation((cb) => {
      cb(NO_NETWORK); // NetInfo abonelikte durumu hemen yollar
      return jest.fn();
    });
    const seen = jest.fn();
    subscribeOnline(seen);
    startNetworkTracking();
    jest.advanceTimersByTime(OFFLINE_CONFIRM_MS);
    expect(seen.mock.calls).toEqual([[false]]);
  });

  it('gereksiz fetch yok: yalnız addEventListener', () => {
    startNetworkTracking();
    expect((mockNetInfo as Record<string, unknown>).fetch).toBeUndefined();
    expect(mockNetInfo.addEventListener).toHaveBeenCalledTimes(1);
  });
});

describe('recheckNetwork (Tekrar dene)', () => {
  it('kesin çevrimdışı sonucu ANINDA uygular', async () => {
    startNetworkTracking();
    mockNetInfo.refresh.mockResolvedValueOnce(PROBE_FAIL);
    await expect(recheckNetwork()).resolves.toBe(false);
    expect(isOnline()).toBe(false);
  });

  it('refresh sonrası reachability null: bilinmiyor → önceki (çevrimdışı) karar korunur', async () => {
    startNetworkTracking();
    emit(NO_NETWORK);
    jest.advanceTimersByTime(OFFLINE_CONFIRM_MS);
    expect(isOnline()).toBe(false);
    mockNetInfo.refresh.mockResolvedValueOnce({ isConnected: true, isInternetReachable: null });
    await expect(recheckNetwork()).resolves.toBe(false);
    expect(isOnline()).toBe(false);
  });

  it('yalnız kesin true çevrimiçi yapar', async () => {
    startNetworkTracking();
    emit(NO_NETWORK);
    jest.advanceTimersByTime(OFFLINE_CONFIRM_MS);
    mockNetInfo.refresh.mockResolvedValueOnce(ONLINE);
    await expect(recheckNetwork()).resolves.toBe(true);
    expect(isOnline()).toBe(true);
  });

  it('refresh fırlatırsa çökmez, mevcut karar döner', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    startNetworkTracking();
    mockNetInfo.refresh.mockRejectedValueOnce(new Error('boom'));
    await expect(recheckNetwork()).resolves.toBe(true);
    warn.mockRestore();
  });
});

describe('startNetworkTracking', () => {
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

  it('modül yok (yeniden derlenmemiş dev-client): require fırlatırsa çökmez; çevrimiçi varsayılır', async () => {
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
    jest.doMock('@react-native-community/netinfo', () => mockNetInfo); // sonraki testler için
  });

  it('modül var ama addEventListener fırlatırsa çökmez', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockNetInfo.addEventListener.mockImplementation(() => {
      throw new Error('native yok');
    });
    expect(() => startNetworkTracking()).not.toThrow();
    expect(isOnline()).toBe(true);
    warn.mockRestore();
  });
});

describe('erişilebilirlik yapılandırması', () => {
  it('izleme başlarken kendi API sağlık ucuna yapılandırılır (Google değil)', () => {
    startNetworkTracking();
    expect(mockNetInfo.configure).toHaveBeenCalledTimes(1);
    const config = mockNetInfo.configure.mock.calls[0][0];
    expect(config.reachabilityUrl).toMatch(/\/health\/live$/);
    expect(config.reachabilityUrl).not.toContain('google');
  });

  it('herhangi bir HTTP yanıtı (5xx hariç) internet VAR demektir; 5xx / yanıtsız değil', async () => {
    const { reachabilityTest, reachabilityShortTimeout, reachabilityLongTimeout } =
      buildReachabilityConfig('https://api.example.com/api/') as {
        reachabilityTest: (r: { status: number }) => Promise<boolean>;
        reachabilityShortTimeout: number;
        reachabilityLongTimeout: number;
        reachabilityUrl: string;
      };
    await expect(reachabilityTest({ status: 200 })).resolves.toBe(true);
    await expect(reachabilityTest({ status: 404 })).resolves.toBe(true);
    await expect(reachabilityTest({ status: 502 })).resolves.toBe(false);
    expect(reachabilityShortTimeout).toBeLessThan(reachabilityLongTimeout);
    expect(
      (buildReachabilityConfig('https://api.example.com/api/') as { reachabilityUrl: string })
        .reachabilityUrl,
    ).toBe('https://api.example.com/api/health/live');
  });
});

describe('TanStack onlineManager entegrasyonu (aynı karardan beslenir)', () => {
  beforeEach(() => installOnlineManager());
  afterEach(() => onlineManager.setOnline(true));

  it('ham olay değil KARAR taşınır: titreşimde onlineManager değişmez', () => {
    startNetworkTracking();
    const seen = jest.fn();
    const unsub = onlineManager.subscribe(seen);
    emit(NO_NETWORK);
    jest.advanceTimersByTime(500);
    emit(ONLINE);
    expect(onlineManager.isOnline()).toBe(true);
    expect(seen).not.toHaveBeenCalled();
    unsub();
  });

  it('kalıcı kopuş: false, dönüş: true', () => {
    startNetworkTracking();
    const seen = jest.fn();
    const unsub = onlineManager.subscribe(seen);
    emit(NO_NETWORK);
    jest.advanceTimersByTime(OFFLINE_CONFIRM_MS);
    expect(onlineManager.isOnline()).toBe(false);
    emit(ONLINE);
    expect(onlineManager.isOnline()).toBe(true);
    expect(seen.mock.calls).toEqual([[false], [true]]);
    unsub();
  });

  it('resetNetworkStatusForTests onlineManager bağlantısını silmez, değeri true yapar', () => {
    startNetworkTracking();
    emit(NO_NETWORK);
    jest.advanceTimersByTime(OFFLINE_CONFIRM_MS);
    expect(onlineManager.isOnline()).toBe(false);
    resetNetworkStatusForTests();
    expect(onlineManager.isOnline()).toBe(true);
    // bağlantı hâlâ canlı: yeni kopuş yine taşınır
    startNetworkTracking();
    emit(NO_NETWORK);
    jest.advanceTimersByTime(OFFLINE_CONFIRM_MS);
    expect(onlineManager.isOnline()).toBe(false);
  });

  it('kurulum anında mevcut (çevrimdışı) kararı hemen uygular', () => {
    startNetworkTracking();
    emit(NO_NETWORK);
    jest.advanceTimersByTime(OFFLINE_CONFIRM_MS);
    installOnlineManager();
    expect(onlineManager.isOnline()).toBe(false);
  });
});

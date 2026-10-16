/**
 * H3 — görüntüsüz (eski kurulum) açılış yolunda GEÇİCİ hata oturumu silmez.
 *
 * Eskiden `GET /users/me`'nin her hatası (ağ, 5xx) ve anahtar zinciri okuma hatası
 * token'ları siliyordu: bu sürüme geçen her kullanıcı ilk açılışta çevrimdışıysa
 * çıkış yapmış oluyordu. Sözleşme:
 * - yalnız kesin 401 token'ları siler,
 * - geçici hata: token'lar kalır, misafir başlanır, bağlantı gelince / ön plana dönüşte
 *   oturum yeniden yüklenir (başarılıysa sorgular token'la yeniden çekilir),
 * - anahtar zinciri hatası bir kez yeniden denenir, ikinci hata da "oturum yok" sayılmaz,
 * - bu arada kullanıcı giriş yaptıysa ertelenmiş deneme çalışmaz.
 * Ayrıca `refreshUserData` kuşak koruması ve `login`'in istemci kuşağını ilerletmesi.
 */
jest.mock('@/lib/api', () => ({
  authApi: { logout: jest.fn(() => Promise.resolve()) },
  userApi: { getProfile: jest.fn() },
}));
jest.mock('../../services/push', () => ({
  unregisterPushNotifications: jest.fn(() => Promise.resolve()),
}));
jest.mock('../resetUserStores', () => ({
  resetUserStores: jest.fn(),
  resetServerStateForNewSession: jest.fn(() => Promise.resolve()),
}));

const mockOnlineListeners = new Set<(online: boolean) => void>();
jest.mock('@/lib/network/networkStatus', () => ({
  subscribeOnline: (listener: (online: boolean) => void) => {
    mockOnlineListeners.add(listener);
    return () => mockOnlineListeners.delete(listener);
  },
}));

import * as SecureStore from 'expo-secure-store';

import { discardStoredSession, useAuthStore, type User } from '../authStore';
import { userApi } from '@/lib/api';
import { SESSION_PROBE, getSessionEpoch, isSessionDeferred } from '@/lib/api/sessionState';
import { resetServerStateForNewSession, resetUserStores } from '../resetUserStores';
import { USER_SNAPSHOT_KEY, serializeUserSnapshot } from '../userSnapshot';

const secure = SecureStore as unknown as {
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
};
const getProfile = userApi.getProfile as jest.Mock;

let vault: Map<string, string>;

const user = (over: Partial<User> = {}): User => ({
  id: 'u1',
  email: 'a@test.com',
  displayName: 'Ayşe',
  membershipTier: 'premium',
  isVerified: true,
  isEmailVerified: true,
  isPhoneVerified: false,
  verificationStatus: 'verified',
  isSeller: true,
  totalSales: 3,
  totalPurchases: 1,
  accountAge: 40,
  profileCompletion: 80,
  disputeCount: 0,
  listingCount: 2,
  maxFreeListings: 10,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

const flush = () => new Promise((r) => setTimeout(r, 0));

/** Bağlantı geri geldi (`subscribeOnline` kararı). */
const goOnline = async () => {
  for (const l of [...mockOnlineListeners]) l(true);
  await flush();
  await flush();
};

const networkError = () => Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' });

const legacySession = (token = 'token-1') => {
  vault.set('accessToken', token);
  vault.set('refreshToken', 'refresh-1');
};

beforeEach(async () => {
  vault = new Map();
  secure.getItemAsync.mockImplementation((k: string) => Promise.resolve(vault.get(k) ?? null));
  secure.setItemAsync.mockImplementation((k: string, v: string) => {
    vault.set(k, v);
    return Promise.resolve();
  });
  secure.deleteItemAsync.mockImplementation((k: string) => {
    vault.delete(k);
    return Promise.resolve();
  });
  // Temiz, oturumsuz başlangıç (ertelenmiş denemeyi de iptal eder).
  await useAuthStore.getState().logout({ skipServer: true });
  vault = new Map();
  jest.clearAllMocks();
  useAuthStore.setState({ isLoading: true });
});

afterAll(() => {
  secure.getItemAsync.mockImplementation(() => Promise.resolve(null));
  secure.setItemAsync.mockImplementation(() => Promise.resolve());
  secure.deleteItemAsync.mockImplementation(() => Promise.resolve());
});

describe('loadToken · görüntü yok, geçici hata (H3)', () => {
  it('çevrimdışı ilk açılış: token’lar silinmez, misafir başlanır', async () => {
    legacySession();
    getProfile.mockRejectedValueOnce(networkError());

    await useAuthStore.getState().loadToken();

    const s = useAuthStore.getState();
    expect(s.isLoading).toBe(false);
    expect(s.isAuthenticated).toBe(false);
    expect(vault.get('accessToken')).toBe('token-1');
    expect(vault.get('refreshToken')).toBe('refresh-1');
    expect(secure.deleteItemAsync).not.toHaveBeenCalled();
    expect(resetUserStores).not.toHaveBeenCalled();
  });

  it('bağlantı gelince oturum yeniden yüklenir ve sorgular token’la tazelenir', async () => {
    legacySession();
    getProfile.mockRejectedValueOnce(networkError());
    await useAuthStore.getState().loadToken();

    getProfile.mockResolvedValueOnce({ data: user() });
    await goOnline();

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.user?.id).toBe('u1');
    expect(s.token).toBe('token-1');
    expect(resetServerStateForNewSession).toHaveBeenCalled();
    // Abonelik tek seferlik: tekrar çevrimiçi olmak yeni yükleme başlatmaz.
    await goOnline();
    expect(getProfile).toHaveBeenCalledTimes(2);
  });

  it.each([500, 503, 403])('%i: token’lar kalır', async (status) => {
    legacySession();
    getProfile.mockRejectedValueOnce({ response: { status } });

    await useAuthStore.getState().loadToken();

    expect(vault.get('accessToken')).toBe('token-1');
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('kesin 401 (refresh sonrası yine 401): token’lar silinir', async () => {
    legacySession();
    getProfile.mockRejectedValueOnce({ response: { status: 401 } });

    await useAuthStore.getState().loadToken();

    expect(vault.has('accessToken')).toBe(false);
    expect(vault.has('refreshToken')).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    // Ertelenmiş deneme kurulmaz.
    await goOnline();
    expect(getProfile).toHaveBeenCalledTimes(1);
  });

  it('bu arada kullanıcı giriş yaptıysa ertelenmiş deneme çalışmaz', async () => {
    legacySession();
    getProfile.mockRejectedValueOnce(networkError());
    await useAuthStore.getState().loadToken();

    await useAuthStore.getState().login('token-b', user({ id: 'b' }));
    await goOnline();

    // Ertelenmiş oturum denemesi (SESSION_PROBE) yeniden çalışmadı; girişin kendi tam profil
    // çekimi (argümansız) ayrı bir istektir.
    expect(getProfile.mock.calls.filter((call) => call[0] === SESSION_PROBE)).toHaveLength(1);
    expect(useAuthStore.getState().user?.id).toBe('b');
  });
});

describe('loadToken · anahtar zinciri okuma hatası (H3)', () => {
  it('bir kez yeniden denenir; ikincisi başarılıysa açılış normal sürer', async () => {
    legacySession();
    vault.set(USER_SNAPSHOT_KEY, serializeUserSnapshot(user())!);
    getProfile.mockResolvedValueOnce({ data: user() });
    secure.getItemAsync.mockImplementationOnce(() => Promise.reject(new Error('keychain locked')));

    await useAuthStore.getState().loadToken();

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.id).toBe('u1');
  });

  it('iki kez okunamazsa "oturum yok" sayılmaz: token’lar kalır, sonra yeniden yüklenir', async () => {
    legacySession();
    vault.set(USER_SNAPSHOT_KEY, serializeUserSnapshot(user())!);
    secure.getItemAsync
      .mockImplementationOnce(() => Promise.reject(new Error('keychain locked')))
      .mockImplementationOnce(() => Promise.reject(new Error('keychain locked')));

    await useAuthStore.getState().loadToken();

    expect(useAuthStore.getState().isLoading).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(secure.deleteItemAsync).not.toHaveBeenCalled();
    expect(vault.get('accessToken')).toBe('token-1');
    expect(getProfile).not.toHaveBeenCalled();

    // Kilit açıldı / bağlantı geldi: görüntüyle oturum açılır.
    getProfile.mockResolvedValueOnce({ data: user() });
    await goOnline();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.id).toBe('u1');
  });
});

describe('oturum kuşağı', () => {
  it('refreshUserData: yanıt beklenirken çıkış olduysa store’a kullanıcı yazılmaz', async () => {
    await useAuthStore.getState().login('token-1', user());
    let resolve!: (v: unknown) => void;
    getProfile.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const refreshing = useAuthStore.getState().refreshUserData();

    await useAuthStore.getState().logout({ skipServer: true });
    resolve({ data: user() });

    await expect(refreshing).resolves.toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().limits).toBeNull();
  });

  it('refreshUserData: başka hesapla giriş olduysa A’nın profili B’nin üstüne yazılmaz', async () => {
    await useAuthStore.getState().login('token-a', user({ id: 'a' }));
    let resolve!: (v: unknown) => void;
    getProfile.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const refreshing = useAuthStore.getState().refreshUserData();

    await useAuthStore.getState().login('token-b', user({ id: 'b' }));
    resolve({ data: user({ id: 'a' }) });
    await refreshing;

    expect(useAuthStore.getState().user?.id).toBe('b');
  });

  it('login istemci oturum kuşağını ilerletir (önceki oturumun refresh’i yazamaz)', async () => {
    const epoch = getSessionEpoch();
    await useAuthStore.getState().login('token-1', user());
    expect(getSessionEpoch()).toBe(epoch + 1);
  });
});

describe('ertelenmiş (doğrulanmamış) oturum — arayüz misafir, istekler de misafir', () => {
  it('geçici hata: oturum ertelenir; yeniden deneme isteği SESSION_PROBE taşır, başarıda bayrak kalkar', async () => {
    legacySession();
    getProfile.mockRejectedValueOnce(networkError());

    await useAuthStore.getState().loadToken();

    expect(isSessionDeferred()).toBe(true);
    expect(getProfile).toHaveBeenLastCalledWith(SESSION_PROBE);

    getProfile.mockResolvedValueOnce({ data: user() });
    await goOnline();

    expect(getProfile).toHaveBeenLastCalledWith(SESSION_PROBE);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    // Oturum doğrulandı: istekler yeniden token'ı taşır.
    expect(isSessionDeferred()).toBe(false);
  });

  it('anahtar zinciri hatası da oturumu erteler; görüntüyle açılınca bayrak kalkar', async () => {
    legacySession();
    vault.set(USER_SNAPSHOT_KEY, serializeUserSnapshot(user())!);
    secure.getItemAsync
      .mockImplementationOnce(() => Promise.reject(new Error('keychain locked')))
      .mockImplementationOnce(() => Promise.reject(new Error('keychain locked')));

    await useAuthStore.getState().loadToken();
    expect(isSessionDeferred()).toBe(true);

    getProfile.mockResolvedValueOnce({ data: user() });
    await goOnline();
    expect(isSessionDeferred()).toBe(false);
  });

  it('ertelenmişken kullanıcı giriş yaparsa bayrak kalkar', async () => {
    legacySession();
    getProfile.mockRejectedValueOnce(networkError());
    await useAuthStore.getState().loadToken();

    await useAuthStore.getState().login('token-b', user({ id: 'b' }));

    expect(isSessionDeferred()).toBe(false);
  });

  it('discardStoredSession: sessiz atma — token/görüntü silinir, kuşak ilerler, misafir verisi sıfırlanmaz', async () => {
    legacySession();
    vault.set(USER_SNAPSHOT_KEY, 'bozuk');
    getProfile.mockRejectedValueOnce(networkError());
    await useAuthStore.getState().loadToken();
    const epoch = getSessionEpoch();

    await discardStoredSession();

    expect(getSessionEpoch()).toBe(epoch + 1);
    expect(isSessionDeferred()).toBe(false);
    expect(vault.has('accessToken')).toBe(false);
    expect(vault.has('refreshToken')).toBe(false);
    expect(vault.has(USER_SNAPSHOT_KEY)).toBe(false);
    // Zorunlu çıkış DEĞİL: misafir sepeti / önbellek dokunulmaz.
    expect(resetUserStores).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    // Ertelenmiş deneme de durdu.
    await goOnline();
    expect(getProfile).toHaveBeenCalledTimes(1);
  });

  it('kesin 401 (eski yol): token silme kuşağı ilerletir (uçuştaki refresh geri yazamaz)', async () => {
    legacySession();
    getProfile.mockRejectedValueOnce({ response: { status: 401 } });
    const epoch = getSessionEpoch();

    await useAuthStore.getState().loadToken();

    expect(getSessionEpoch()).toBeGreaterThan(epoch);
    expect(vault.has('accessToken')).toBe(false);
  });
});

describe('profileValidated — tam profil (GET /users/me) bu oturumda geldi mi', () => {
  it('görüntüyle açılış: false; arka plan doğrulaması gelince true', async () => {
    legacySession();
    vault.set(USER_SNAPSHOT_KEY, serializeUserSnapshot(user())!);
    let resolve!: (v: unknown) => void;
    getProfile.mockReturnValueOnce(new Promise((r) => (resolve = r)));

    await useAuthStore.getState().loadToken();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().profileValidated).toBe(false);

    resolve({ data: user({ phone: '+905321112233', bio: 'Merhaba' }) });
    await flush();
    await flush();

    expect(useAuthStore.getState().profileValidated).toBe(true);
    expect(useAuthStore.getState().user?.phone).toBe('+905321112233');
  });

  it('giriş yanıtı tam profil değil: false; refreshUserData başarılıysa true', async () => {
    await useAuthStore.getState().login('token-1', user());
    expect(useAuthStore.getState().profileValidated).toBe(false);

    getProfile.mockResolvedValueOnce({ data: user({ bio: 'Merhaba' }) });
    await useAuthStore.getState().refreshUserData();

    expect(useAuthStore.getState().profileValidated).toBe(true);
    expect(useAuthStore.getState().user?.bio).toBe('Merhaba');
  });

  it('refreshUserData düşerse false kalır; çıkış sıfırlar', async () => {
    await useAuthStore.getState().login('token-1', user());
    getProfile.mockRejectedValueOnce(networkError());
    await useAuthStore.getState().refreshUserData();
    expect(useAuthStore.getState().profileValidated).toBe(false);

    getProfile.mockResolvedValueOnce({ data: user() });
    await useAuthStore.getState().refreshUserData();
    expect(useAuthStore.getState().profileValidated).toBe(true);
    await useAuthStore.getState().logout({ skipServer: true });
    expect(useAuthStore.getState().profileValidated).toBe(false);
  });
});

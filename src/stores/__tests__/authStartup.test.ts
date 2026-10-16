/**
 * Soğuk açılış ağı BEKLEMEZ: `loadToken` token + saklı kullanıcı görüntüsüyle oturumu
 * hemen açar, `GET /users/me` arka planda doğrulanır. Bu suite şunları sabitler:
 * - açılış profil yanıtını beklemeden biter (splash ağa takılmaz),
 * - görüntüden kullanıcı hidrate edilir, doğrulama dönünce store + görüntü tazelenir,
 * - ağ hatasında saklı kullanıcı kalır (token silinmez),
 * - refresh sonrası yine 401 → zorunlu çıkış (eski açılış yolunun karşılığı),
 * - doğrulama uçuştayken çıkış/başka giriş olursa geç yanıt yazılmaz,
 * - görüntü yoksa (eski kurulum) eski yol: profil beklenir.
 */
jest.mock('@/lib/api', () => ({
  authApi: { logout: jest.fn(() => Promise.resolve()) },
  userApi: { getProfile: jest.fn() },
  advanceSessionEpoch: jest.fn(),
}));
jest.mock('../../services/push', () => ({
  unregisterPushNotifications: jest.fn(() => Promise.resolve()),
}));
jest.mock('../resetUserStores', () => ({
  resetUserStores: jest.fn(),
  resetServerStateForNewSession: jest.fn(() => Promise.resolve()),
}));

import * as SecureStore from 'expo-secure-store';

import { useAuthStore, type User } from '../authStore';
import { userApi } from '@/lib/api';
import { resetUserStores } from '../resetUserStores';
import { USER_SNAPSHOT_KEY, serializeUserSnapshot } from '../userSnapshot';

const secure = SecureStore as unknown as {
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
};
const getProfile = userApi.getProfile as jest.Mock;

/** Bellek içi SecureStore (anahtar → değer). */
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

/** Çözülmesi testin elinde olan söz. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const storeSession = (token: string, snapshotUser: User | null) => {
  vault.set('accessToken', token);
  vault.set('refreshToken', 'refresh-1');
  if (snapshotUser) vault.set(USER_SNAPSHOT_KEY, serializeUserSnapshot(snapshotUser)!);
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
  // Temiz, oturumsuz başlangıç (logout, vault'u da boşaltır).
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

describe('loadToken · saklı görüntüyle (ağ beklenmez)', () => {
  it('profil yanıtı gelmeden biter; oturum görüntüdeki kullanıcıyla hemen açılır', async () => {
    storeSession('token-1', user({ companyName: 'ACME', taxId: '123', businessStatus: 'pending' }));
    const profile = deferred<{ data: unknown }>();
    getProfile.mockReturnValueOnce(profile.promise);

    await useAuthStore.getState().loadToken(); // profil hâlâ uçuşta

    const s = useAuthStore.getState();
    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(s.isAuthenticated).toBe(true);
    expect(s.isLoading).toBe(false);
    expect(s.token).toBe('token-1');
    expect(s.user).toMatchObject({
      id: 'u1',
      membershipTier: 'premium',
      isSeller: true,
      // Kurumsal başvuru yönlendirmesinin (BusinessMembershipGuard) alanları görüntüde.
      companyName: 'ACME',
      taxId: '123',
      businessStatus: 'pending',
    });
    expect(s.limits?.maxListings).toBe(-1); // premium

    profile.resolve({ data: user() });
    await flush();
  });

  it('doğrulama dönünce taze profil + taze token store’a ve görüntüye yazılır', async () => {
    storeSession('expired-token', user({ businessStatus: 'pending', companyName: 'ACME', taxId: '1' }));
    const profile = deferred<{ data: unknown }>();
    getProfile.mockReturnValueOnce(profile.promise);
    await useAuthStore.getState().loadToken();

    // Interceptor sessiz refresh yaptı → SecureStore'da yeni token.
    vault.set('accessToken', 'refreshed-token');
    profile.resolve({
      data: { ...user({ companyName: 'ACME', taxId: '1' }), businessStatus: 'approved', membershipTier: 'business' },
    });
    await flush();

    const s = useAuthStore.getState();
    expect(s.token).toBe('refreshed-token');
    expect(s.user?.businessStatus).toBe('approved');
    expect(s.user?.membershipTier).toBe('business');
    expect(JSON.parse(vault.get(USER_SNAPSHOT_KEY)!)).toMatchObject({
      businessStatus: 'approved',
      membershipTier: 'business',
    });
  });

  it('ağ hatasında saklı kullanıcı kalır, token’lar silinmez', async () => {
    storeSession('token-1', user());
    getProfile.mockRejectedValueOnce(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));

    await useAuthStore.getState().loadToken();
    await flush();

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.user?.id).toBe('u1');
    expect(vault.get('accessToken')).toBe('token-1');
    expect(vault.has(USER_SNAPSHOT_KEY)).toBe(true);
    expect(resetUserStores).not.toHaveBeenCalled();
  });

  it('refresh sonrası yine 401 → zorunlu çıkış (sunucu çağrısız)', async () => {
    storeSession('token-1', user());
    getProfile.mockRejectedValueOnce({ response: { status: 401 } });

    await useAuthStore.getState().loadToken();
    await flush();

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.user).toBeNull();
    expect(vault.has('accessToken')).toBe(false);
    expect(resetUserStores).toHaveBeenCalledWith('forced');
  });

  it('interceptor zorunlu çıkışı zaten yaptıysa ikinci çıkış yok', async () => {
    storeSession('token-1', user());
    // Refresh düştü: `handleAuthFailure` çıkışı bekler, SONRA istek reddedilir.
    getProfile.mockImplementationOnce(async () => {
      await useAuthStore.getState().logout({ reason: 'forced' });
      throw { response: { status: 401 } };
    });

    await useAuthStore.getState().loadToken();
    await flush();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(resetUserStores).toHaveBeenCalledTimes(1);
  });

  it('doğrulama uçuştayken çıkış: geç gelen profil oturumu diriltmez', async () => {
    storeSession('token-1', user());
    const profile = deferred<{ data: unknown }>();
    getProfile.mockReturnValueOnce(profile.promise);
    await useAuthStore.getState().loadToken();

    await useAuthStore.getState().logout({ skipServer: true });
    vault.delete(USER_SNAPSHOT_KEY); // resetUserStores (testte mock) siler
    profile.resolve({ data: user() });
    await flush();

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.user).toBeNull();
    expect(vault.has(USER_SNAPSHOT_KEY)).toBe(false);
  });

  it('doğrulama uçuştayken başka hesapla giriş: A’nın profili B’nin üstüne yazılmaz', async () => {
    storeSession('token-a', user({ id: 'a' }));
    const profile = deferred<{ data: unknown }>();
    getProfile.mockReturnValueOnce(profile.promise);
    await useAuthStore.getState().loadToken();

    await useAuthStore.getState().logout({ skipServer: true });
    await useAuthStore.getState().login('token-b', user({ id: 'b', email: 'b@test.com' }));
    profile.resolve({ data: user({ id: 'a' }) });
    await flush();

    expect(useAuthStore.getState().user?.id).toBe('b');
    expect(useAuthStore.getState().token).toBe('token-b');
    expect(JSON.parse(vault.get(USER_SNAPSHOT_KEY)!).id).toBe('b');
  });
});

describe('loadToken · görüntü yok (eski kurulum)', () => {
  it('profil beklenir (eski yol) ve görüntü yazılır', async () => {
    storeSession('token-1', null);
    const profile = deferred<{ data: unknown }>();
    getProfile.mockReturnValueOnce(profile.promise);

    let done = false;
    const loading = useAuthStore.getState().loadToken().then(() => {
      done = true;
    });
    await flush();
    expect(done).toBe(false); // profil bekleniyor

    profile.resolve({ data: user() });
    await loading;

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().isLoading).toBe(false);
    await flush();
    expect(JSON.parse(vault.get(USER_SNAPSHOT_KEY)!).id).toBe('u1');
  });

  it('bozuk görüntü eski yola düşer', async () => {
    storeSession('token-1', null);
    vault.set(USER_SNAPSHOT_KEY, '{bozuk');
    getProfile.mockResolvedValueOnce({ data: user() });

    await useAuthStore.getState().loadToken();

    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().user?.id).toBe('u1');
  });

  it('token yoksa görüntü kullanılmaz (misafir)', async () => {
    vault.set(USER_SNAPSHOT_KEY, serializeUserSnapshot(user())!);

    await useAuthStore.getState().loadToken();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(getProfile).not.toHaveBeenCalled();
  });
});

describe('kullanıcı görüntüsü yazımı', () => {
  it('login görüntüyü yazar', async () => {
    await useAuthStore.getState().login('token-1', user());
    await flush();
    expect(JSON.parse(vault.get(USER_SNAPSHOT_KEY)!).id).toBe('u1');
  });

  it('refreshUserData ve updateUser görüntüyü tazeler', async () => {
    await useAuthStore.getState().login('token-1', user());
    getProfile.mockResolvedValueOnce({ data: user({ displayName: 'Yeni Ad' }) });
    await useAuthStore.getState().refreshUserData();
    await flush();
    expect(JSON.parse(vault.get(USER_SNAPSHOT_KEY)!).displayName).toBe('Yeni Ad');

    useAuthStore.getState().updateUser({ username: 'ayse', usernameClaimed: true });
    await flush();
    expect(JSON.parse(vault.get(USER_SNAPSHOT_KEY)!)).toMatchObject({
      username: 'ayse',
      usernameClaimed: true,
    });
  });

  it('çıkıştan sonra dönen refreshUserData görüntüyü geri yazmaz', async () => {
    await useAuthStore.getState().login('token-1', user());
    const profile = deferred<{ data: unknown }>();
    getProfile.mockReturnValueOnce(profile.promise);
    const refreshing = useAuthStore.getState().refreshUserData();
    await useAuthStore.getState().logout({ skipServer: true });
    vault.delete(USER_SNAPSHOT_KEY); // resetUserStores (testte mock) siler
    profile.resolve({ data: user() });
    await refreshing;
    await flush();
    expect(vault.has(USER_SNAPSHOT_KEY)).toBe(false);
  });
});

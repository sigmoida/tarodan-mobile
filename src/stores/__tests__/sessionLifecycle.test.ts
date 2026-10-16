/**
 * Oturum yaşam döngüsü (oturum turu 2026-10-16 kalanları):
 * - giriş sonrası TAM profil hemen çekilir (üyelik kademesi / kurumsal alanlar), giriş yanıtı eksik;
 * - token çifti tutarlı yazılır, girişte önceki oturumun refresh token'ı kalmaz;
 * - çıkış: yerel temizlik ÖNCE (ağ beklenmez), sunucu iptali arka planda açık kimlikle
 *   (push token + refresh token), socket kapanır, ban bayrağı sıfırlanır;
 * - açılış doğrulaması geçici hatayla düşerse oturum AÇIK kalır ve geri çekilerek yeniden denenir.
 */
jest.mock('@/lib/api', () => ({
  authApi: { logout: jest.fn(() => Promise.resolve()) },
  userApi: { getProfile: jest.fn() },
}));
jest.mock('../../services/push', () => ({
  unregisterPushNotifications: jest.fn(() => Promise.resolve()),
  clearLocalPushState: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../services/socket', () => ({ disconnectSocket: jest.fn() }));
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
import { authApi, userApi } from '@/lib/api';
import { claimBannedRedirect } from '@/lib/api/sessionState';
import { unregisterPushNotifications } from '../../services/push';
import { resetPushRevocationForTests } from '../../services/pushRevocation';
import { disconnectSocket } from '../../services/socket';
import { useAuthStore, type User } from '../authStore';
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
  membershipTier: 'free',
  isVerified: true,
  isEmailVerified: true,
  isPhoneVerified: false,
  verificationStatus: 'verified',
  isSeller: false,
  totalSales: 0,
  totalPurchases: 0,
  accountAge: 1,
  profileCompletion: 80,
  disputeCount: 0,
  listingCount: 0,
  maxFreeListings: 10,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

const flush = () => new Promise((r) => setTimeout(r, 0));
const networkError = () => Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' });
const goOnline = async () => {
  for (const l of [...mockOnlineListeners]) l(true);
  await flush();
  await flush();
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
  await useAuthStore.getState().logout({ skipServer: true });
  vault = new Map();
  jest.clearAllMocks();
  getProfile.mockReset();
  (unregisterPushNotifications as jest.Mock).mockImplementation(() => Promise.resolve());
  resetPushRevocationForTests();
});

afterAll(() => {
  secure.getItemAsync.mockImplementation(() => Promise.resolve(null));
  secure.setItemAsync.mockImplementation(() => Promise.resolve());
  secure.deleteItemAsync.mockImplementation(() => Promise.resolve());
});

describe('giriş', () => {
  it('giriş sonrası tam profil hemen çekilir: üyelik kademesi ve kurumsal alanlar store’a gelir', async () => {
    getProfile.mockResolvedValueOnce({
      data: {
        ...user(),
        membership: { tier: { type: 'business', name: 'Business' } },
        companyName: 'Acme',
        taxId: '1234567890',
        phone: '+905551112233',
      },
    });

    await useAuthStore.getState().login('at-1', user(), 'rt-1');
    // Giriş beklemez: anında giriş yanıtının kullanıcısıyla açık.
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    await flush();

    const s = useAuthStore.getState();
    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(s.profileValidated).toBe(true);
    expect(s.user?.membershipTier).toBe('business');
    expect(s.user?.companyName).toBe('Acme');
    expect(s.limits?.isAdFree).toBe(true);
  });

  it('refreshUserData her zaman YENİ istek atar; eski (önce başlamış) yanıt yenisinin üstüne yazmaz', async () => {
    let resolveLoginFetch!: (v: unknown) => void;
    getProfile.mockReturnValueOnce(new Promise((r) => (resolveLoginFetch = r)));
    getProfile.mockResolvedValueOnce({ data: { ...user(), displayName: 'Yeni', companyName: 'Acme', taxId: '1' } });

    await useAuthStore.getState().login('at-1', user(), 'rt-1');
    // Değişiklikten sonra çağrılan refreshUserData uçuştaki giriş çekimine KATILMAZ.
    const fresh = await useAuthStore.getState().refreshUserData();
    expect(getProfile).toHaveBeenCalledTimes(2);
    expect(fresh?.displayName).toBe('Yeni');

    // Giriş çekiminin (daha eski) yanıtı sonradan dönse de yazılmaz.
    resolveLoginFetch({ data: { ...user(), displayName: 'Eski' } });
    await flush();
    expect(useAuthStore.getState().user?.displayName).toBe('Yeni');
  });

  it('yerel güncellemeden (updateUser) önce başlamış profil yanıtı onun üstüne yazmaz', async () => {
    let resolveFetch!: (v: unknown) => void;
    getProfile.mockReturnValueOnce(new Promise((r) => (resolveFetch = r)));
    await useAuthStore.getState().login('at-1', user(), 'rt-1');

    useAuthStore.getState().updateUser({ displayName: 'Kaydedildi' });
    resolveFetch({ data: { ...user(), displayName: 'Eski' } });
    await flush();

    expect(useAuthStore.getState().user?.displayName).toBe('Kaydedildi');
  });

  it('önceki çıkışın push iptali uçuştaysa giriş önce onu bekler (kayıt iptalden sonra)', async () => {
    let finishRevoke!: () => void;
    (unregisterPushNotifications as jest.Mock).mockReturnValueOnce(
      new Promise<void>((r) => (finishRevoke = r)),
    );
    getProfile.mockResolvedValue({ data: user() });
    await useAuthStore.getState().logout({ skipServer: true });

    let loggedIn = false;
    const login = useAuthStore.getState().login('at-b', user({ id: 'b' }), 'rt-b').then(() => {
      loggedIn = true;
    });
    await flush();
    expect(loggedIn).toBe(false);

    finishRevoke();
    await login;
    expect(loggedIn).toBe(true);
  });

  it('yanıt refresh token vermezse önceki oturumun refresh token’ı SİLİNİR', async () => {
    vault.set('refreshToken', 'stale-refresh-of-previous-account');
    getProfile.mockResolvedValue({ data: user() });

    await useAuthStore.getState().login('at-2', user());

    expect(vault.get('accessToken')).toBe('at-2');
    expect(vault.has('refreshToken')).toBe(false);
  });

  it('access yazımı düşerse yeni refresh KALIR, eski access silinir; giriş hata verir', async () => {
    vault.set('accessToken', 'old-access-of-previous-account');
    vault.set('refreshToken', 'old');
    secure.setItemAsync.mockImplementation((k: string, v: string) => {
      if (k === 'accessToken') return Promise.reject(new Error('keychain write failed'));
      vault.set(k, v);
      return Promise.resolve();
    });

    await expect(useAuthStore.getState().login('at-3', user(), 'rt-3')).rejects.toThrow(
      'keychain write failed',
    );
    expect(vault.has('accessToken')).toBe(false);
    expect(vault.get('refreshToken')).toBe('rt-3');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('refresh yazımı düşerse ikisi de silinir (yarım çift kalmaz)', async () => {
    vault.set('accessToken', 'old-access');
    vault.set('refreshToken', 'old');
    secure.setItemAsync.mockImplementation((k: string, v: string) => {
      if (k === 'refreshToken') return Promise.reject(new Error('keychain write failed'));
      vault.set(k, v);
      return Promise.resolve();
    });

    await expect(useAuthStore.getState().login('at-4', user(), 'rt-4')).rejects.toThrow();
    expect(vault.has('accessToken')).toBe(false);
    expect(vault.has('refreshToken')).toBe(false);
  });

  it('önceki oturumun ban yönlendirmesi bayrağı girişte sıfırlanır', async () => {
    expect(claimBannedRedirect()).toBe(true);
    getProfile.mockResolvedValue({ data: user() });
    await useAuthStore.getState().login('at-4', user(), 'rt-4');
    expect(claimBannedRedirect()).toBe(true);
  });
});

describe('çıkış', () => {
  beforeEach(async () => {
    getProfile.mockResolvedValue({ data: user() });
    await useAuthStore.getState().login('at-1', user(), 'rt-1');
    await flush();
    jest.clearAllMocks();
  });

  it('yerel temizlik ağı BEKLEMEZ (çevrimdışı da anında biter); refresh token body’de iptal edilir', async () => {
    (unregisterPushNotifications as jest.Mock).mockReturnValue(new Promise(() => undefined));
    (authApi.logout as jest.Mock).mockReturnValue(new Promise(() => undefined));

    await useAuthStore.getState().logout();

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(vault.has('accessToken')).toBe(false);
    expect(vault.has('refreshToken')).toBe(false);
    // Push iptali oturumsuz (uç @Public), iptal edilebilir sinyalle; refresh temizlikten ÖNCE okundu.
    expect(unregisterPushNotifications).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    expect(authApi.logout).toHaveBeenCalledWith('rt-1');
    expect(disconnectSocket).toHaveBeenCalled();
  });

  it('zorunlu çıkışta da push iptal edilir', async () => {
    await useAuthStore.getState().logout({ reason: 'forced' });
    expect(unregisterPushNotifications).toHaveBeenCalledTimes(1);
  });

  it('sunucusuz çıkışta (hesap silindi / oturum sunucuda geçersiz) da push iptal edilir; refresh iptali yok', async () => {
    await useAuthStore.getState().logout({ reason: 'accountDeleted' });
    expect(unregisterPushNotifications).toHaveBeenCalledTimes(1);
    expect(authApi.logout).not.toHaveBeenCalled();
  });

  it('ban yönlendirmesi bayrağı çıkışta sıfırlanır (sonraki oturum takılı kalmaz)', async () => {
    expect(claimBannedRedirect()).toBe(true);
    expect(claimBannedRedirect()).toBe(false);
    await useAuthStore.getState().logout();
    expect(claimBannedRedirect()).toBe(true);
  });
});

describe('açılış doğrulaması geçici hata (saklı görüntüyle)', () => {
  const storedSession = () => {
    vault.set('accessToken', 'at-1');
    vault.set('refreshToken', 'rt-1');
    vault.set(USER_SNAPSHOT_KEY, serializeUserSnapshot(user({ membershipTier: 'premium' }))!);
  };

  it('oturum AÇIK kalır (misafire düşmez) ve bağlantı gelince doğrulama yeniden denenir', async () => {
    storedSession();
    getProfile.mockRejectedValueOnce(networkError());

    await useAuthStore.getState().loadToken();
    await flush();

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.membershipTier).toBe('premium');
    expect(useAuthStore.getState().profileValidated).toBe(false);

    getProfile.mockResolvedValueOnce({ data: { ...user(), phone: '+905551112233' } });
    await goOnline();

    expect(getProfile).toHaveBeenCalledTimes(2);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().profileValidated).toBe(true);
    expect(useAuthStore.getState().user?.phone).toBe('+905551112233');
  });

  it('403 (ban → /banned) yeniden denenmez, oturum açık kalır', async () => {
    storedSession();
    getProfile.mockRejectedValueOnce({ response: { status: 403 } });

    await useAuthStore.getState().loadToken();
    await flush();
    await goOnline();

    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('çıkış yapıldıysa bekleyen doğrulama denemesi çalışmaz', async () => {
    storedSession();
    getProfile.mockRejectedValueOnce(networkError());
    await useAuthStore.getState().loadToken();
    await flush();

    await useAuthStore.getState().logout({ skipServer: true });
    await goOnline();

    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

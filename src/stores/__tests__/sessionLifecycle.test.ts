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
import { clearLocalPushState, unregisterPushNotifications } from '../../services/push';
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

  it('refreshUserData giriş sonrası çekimle aynı isteği paylaşır (ikinci istek yok)', async () => {
    let resolve!: (v: unknown) => void;
    getProfile.mockReturnValueOnce(new Promise((r) => (resolve = r)));

    await useAuthStore.getState().login('at-1', user(), 'rt-1');
    const shared = useAuthStore.getState().refreshUserData();
    resolve({ data: { ...user(), companyName: 'Acme', taxId: '1' } });

    expect((await shared)?.companyName).toBe('Acme');
    expect(getProfile).toHaveBeenCalledTimes(1);
  });

  it('yanıt refresh token vermezse önceki oturumun refresh token’ı SİLİNİR', async () => {
    vault.set('refreshToken', 'stale-refresh-of-previous-account');
    getProfile.mockResolvedValue({ data: user() });

    await useAuthStore.getState().login('at-2', user());

    expect(vault.get('accessToken')).toBe('at-2');
    expect(vault.has('refreshToken')).toBe(false);
  });

  it('token yazımı düşerse yarım çift kalmaz (ikisi de silinir) ve giriş hata verir', async () => {
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
    expect(vault.has('refreshToken')).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
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

  it('yerel temizlik ağı BEKLEMEZ (çevrimdışı da anında biter); sunucu iptali açık kimlikle', async () => {
    (unregisterPushNotifications as jest.Mock).mockReturnValue(new Promise(() => undefined));
    (authApi.logout as jest.Mock).mockReturnValue(new Promise(() => undefined));

    await useAuthStore.getState().logout();

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(vault.has('accessToken')).toBe(false);
    expect(vault.has('refreshToken')).toBe(false);
    // Kimlik bilgileri temizlikten ÖNCE okunup açıkça verildi.
    expect(unregisterPushNotifications).toHaveBeenCalledWith('at-1');
    expect(authApi.logout).toHaveBeenCalledWith('rt-1');
    expect(disconnectSocket).toHaveBeenCalled();
  });

  it('zorunlu çıkışta da push iptali denenir (token hâlâ geçerli olabilir)', async () => {
    await useAuthStore.getState().logout({ reason: 'forced' });
    expect(unregisterPushNotifications).toHaveBeenCalledWith('at-1');
  });

  it('sunucusuz çıkış (hesap silindi) yalnız yerel push kaydını temizler', async () => {
    await useAuthStore.getState().logout({ reason: 'accountDeleted' });
    expect(unregisterPushNotifications).not.toHaveBeenCalled();
    expect(authApi.logout).not.toHaveBeenCalled();
    expect(clearLocalPushState).toHaveBeenCalled();
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

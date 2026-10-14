/**
 * `logout` yeniden giriş koruması + hesap silme sonrası yalnız yerel çıkış.
 *
 * Döngü (hesap silme): silinen hesabın token'ıyla `unregisterPushNotifications`
 * (POST /notifications/push-token) → 401 → refresh 401 → `handleAuthFailure` →
 * yeniden `logout` → yine push iptali … Koruma iki katlı:
 * - `logout({ reason: 'accountDeleted' })` sunucuya HİÇ istek atmaz;
 * - eşzamanlı `logout()` çağrıları tek çıkışı paylaşır (`isLogoutInProgress`).
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
import { advanceSessionEpoch, authApi } from '@/lib/api';
import { unregisterPushNotifications } from '../../services/push';
import { resetUserStores } from '../resetUserStores';
import { isLogoutInProgress, useAuthStore, type User } from '../authStore';

const mockAuthLogout = authApi.logout as jest.Mock;
const mockUnregister = unregisterPushNotifications as jest.Mock;
const mockReset = resetUserStores as jest.Mock;
const mockDeleteItem = SecureStore.deleteItemAsync as jest.Mock;

const user: User = {
  id: 'u1',
  email: 'u1@test.com',
  displayName: 'U1',
  membershipTier: 'free',
  isVerified: true,
  isEmailVerified: true,
  isPhoneVerified: true,
  verificationStatus: 'verified',
  isSeller: false,
  totalSales: 0,
  totalPurchases: 0,
  accountAge: 1,
  profileCompletion: 100,
  disputeCount: 0,
  listingCount: 0,
  maxFreeListings: 10,
  createdAt: new Date().toISOString(),
};

beforeEach(async () => {
  await useAuthStore.getState().login('token-1', user, 'refresh-1');
  jest.clearAllMocks();
  mockAuthLogout.mockImplementation(() => Promise.resolve());
  mockUnregister.mockImplementation(() => Promise.resolve());
});

describe('logout — hesap silindi (yalnız yerel)', () => {
  it('sunucu çağrısı yok; token, store ve kullanıcı state\'i temizlenir', async () => {
    await useAuthStore.getState().logout({ reason: 'accountDeleted' });

    expect(mockUnregister).not.toHaveBeenCalled();
    expect(mockAuthLogout).not.toHaveBeenCalled();
    expect(advanceSessionEpoch).toHaveBeenCalledTimes(1);
    expect(mockDeleteItem).toHaveBeenCalledWith('accessToken');
    expect(mockDeleteItem).toHaveBeenCalledWith('refreshToken');
    expect(mockReset).toHaveBeenCalledWith('accountDeleted');
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.token).toBeNull();
    expect(s.user).toBeNull();
  });

  it('skipServer başka bir nedenle de açıkça istenebilir', async () => {
    await useAuthStore.getState().logout({ skipServer: true });
    expect(mockUnregister).not.toHaveBeenCalled();
    expect(mockAuthLogout).not.toHaveBeenCalled();
    expect(mockReset).toHaveBeenCalledWith('user');
  });

  it('SecureStore silme hatası çıkışı yarıda bırakmaz', async () => {
    mockDeleteItem.mockRejectedValueOnce(new Error('keychain'));
    await expect(
      useAuthStore.getState().logout({ reason: 'accountDeleted' }),
    ).resolves.toBeUndefined();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(mockDeleteItem).toHaveBeenCalledWith('refreshToken');
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});

describe('logout — normal ve zorunlu çıkış değişmedi', () => {
  it('kullanıcı çıkışı: push iptali + POST /auth/logout + temizlik', async () => {
    await useAuthStore.getState().logout();
    expect(mockUnregister).toHaveBeenCalledTimes(1);
    expect(mockAuthLogout).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledWith('user');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('zorunlu çıkış: sunucu çağrıları yapılır, neden korunur', async () => {
    await useAuthStore.getState().logout({ reason: 'forced' });
    expect(mockAuthLogout).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledWith('forced');
  });
});

describe('logout — yeniden giriş koruması', () => {
  it('eşzamanlı çağrılar tek çıkışı paylaşır; ikinci çağrının sunucu/temizlik etkisi yok', async () => {
    let releasePush: () => void = () => {};
    mockUnregister.mockImplementation(
      () => new Promise<void>((r) => (releasePush = r)),
    );

    const first = useAuthStore.getState().logout();
    expect(isLogoutInProgress()).toBe(true);
    // Çıkışın kendi isteği 401 alıp `handleAuthFailure` → logout('forced') çağırdı.
    const second = useAuthStore.getState().logout({ reason: 'forced' });
    expect(second).toBe(first);

    releasePush();
    await Promise.all([first, second]);

    expect(mockUnregister).toHaveBeenCalledTimes(1);
    expect(mockAuthLogout).toHaveBeenCalledTimes(1);
    expect(advanceSessionEpoch).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledWith('user');
    expect(isLogoutInProgress()).toBe(false);
  });

  it('çıkış bittikten sonra yeni çıkış yeniden çalışır', async () => {
    await useAuthStore.getState().logout({ reason: 'accountDeleted' });
    await useAuthStore.getState().login('token-2', user);
    await useAuthStore.getState().logout();
    expect(mockReset).toHaveBeenCalledTimes(2);
    expect(mockAuthLogout).toHaveBeenCalledTimes(1);
  });

  it('çıkış hata verse de kilit bırakılır', async () => {
    mockReset.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(useAuthStore.getState().logout()).rejects.toThrow('boom');
    expect(isLogoutInProgress()).toBe(false);
  });
});

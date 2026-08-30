/**
 * `logout` sonrası `serverLimits` temizlenmezse eski kullanıcının sunucu
 * bindirmesi (ör. premium `isAdFree`/`maxListings`) yeni giriş yapan
 * kullanıcıya sızar. Bu suite tam olarak o sızıntı yolunu sabitler.
 */
jest.mock('@/lib/api', () => ({
  authApi: { logout: jest.fn(() => Promise.resolve()) },
  userApi: { getProfile: jest.fn() },
  // logout ilk iş olarak oturum kuşağını ilerletiyor (uçuştaki refresh'i
  // geçersizleştirmek için) — sözleşmesi `sessionEpoch.test.ts`'te kilitli.
  advanceSessionEpoch: jest.fn(),
}));
// authStore `require("../services/push")`'u logout içinde lazy çağırıyor —
// gerçek push modülü native bağımlılıklar içerir, no-op mock yeterli.
jest.mock('../../services/push', () => ({
  unregisterPushNotifications: jest.fn(() => Promise.resolve()),
}));
// logout → resetUserStores → cartStore, AsyncStorage tabanlı persist middleware
// kullanıyor; native modül testte kayıtlı değil. no-op mock yeterli.
jest.mock('../resetUserStores', () => ({
  resetUserStores: jest.fn(),
}));

import * as SecureStore from 'expo-secure-store';

import { useAuthStore, type User } from '../authStore';
import { userApi } from '@/lib/api';

const baseUser: User = {
  id: 'u1',
  email: 'premium@test.com',
  displayName: 'Premium User',
  membershipTier: 'premium',
  isVerified: true,
  isEmailVerified: true,
  isPhoneVerified: true,
  verificationStatus: 'verified',
  isSeller: false,
  totalSales: 0,
  totalPurchases: 0,
  accountAge: 100,
  profileCompletion: 100,
  disputeCount: 0,
  listingCount: 0,
  maxFreeListings: 10,
  createdAt: new Date().toISOString(),
};

describe('authStore — serverLimits sızıntısı (logout)', () => {
  beforeEach(async () => {
    // Her testten önce temiz bir oturumsuz duruma dön.
    await useAuthStore.getState().logout();
  });

  it('logout sonrası serverLimits null olur', async () => {
    useAuthStore.getState().setServerLimits({ maxListings: 200, isAdFree: true });
    expect(useAuthStore.getState().serverLimits).toEqual({ maxListings: 200, isAdFree: true });

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().serverLimits).toBeNull();
  });

  it('eski kullanıcının override bilgisi yeni girişte sızmaz — limits TIER_LIMITS[yeni tier] ile birebir eşleşir', async () => {
    // Premium kullanıcı sunucudan yüksek limitler alıyor.
    useAuthStore.getState().setServerLimits({ maxListings: 200, isAdFree: true });
    expect(useAuthStore.getState().limits?.maxListings).toBe(200);
    expect(useAuthStore.getState().limits?.isAdFree).toBe(true);

    // Çıkış yapar.
    await useAuthStore.getState().logout();

    // Aynı cihazdan farklı (free) bir kullanıcı giriş yapar.
    const freeUser: User = { ...baseUser, id: 'u2', email: 'free@test.com', membershipTier: 'free' };
    await useAuthStore.getState().login('token-2', freeUser);

    const { limits } = useAuthStore.getState();
    // Eski kullanıcının 200/isAdFree:true değeri sızmamalı — sunucu yanıtı
    // henüz gelmediği için free tier'ın TIER_LIMITS değerleri geçerli olmalı.
    expect(limits?.maxListings).toBe(10);
    expect(limits?.isAdFree).toBe(false);
  });
});

/**
 * `mapApiUserToUser` (authStore.ts, private) yeni `username`/`usernameClaimed`
 * alanlarını API cevabından kopyalamazsa, `claimUsername` ile set edilen değer
 * bir sonraki profil refetch'inde sessizce silinir — kullanıcı adı bir kez
 * belirlenir kuralı bozulur. Bu suite gerçek store + gerçek `mapApiUserToUser`
 * üzerinden (authStore mock'lanmadan) bu alanların taşındığını sabitler.
 */
describe('authStore — mapApiUserToUser kullanıcı adı alanları', () => {
  beforeEach(async () => {
    await useAuthStore.getState().logout();
    jest.clearAllMocks();
  });

  it('refreshUserData sonrası username ve usernameClaimed store’a doğru taşınır', async () => {
    (userApi.getProfile as jest.Mock).mockResolvedValueOnce({
      data: {
        ...baseUser,
        username: 'kaan.merakli',
        usernameClaimed: true,
      },
    });

    await useAuthStore.getState().refreshUserData();

    const { user } = useAuthStore.getState();
    expect(user?.username).toBe('kaan.merakli');
    expect(user?.usernameClaimed).toBe(true);
  });
});

/**
 * C1'in soğuk-açılış varyantı: `loadToken` SecureStore'dan token'ı `getProfile()`
 * çağrısından ÖNCE okuyor. Access token süresi dolmuşsa o istek 401 alıp sessiz
 * refresh tetikler (interceptor SecureStore'u yeniler) — ama store'a önceden
 * okunan BAYAT token yazılırsa, store'dan okuyan tüketiciler (bearer'lı mesaj
 * eki görselleri, socket) ölü token'la kalır. Bu test taze token'ın yazıldığını
 * sabitler.
 */
describe('authStore — loadToken sessiz refresh sonrası taze token yazar', () => {
  beforeEach(async () => {
    await useAuthStore.getState().logout();
    jest.clearAllMocks();
  });

  it('getProfile sırasında token yenilendiyse store TAZE token’ı tutar', async () => {
    (SecureStore.getItemAsync as jest.Mock)
      .mockResolvedValueOnce('expired-token') // ilk okuma: süresi dolmuş
      .mockResolvedValueOnce('refreshed-token'); // getProfile sonrası: yenilenmiş
    (userApi.getProfile as jest.Mock).mockResolvedValueOnce({ data: baseUser });

    await useAuthStore.getState().loadToken();

    expect(useAuthStore.getState().token).toBe('refreshed-token');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('refresh olmadıysa (token aynı) davranış değişmez', async () => {
    (SecureStore.getItemAsync as jest.Mock)
      .mockResolvedValueOnce('valid-token')
      .mockResolvedValueOnce('valid-token');
    (userApi.getProfile as jest.Mock).mockResolvedValueOnce({ data: baseUser });

    await useAuthStore.getState().loadToken();

    expect(useAuthStore.getState().token).toBe('valid-token');
  });
});

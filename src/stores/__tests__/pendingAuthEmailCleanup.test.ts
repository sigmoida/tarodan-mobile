/**
 * Doğrulama/giriş akışının bellek içi e-postası (PII) iş bitince silinir:
 * her giriş yolu (`authStore.login`) ve çıkış (`resetUserStores`).
 * Gerçek `authStore` + gerçek `resetUserStores`; ağ ve push mock'lu.
 */
jest.mock('@/lib/api', () => ({
  authApi: { logout: jest.fn(() => Promise.resolve()) },
  userApi: { getProfile: jest.fn() },
  advanceSessionEpoch: jest.fn(),
}));
jest.mock('../../services/push', () => ({
  unregisterPushNotifications: jest.fn(() => Promise.resolve()),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { useAuthStore, type User } from '../authStore';
import { resetUserStores } from '../resetUserStores';
import { usePendingAuthEmailStore } from '../pendingAuthEmailStore';

const user = {
  id: 'u1',
  email: 'u1@test.com',
  displayName: 'u1',
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
} as User;

beforeEach(() => {
  usePendingAuthEmailStore.setState({ email: 'kayit@demo.com' });
});

it('giriş başarısında temizlenir', async () => {
  await useAuthStore.getState().login('token-1', user);
  expect(usePendingAuthEmailStore.getState().email).toBeNull();
});

it('çıkışta (resetUserStores) temizlenir', () => {
  resetUserStores('user');
  expect(usePendingAuthEmailStore.getState().email).toBeNull();
});

it('boşluklu / boş adres null olarak saklanır', () => {
  usePendingAuthEmailStore.getState().setEmail('  x@y.com ');
  expect(usePendingAuthEmailStore.getState().email).toBe('x@y.com');
  usePendingAuthEmailStore.getState().setEmail('   ');
  expect(usePendingAuthEmailStore.getState().email).toBeNull();
});

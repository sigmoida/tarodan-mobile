/**
 * The old device-local saved-search list (`diecast_saved_searches`) is discarded, never imported
 * (plan 2026-10-21 decision C; contract delta `2026-10-21-saved-searches.md`): once per start in
 * `loadToken` (guest or signed in) and on logout (`resetUserStores`, covered by
 * `resetUserLocalData.test.ts`). The cleanup never throws.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../authStore';
import { SAVED_SEARCHES_STORAGE_KEY, clearSavedSearches } from '../savedSearchesStorage';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('legacy saved-search list', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('is removed at startup (no token: a guest start), and is not imported anywhere', async () => {
    await AsyncStorage.setItem(SAVED_SEARCHES_STORAGE_KEY, JSON.stringify([{ id: 'old', name: 'BMW' }]));

    await useAuthStore.getState().loadToken();
    await flush();

    expect(await AsyncStorage.getItem(SAVED_SEARCHES_STORAGE_KEY)).toBeNull();
  });

  it('clearSavedSearches does not throw when the storage fails', async () => {
    const spy = jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(new Error('disk'));
    await expect(clearSavedSearches()).resolves.toBeUndefined();
    spy.mockRestore();
  });
});

/**
 * LEGACY key of the device-local saved-search list. Saved searches live on the server now
 * (`savedSearchesApi`, `qk.user.savedSearches`); nothing reads or writes this key any more. The list
 * is discarded, not imported (plan 2026-10-21 decision C): once per start (`authStore.loadToken`) and
 * on logout (`resetUserStores`), as web does for its localStorage key.
 */
export const SAVED_SEARCHES_STORAGE_KEY = 'diecast_saved_searches';

/**
 * Removes the legacy local list. Best effort, never throws. AsyncStorage is loaded here, not at the
 * top: `authStore` imports this module, and the native module must not load with every importer of
 * the store (it is only needed for this one removal).
 */
export async function clearSavedSearches(): Promise<void> {
  try {
    // Lazy require (the same way `authStore` loads `cartStore`): a load failure is caught below.
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const storage = require('@react-native-async-storage/async-storage');
    const AsyncStorage = storage.default ?? storage;
    await AsyncStorage.removeItem(SAVED_SEARCHES_STORAGE_KEY);
  } catch {
    /* best effort */
  }
}

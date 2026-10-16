import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Kayıtlı aramalar (üyeye özel) cihazda AsyncStorage'da tutulur — anahtarın TEK kaynağı.
 * Ekran: `app/settings/saved-searches`; çıkışta silinir (`resetUserStores`).
 */
export const SAVED_SEARCHES_STORAGE_KEY = 'diecast_saved_searches';

/** Çıkış: önceki hesabın kayıtlı aramaları sonraki oturuma kalmasın. En iyi çaba, fırlatmaz. */
export async function clearSavedSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SAVED_SEARCHES_STORAGE_KEY);
  } catch {
    /* en iyi çaba */
  }
}

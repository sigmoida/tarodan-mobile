/**
 * Çıkışta cihazda kalıcı tutulan kullanıcıya özel yerel veriler de silinir: son aramalar
 * (persist'li store), kayıtlı aramalar (AsyncStorage) ve sepetin birleştirme bekliyor işareti.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCartStore } from '../cartStore';
import { useRecentSearchesStore } from '../recentSearchesStore';
import { resetUserStores } from '../resetUserStores';
import { SAVED_SEARCHES_STORAGE_KEY } from '../savedSearchesStorage';

const flush = () => new Promise((r) => setTimeout(r, 0));

it('son aramalar, kayıtlı aramalar ve sepet birleştirme işareti çıkışta temizlenir', async () => {
  useRecentSearchesStore.getState().addSearch('ferrari 1:18');
  await AsyncStorage.setItem(SAVED_SEARCHES_STORAGE_KEY, JSON.stringify([{ id: 's1' }]));
  useCartStore.setState({ mergePendingFor: 'u1' });

  resetUserStores('user');
  await flush();

  expect(useRecentSearchesStore.getState().searches).toEqual([]);
  expect(await AsyncStorage.getItem(SAVED_SEARCHES_STORAGE_KEY)).toBeNull();
  expect(useCartStore.getState().mergePendingFor).toBeNull();
});

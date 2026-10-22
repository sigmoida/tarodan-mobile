/**
 * Çıkışta cihazda kalıcı tutulan kullanıcıya özel yerel veriler de silinir: son aramalar
 * (persist'li store), kayıtlı aramalar (AsyncStorage) ve sepetin birleştirme bekliyor işareti.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCartStore } from '../cartStore';
import { useCartWritesStore } from '../cartWritesStore';
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

it('a card cart write still running does not lock its listing for the next session', () => {
  const stale = useCartWritesStore.getState().begin('p1')!;

  resetUserStores('forced');

  expect(useCartWritesStore.getState().inFlight).toEqual({});
  const fresh = useCartWritesStore.getState().begin('p1');
  expect(fresh).not.toBeNull();
  // The old write settling later does not end the new one.
  useCartWritesStore.getState().end('p1', stale);
  expect('p1' in useCartWritesStore.getState().inFlight).toBe(true);
  useCartWritesStore.getState().end('p1', fresh!);
  expect(useCartWritesStore.getState().inFlight).toEqual({});
});

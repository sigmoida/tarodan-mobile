/**
 * Kalıcı sorgu önbelleği: diske YALNIZ herkese açık katalog sorguları yazılır; kullanıcıya
 * özel hiçbir anahtar (sepet, favori, mesaj, sipariş, ödeme, üyelik…) dehydrate edilmez.
 * Yeni sürüm (buster) eski önbelleği düşürür; çıkış saklı önbelleği siler.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, dehydrate, type QueryKey } from '@tanstack/react-query';
import {
  persistQueryClientRestore,
  persistQueryClientSave,
} from '@tanstack/react-query-persist-client';
import * as SecureStore from 'expo-secure-store';
import { qk } from '../keys';
import {
  QUERY_CACHE_BUSTER,
  QUERY_CACHE_MAX_AGE_MS,
  QUERY_CACHE_STORAGE_KEY,
  isPersistableQueryKey,
  queryPersistOptions,
} from '../persist';
import { resetUserStores } from '@/stores/resetUserStores';
import { USER_SNAPSHOT_KEY } from '@/stores/userSnapshot';

const PUBLIC_KEYS: QueryKey[] = [
  ['product-filters', ''],
  ['product-filters', 'hot-wheels'],
  qk.catalog.categories,
  qk.catalog.collectionCategories,
  qk.catalog.brands,
  qk.catalog.manufacturers,
  qk.hero.slides('auth_default', 'app'),
  qk.hero.slides('auth_register', 'app'),
  qk.publicSettings.all,
  qk.timingPolicy.all,
  qk.appConfig.check('ios', '1.0.6'),
  qk.shipping.packageTiers,
  qk.products.attributeGroups,
];

const PRIVATE_KEYS: QueryKey[] = [
  qk.cart.mine,
  qk.favorites.all,
  qk.messaging.threads,
  qk.messaging.unreadCount,
  qk.notifications.unread,
  qk.notifications.list,
  qk.orders.list(),
  qk.orders.detail('o1'),
  qk.payments.mine,
  qk.payments.savedCards('checkout'),
  qk.membership.me,
  qk.membership.tiers,
  qk.membershipLimits.mine,
  qk.consents.pending,
  qk.legalIdentity.me,
  qk.user.addresses,
  qk.user.bankAccount,
  qk.user.twoFactorStatus,
  // Sign-in methods: the password flag and the linked provider e-mails of this account.
  qk.auth.signInMethods,
  qk.offers.pendingCount,
  qk.trades.pendingCount,
  qk.checkout.quote('sig'),
  qk.products.detail('p1'),
  qk.products.myListings(),
  qk.ads.active,
  qk.shipping.byOrder('o1'),
  // Ana sayfa hero'su herkese açık ama admin anahtarıyla anında gizlenebilir: soğuk açılışta eski
  // kopya çizilmesin.
  qk.hero.slides('home', 'app'),
  qk.hero.slidesAll,
];

describe('izin listesi', () => {
  it.each(PUBLIC_KEYS.map((k) => [JSON.stringify(k), k]))('saklanır: %s', (_, key) => {
    expect(isPersistableQueryKey(key as QueryKey)).toBe(true);
  });

  it.each(PRIVATE_KEYS.map((k) => [JSON.stringify(k), k]))('saklanMAZ: %s', (_, key) => {
    expect(isPersistableQueryKey(key as QueryKey)).toBe(false);
  });

  it('dehydrate yalnız başarılı + izinli sorguları alır, mutasyon hiç almaz', async () => {
    const client = new QueryClient();
    [...PUBLIC_KEYS, ...PRIVATE_KEYS].forEach((key) => client.setQueryData(key, { ok: true }));
    // Hatalı izinli sorgu saklanmaz.
    await client
      .fetchQuery({ queryKey: ['brands', 'broken'], queryFn: () => Promise.reject(new Error('x')), retry: false })
      .catch(() => undefined);

    const state = dehydrate(client, queryPersistOptions.dehydrateOptions);
    const keys = state.queries.map((q) => JSON.stringify(q.queryKey));

    expect(keys.sort()).toEqual(PUBLIC_KEYS.map((k) => JSON.stringify(k)).sort());
    expect(state.mutations).toEqual([]);
    client.clear();
  });
});

describe('persist/restore', () => {
  beforeEach(() => AsyncStorage.clear());

  it('yalnız katalog geri yüklenir; seçenekler (24 sa, sürüm buster) doğru', async () => {
    expect(queryPersistOptions.maxAge).toBe(QUERY_CACHE_MAX_AGE_MS);
    expect(QUERY_CACHE_MAX_AGE_MS).toBe(24 * 60 * 60 * 1000);
    expect(queryPersistOptions.buster).toBe(QUERY_CACHE_BUSTER);
    expect(QUERY_CACHE_BUSTER).toMatch(/^.+:\d+$/);

    const before = new QueryClient();
    before.setQueryData(qk.catalog.categories, [{ id: 'c1' }]);
    before.setQueryData(qk.cart.mine, { items: ['gizli'] });
    await persistQueryClientSave({ queryClient: before, ...queryPersistOptions });
    expect(await AsyncStorage.getItem(QUERY_CACHE_STORAGE_KEY)).toBeTruthy();

    const after = new QueryClient();
    await persistQueryClientRestore({ queryClient: after, ...queryPersistOptions });
    expect(after.getQueryData(qk.catalog.categories)).toEqual([{ id: 'c1' }]);
    expect(after.getQueryData(qk.cart.mine)).toBeUndefined();
    before.clear();
    after.clear();
  });

  it('farklı sürümün (buster) önbelleği atılır', async () => {
    const before = new QueryClient();
    before.setQueryData(qk.catalog.categories, [{ id: 'c1' }]);
    await persistQueryClientSave({ queryClient: before, ...queryPersistOptions, buster: '0.0.1:1' });

    const after = new QueryClient();
    await persistQueryClientRestore({ queryClient: after, ...queryPersistOptions });
    expect(after.getQueryData(qk.catalog.categories)).toBeUndefined();
    before.clear();
    after.clear();
  });
});

describe('çıkış (resetUserStores)', () => {
  it('saklı sorgu önbelleğini ve açılış kullanıcı görüntüsünü siler', async () => {
    await AsyncStorage.setItem(QUERY_CACHE_STORAGE_KEY, '{"buster":"x"}');

    resetUserStores('user');
    await new Promise((r) => setTimeout(r, 0));

    expect(await AsyncStorage.getItem(QUERY_CACHE_STORAGE_KEY)).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(USER_SNAPSHOT_KEY);
  });

  it('zorunlu çıkışta da siler', async () => {
    await AsyncStorage.setItem(QUERY_CACHE_STORAGE_KEY, '{"buster":"x"}');
    (SecureStore.deleteItemAsync as jest.Mock).mockClear();

    resetUserStores('forced');
    await new Promise((r) => setTimeout(r, 0));

    expect(await AsyncStorage.getItem(QUERY_CACHE_STORAGE_KEY)).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(USER_SNAPSHOT_KEY);
  });
});

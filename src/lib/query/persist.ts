import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { defaultShouldDehydrateQuery, type Query, type QueryKey } from "@tanstack/react-query";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";
import { getAppVersion } from "@/constants/appUpdate";
import { logger, safeError } from "@/services/logger";
import { qk } from "./keys";

/**
 * Soğuk açılışlar arası kalıcı sorgu önbelleği (TanStack `PersistQueryClientProvider`).
 *
 * Yalnız HERKESE AÇIK, seyrek değişen katalog verisi saklanır: açılışta kategori
 * ağacı / üretici şeridi / filtre seçenekleri / politika süreleri ağı beklemeden
 * çizilir, sonra eskimişse (staleTime) arka planda tazelenir.
 *
 * Kullanıcıya özel HİÇBİR şey saklanmaz (sepet, favori, mesaj, sipariş, ödeme,
 * üyelik, bildirim…) — izin listesi dışı her anahtar varsayılan olarak dışarıda.
 * Yeni anahtar eklemeden önce: yanıt oturuma göre değişiyor mu? Değişiyorsa EKLEME.
 */

/** AsyncStorage anahtarı. */
export const QUERY_CACHE_STORAGE_KEY = "tarodan.query-cache.v1";

/** Saklı önbellek en çok bu kadar eski olabilir; daha eskisi açılışta atılır. */
export const QUERY_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Saklanan veri şekli değişince (sorgu `queryFn` dönüşü / `select` öncesi şekil) artır:
 * aynı sürüm numarasıyla çıkan OTA güncellemesi de eski önbelleği bıraksın.
 */
// 2: hero slaytları izin listesinden çıktı — cihazlardaki eski kopya (içinde hero var) düşsün.
const QUERY_CACHE_SCHEMA = 2;

/** Yeni build (sürüm) ya da şema değişikliği eski önbelleği düşürür. */
export const QUERY_CACHE_BUSTER = `${getAppVersion() ?? "unknown"}:${QUERY_CACHE_SCHEMA}`;

/**
 * Saklanabilir sorgu anahtarı önekleri. Eşleşme öğe öğe önek karşılaştırmasıdır
 * (`["categories"]` → `["categories", "collections"]`'ı da kapsar).
 */
export const PERSISTED_QUERY_PREFIXES: readonly QueryKey[] = [
  // Ürün filtre seçenekleri (`useProductFilterOptions`).
  qk.products.filterOptionsAll,
  qk.catalog.categories,
  qk.catalog.brands,
  qk.catalog.manufacturers,
  // Hero slaytları (`qk.hero.slidesAll`) BİLEREK yok: admin uygulama anahtarını kapatınca ya da
  // slayt süresi dolunca soğuk açılışta 24 sa'lik eski kopya çizilip gösterim saymasın. Zıplama
  // `hero.home.lastHadSlides` yer tutucusuyla önlenir (`useHomeHero`).
  // İlan fiyat sınırları vb. herkese açık ayarlar (`usePriceLimits`).
  qk.publicSettings.all,
  qk.timingPolicy.all,
  // Zorunlu güncelleme kontrolü: anahtar sürümü içerir, buster da sürüme bağlı.
  qk.appConfig.all,
  // İlan formu: herkese açık kargo kademe tarifesi + genel özel nitelik grupları.
  qk.shipping.packageTiers,
  qk.products.attributeGroups,
];

const startsWith = (key: QueryKey, prefix: QueryKey): boolean =>
  prefix.length <= key.length && prefix.every((part, i) => key[i] === part);

export function isPersistableQueryKey(key: QueryKey): boolean {
  return PERSISTED_QUERY_PREFIXES.some((prefix) => startsWith(key, prefix));
}

/** Yalnız başarılı + izin listesindeki sorgular saklanır. */
export function shouldPersistQuery(query: Query): boolean {
  return defaultShouldDehydrateQuery(query) && isPersistableQueryKey(query.queryKey);
}

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: QUERY_CACHE_STORAGE_KEY,
  throttleTime: 1000,
});

/** `PersistQueryClientProvider` `persistOptions` (queryClient sağlayıcı tarafından eklenir). */
export const queryPersistOptions: Omit<PersistQueryClientOptions, "queryClient"> = {
  persister: queryPersister,
  maxAge: QUERY_CACHE_MAX_AGE_MS,
  buster: QUERY_CACHE_BUSTER,
  dehydrateOptions: {
    shouldDehydrateQuery: shouldPersistQuery,
    // Mutasyonlar hiç saklanmaz (ödeme/teklif yazmaları sonraki açılışta yeniden oynatılmasın).
    shouldDehydrateMutation: () => false,
  },
};

/**
 * Saklı önbelleği siler (çıkış — `resetUserStores`). Saklanan veri herkese açık olsa da
 * çıkış "bu cihazda önceki oturumdan iz kalmasın" demek; en iyi çaba, fırlatmaz.
 */
export async function clearPersistedQueryCache(): Promise<void> {
  try {
    await queryPersister.removeClient();
  } catch (error) {
    logger.warn("Persisted query cache clear failed", { err: safeError(error) });
  }
}

import { createPlatformQueryClient } from "@/lib/api-client/query";
import { installOnlineManager } from "@/lib/network/onlineManager";
import { installFocusManager } from "./focusManager";
import { retryUnlessClientError } from "./retry";
import { qk } from "./keys";
import { StaggeredFocusQueryCache } from "./staggeredFocusCache";

// TanStack `onlineManager` cihaz bağlantısına bağlanır (ilk sorgudan önce): çevrimiçi olunca
// eskimiş / hatalı sorgular tazelenir.
installOnlineManager();
// `focusManager` AppState'e bağlanır: arka planda yoklamalar durur, ön plana dönüşte eskimiş
// ekran sorguları tazelenir (`./focusManager`).
installFocusManager();

// Tek paylaşılan QueryClient — _layout'taki provider ve logout temizliği
// (resetUserStores) aynı örneği kullansın diye modül seviyesinde.
export const queryClient = createPlatformQueryClient({
  // Ön plana dönüşte eskimiş sorgular partiler halinde yeniden çekilir (ilk 8 hemen, sonra 4'er /
  // 300 ms; son etkinliğe göre sıralı) — 10–20 isteğin aynı anda çıkması yerine (`./staggeredFocusCache`).
  queryCache: new StaggeredFocusQueryCache(),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      // 4xx yeniden denenmez (tekrar denemek düzeltmez, aynı hatayı/isteği üç kez üretir);
      // ağ/5xx en fazla 2 kez denenir. Kendi `retry`'sini veren sorgular bunu ezer.
      retry: retryUnlessClientError,
      // 'always': çevrimdışıyken sorgular DURAKLATILMAZ (varsayılan 'online' duraklatır: ekran
      // yükleme/hata durumuna hiç girmeden boş kalır). Davranış bağlantı izlemesinden ÖNCEKİYLE
      // aynı kalır — istek denenir, ağ hatasıyla düşerse mevcut hata durumu görünür; yeniden
      // bağlanınca `refetchOnReconnect` (onlineManager) yine tazeler.
      networkMode: 'always',
      // Ön plana GERÇEK dönüşte (arka plan → active; iOS `inactive` sıçraması sayılmaz) yalnız
      // ekranda olan VE eskimiş (staleTime 5 dk) sorgular yenilenir — her dönüşte her şey değil.
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Yazmalar (ödeme, teklif…) çevrimdışıyken sessizce kuyruğa alınıp bağlantı dönünce
      // KENDİLİĞİNDEN çalışmasın; kullanıcı hatayı görür ve bilerek yeniden dener.
      networkMode: 'always',
    },
  },
});

/** Yavaş değişen katalog / ayar verisi: 30 dk taze, ön plana dönüşte yeniden çekilmez. */
export const SLOW_DATA_STALE_MS = 30 * 60 * 1000;

/**
 * Admin'in seyrek değiştirdiği katalog (kategori ağacı, marka/üretici/model listeleri, ilan filtre
 * seçenekleri) her ön plana dönüşte yeniden çekilmesin. Sorgu kendi `staleTime`'ını verirse o
 * geçerlidir (`setQueryDefaults` < gözlemci seçenekleri). Önek eşleşir: `["categories"]` ağaç +
 * koleksiyon kategorilerini de kapsar. Fiyat/politika ayarları (`publicSettings`, `timingPolicy`)
 * bilerek YOK: kendi staleTime'ları var ve dönüşte tazelenmeleri istenir.
 */
const SLOW_DATA_PREFIXES = [
  qk.catalog.categories,
  qk.catalog.brands,
  qk.catalog.manufacturers,
  qk.catalog.carModelsAll,
  qk.products.filterOptionsAll,
];
for (const prefix of SLOW_DATA_PREFIXES) {
  queryClient.setQueryDefaults(prefix, {
    staleTime: SLOW_DATA_STALE_MS,
    refetchOnWindowFocus: false,
  });
}

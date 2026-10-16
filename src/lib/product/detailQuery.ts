import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';
import { qk, retryUnlessClientError } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';

/** Ürün detayı yanıtı — backend şekli gevşek (dinamik alanlar); route DTO'su (`Product`, index signature `any`) bununla uyumlu. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- route `Product` DTO'su ile aynı gevşeklik (sıkılaştırma Faz 4)
export type ProductDetailData = Record<string, any> & { id: string; title: string };

const httpStatus = (error: unknown): number | undefined => {
  const status = (error as { response?: { status?: unknown } } | null)?.response?.status;
  return typeof status === 'number' ? status : undefined;
};

/**
 * "Ürün yok" yanıtı mı: 404 (silinmiş / pasif / onay bekleyen ilan public uçta) ya da 400 (API
 * `ParseUUIDPipe`: geçersiz id biçimi — böyle bir ilan hiç olamaz). Ağ / 5xx / zaman aşımı DEĞİL:
 * onlar hata olarak kalır ki ekran "bulunamadı" yerine "Tekrar Dene" göstersin.
 */
export function isProductNotFoundError(error: unknown): boolean {
  const status = httpStatus(error);
  return status === 404 || status === 400;
}

const unwrap = (response: { data: unknown }): ProductDetailData | null => {
  // Sarmal `{ data: ürün }` ya da düz ürün.
  const body = response.data as (ProductDetailData & { data?: ProductDetailData }) | null | undefined;
  return body?.data || body || null;
};

/**
 * GET /products/:id (web ile parite). Public uç pending/rejected/inactive ilanı 404 döndürür; kullanıcı
 * giriş yapmışsa sahibe-özel uca (GET /products/my/:id) düşülür (her statüde döner). Yalnız gerçek
 * "yok" yanıtı `null` olur (ekran: bulunamadı); ağ / 5xx hatası FIRLATILIR (ekran: hata + tekrar dene,
 * React Query de yeniden dener) — önceden her hata 5 dk'lık bir "bulunamadı" önbelleğine dönüşüyordu.
 * Görüntülenme sayımı burada YOK (bkz. `useProduct`): önbelleğe alma / prefetch görüntülenme saymaz.
 */
export async function fetchProductDetail(productId: string, isAuthenticated: boolean): Promise<ProductDetailData | null> {
  try {
    return unwrap(await productsApi.getOne(productId));
  } catch (error) {
    if (!isProductNotFoundError(error)) throw error;
    if (!isAuthenticated) return null;
    try {
      return unwrap(await productsApi.getMyById(productId));
    } catch (mineError) {
      // Sahibi değil (404/403) → gerçekten yok; sahibe-özel uç ağ / 5xx ile düştüyse hata kalır.
      const status = httpStatus(mineError);
      if (status !== undefined && status >= 400 && status < 500) return null;
      throw mineError;
    }
  }
}

/** Tek yeniden deneme (ağ / 5xx); 4xx denenmez (`retryUnlessClientError` ile aynı kural). */
const retryOnce = (failureCount: number, error: unknown) => failureCount < 1 && retryUnlessClientError(failureCount, error);

/**
 * Ürün detayı sorgusunun TEK tanımı (anahtar + queryFn): `useProduct` ve kart dokunuşundaki prefetch
 * aynı nesneyi kullanır — biri değişip diğeri farklı anahtar/şekil yazamaz.
 */
export function productDetailQuery(productId: string, isAuthenticated: boolean) {
  return queryOptions({
    queryKey: qk.products.detail(productId),
    queryFn: () => fetchProductDetail(productId, isAuthenticated),
    retry: retryOnce,
  });
}

/** Oturum durumu (store'dan, render'a abone olmadan). Store testte sade fonksiyonla taklit edildiyse misafir. */
function isAuthenticatedNow(): boolean {
  const getState = (useAuthStore as { getState?: () => { isAuthenticated?: boolean } }).getState;
  return typeof getState === 'function' ? !!getState().isAuthenticated : false;
}

/**
 * Kart dokunuşunda detayı önceden çek: ekran açılırken istek zaten yolda / önbellekte olur. Taze veri
 * varsa (staleTime) istek atılmaz; hata yutulur (ekran kendi sorgusunda yeniden dener). Görüntülenme
 * SAYILMAZ — sayım yalnız detay ekranı bağlanınca (`useProduct`).
 */
export function prefetchProductDetail(queryClient: QueryClient, productId: string): void {
  if (!productId) return;
  void queryClient.prefetchQuery(productDetailQuery(productId, isAuthenticatedNow()));
}

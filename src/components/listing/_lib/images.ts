/**
 * İlan görsellerinin TEK durum modeli (web `listing-image-item.ts` karşılığı).
 *
 * Eskiden iki paralel dizi vardı (`imageUris` + `imageKeys`), yalnız İNDEKS
 * üzerinden eşleşiyorlardı; sıralama/çevirme eklenince önizleme ile anahtarın
 * ayrışması kaçınılmaz olurdu. Artık ekrandaki sıra tek bir `ListingImage[]`
 * listesidir; payload/doğrulama bu listeden TÜRETİLİR. React anahtarı `id`.
 *
 * Kapak için ayrı alan YOK: listenin ilk kalemi kapaktır, sıra `sortOrder`
 * olarak gider (payload dizi sırası).
 */
import type { ImageKey } from './types';

/** `ready`: kayıtlı/yüklenmiş; `rotating`: sunucuda 90° çevriliyor (kilitli). */
export type ListingImageStatus = 'ready' | 'rotating';

export interface ListingImage extends ImageKey {
  /** Kalıcı istemci kimliği — React key ve eşleşme bunun üzerinden (indeks DEĞİL). */
  id: string;
  /** Gösterilecek önizleme (sunucunun döndürdüğü URL). */
  uri: string;
  status: ListingImageStatus;
}

let counter = 0;
/** Çakışmaz istemci kimliği (oturum içi sayaç + rastgele ek). */
export function nextImageId(): string {
  counter += 1;
  return `img-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Yüklenmiş/kayıtlı görselden kalem. */
export function imageFromKeys(keys: ImageKey, uri: string): ListingImage {
  return { id: nextImageId(), cardKey: keys.cardKey, detailKey: keys.detailKey, uri, status: 'ready' };
}

/** `editMapper` çıktısından (paralel diziler, aynı sıra) liste. */
export function imagesFromMapped(mapped: { keys: ImageKey[]; uris: string[] }): ListingImage[] {
  return mapped.keys.map((keys, i) => imageFromKeys(keys, mapped.uris[i] ?? ''));
}

/** Payload'a giden anahtarlar — EKRANDAKİ sırayla (dizi sırası = sortOrder, ilk = kapak). */
export function toImageKeys(items: ReadonlyArray<ListingImage>): ImageKey[] {
  return items.map(({ cardKey, detailKey }) => ({ cardKey, detailKey }));
}

/** Kalemi kimliğinden çıkar. */
export function removeImageById(items: ListingImage[], id: string): ListingImage[] {
  return items.filter((item) => item.id !== id);
}

/** Kalemi `from` konumundan `to` konumuna taşı; geçersiz/aynı konumda liste AYNEN döner. */
export function moveImage<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as T);
  return next;
}

/** Kapak = listenin ilk kalemi: kalemi başa al. */
export function makeCoverImage<T>(items: T[], index: number): T[] {
  return moveImage(items, index, 0);
}

/**
 * Kalemi KİMLİĞİNDEN `to` konumuna taşı. Konum işlem anında güncel listeden çözülür: sürükleme ya
 * da menü açıkken liste değişmiş olabilir (yükleme bitti, görsel kaldırıldı) — yakalanmış bir indeks
 * yanlış kalemi taşırdı. Kalem yoksa liste AYNEN döner.
 */
export function moveImageById(items: ListingImage[], id: string, to: number): ListingImage[] {
  const from = items.findIndex((item) => item.id === id);
  if (from < 0) return items;
  return moveImage(items, from, Math.max(0, Math.min(items.length - 1, to)));
}

/** Kalemi kimliğinden `delta` kadar kaydır (menü "Sola/Sağa taşı"). */
export function shiftImageById(items: ListingImage[], id: string, delta: number): ListingImage[] {
  const from = items.findIndex((item) => item.id === id);
  if (from < 0) return items;
  return moveImageById(items, id, from + delta);
}

/** Kalemi kimliğinden kapak yap (başa al). */
export function makeCoverById(items: ListingImage[], id: string): ListingImage[] {
  return moveImageById(items, id, 0);
}

/** Kalemi kimliğinden güncelle. */
export function patchImage(items: ListingImage[], id: string, patch: Partial<ListingImage>): ListingImage[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

/** Çevirme/yükleme sürüyorsa gönderim beklemeli (web `imageSubmitBlocker` "pending"). */
export function hasPendingImages(items: ReadonlyArray<ListingImage>): boolean {
  return items.some((item) => item.status !== 'ready');
}

/**
 * Çevrilen görselin önizlemesi. Sunucu YENİ anahtar (yeni URL) döndürür; yine de
 * aynı URL gelirse önbellekteki çevrilmemiş hâl görünmesin diye sürüm eki eklenir.
 */
export function rotatedPreviewUri(nextUrl: string | undefined, previousUri: string): string {
  const url = nextUrl || previousUri;
  if (url !== previousUri) return url;
  return `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
}

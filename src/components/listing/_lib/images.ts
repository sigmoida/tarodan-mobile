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
 *
 * Yeni seçilen görsel, yüklemesi bitmeden YEREL önizlemesiyle (`uri` = picker
 * URI'si) listede görünür ama sunucu anahtarı yoktur. Payload YALNIZ sunucu
 * anahtarlı kalemlerden kurulur (`toImageKeys`); yerel geçici URI asla
 * "yüklenmiş" görsel olarak kaydedilmez (delta 18 §2d). Bekleyen/hatalı kalem
 * varken gönderim `imageSubmitBlocker` ile engellenir.
 */
import type { ImageKey } from './types';
import type { LocalImageFile } from '@/lib/media';
import type { QueueEvent } from './uploadQueue';

/**
 * - `queued` / `uploading` / `processing`: yükleme sürüyor (yerel önizleme, anahtar yok);
 * - `ready`: sunucuda kayıtlı/yüklenmiş (anahtarlı);
 * - `rotating`: sunucuda 90° çevriliyor (kilitli; eski anahtarlar hâlâ geçerli);
 * - `failed`: yüklenemedi — yeniden dene / kaldır.
 */
export type ListingImageStatus = 'queued' | 'uploading' | 'processing' | 'ready' | 'rotating' | 'failed';

export interface ListingImage extends Partial<ImageKey> {
  /** Kalıcı istemci kimliği — React key ve eşleşme bunun üzerinden (indeks DEĞİL). */
  id: string;
  /** Gösterilecek önizleme: yüklenene kadar yerel URI, sonra sunucunun döndürdüğü URL. */
  uri: string;
  status: ListingImageStatus;
  /** 0–100, yalnız bayt aktarımı (yükleme sürerken). */
  progress?: number;
  /** Picker'ın verdiği yerel dosya — yalnız YENİ seçilen kalemde (orijinal; silinmez). */
  file?: LocalImageFile;
  /**
   * Yüklemeye hazırlanmış (küçültülmüş) dosya — ilk denemede bir kez üretilir; yeniden deneme
   * bunu kullanır (tekrar küçültme yok). Geçici cache dosyasıdır: yükleme bitince ya da kalem
   * kaldırılınca silinir.
   */
  preparedFile?: LocalImageFile;
  /** Hata alan kalemin açıklaması (sunucu mesajı ya da yerel metin). */
  error?: string;
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

/** Yeni seçilen yerel dosyadan kuyruğa girecek kalem (önizleme = yerel URI, anahtar YOK). */
export function imageFromFile(file: LocalImageFile): ListingImage {
  return { id: nextImageId(), uri: file.uri, status: 'queued', progress: 0, file };
}

/** `editMapper` çıktısından (paralel diziler, aynı sıra) liste. */
export function imagesFromMapped(mapped: { keys: ImageKey[]; uris: string[] }): ListingImage[] {
  return mapped.keys.map((keys, i) => imageFromKeys(keys, mapped.uris[i] ?? ''));
}

/**
 * Sunucuda karşılığı olan kalem mi? Anahtarlar YALNIZ başarılı yüklemede (ya da kayıtlı
 * görselde) yazılır; çevrilen kalemin eski anahtarları çevirme bitene kadar geçerlidir.
 */
export function isUploadedImage(item: ListingImage): item is ListingImage & ImageKey {
  return !!item.cardKey && !!item.detailKey && (item.status === 'ready' || item.status === 'rotating');
}

/**
 * Payload'a giden anahtarlar — EKRANDAKİ sırayla (dizi sırası = sortOrder, ilk = kapak).
 * YALNIZ sunucu anahtarlı kalemler: bekleyen/hatalı kalemin yerel URI'si asla gitmez.
 */
export function toImageKeys(items: ReadonlyArray<ListingImage>): ImageKey[] {
  return items.filter(isUploadedImage).map(({ cardKey, detailKey }) => ({ cardKey, detailKey }));
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

/** Kuyrukta ya da aktarımda olan kalem var mı? (çevirme HARİÇ) */
export function hasPendingUploads(items: ReadonlyArray<ListingImage>): boolean {
  return items.some(
    (item) => item.status === 'queued' || item.status === 'uploading' || item.status === 'processing',
  );
}

/** Yükleme ya da çevirme sürüyor mu? Gönderim beklemeli (web `imageSubmitBlocker` "pending"). */
export function hasPendingImages(items: ReadonlyArray<ListingImage>): boolean {
  return items.some((item) => item.status !== 'ready' && item.status !== 'failed');
}

/**
 * Form GÖNDERİLEBİLİR mi? Gönderilemiyorsa gerekçesi (web `imageSubmitBlocker`).
 * Çözümlenmemiş görselle kaydedilen ilan ekranda görünenden EKSİK görselle yayınlanırdı:
 * payload'a yalnız yüklenmiş kalemler yazıldığı için bekleyen/hatalı olanlar sessizce düşerdi.
 */
export function imageSubmitBlocker(items: ReadonlyArray<ListingImage>): 'pending' | 'failed' | null {
  if (hasPendingImages(items)) return 'pending';
  if (items.some((item) => item.status === 'failed')) return 'failed';
  return null;
}

/**
 * Kuyruk olayını listeye uygula. Kalem bu arada kaldırıldıysa liste AYNEN döner.
 * Başarıda sunucu anahtarları + URL'si yazılır ve yerel dosyalar bırakılır (hazırlanmış geçici
 * dosyanın SİLİNMESİ çağıranın işi — saf fonksiyon); hatada `errorText`
 * (çağıran katalogdan üretir) kaleme yazılır.
 */
export function applyUploadEvent(
  items: ListingImage[],
  event: QueueEvent,
  errorText?: string,
): ListingImage[] {
  if (!items.some((item) => item.id === event.clientId)) return items;
  const patch: Partial<ListingImage> = { status: event.status };
  if (event.progress !== undefined) patch.progress = event.progress;
  if (event.status === 'ready') {
    if (!event.result) return items;
    patch.cardKey = event.result.cardKey;
    patch.detailKey = event.result.detailKey;
    if (event.result.url) patch.uri = event.result.url;
    patch.file = undefined;
    patch.preparedFile = undefined;
    patch.error = undefined;
  }
  if (event.status === 'failed') {
    patch.error = errorText;
    patch.progress = 0;
  }
  return patchImage(items, event.clientId, patch);
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

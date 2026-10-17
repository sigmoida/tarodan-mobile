/**
 * Yüklemeden önce görseli küçült + sıkıştır — uygulamadaki TÜM fotoğraf yüklemelerinin
 * ortak hazırlığı (ilan görseli, mesaj eki, iade kanıtı, avatar, koleksiyon kapağı,
 * işletme belgesi fotoğrafı).
 *
 * Galeri fotoğrafları 12–48 MP, 2–8 MB geliyordu; picker'ın `quality` ayarı
 * çözünürlüğü DÜŞÜRMEZ. Sunucu en fazla 1200 px saklıyor, yani fazlası mobil
 * veriyle boşa taşınıyordu. Fotoğraf (JPEG/HEIC/HEIF) uzun kenarı
 * `maxEdge`'i aşıyorsa oraya indirilir ve JPEG olarak yeniden kodlanır
 * (HEIC de JPEG'e döner). PNG/WebP/GIF HİÇ yeniden kodlanmaz (web ile aynı):
 * JPEG'e çevirmek saydam alanı siyaha boyardı; sınır üstündeyse sunucunun
 * mevcut hata akışı devreye girer. Görsel olmayan dosyaya (PDF) dokunulmaz.
 *
 * `expo-image-manipulator` NATIVE bir modül. `runtimeVersion` politikası
 * `fingerprint` olduğu için modülsüz bir store binary'sine bu JS OTA ile
 * GELMEZ; tek gerçek senaryo, paket eklendikten sonra yeniden derlenmemiş bir
 * dev-client. Paketin JS'ini içe aktarmak orada `requireNativeModule` hatası
 * fırlatıp ekranı kırardı, bu yüzden paket import edilmez; native modül
 * `requireOptionalNativeModule` ile alınır. Modül yoksa ya da işlem hata
 * verirse SESSİZCE orijinal dosyayla devam edilir — yükleme yavaşlar ama kırılmaz.
 *
 * Üretilen dosya `temporary: true` taşır (cache'teki manipulator çıktısı); işi biten
 * çağıran `releasePreparedFile` ile siler. Orijinal dosya hiçbir zaman işaretlenmez.
 */
import { requireOptionalNativeModule } from 'expo';
import { abortError, untilAborted } from './abort';
import { createSerialRunner } from './serialRunner';
import { releasePreparedFile } from './tempFiles';

/** Uzun kenar sınırı (px). Sunucu 1200 px saklıyor; biraz pay bırakılır. */
export const MAX_UPLOAD_EDGE = 1600;
/** JPEG kalitesi (0–1). */
export const UPLOAD_JPEG_QUALITY = 0.75;
/**
 * Tek görselin hazırlanma süresi tavanı. Native adım takılırsa (bozuk dosya, bellek baskısı)
 * sıradaki görseller sonsuza dek beklemesin: süre dolunca orijinal dosyayla devam edilir.
 */
export const PREPARE_TIMEOUT_MS = 20_000;
/**
 * Boyutu bilinmeyen (belge seçiciden gelen) JPEG bu baytın altındaysa yeniden kodlanmaz: küçük
 * JPEG'i tekrar sıkıştırmak boyutu büyütebilir/kaliteyi düşürür, çözme maliyeti de boşa gider.
 */
export const SMALL_JPEG_BYTES = 1.5 * 1024 * 1024;

/** Hedefe göre küçültme ayarı. */
export interface PrepareOptions {
  /** Uzun kenar sınırı (px). */
  maxEdge?: number;
  /** JPEG kalitesi (0–1). */
  quality?: number;
  /**
   * `true`: yeniden kodlanması gereken görsel hazırlanamazsa (modül yok, çözülemedi, süre
   * doldu) ORİJİNAL YÜKLENMEZ — `ImagePrepareError` fırlatılır, çağıran kendi hata akışını
   * gösterir. Karşı tarafa giden görseller (mesaj eki, iade kanıtı) için: ham orijinal
   * EXIF/konum taşıyabilir ve "image/jpeg" etiketli HEIC olabilir (sunucu reddeder).
   */
  strict?: boolean;
}

/** `strict` hazırlamada görsel güvenle yeniden kodlanamadı — orijinal yüklenmez. */
export class ImagePrepareError extends Error {
  constructor(reason: 'unavailable' | 'failed' | 'timeout') {
    super(`Image could not be prepared for upload (${reason})`);
    this.name = 'ImagePrepareError';
  }
}

/**
 * Yükleme hedeflerinin profilleri (sunucunun sakladığı boyuta göre):
 * - `photo` (varsayılan): ilan görseli (sunucu ≤1200 px), mesaj eki, iade kanıtı,
 *   koleksiyon kapağı (sunucu 1200×600 kırpar);
 * - `avatar`: sunucu 300×300 kırpıp saklıyor, sınırı 2 MB — 2× pay ile 600 px yeter;
 * - `document`: işletme belgesi fotoğrafı (vergi levhası, kimlik…) sunucuda olduğu gibi
 *   saklanır ve yönetici OKUR — küçük yazı okunaklı kalsın diye daha geniş sınır/kalite.
 */
export const IMAGE_PROFILES = {
  photo: { maxEdge: MAX_UPLOAD_EDGE, quality: UPLOAD_JPEG_QUALITY },
  avatar: { maxEdge: 600, quality: 0.8 },
  document: { maxEdge: 2400, quality: 0.85 },
} as const satisfies Record<string, Required<Pick<PrepareOptions, 'maxEdge' | 'quality'>>>;

/** Zaten sunucuya uygun JPEG: küçültme gerekmiyorsa yeniden kodlanmaz. */
const JPEG_TYPES = ['image/jpeg', 'image/jpg'];
/** Saydamlık/animasyon taşıyabilen türler — hiç yeniden kodlanmaz (web de yalnız fotoğrafı küçültür). */
const KEEP_AS_IS_TYPES = ['image/png', 'image/webp', 'image/gif'];

/**
 * Hazırlamanın yeniden kodlayabileceği tür mü (JPEG/HEIC/HEIF vb. fotoğraf)? PDF ve
 * PNG/WebP/GIF HAYIR — onlar olduğu gibi gider.
 */
export function isReencodableImage(type: string | undefined | null): boolean {
  const t = (type || '').toLowerCase();
  return t.startsWith('image/') && !KEEP_AS_IS_TYPES.includes(t);
}

/** Picker'dan gelen, yüklenecek yerel dosya. */
export interface LocalImageFile {
  uri: string;
  name: string;
  type: string;
  width?: number;
  height?: number;
  /** Bayt boyutu (biliniyorsa) — boyutları bilinmeyen küçük JPEG'i atlamak için. */
  size?: number;
  /**
   * Galeri seçicisinden geldi (`fromPickerAsset`). Seçici dosyası HER ZAMAN yeniden kodlanır:
   * küçük JPEG atlaması yalnız belge seçici dosyaları içindir. Seçicinin "JPEG" dediği dosya
   * EXIF/konum taşıyabilir ya da gerçekte HEIC olabilir; yeniden kodlama ikisini de temizler.
   */
  fromPicker?: boolean;
  /**
   * `true` YALNIZ hazırlayıcının cache'e yazdığı dosyada — işi bitince silinebilir
   * (`releasePreparedFile`). Picker'ın orijinalinde hiçbir zaman yoktur.
   */
  temporary?: boolean;
}

/** `expo-image-manipulator` native modülünün kullandığımız yüzeyi (test için arayüz). */
interface ImageRefLike {
  width: number;
  height: number;
  saveAsync(options: { format?: 'jpeg' | 'png' | 'webp'; compress?: number }): Promise<{ uri: string }>;
  release?: () => void;
}
interface ManipulatorContextLike {
  resize(size: { width?: number | null; height?: number | null }): ManipulatorContextLike;
  renderAsync(): Promise<ImageRefLike>;
  release?: () => void;
}
export interface ImageManipulatorLike {
  manipulate(source: string | ImageRefLike): ManipulatorContextLike;
}

/** Native modül — yoksa `null` (yeniden derlenmemiş dev-client / test ortamı). Hiçbir koşulda fırlatmaz. */
export function loadImageManipulator(): ImageManipulatorLike | null {
  try {
    const mod = requireOptionalNativeModule<ImageManipulatorLike>('ExpoImageManipulator');
    return mod && typeof mod.manipulate === 'function' ? mod : null;
  } catch {
    return null;
  }
}

/**
 * Uzun kenarı `maxEdge`'e indiren yeniden boyut — gerek yoksa (ya da boyut bilinmiyorsa) `null`.
 * Yalnız uzun kenar verilir; manipulator en-boy oranını korur.
 */
export function resizeFor(
  width: number | undefined,
  height: number | undefined,
  maxEdge: number = MAX_UPLOAD_EDGE,
): { width: number } | { height: number } | null {
  if (!width || !height || width <= 0 || height <= 0) return null;
  if (Math.max(width, height) <= maxEdge) return null;
  return width >= height ? { width: maxEdge } : { height: maxEdge };
}

/** Dosya adının uzantısını `.jpg` yap (yoksa ekle). */
export function jpegName(name: string): string {
  const base = name.replace(/\.[^./\\]*$/, '');
  return `${base || 'image'}.jpg`;
}

const release = (obj: { release?: () => void } | null | undefined) => {
  try {
    obj?.release?.();
  } catch {
    // Paylaşılan nesne zaten serbest bırakılmış olabilir.
  }
};

/**
 * Görseli yüklemeye hazırla. Her koşulda bir dosya döner: başarısızlıkta orijinal.
 *
 * - Görsel olmayan dosya (PDF vb.) olduğu gibi gider.
 * - PNG/WebP/GIF olduğu gibi gider (saydamlık/animasyon korunur; web ile aynı).
 * - Galeri seçicisinden gelen (`fromPicker`) fotoğraf HER ZAMAN yeniden kodlanır (meta
 *   veri temizliği + gerçek JPEG garantisi).
 * - Seçici dışı (belge seçici) küçük JPEG yeniden kodlanmaz (tekrar sıkıştırmak boyutu
 *   büyütebilir): uzun kenarı sınırın altındaysa ya da boyutu bilinmiyor ve
 *   `SMALL_JPEG_BYTES` altındaysa.
 * - `strict`: hazırlama başarısızsa orijinal DÖNMEZ, `ImagePrepareError` fırlatılır.
 * - Aksi halde (büyük JPEG, her HEIC/HEIF): gerekiyorsa küçült + JPEG `quality`.
 * - Boyut picker'dan biliniyorsa tek geçişte; EXIF yönü yüzünden işlenmiş
 *   görsel hâlâ sınırı aşıyorsa (ya da boyut bilinmiyorsa) ikinci geçişte
 *   gerçek (yönlendirilmiş) boyuttan küçültülür.
 */
export async function prepareImageForUpload(
  file: LocalImageFile,
  manipulator: ImageManipulatorLike | null = loadImageManipulator(),
  { maxEdge = MAX_UPLOAD_EDGE, quality = UPLOAD_JPEG_QUALITY, strict = false }: PrepareOptions = {},
): Promise<LocalImageFile> {
  if (!isReencodableImage(file.type)) return file;
  if (!manipulator) {
    if (strict) throw new ImagePrepareError('unavailable');
    return file;
  }
  const type = file.type.toLowerCase();
  const firstResize = resizeFor(file.width, file.height, maxEdge);
  const knownDims = !!file.width && !!file.height;
  const knownSmall = knownDims ? !firstResize : typeof file.size === 'number' && file.size <= SMALL_JPEG_BYTES;
  if (knownSmall && JPEG_TYPES.includes(type) && !file.fromPicker) return file;

  const owned: Array<{ release?: () => void } | null | undefined> = [];
  try {
    const context = manipulator.manipulate(file.uri);
    owned.push(context);
    if (firstResize) context.resize(firstResize);
    let ref = await context.renderAsync();
    owned.push(ref);

    const secondResize = resizeFor(ref.width, ref.height, maxEdge);
    if (secondResize) {
      const again = manipulator.manipulate(ref);
      owned.push(again);
      again.resize(secondResize);
      ref = await again.renderAsync();
      owned.push(ref);
    }

    const saved = await ref.saveAsync({ format: 'jpeg', compress: quality });
    if (!saved?.uri) {
      if (strict) throw new ImagePrepareError('failed');
      return file;
    }
    return {
      uri: saved.uri,
      name: jpegName(file.name),
      type: 'image/jpeg',
      width: ref.width,
      height: ref.height,
      temporary: true,
    };
  } catch (error) {
    // Modül eski/eksik ya da görsel çözülemedi: orijinalle devam (yükleme kırılmaz) —
    // `strict` hedeflerde orijinal yüklenmez.
    if (strict) throw error instanceof ImagePrepareError ? error : new ImagePrepareError('failed');
    return file;
  } finally {
    owned.forEach(release);
  }
}

/** Hazırlayıcı çağrısının seçenekleri: iptal sinyali + hedef profili. */
export interface PrepareRunOptions extends PrepareOptions {
  /** Kalem kaldırıldı / ekran kapandı → çağıran hemen `AbortError` alır. */
  signal?: AbortSignal;
}

export type ImagePreparer = (file: LocalImageFile, options?: PrepareRunOptions) => Promise<LocalImageFile>;

/**
 * Seri, süre sınırlı ve iptal edilebilir hazırlayıcı.
 *
 * Native adım kesilemez; bu yüzden SONUCU yarıştırılır ki sıra hiç kilitlenmesin:
 * - süre dolarsa (`timeoutMs`) orijinal dosyayla devam edilir, sıra bir sonrakine geçer;
 * - iptal gelirse (kalem kaldırıldı / ekran kapandı) çağıran HEMEN `AbortError` alır
 *   (yükleme yapılmaz), sıra da bir sonrakine geçer — sırası gelmemiş iptal edilmiş
 *   kalem hiç hazırlanmaz.
 * Yarışı kaybeden (süre doldu / iptal) native adım sonradan dosya üretirse o geçici
 * dosya kimseye verilmeden silinir — cache'te sahipsiz dosya kalmaz.
 * Yeniden kodlanmayacak dosya (PDF, PNG/WebP/GIF) seri kapıya hiç girmez — hemen döner.
 */
export function createPreparer({
  prepare = (file: LocalImageFile, options?: PrepareOptions) => prepareImageForUpload(file, undefined, options),
  timeoutMs = PREPARE_TIMEOUT_MS,
}: {
  prepare?: (file: LocalImageFile, options?: PrepareOptions) => Promise<LocalImageFile>;
  timeoutMs?: number;
} = {}): ImagePreparer {
  const runSerial = createSerialRunner();
  return (file, { signal, ...options } = {}) => {
    const guard = signal ?? new AbortController().signal;
    if (!isReencodableImage(file.type)) {
      return guard.aborted ? Promise.reject(abortError()) : Promise.resolve(file);
    }
    return untilAborted(
      runSerial(() => {
        if (guard.aborted) return Promise.reject(abortError());
        let timer: ReturnType<typeof setTimeout> | undefined;
        let handedOver = false;
        const strict = options.strict === true;
        // Süre dolunca orijinalle devam — `strict`te orijinal yüklenmez, hata döner.
        const timeout = new Promise<LocalImageFile>((resolve, reject) => {
          timer = setTimeout(
            () => (strict ? reject(new ImagePrepareError('timeout')) : resolve(file)),
            timeoutMs,
          );
        });
        const work = Promise.resolve()
          .then(() => prepare(file, options))
          .catch((error: unknown) => {
            if (strict) throw error;
            return file;
          });
        const raced = untilAborted(Promise.race([work, timeout]), guard).then((result) => {
          // Süre dolduysa sonuç orijinaldir: geç gelecek hazırlanmış dosya sahipsiz kalır.
          if (result !== file) handedOver = true;
          return result;
        });
        // Yarışı kaybeden sonuç (süre doldu / iptal) çağırana ulaşmaz: ikisi de bitince
        // teslim edilmemiş hazırlanmış dosya silinir.
        void Promise.allSettled([raced, work]).then(([, settledWork]) => {
          if (settledWork.status !== 'fulfilled') return;
          const result = settledWork.value;
          if (!handedOver && result !== file) releasePreparedFile(result);
        });
        return raced.finally(() => clearTimeout(timer));
      }),
      guard,
    ).then((result) => {
      // Native adım biter bitmez gelen iptal: dosya çağırana verilmez, silinir.
      if (guard.aborted) {
        if (result !== file) releasePreparedFile(result);
        throw abortError();
      }
      return result;
    });
  };
}

/**
 * Uygulama genelinde TEK hazırlayıcı: farklı ekranlardan gelen hazırlamalar da aynı seri
 * kapıdan geçer (iki ekranın aynı anda 48 MP çözmesi engellenir).
 */
export const prepareUploadImage: ImagePreparer = createPreparer();

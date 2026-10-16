/**
 * Yüklemeden önce görseli küçült + sıkıştır.
 *
 * Galeri fotoğrafları 12–48 MP, 2–8 MB geliyordu; picker'ın `quality` ayarı
 * çözünürlüğü DÜŞÜRMEZ. Sunucu en fazla 1200 px saklıyor, yani fazlası mobil
 * veriyle boşa taşınıyordu. Uzun kenar `MAX_UPLOAD_EDGE`'i aşıyorsa oraya
 * indirilir ve JPEG olarak yeniden kodlanır (HEIC de JPEG'e döner).
 *
 * `expo-image-manipulator` NATIVE bir modül: eski bir binary'ye OTA ile gelen
 * JS'te modül bulunmayabilir. Paketin JS'ini içe aktarmak bile o binary'de
 * `requireNativeModule` hatası fırlatır, bu yüzden paket HİÇ import edilmez;
 * native modül `requireOptionalNativeModule` ile alınır. Modül yoksa ya da
 * işlem hata verirse SESSİZCE orijinal dosyayla devam edilir — yükleme
 * yavaşlar ama asla kırılmaz.
 */
import { requireOptionalNativeModule } from 'expo';

/** Uzun kenar sınırı (px). Sunucu 1200 px saklıyor; biraz pay bırakılır. */
export const MAX_UPLOAD_EDGE = 1600;
/** JPEG kalitesi (0–1). */
export const UPLOAD_JPEG_QUALITY = 0.75;

/** Sunucunun kabul ettiği ve yeniden kodlamadan gönderilebilen türler. */
const PASSTHROUGH_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/** Picker'dan gelen, yüklenecek yerel dosya. */
export interface LocalImageFile {
  uri: string;
  name: string;
  type: string;
  width?: number;
  height?: number;
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

/** Native modül — yoksa `null` (eski binary / test ortamı). Hiçbir koşulda fırlatmaz. */
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
 * - Uzun kenar sınırın altında VE tür sunucunun kabul ettiği bir türse yeniden
 *   kodlanmaz (küçük JPEG'i tekrar sıkıştırmak boyutu büyütebilir).
 * - Aksi halde: (gerekiyorsa) küçült + JPEG `UPLOAD_JPEG_QUALITY`.
 * - Boyut picker'dan biliniyorsa tek geçişte; EXIF yönü yüzünden işlenmiş
 *   görsel hâlâ sınırı aşıyorsa (ya da boyut bilinmiyorsa) ikinci geçişte
 *   gerçek (yönlendirilmiş) boyuttan küçültülür.
 */
export async function prepareImageForUpload(
  file: LocalImageFile,
  manipulator: ImageManipulatorLike | null = loadImageManipulator(),
): Promise<LocalImageFile> {
  if (!manipulator) return file;
  const firstResize = resizeFor(file.width, file.height);
  const knownSmall = !!file.width && !!file.height && !firstResize;
  if (knownSmall && PASSTHROUGH_TYPES.includes(file.type.toLowerCase())) return file;

  const owned: Array<{ release?: () => void } | null | undefined> = [];
  try {
    const context = manipulator.manipulate(file.uri);
    owned.push(context);
    if (firstResize) context.resize(firstResize);
    let ref = await context.renderAsync();
    owned.push(ref);

    const secondResize = resizeFor(ref.width, ref.height);
    if (secondResize) {
      const again = manipulator.manipulate(ref);
      owned.push(again);
      again.resize(secondResize);
      ref = await again.renderAsync();
      owned.push(ref);
    }

    const saved = await ref.saveAsync({ format: 'jpeg', compress: UPLOAD_JPEG_QUALITY });
    if (!saved?.uri) return file;
    return {
      uri: saved.uri,
      name: jpegName(file.name),
      type: 'image/jpeg',
      width: ref.width,
      height: ref.height,
    };
  } catch {
    // Modül eski/eksik ya da görsel çözülemedi: orijinalle devam (yükleme kırılmaz).
    return file;
  } finally {
    owned.forEach(release);
  }
}

/**
 * İşleri SIRAYLA çalıştıran kapı. Yüklemeler 3'lü paralel gider ama tam
 * çözünürlüklü çözme (48 MP ≈ 190 MB bitmap) aynı anda üç kez yapılırsa eski
 * Android cihazlarda bellek yetmez — hazırlama tek tek yapılır.
 */
export function createSerialRunner() {
  let tail: Promise<unknown> = Promise.resolve();
  return function run<T>(task: () => Promise<T>): Promise<T> {
    const result = tail.then(task, task);
    tail = result.catch(() => undefined);
    return result;
  };
}

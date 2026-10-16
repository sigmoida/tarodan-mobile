/**
 * Hazırlanmış (manipulator'ın ürettiği) geçici dosyaların temizliği.
 *
 * YALNIZ `prepareImageForUpload`'un kendi yazdığı, `temporary: true` işaretli ve
 * uygulamanın cache dizini altındaki dosya silinir. Picker'ın orijinaline (galeri
 * kopyası / kullanıcının seçtiği dosya) hiçbir koşulda dokunulmaz.
 *
 * `expo-file-system/legacy` native modülü opsiyonel yükler (yoksa shim) — bu yüzden
 * yeniden derlenmemiş dev-client'ta ve testte de import güvenli; silme hatası yutulur
 * (cache dizinini işletim sistemi zaten temizler, yükleme akışı asla kırılmaz).
 */
import { cacheDirectory, deleteAsync } from 'expo-file-system/legacy';
import type { LocalImageFile } from './prepareImage';

/** Bu dosya hazırlayıcının ürettiği, silinebilir bir cache dosyası mı? */
export function isDisposablePreparedFile(file: LocalImageFile | null | undefined): file is LocalImageFile {
  if (!file?.temporary || !file.uri) return false;
  // Cache dizini bilinmiyorsa (shim) yerini doğrulayamayız → silme.
  if (!cacheDirectory) return false;
  return file.uri.startsWith(cacheDirectory);
}

/** Hazırlanmış geçici dosyayı sil (fire-and-forget; asla fırlatmaz). */
export function releasePreparedFile(file: LocalImageFile | null | undefined): void {
  if (!isDisposablePreparedFile(file)) return;
  deleteAsync(file.uri, { idempotent: true }).catch(() => undefined);
}

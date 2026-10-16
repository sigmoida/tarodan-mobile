import { mediaApi } from '@/lib/api';
import { withPreparedImage, type LocalImageFile } from '@/lib/media';

/**
 * Mesaj eki fotoğrafını yükler, gömülecek URL'yi döner (yoksa `undefined`).
 * Hazırla (≤1600 px JPEG; HEIC → JPEG) → `POST /media/upload?folder=messages` → geçici dosyayı sil.
 *
 * `strict`: görsel karşı tarafa gider — hazırlanamazsa HAM orijinal (EXIF/konum, "jpeg" etiketli
 * HEIC) yüklenmez; hata fırlar ve gönderim akışı mevcut "görsel gönderilemedi" uyarısını gösterir.
 */
export async function uploadMessageAttachment(file: LocalImageFile): Promise<string | undefined> {
  const response = await withPreparedImage(
    file,
    (prepared) => mediaApi.uploadMessageImage(prepared),
    { strict: true },
  );
  const data = response.data as { url?: string; data?: { url?: string } } | undefined;
  return data?.url ?? data?.data?.url;
}

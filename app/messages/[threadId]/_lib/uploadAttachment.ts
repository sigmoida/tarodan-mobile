import { mediaApi } from '@/lib/api';
import { formDataUri, withPreparedImage, type LocalImageFile } from '@/lib/media';

/**
 * Mesaj eki fotoğrafını yükler, gömülecek URL'yi döner (yoksa `undefined`).
 * Hazırla (≤1600 px JPEG; HEIC → JPEG) → `POST /media/upload?folder=messages` → geçici dosyayı sil.
 */
export async function uploadMessageAttachment(file: LocalImageFile): Promise<string | undefined> {
  const response = await withPreparedImage(file, (prepared) =>
    mediaApi.uploadMessageImage({ uri: formDataUri(prepared.uri), name: prepared.name, type: prepared.type }),
  );
  const data = response.data as { url?: string; data?: { url?: string } } | undefined;
  return data?.url ?? data?.data?.url;
}

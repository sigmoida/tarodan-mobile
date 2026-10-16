import { prepareUploadImage, type LocalImageFile, type PrepareRunOptions } from './prepareImage';
import { releasePreparedFile } from './tempFiles';

/**
 * Tek seferlik yüklemelerin (avatar, mesaj eki, iade kanıtı, kapak, belge) ortak sarmalı:
 * dosyayı hazırla → `upload(hazırlanmış)` → hazırlanmış geçici dosyayı HER durumda sil
 * (başarı da hata da). Yeniden deneme bu yollarda tek görsellik yeni bir hazırlamadır;
 * hazırlanmış dosyayı saklayıp tekrar kullanan tek yol ilan formu kuyruğudur.
 */
export async function withPreparedImage<T>(
  file: LocalImageFile,
  upload: (prepared: LocalImageFile) => Promise<T>,
  options?: PrepareRunOptions,
): Promise<T> {
  const prepared = await prepareUploadImage(file, options);
  try {
    return await upload(prepared);
  } finally {
    releasePreparedFile(prepared);
  }
}

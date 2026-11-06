import { useCallback, useRef, useState } from 'react';
import type { LocalImageFile } from '@/lib/media';
import { coverFileFor, pickCollectionCover, uploadCollectionCover } from '../_lib/cover';

/**
 * Koleksiyon kapağı durumu — yeni koleksiyon ve düzenleme ekranlarının ORTAK hook'u.
 * `coverImage` önizlenen URI (yerel seçim ya da kayıtlı kapak URL'si); seçilen dosyanın tür/boyut
 * bilgisi hazırlama için saklanır. Yükleme çağıranın mutation'ı içinden `uploadCover(id)` ile.
 */
export function useCollectionCover() {
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const pickedRef = useRef<LocalImageFile | null>(null);

  const pickCoverImage = useCallback(async () => {
    const picked = await pickCollectionCover();
    if (picked) {
      pickedRef.current = picked;
      setCoverImage(picked.uri);
    }
  }, []);

  /** Önizlenen kapağı hazırla + yükle (PATCH /collections/:id/cover). */
  const uploadCover = useCallback(
    (collectionId: string, uri: string) => uploadCollectionCover(collectionId, coverFileFor(uri, pickedRef.current)),
    [],
  );

  /** Preview the server's cover, unless the user picked one that is not saved yet (a refetch must not drop it). */
  const showSavedCover = useCallback((url: string | null) => {
    if (!pickedRef.current) setCoverImage(url);
  }, []);

  /** The picked cover is saved: from now on the preview follows the server again. */
  const markCoverSaved = useCallback(() => {
    pickedRef.current = null;
  }, []);

  return { coverImage, setCoverImage, pickCoverImage, uploadCover, showSavedCover, markCoverSaved };
}

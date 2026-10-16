import * as ImagePicker from 'expo-image-picker';
import { fromPickerAsset, pickerQuality, type LocalImageFile } from '@/lib/media';

/**
 * Galeriden en fazla `remaining` kanıt fotoğrafı seçer. İzin yoksa `'denied'`
 * döner — çağıran (iade ekranı) mesajı satır içi gösterir. Dosyalar yerel URI'yle
 * döner (önizleme); küçültme ve iOS FormData biçimi yükleme anında
 * (`useUploadRefundEvidence`).
 */
export async function pickEvidencePhotos(remaining: number): Promise<LocalImageFile[] | 'denied'> {
  if (remaining <= 0) return [];
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return 'denied';
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: remaining,
    quality: pickerQuality(),
  });
  if (result.canceled || !result.assets?.length) return [];
  return result.assets.slice(0, remaining).map((a, i) => fromPickerAsset(a, `evidence_${i}.jpg`));
}

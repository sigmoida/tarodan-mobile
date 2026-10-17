import * as ImagePicker from 'expo-image-picker';
import { fromPickerAsset, pickerQuality, type LocalImageFile } from '@/lib/media';

/**
 * Galeriden en fazla `remaining` kanıt fotoğrafı seçer. Dosyalar yerel URI'yle döner
 * (önizleme); küçültme ve iOS FormData biçimi yükleme anında (`useUploadRefundEvidence`).
 *
 * Galeri izni İSTENMEZ: iOS PHPicker ve Android Photo Picker izin gerektirmez. Eski istek
 * reddedildiğinde seçici hiç açılmıyor, kullanıcı "izin gerekli" çıkmazında kalıyordu.
 */
export async function pickEvidencePhotos(remaining: number): Promise<LocalImageFile[]> {
  if (remaining <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: remaining,
    quality: pickerQuality(),
  });
  if (result.canceled || !result.assets?.length) return [];
  return result.assets.slice(0, remaining).map((a, i) => fromPickerAsset(a, `evidence_${i}.jpg`));
}

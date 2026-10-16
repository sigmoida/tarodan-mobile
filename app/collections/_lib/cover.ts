import * as ImagePicker from 'expo-image-picker';
import { collectionsApi } from '@/lib/api';
import { fromPickerAsset, pickerQuality, withPreparedImage, type LocalImageFile } from '@/lib/media';

/**
 * Koleksiyon kapağı — yeni koleksiyon ve düzenleme ekranlarının ORTAK seçme/yükleme yolu.
 * Sunucu kapağı 1200×600 kırpıp WebP'ye çevirir; yüklemeden önce `photo` profiliyle
 * (≤1600 px JPEG) küçültülür.
 */

/** Galeriden 16:9 kapak seç; vazgeçilirse `null`. */
export async function pickCollectionCover(): Promise<LocalImageFile | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [16, 9],
    quality: pickerQuality(),
  });
  const asset = result.canceled ? undefined : result.assets?.[0];
  return asset ? fromPickerAsset(asset, 'cover.jpg') : null;
}

/**
 * Kapağı hazırla + yükle (PATCH /collections/:id/cover, alan `cover`). Ad/tür eskisi gibi
 * sabit: hazırlanmış dosya zaten JPEG; dokunulmayan PNG/WebP/GIF'i sunucu (sharp) çevirir.
 */
export function uploadCollectionCover(collectionId: string, file: LocalImageFile) {
  return withPreparedImage(file, (prepared) =>
    collectionsApi.updateCover(collectionId, { uri: prepared.uri, name: 'cover.jpg', type: 'image/jpeg' }),
  );
}

/** Seçilen kapak URI'sinin dosyası (seçici bilgisiyle; yoksa yalnız URI'den). */
export function coverFileFor(uri: string, picked: LocalImageFile | null): LocalImageFile {
  return picked?.uri === uri ? picked : { uri, name: 'cover.jpg', type: 'image/jpeg' };
}

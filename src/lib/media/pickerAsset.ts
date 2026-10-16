import type { ImagePickerAsset } from 'expo-image-picker';
import type { LocalImageFile } from './prepareImage';

/** Uzantıdan MIME (picker `mimeType` vermezse). `.jpg` → `image/jpeg` (sunucu `image/jpg` kabul etmez). */
const EXTENSION_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
};

/**
 * Picker varlığı → yüklenecek yerel dosya. URI `file://` önekiyle KALIR (hazırlama onu ister;
 * iOS FormData biçimi multipart parçasında `appendRNFile` ile verilir). Boyutlar picker'dan gelirse
 * hazırlama tek geçişte küçültür.
 */
export function fromPickerAsset(asset: ImagePickerAsset, fallbackName: string): LocalImageFile {
  const name = asset.fileName || fallbackName;
  const ext = /\.(\w+)$/.exec(name)?.[1]?.toLowerCase();
  return {
    uri: asset.uri,
    name,
    type: asset.mimeType || (ext && EXTENSION_MIME[ext]) || 'image/jpeg',
    width: asset.width || undefined,
    height: asset.height || undefined,
    size: typeof asset.fileSize === 'number' ? asset.fileSize : undefined,
  };
}

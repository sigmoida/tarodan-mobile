/** Görsel seçicinin JPEG kalitesi — bütün picker çağrılarının TEK kaynağı. */
export const PICKER_QUALITY = 0.8;

/**
 * Görsel seçicinin (`launchImageLibraryAsync` / `launchCameraAsync`) `quality` değeri — TEK karar
 * noktası, bütün picker çağrıları bunu kullanır. Her durumda 0.8 (manipulator olsa da).
 *
 * `1` denendi ve bilinçli olarak geri alındı: picker 1'de iOS orijinali olduğu gibi kopyalar.
 * Hazırlama (`prepareImageForUpload`) zaman aşımına uğrar ya da hata verirse orijinal dosya
 * gider; bu durumda
 * - 12–20 MB JPEG / HEIC sunucudan 400 alır (picker'ın 0.8 kodlaması güvenlik ağıydı),
 * - avatar kırpması 2 MB sınırını aşar,
 * - orijinalin EXIF'i (GPS konumu dahil) sunucuya — mesaj ekinde karşı tarafa — sızar.
 * Picker + hazırlamanın iki kez kodlamasının kalite/süre maliyeti bu riske tercih edildi.
 */
export function pickerQuality(): number {
  return PICKER_QUALITY;
}

import { loadImageManipulator, type ImageManipulatorLike } from './prepareImage';

/** Manipulator varken: picker yeniden kodlamaz, tek kayıplı kodlama hazırlamada yapılır. */
export const PICKER_QUALITY_WITH_MANIPULATOR = 1;
/** Manipulator yokken (yeniden derlenmemiş dev-client): picker'ın sıkıştırması tek sıkıştırmadır. */
export const PICKER_QUALITY_FALLBACK = 0.8;

/**
 * Görsel seçicinin (`launchImageLibraryAsync` / `launchCameraAsync`) `quality` değeri — TEK karar
 * noktası, bütün picker çağrıları bunu kullanır.
 *
 * Çift sıkıştırma olmasın: picker 0.8 ile JPEG'i yeniden kodlayıp ardından hazırlama
 * (`prepareImageForUpload`) bir kez daha kodlarsa kalite iki kez kaybedilir. Manipulator varsa
 * picker `1` ile açılır (iOS orijinali kopyalar, yeniden kodlamaz); manipulator yoksa
 * hazırlama atlanacağı için picker'ın 0.8 sıkıştırması korunur.
 */
export function pickerQuality(manipulator: ImageManipulatorLike | null = loadImageManipulator()): number {
  return manipulator ? PICKER_QUALITY_WITH_MANIPULATOR : PICKER_QUALITY_FALLBACK;
}

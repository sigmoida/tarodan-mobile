/**
 * Alttan açılan sheet (`BottomSheet`) geometri ve jest kuralları — saf fonksiyonlar. Bileşen
 * bunları UI thread'inde (worklet) da çağırır; bu yüzden hepsi `'worklet'` işaretli ve yan etkisizdir.
 */
import { theme } from './theme';

/** Sheet'in üstünde HER ZAMAN açık kalan boşluk (status bar / çentik altına ek pay, pt). */
export const SHEET_TOP_GAP = theme.spacing[3];
/** `size="large"`: kapsayıcı yüksekliğinin bu oranı (üst sınır yine `sheetMaxHeight`). */
export const SHEET_LARGE_RATIO = 0.92;
/** Aşağı sürüklemede sheet, yüksekliğinin bu kadarından fazla inmişse (ya da hızlıysa) kapanır. */
export const SHEET_CLOSE_DRAG_FRACTION = 0.25;
/** pt/sn — bu hızdan hızlı aşağı fırlatma sheet'i kapatır. */
export const SHEET_CLOSE_FLING_VELOCITY = 1000;

export type BottomSheetSize = 'fit' | 'large';

/**
 * Sheet'in alabileceği en büyük yükseklik: kapsayıcı (tam ekran Modal) − klavye kaldırması −
 * güvenli alan üstü − sabit üst pay. iPhone SE / 360x640 Android'de de üstte status bar + pay kalır.
 */
export function sheetMaxHeight(containerHeight: number, topInset: number, keyboardLift: number): number {
  'worklet';
  return Math.max(0, containerHeight - keyboardLift - topInset - SHEET_TOP_GAP);
}

/**
 * Boyut kuralı: `fit` içerik kadar (yalnız üst sınır), `large` ekranın ~%92'si — ikisi de
 * `sheetMaxHeight`'ı aşmaz (klavye açılınca küçülür).
 */
export function sheetLayout(
  size: BottomSheetSize,
  containerHeight: number,
  topInset: number,
  keyboardLift: number,
): { height?: number; maxHeight: number } {
  const maxHeight = sheetMaxHeight(containerHeight, topInset, keyboardLift);
  if (size === 'large') {
    return { height: Math.min(Math.round(containerHeight * SHEET_LARGE_RATIO), maxHeight), maxHeight };
  }
  return { maxHeight };
}

/**
 * Sabit alt çubuğun (footer) ya da footer'sız gövdenin alt iç boşluğu: klavye kapalıyken
 * güvenli alan (home indicator / Android gezinti çubuğu), en az `spacing[3]`; klavye açıkken
 * sheet zaten klavyenin üstünde durduğu için yalnız `spacing[3]`.
 */
export function sheetBottomPadding(safeBottom: number, keyboardOpen: boolean): number {
  return keyboardOpen ? theme.spacing[3] : Math.max(safeBottom, theme.spacing[3]);
}

/**
 * Android pencereyi klavye için yine de küçülttü mü (`adjustResize` kenardan kenara Modal'da
 * normalde çalışmaz; çalışırsa kök yükseklik klavyenin yarısından fazla kısalır)? Öyleyse sheet
 * ayrıca kaldırılmaz — çift kaydırma olmaz. iOS'ta pencere hiç küçülmez.
 */
export function keyboardResizedWindow(
  os: string,
  keyboardHeight: number,
  rootHeight: number,
  windowHeight: number,
): boolean {
  return os === 'android' && keyboardHeight > 0 && rootHeight > 0 && rootHeight < windowHeight - keyboardHeight / 2;
}

/** Sheet'in dikey kayması: 0 = tamamen açık, `height` = ekranın altında gizli; + sürükleme. */
export function sheetTranslateY(progress: number, height: number, drag: number): number {
  'worklet';
  return (1 - progress) * height + drag;
}

/** Aşağı sürükleme (yalnız pozitif) — yukarı çekmek sheet'i büyütmez. */
export function sheetDragOffset(translationY: number): number {
  'worklet';
  return Math.max(0, translationY);
}

/** Sürükleme bitince sheet kapanmalı mı (yeterince aşağı çekildi ya da hızlı fırlatıldı)? */
export function shouldCloseSheetOnRelease(translationY: number, velocityY: number, height: number): boolean {
  'worklet';
  return translationY > height * SHEET_CLOSE_DRAG_FRACTION || velocityY > SHEET_CLOSE_FLING_VELOCITY;
}

/** Sürüklenerek kapanırken animasyon kaldığı yerden devam etsin: sürüklemeyi progress'e katla. */
export function progressAfterDrag(drag: number, height: number): number {
  'worklet';
  if (height <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - drag / height));
}

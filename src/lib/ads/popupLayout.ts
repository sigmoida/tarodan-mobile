import { theme, MODAL_MAX_WIDTH, MODAL_CLOSE_HEADER_HEIGHT } from '@/ui';

/** Popup kartının ekran yüksekliğine oranla en büyük yüksekliği. */
export const POPUP_MAX_HEIGHT_RATIO = 0.8;
/**
 * Popup `@/ui` Modal'ı web gibi kurar: `lg` boyut (512pt), beyaz kart, başlık satırında
 * kapat (X), gövde iç boşluğu sıfır (`flushBody`). Görsel kutusu kartın tam genişliğidir;
 * yüksekliğinden başlık satırı düşülür.
 */
export const POPUP_MODAL_SIZE = 'lg' as const;
const BACKDROP_PADDING = theme.spacing[4];

export interface PopupMediaLimits {
  /** Görsel kutusunun en büyük genişliği (pt). */
  width: number;
  /** Görsel kutusunun en büyük yüksekliği (pt). */
  height: number;
  /** Kartın tamamının (başlık satırı dahil) en büyük yüksekliği (pt). */
  cardMaxHeight: number;
}

/**
 * Popup görselinin sığacağı en büyük kutu. Kart ekranın ~%80'ini ve güvenli
 * alanı (çentik/ana çubuk) aşmaz; görsel kutusu kartın gövdesidir (iç boşluk yok), yani
 * kart yüksekliğinden kapat düğmesinin başlık satırı düşülür. Böylece uzun (ör. 1:2)
 * bir reklam kartı taşırmaz ve kapat düğmesi her zaman ekranda kalır. Oran korunur:
 * sığdırmayı `fitBox` yapar.
 */
export function popupMediaLimits(
  window: { width: number; height: number },
  insets: { top: number; bottom: number },
): PopupMediaLimits {
  const cardMaxHeight = Math.min(
    window.height * POPUP_MAX_HEIGHT_RATIO,
    window.height - insets.top - insets.bottom - 2 * BACKDROP_PADDING,
  );
  const cardWidth = Math.min(MODAL_MAX_WIDTH[POPUP_MODAL_SIZE], window.width - 2 * BACKDROP_PADDING);
  return {
    width: Math.max(0, cardWidth),
    height: Math.max(0, cardMaxHeight - MODAL_CLOSE_HEADER_HEIGHT),
    cardMaxHeight,
  };
}

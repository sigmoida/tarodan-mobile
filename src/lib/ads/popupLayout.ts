import { theme, MODAL_MAX_WIDTH } from '@/ui';

/** Popup kartının ekran yüksekliğine oranla en büyük yüksekliği. */
export const POPUP_MAX_HEIGHT_RATIO = 0.8;
/**
 * Görselli popup `@/ui` Modal'ı `variant="media"` ile kurar: `lg` boyut (512pt), başlık satırı
 * yok, kapat (X) görselin üstünde sağ üstte. Görsel kutusu kartın tamamıdır (genişlik ve
 * yükseklik); başlık satırı düşülmez.
 */
export const POPUP_MODAL_SIZE = 'lg' as const;
const BACKDROP_PADDING = theme.spacing[4];

export interface PopupMediaLimits {
  /** Görsel kutusunun en büyük genişliği (pt). */
  width: number;
  /** Görsel kutusunun en büyük yüksekliği (pt). */
  height: number;
  /** Kartın en büyük yüksekliği (pt) — media varyantında görsel kutusuyla aynı. */
  cardMaxHeight: number;
}

/**
 * Popup görselinin sığacağı en büyük kutu. Kart ekranın ~%80'ini ve güvenli
 * alanı (çentik/ana çubuk) aşmaz; görsel kartın tamamıdır (başlık satırı yok, X görselin
 * üstünde). Böylece uzun (ör. 1:2) bir reklam kartı taşırmaz ve kapat düğmesi her zaman
 * ekranda kalır. Oran korunur: sığdırmayı `fitBox` yapar.
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
    height: Math.max(0, cardMaxHeight),
    cardMaxHeight,
  };
}

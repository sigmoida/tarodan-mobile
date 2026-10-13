import { theme } from '@/ui';

/** Popup kartının ekran yüksekliğine oranla en büyük yüksekliği. */
export const POPUP_MAX_HEIGHT_RATIO = 0.8;
/** `@/ui` Modal'ın kart genişlik sınırı ve iç boşluğu (bkz. src/ui/components/Modal.tsx). */
const MODAL_MAX_WIDTH = 480;
const MODAL_PADDING = theme.spacing[6];
const BACKDROP_PADDING = theme.spacing[4];

export interface PopupMediaLimits {
  /** Görsel kutusunun en büyük genişliği (pt). */
  width: number;
  /** Görsel kutusunun en büyük yüksekliği (pt). */
  height: number;
  /** Kartın tamamının en büyük yüksekliği (pt). */
  cardMaxHeight: number;
}

/**
 * Popup görselinin sığacağı en büyük kutu. Kart ekranın ~%80'ini ve güvenli
 * alanı (çentik/ana çubuk) aşmaz; görsel kutusu Modal'ın iç boşluğu düşülmüş
 * alana sığar. Böylece uzun (ör. 1:2) bir reklam kartı taşırmaz ve kapat
 * düğmesi her zaman ekranda kalır. Oran korunur: sığdırmayı `fitBox` yapar.
 */
export function popupMediaLimits(
  window: { width: number; height: number },
  insets: { top: number; bottom: number },
): PopupMediaLimits {
  const cardMaxHeight = Math.min(
    window.height * POPUP_MAX_HEIGHT_RATIO,
    window.height - insets.top - insets.bottom - 2 * BACKDROP_PADDING,
  );
  const cardWidth = Math.min(MODAL_MAX_WIDTH, window.width - 2 * BACKDROP_PADDING);
  return {
    width: Math.max(0, cardWidth - 2 * MODAL_PADDING),
    height: Math.max(0, cardMaxHeight - 2 * MODAL_PADDING),
    cardMaxHeight,
  };
}

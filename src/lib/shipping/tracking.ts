import type { Shipment } from '@/lib/api';

/** Sağlayıcı → takip sayfası şablonu. Bugün tek sağlayıcı var. */
const TRACKING_URLS: Record<string, (code: string) => string> = {
  surat: (code) =>
    `https://www.suratkargo.com.tr/KargoTakip/?kargotakipno=${encodeURIComponent(code)}`,
};

/**
 * Takip linkini KODDAN kurar. Sunucunun `trackingUrl` alanı kullanılmaz:
 * 2026-08-10 ölçümünde gerçek kod varken `null`, yokken iç referansı taşıyan
 * bozuk bir link döndürüyordu.
 */
export function buildTrackingUrl(
  provider: string | null | undefined,
  code: string | null | undefined,
): string | null {
  if (!provider || !code) return null;
  const build = TRACKING_URLS[provider];
  return build ? build(code) : null;
}

export type ShipmentView = {
  /** Gerçek taşıyıcı kodu — kullanıcıya "Takip Numarası" olarak gösterilir. */
  cargoCode: string | null;
  /** İç referans (`PKG-…`) — YALNIZ satıcıya, şubede vereceği numara olarak. */
  reference: string | null;
  /** Kargo kaydı var ama taşıyıcı kodu henüz yok — NORMAL ara durum. */
  isCodePending: boolean;
  /** `cargoCode`'dan kurulmuş takip linki. */
  trackingUrl: string | null;
};

/**
 * Kargo kaydı → görünüm. `fallbackCargoCode`, sipariş/grup yanıtlarının aynı
 * bilgiyi taşıyan `shipment.cargoCode` alanı içindir.
 */
export function deriveShipmentView(
  s: Shipment | null | undefined,
  fallbackCargoCode?: string | null,
): ShipmentView {
  const cargoCode = s?.providerTrackingId || fallbackCargoCode || null;
  return {
    cargoCode,
    reference: s?.trackingNumber || null,
    // Kargo kaydı hiç yokken "kod hazırlanıyor" demek yanlış olur.
    isCodePending: !!s && !cargoCode,
    trackingUrl: buildTrackingUrl(s?.provider, cargoCode),
  };
}

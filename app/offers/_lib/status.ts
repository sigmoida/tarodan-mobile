// Teklif formatlama yardımcıları. Durum haritası TEK kaynakta: web
// `offerStatusConfig` (`@/lib/shared/status-configs`).
import type { TFunction } from "i18next";
import { transformImageUrl } from "@/utils/imageUrl";
import type { Offer } from "./types";

export function getProductImage(product: Offer["product"]): string {
  const img = product.images?.[0];
  const src = img?.cardUrl ?? product.imageUrl;
  return transformImageUrl(src);
}

export function getTimeRemaining(expiresAt: string, t: TFunction): string | null {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}${t('time.dayShort')}`;
  return `${hours}${t('time.hourShort')} ${minutes}${t('time.minuteShort')}`;
}

export function formatTimeAgo(iso: string, t: TFunction): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return t("time.ago.justNow");
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return t("time.ago.justNow");
  if (m < 60) return t("time.ago.minutes", { count: m });
  if (h < 24) return t("time.ago.hours", { count: h });
  if (d < 30) return t("time.ago.days", { count: d });
  const mo = Math.floor(d / 30);
  return t("time.ago.months", { count: mo });
}

// Fiyat biçimi web ile aynı tek biçimleyici ("1.234,50 TL").
export { formatPrice } from '@/utils/format';

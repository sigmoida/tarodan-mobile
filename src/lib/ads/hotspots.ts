import type { ActiveAd, AdHotspot } from '@/lib/api';
import { resolveAdLink } from './openAdLink';

/** Oranları (0–1) görsel kutusuna göre yüzde konumlandırmaya çevirir. */
const pct = (n: number) => `${n * 100}%` as const;

export function hotspotStyle(h: Pick<AdHotspot, 'x' | 'y' | 'width' | 'height'>) {
  return { left: pct(h.x), top: pct(h.y), width: pct(h.width), height: pct(h.height) };
}

/**
 * Çizilecek bölgeler: görselin sınırları içinde (bozuk koordinat atlanır),
 * bağlantısı güvenli ve açılabilir olan (güvensiz şema ya da satın almaya
 * götüren hedef atlanır), çizim sırasıyla. Görselsiz (metin) reklamda bölge
 * yoktur — tek `linkUrl` kullanılır. Eski API yanıtında `hotspots` yoksa `[]`.
 */
export function renderableHotspots(ad: Pick<ActiveAd, 'imageUrl' | 'hotspots'>): AdHotspot[] {
  if (!ad.imageUrl) return [];
  return (ad.hotspots ?? [])
    .filter(
      (h) =>
        resolveAdLink(h.linkUrl).kind !== 'blocked' &&
        h.width > 0 &&
        h.height > 0 &&
        h.x >= 0 &&
        h.y >= 0 &&
        h.x + h.width <= 1.0001 &&
        h.y + h.height <= 1.0001,
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

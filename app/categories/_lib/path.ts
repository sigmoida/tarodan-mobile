import type { CategoryTileData } from './groups';

/**
 * Alt kategori iniş yolunu (kutu id'leri) güncel kutu ağacına göre çözer. Yol, kökten başlayıp her
 * adımda bir öncekinin `children`'ında bulunmalı; herhangi bir id bulunamazsa (katalog yenilendi,
 * kategori kalktı) TÜM yol sıfırlanır → köke dönülür. Saf.
 */
export function resolveTilePath(roots: CategoryTileData[], ids: string[]): CategoryTileData[] {
  const path: CategoryTileData[] = [];
  let level: CategoryTileData[] = roots;
  for (const id of ids) {
    const found = level.find((tile) => tile.id === id);
    if (!found || !found.children || found.children.length === 0) return [];
    path.push(found);
    level = found.children;
  }
  return path;
}

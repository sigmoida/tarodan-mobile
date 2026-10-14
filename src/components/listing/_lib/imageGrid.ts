/**
 * Görsel ızgarası yerleşimi — web `ImagePreviewGrid` telefon genişliği: 3 sütun, kapak karosu
 * 2×2 (sol üst), diğerleri sırayla sağ sütunu sonra alttaki satırları doldurur.
 *
 * Tüm işlevler worklet: sürükleme sırasında UI thread'inde hedef konum hesaplanır.
 */

export interface SlotRect {
  x: number;
  y: number;
  size: number;
}

export const GRID_COLUMNS = 3;

/** Tek hücre kenarı (pt). */
export function cellSize(width: number, gap: number): number {
  'worklet';
  return Math.max(0, (width - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS);
}

/** `slot` sırasındaki karonun konumu ve kenarı. 0 = kapak (2×2). */
export function slotRect(slot: number, width: number, gap: number): SlotRect {
  'worklet';
  const cell = cellSize(width, gap);
  const step = cell + gap;
  if (slot <= 0) return { x: 0, y: 0, size: cell * 2 + gap };
  if (slot <= 2) return { x: step * 2, y: step * (slot - 1), size: cell };
  const j = slot - 3;
  return { x: step * (j % GRID_COLUMNS), y: step * (2 + Math.floor(j / GRID_COLUMNS)), size: cell };
}

/** `count` karolu ızgaranın yüksekliği. */
export function gridHeight(count: number, width: number, gap: number): number {
  'worklet';
  if (count <= 0) return 0;
  const cell = cellSize(width, gap);
  const rows = count <= 3 ? 2 : 2 + Math.ceil((count - 3) / GRID_COLUMNS);
  return rows * cell + (rows - 1) * gap;
}

/**
 * Noktanın düştüğü yuva: önce içinde olduğu karo (kapak büyük olduğundan en yakın merkez
 * yanıltır), değilse merkezi en yakın olan.
 */
export function slotAtPoint(px: number, py: number, count: number, width: number, gap: number): number {
  'worklet';
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < count; i += 1) {
    const r = slotRect(i, width, gap);
    if (px >= r.x && px <= r.x + r.size && py >= r.y && py <= r.y + r.size) return i;
    const dx = r.x + r.size / 2 - px;
    const dy = r.y + r.size / 2 - py;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

/**
 * Sürüklenen kalem `from` yuvasından `to` yuvasına geçince tüm kalemlerin yeni yuvaları
 * (`moveImage` ile aynı kaydırma kuralı, kimlik → yuva haritası üzerinde).
 */
export function moveSlots(
  slots: Readonly<Record<string, number>>,
  id: string,
  from: number,
  to: number,
): Record<string, number> {
  'worklet';
  const next: Record<string, number> = {};
  for (const key of Object.keys(slots)) {
    const p = slots[key] as number;
    if (key === id) next[key] = to;
    else if (from < to && p > from && p <= to) next[key] = p - 1;
    else if (from > to && p >= to && p < from) next[key] = p + 1;
    else next[key] = p;
  }
  return next;
}

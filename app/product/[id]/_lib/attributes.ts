/**
 * Ürün detayı "Teknik özellikler" — `attributes[]` gösterimi (delta 19).
 *
 * API her niteliği `{ id, label (grup adı), value, groupSlug }` döndürür. Ölçek,
 * malzeme ve renk "Özellikler" kartında kendi satırına sahip (`DEDICATED`), burada
 * ikinci kez görünmez. Eşleşme YALNIZ `groupSlug` ile: grup adı DB'den Türkçe
 * gelir, çevrilemez. Aynı gruptan birden çok değer (çoklu seçimli üretici
 * grupları) tek satırda virgülle birleşir.
 */
const DEDICATED_GROUP_SLUGS: readonly string[] = ['scale', 'material', 'color'];

export interface TechnicalAttributeRow {
  key: string;
  label: string;
  value: string;
}

export function technicalAttributeRows(attributes: unknown): TechnicalAttributeRow[] {
  if (!Array.isArray(attributes)) return [];
  const rows = new Map<string, TechnicalAttributeRow>();
  for (const a of attributes) {
    if (!a || typeof a !== 'object') continue;
    const groupSlug = typeof a.groupSlug === 'string' ? a.groupSlug : '';
    if (DEDICATED_GROUP_SLUGS.includes(groupSlug)) continue;
    const label = String(a.label ?? a.group ?? '').trim();
    const value = String(a.value ?? '').trim();
    if (!label || !value) continue;
    const key = groupSlug || label;
    const prev = rows.get(key);
    if (!prev) rows.set(key, { key, label, value });
    else if (!prev.value.split(', ').includes(value)) prev.value = `${prev.value}, ${value}`;
  }
  return [...rows.values()];
}

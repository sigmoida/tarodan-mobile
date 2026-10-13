/**
 * Ürün detayı "Özellikler" / "Teknik özellikler" — `attributes[]` gösterimi
 * (web `ProductSpecs` ile aynı kurallar).
 *
 * API her niteliği `{ id, label (grup adı), value, groupSlug }` döndürür, ayrıca
 * `scale` ve `material` türetilmiş metinlerini verir. Web'de:
 *  - ölçek ve malzeme "Detaylar" kartında kendi satırı,
 *  - renk "Teknik özellikler" kartında kendi satırı (`products.color` boşsa renk
 *    grubunun değerleri virgülle birleşir — backfill görmemiş eski ilan),
 *  - kalan nitelikler (`DEDICATED` dışı) teknik listede.
 * Ölçek/malzeme/renk teknik listeden YALNIZ kendi satırı gösterildiği için elenir;
 * eşleşme `groupSlug` ile (grup adı DB'den Türkçe gelir, çevrilemez). Gizli
 * grupları web de elemez (API zaten sunmaz), burada da elenmez. Aynı gruptan birden
 * çok değer (çoklu seçimli üretici grupları) tek satırda virgülle birleşir.
 */
import {
  COLOR_GROUP_SLUG,
  COLOR_LABEL_SEPARATOR,
  DEDICATED_GROUP_SLUGS,
  MATERIAL_GROUP_SLUG,
  SCALE_GROUP_SLUG,
} from '@/components/listing/_lib/attributeGroups';
import { asLabel } from '@/utils/format';

export interface TechnicalAttributeRow {
  key: string;
  label: string;
  value: string;
}

function attributeList(attributes: unknown): any[] {
  return Array.isArray(attributes) ? attributes.filter((a) => a && typeof a === 'object') : [];
}

function valuesInGroup(attributes: unknown, slug: string): string[] {
  return attributeList(attributes)
    .filter((a) => a.groupSlug === slug)
    .map((a) => String(a.value ?? '').trim())
    .filter(Boolean);
}

/** Ölçek satırı: `product.scale` (API türetir), boşsa ölçek grubunun değeri (web ile aynı). */
export function scaleValue(product: { scale?: unknown; attributes?: unknown }): string {
  return asLabel(product.scale) || valuesInGroup(product.attributes, SCALE_GROUP_SLUG)[0] || '';
}

/** Malzeme satırı: `product.material`, boşsa malzeme grubunun değeri (web ile aynı). */
export function materialValue(product: { material?: unknown; attributes?: unknown }): string {
  return asLabel(product.material) || valuesInGroup(product.attributes, MATERIAL_GROUP_SLUG)[0] || '';
}

/** Renk satırı: `product.color`, boşsa renk grubunun değerleri virgülle (web ile aynı). */
export function colorValue(product: { color?: unknown; attributes?: unknown }): string {
  return (
    asLabel(product.color) ||
    valuesInGroup(product.attributes, COLOR_GROUP_SLUG).join(COLOR_LABEL_SEPARATOR)
  );
}

export function technicalAttributeRows(attributes: unknown): TechnicalAttributeRow[] {
  const rows = new Map<string, TechnicalAttributeRow>();
  for (const a of attributeList(attributes)) {
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

import type { AttrGroup } from './types';

/**
 * Genel özel gruplar (ör. Nadirlik/Bulunabilirlik) — ana repo
 * `@tarodan/types` `isGlobalCustomAttributeGroup` ve `@tarodan/listing-form`
 * `splitAttributeGroups`/`requiredGroupSlugsOf` ile birebir (web ilan formu).
 *
 * `/products/attribute-groups` üç tür grup döndürür:
 *  - sabit üçlü (ölçek, malzeme, renk): formda kendi alanları var,
 *  - genel özel gruplar: üreticisiz, her ilanda sorulur, TEK seçimli; zorunlu
 *    olanı sunucu oluşturmada şart koşar,
 *  - üreticiye bağlı gruplar: yalnız o üretici seçiliyken.
 */
const DEDICATED_GROUP_SLUGS: readonly string[] = ['scale', 'material', 'color'];
const HIDDEN_GROUP_SLUGS: readonly string[] = ['vehicle_type'];

export function isGlobalCustomAttributeGroup(group: Pick<AttrGroup, 'slug' | 'manufacturerSlug'>): boolean {
  return (
    group.manufacturerSlug == null &&
    !DEDICATED_GROUP_SLUGS.includes(group.slug) &&
    !HIDDEN_GROUP_SLUGS.includes(group.slug)
  );
}

export function globalCustomGroups<G extends Pick<AttrGroup, 'slug' | 'manufacturerSlug'>>(groups: readonly G[]): G[] {
  return groups.filter(isGlobalCustomAttributeGroup);
}

/**
 * Formun zorunlu tutacağı genel gruplar — API ile simetrik: `isRequired` VE en
 * az bir seçeneği olan (sunucu seçeneksiz zorunlu grubu saymaz; form sayarsa
 * satıcı seçemeyeceği bir alanda takılır).
 */
export function requiredGlobalGroups(groups: readonly AttrGroup[]): Array<{ slug: string; name: string }> {
  return groups
    .filter((g) => g.isRequired && g.attributes.length > 0)
    .map((g) => ({ slug: g.slug, name: g.name }));
}

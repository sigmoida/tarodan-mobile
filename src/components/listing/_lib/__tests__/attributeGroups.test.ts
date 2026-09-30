/**
 * Genel özel gruplar (ör. Nadirlik/Bulunabilirlik) — web `@tarodan/listing-form`
 * `splitAttributeGroups`/`requiredGroupSlugsOf` ve `@tarodan/types`
 * `isGlobalCustomAttributeGroup` ile birebir. Mobil bu grupları hiç
 * göstermiyordu; sunucu zorunlu olanı istediği için ilan oluşturma "nadirlik
 * eklemediniz" hatası veriyordu (2026-09-30).
 */
import { globalCustomGroups, requiredGlobalGroups, isGlobalCustomAttributeGroup } from '../attributeGroups';

// 2026-09-30 production `GET /products/attribute-groups` ölçümü (kısaltılmış).
const LIVE = [
  { slug: 'scale', name: 'Ölçek', manufacturerSlug: null, isRequired: false, attributes: [{ slug: '164', label: '1:64' }] },
  { slug: 'nadirlik-bulunabilirlik', name: 'Nadirlik/Bulunabilirlik', manufacturerSlug: null, isRequired: true,
    attributes: [{ slug: 'chase', label: 'Chase' }, { slug: 'bulunabilir', label: 'Bulunabilir' }] },
  { slug: 'material', name: 'Malzeme', manufacturerSlug: null, isRequired: true, attributes: [{ slug: 'diecast', label: 'Diecast' }] },
  { slug: 'color', name: 'Renk', manufacturerSlug: null, isRequired: true, attributes: [{ slug: 'blue', label: 'Mavi' }] },
  { slug: 'vehicle_type', name: 'Araç tipi', manufacturerSlug: null, isRequired: false, attributes: [{ slug: 'car', label: 'Araba' }] },
  { slug: 'series', name: 'Seri', manufacturerSlug: 'hot-wheels', isRequired: false, attributes: [{ slug: 'premium', label: 'Premium' }] },
] as any[];

describe('isGlobalCustomAttributeGroup', () => {
  it('sabit üçlü (ölçek/malzeme/renk), gizli grup ve üreticiye bağlı grup genel sayılmaz', () => {
    expect(LIVE.filter(isGlobalCustomAttributeGroup).map((g) => g.slug)).toEqual(['nadirlik-bulunabilirlik']);
  });
});

describe('globalCustomGroups / requiredGlobalGroups', () => {
  it('yalnız genel özel grupları döndürür', () => {
    expect(globalCustomGroups(LIVE).map((g) => g.slug)).toEqual(['nadirlik-bulunabilirlik']);
  });

  it('zorunlu olanlar: isRequired VE en az bir seçeneği olan', () => {
    const groups = [
      ...globalCustomGroups(LIVE),
      { slug: 'bos-zorunlu', name: 'Boş', manufacturerSlug: null, isRequired: true, attributes: [] },
    ] as any[];
    expect(requiredGlobalGroups(groups).map((g) => g.slug)).toEqual(['nadirlik-bulunabilirlik']);
  });
});

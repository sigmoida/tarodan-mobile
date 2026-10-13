import { keepGeneralAttributeSelections } from '../productFilters';

describe('keepGeneralAttributeSelections', () => {
  const groups = [
    { slug: 'rarity', manufacturerSlug: null },
    { slug: 'segment', manufacturerSlug: 'hot-wheels' },
  ];
  it('genel grup seçimi kalır, üreticiye bağlı ve bilinmeyen düşer', () => {
    expect(
      keepGeneralAttributeSelections({ rarity: ['rare'], segment: ['premium'], ghost: ['x'] }, groups),
    ).toEqual({ rarity: ['rare'] });
  });
  it('seçim yoksa boş nesne', () => {
    expect(keepGeneralAttributeSelections(undefined, groups)).toEqual({});
  });
  it('manufacturerSlug alanı olmayan grup genel sayılır', () => {
    expect(keepGeneralAttributeSelections({ a: ['1'] }, [{ slug: 'a' }])).toEqual({ a: ['1'] });
  });
});

import { colorValue, materialValue, scaleValue, technicalAttributeRows } from '../attributes';

describe('technicalAttributeRows', () => {
  it('ölçek/malzeme/renk satırlarını eler, genel grubu gösterir', () => {
    expect(
      technicalAttributeRows([
        { id: '1', label: 'Ölçek', value: '1:64', groupSlug: 'scale' },
        { id: '2', label: 'Malzeme', value: 'Diecast', groupSlug: 'material' },
        { id: '3', label: 'Renk', value: 'Mavi', groupSlug: 'color' },
        { id: '4', label: 'Nadirlik', value: 'Nadir', groupSlug: 'rarity' },
      ]),
    ).toEqual([{ key: 'rarity', label: 'Nadirlik', value: 'Nadir' }]);
  });

  it('aynı gruptan çok değeri tek satırda birleştirir (tekrarsız)', () => {
    expect(
      technicalAttributeRows([
        { id: '1', label: 'Segment', value: 'Premium', groupSlug: 'segment' },
        { id: '2', label: 'Segment', value: 'Treasure', groupSlug: 'segment' },
        { id: '3', label: 'Segment', value: 'Premium', groupSlug: 'segment' },
      ]),
    ).toEqual([{ key: 'segment', label: 'Segment', value: 'Premium, Treasure' }]);
  });

  it('boş/bozuk girdide boş liste; etiketi ya da değeri boş satır atlanır', () => {
    expect(technicalAttributeRows(undefined)).toEqual([]);
    expect(technicalAttributeRows(null)).toEqual([]);
    expect(technicalAttributeRows([null, 'x', { label: '', value: 'a', groupSlug: 'g' }, { label: 'L', value: ' ', groupSlug: 'h' }])).toEqual([]);
  });
});

describe('türetilmiş satırlar (web ProductSpecs ile aynı)', () => {
  const attrs = [
    { id: '1', label: 'Renk', value: 'Mavi', groupSlug: 'color' },
    { id: '2', label: 'Renk', value: 'Kırmızı', groupSlug: 'color' },
    { id: '3', label: 'Malzeme', value: 'Diecast', groupSlug: 'material' },
    { id: '4', label: 'Ölçek', value: '1:64', groupSlug: 'scale' },
  ];

  it('kolon doluysa kolon, boşsa nitelik grubu kullanılır', () => {
    expect(colorValue({ color: 'Siyah', attributes: attrs })).toBe('Siyah');
    expect(colorValue({ color: null, attributes: attrs })).toBe('Mavi, Kırmızı');
    expect(materialValue({ material: 'Plastik', attributes: attrs })).toBe('Plastik');
    expect(materialValue({ attributes: attrs })).toBe('Diecast');
    expect(scaleValue({ scale: '1:18', attributes: attrs })).toBe('1:18');
    expect(scaleValue({ attributes: attrs })).toBe('1:64');
  });

  it('hiçbiri yoksa boş döner', () => {
    expect(colorValue({})).toBe('');
    expect(materialValue({ attributes: [] })).toBe('');
    expect(scaleValue({ attributes: 'x' })).toBe('');
  });

  it('gizli grup web gibi elenmez (API sunmaz); yalnız ölçek/malzeme/renk elenir', () => {
    expect(
      technicalAttributeRows([{ id: '9', label: 'Araç tipi', value: 'SUV', groupSlug: 'vehicle_type' }, ...attrs]),
    ).toEqual([{ key: 'vehicle_type', label: 'Araç tipi', value: 'SUV' }]);
  });
});

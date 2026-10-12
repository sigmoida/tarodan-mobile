import { technicalAttributeRows } from '../attributes';

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

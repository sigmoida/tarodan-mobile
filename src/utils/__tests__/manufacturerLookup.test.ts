import { findManufacturerId } from '../manufacturerLookup';

const LIST = [
  { id: 'm-hw', name: 'Hot Wheels', slug: 'hot-wheels' },
  { id: 'm-bb', name: 'Bburago', slug: 'bburago' },
  { id: 'm-ist', name: 'İXO Models', slug: 'ixo' },
];

describe('findManufacturerId', () => {
  it('önce tam adı (büyük/küçük harf duyarsız, kırpılmış) eşler', () => {
    expect(findManufacturerId('Hot Wheels', LIST)).toBe('m-hw');
    expect(findManufacturerId('  hot wheels ', LIST)).toBe('m-hw');
    expect(findManufacturerId('BBURAGO', LIST)).toBe('m-bb');
  });

  it('sonra tam slug ile eşler', () => {
    expect(findManufacturerId('hot-wheels', LIST)).toBe('m-hw');
    expect(findManufacturerId('IXO', LIST)).toBe('m-ist');
  });

  it('noktalama/aksan silerek eşleme yalnız TEK aday varken yapılır', () => {
    expect(findManufacturerId('hotwheels', LIST)).toBe('m-hw');
    expect(findManufacturerId('HOT_WHEELS', LIST)).toBe('m-hw');
    expect(findManufacturerId('ixo models', LIST)).toBe('m-ist');
  });

  it('belirsizlikte (iki farklı üretici aynı anahtara iner) eşleme yapmaz', () => {
    const ambiguous = [
      { id: 'a', name: 'Hot-Wheels' },
      { id: 'b', name: 'Hot Wheels.', slug: 'hw' },
    ];
    expect(findManufacturerId('hotwheels', ambiguous)).toBeNull();
  });

  it('tam ad eşleşmesi, birleştirilmiş benzerden önceliklidir', () => {
    const list = [
      { id: 'a', name: 'Hot-Wheels' },
      { id: 'b', name: 'Hot Wheels' },
    ];
    expect(findManufacturerId('Hot Wheels', list)).toBe('b');
  });

  it('bulunamazsa / liste yoksa / ad boşsa null', () => {
    expect(findManufacturerId('Maisto', LIST)).toBeNull();
    expect(findManufacturerId('Hot Wheels', [])).toBeNull();
    expect(findManufacturerId('Hot Wheels', undefined)).toBeNull();
    expect(findManufacturerId('', LIST)).toBeNull();
    expect(findManufacturerId(undefined, LIST)).toBeNull();
    expect(findManufacturerId('---', LIST)).toBeNull();
  });
});

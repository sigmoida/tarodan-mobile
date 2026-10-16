import { asManufacturerList, findManufacturerId, withManufacturerId } from '../manufacturerLookup';

const LIST = [
  { id: 'm-hw', name: 'Hot Wheels', slug: 'hot-wheels' },
  { id: 'm-bb', name: 'Bburago', slug: 'bburago' },
  { id: 'm-ist', name: 'İXO Models', slug: 'ixo' },
];

describe('findManufacturerId', () => {
  it('adı büyük/küçük harf, boşluk ve noktalamadan bağımsız eşler', () => {
    expect(findManufacturerId('Hot Wheels', LIST)).toBe('m-hw');
    expect(findManufacturerId('hotwheels', LIST)).toBe('m-hw');
    expect(findManufacturerId('HOT-WHEELS', LIST)).toBe('m-hw');
    expect(findManufacturerId('  bburago ', LIST)).toBe('m-bb');
  });

  it('Türkçe karakterleri katlar, slug ile de eşler', () => {
    expect(findManufacturerId('ixo models', LIST)).toBe('m-ist');
    expect(findManufacturerId('IXO', LIST)).toBe('m-ist');
  });

  it('bulunamazsa / liste yoksa / ad boşsa null', () => {
    expect(findManufacturerId('Maisto', LIST)).toBeNull();
    expect(findManufacturerId('Hot Wheels', [])).toBeNull();
    expect(findManufacturerId('Hot Wheels', undefined)).toBeNull();
    expect(findManufacturerId('', LIST)).toBeNull();
    expect(findManufacturerId(undefined, LIST)).toBeNull();
  });
});

describe('withManufacturerId', () => {
  it('+ ile kodlanmış adı çözüp manufacturerId ekler, sorgunun kalanını korur', () => {
    expect(withManufacturerId('/listings?manufacturer=Hot+Wheels', LIST)).toBe(
      '/listings?manufacturer=Hot+Wheels&manufacturerId=m-hw',
    );
    expect(
      withManufacturerId('/listings?scale=1%3A64&manufacturer=Hot%20Wheels&sortBy=price', LIST),
    ).toBe('/listings?scale=1%3A64&manufacturer=Hot%20Wheels&sortBy=price&manufacturerId=m-hw');
  });

  it('#fragment varsa kimlik sorguya eklenir, fragment sonda kalır', () => {
    expect(withManufacturerId('/listings?manufacturer=Bburago#top', LIST)).toBe(
      '/listings?manufacturer=Bburago&manufacturerId=m-bb#top',
    );
  });

  it('zaten manufacturerId varsa dokunmaz', () => {
    const r = '/listings?manufacturer=Hot+Wheels&manufacturerId=zzz';
    expect(withManufacturerId(r, LIST)).toBe(r);
  });

  it('ad listede yoksa, liste boşsa, manufacturer paramı yoksa ya da sorgu yoksa aynen döner', () => {
    expect(withManufacturerId('/listings?manufacturer=Maisto', LIST)).toBe(
      '/listings?manufacturer=Maisto',
    );
    expect(withManufacturerId('/listings?manufacturer=Hot+Wheels', null)).toBe(
      '/listings?manufacturer=Hot+Wheels',
    );
    expect(withManufacturerId('/listings?brand=Porsche', LIST)).toBe('/listings?brand=Porsche');
    expect(withManufacturerId('/listings', LIST)).toBe('/listings');
  });

  it('bozuk yüzde kodlamada çökmez', () => {
    expect(withManufacturerId('/listings?manufacturer=%E0%A4%A', LIST)).toBe(
      '/listings?manufacturer=%E0%A4%A',
    );
  });
});

describe('asManufacturerList', () => {
  it('dizi, { data: [] } ve bozuk girdiyi güvenle listeye çevirir', () => {
    expect(asManufacturerList(LIST)).toHaveLength(3);
    expect(asManufacturerList({ data: LIST })).toHaveLength(3);
    expect(asManufacturerList(undefined)).toEqual([]);
    expect(asManufacturerList([{ id: 1, name: 'x' }, null, LIST[0]])).toEqual([LIST[0]]);
  });
});

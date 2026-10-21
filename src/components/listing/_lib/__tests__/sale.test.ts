import {
  commissionPreviewAmount,
  defaultSaleDates,
  isSaleActive,
  salePayload,
  saleStartsLater,
} from '../sale';

const NOW = new Date('2026-10-14T12:00:00Z').getTime();
const base = { price: '500', salePrice: '400', saleStartDate: '2026-10-10', saleEndDate: '2026-10-20' };

describe('ilan indirimi — komisyon önizlemesi tutarı (web saleIsActive paritesi)', () => {
  it('indirim bugün geçerliyse önizleme indirimli fiyattan sorulur', () => {
    expect(isSaleActive(base, NOW)).toBe(true);
    expect(commissionPreviewAmount(base, NOW)).toBe('400');
  });

  it('indirim ileri tarihte başlıyorsa normal fiyat + başlangıç günü', () => {
    const future = { ...base, saleStartDate: '2026-10-20', saleEndDate: '2026-10-27' };
    expect(isSaleActive(future, NOW)).toBe(false);
    expect(commissionPreviewAmount(future, NOW)).toBe('500');
    expect(saleStartsLater(future, NOW)).toBe('2026-10-20');
  });

  it('süresi bitmiş indirim normal fiyatı kullanır', () => {
    const past = { ...base, saleStartDate: '2026-10-01', saleEndDate: '2026-10-05' };
    expect(commissionPreviewAmount(past, NOW)).toBe('500');
    expect(saleStartsLater(past, NOW)).toBeNull();
  });

  it('tarihsiz indirim süresiz geçerlidir', () => {
    expect(commissionPreviewAmount({ ...base, saleStartDate: '', saleEndDate: '' }, NOW)).toBe('400');
  });

  it('geçersiz indirim (fiyattan büyük/eşit ya da boş) yok sayılır', () => {
    expect(commissionPreviewAmount({ ...base, salePrice: '600' }, NOW)).toBe('500');
    expect(commissionPreviewAmount({ ...base, salePrice: '500' }, NOW)).toBe('500');
    expect(commissionPreviewAmount({ ...base, salePrice: '' }, NOW)).toBe('500');
    expect(saleStartsLater({ ...base, salePrice: '', saleStartDate: '2026-12-01' }, NOW)).toBeNull();
  });

  it('reads both amounts with the shared TL amount parser: a decimal comma, no grouping', () => {
    const comma = { ...base, price: '1250,50', salePrice: '1000' };
    expect(commissionPreviewAmount(comma, NOW)).toBe('1000');
    expect(commissionPreviewAmount({ ...comma, salePrice: '' }, NOW)).toBe('1250.5');
    expect(salePayload(comma)).toMatchObject({ originalPrice: 1250.5, salePrice: 1000 });
    // "1.000" is refused, never 1 TL: no discount here (the form blocks it first) and no preview.
    expect(salePayload({ ...comma, salePrice: '1.000' }).salePrice).toBeNull();
    expect(commissionPreviewAmount({ ...base, price: '1.000', salePrice: '' }, NOW)).toBe('');
  });

  it('payload: indirim yoksa tüm alanlar null; varsa ISO tarihler', () => {
    expect(salePayload({ ...base, salePrice: '' })).toEqual({
      originalPrice: null,
      salePrice: null,
      saleStartDate: null,
      saleEndDate: null,
    });
    expect(salePayload(base)).toEqual({
      originalPrice: 500,
      salePrice: 400,
      saleStartDate: new Date('2026-10-10').toISOString(),
      saleEndDate: new Date('2026-10-20').toISOString(),
    });
  });

  it('varsayılan tarihler: bugün → +7 gün, gün UTC takviminden (web createEmptySaleData)', () => {
    expect(defaultSaleDates(new Date('2026-10-14T23:30:00Z'))).toEqual({
      saleStartDate: '2026-10-14',
      saleEndDate: '2026-10-21',
    });
    // TR 01:30 (UTC önceki gün 22:30): web gibi UTC günü.
    expect(defaultSaleDates(new Date('2026-10-15T01:30:00+03:00')).saleStartDate).toBe('2026-10-14');
  });

  it('TR 00:00–03:00 arasında varsayılan başlangıç "ileri tarihli" sayılmaz (ipucu yok)', () => {
    const now = new Date('2026-10-15T01:30:00+03:00');
    const fields = { price: '500', salePrice: '400', ...defaultSaleDates(now) };
    expect(saleStartsLater(fields, now.getTime())).toBeNull();
    expect(isSaleActive(fields, now.getTime())).toBe(true);
  });
});

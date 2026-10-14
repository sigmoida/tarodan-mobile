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

  it('varsayılan tarihler: bugün → +7 gün (web createEmptySaleData)', () => {
    expect(defaultSaleDates(new Date(2026, 9, 14, 23, 30))).toEqual({
      saleStartDate: '2026-10-14',
      saleEndDate: '2026-10-21',
    });
  });
});

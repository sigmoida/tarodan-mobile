import { schemaT } from '@/test-utils';
import { discountDefaultValues, discountSchema, discountToFormValues } from '../schema';
import type { Discount } from '../types';

const schema = discountSchema(schemaT);
const base = () => ({ ...discountDefaultValues(), name: 'Kampanya' });

/** Alan yolu -> mesaj (ilk hata). */
function errorsOf(values: ReturnType<typeof base>) {
  const r = schema.safeParse(values);
  if (r.success) return {} as Record<string, string>;
  const out: Record<string, string> = {};
  for (const i of r.error.issues) out[String(i.path[0])] ??= i.message;
  return out;
}

describe('discountSchema — alan bazlı koşullu kurallar', () => {
  it('geçerli varsayılan + ad: hata yok', () => {
    expect(errorsOf(base())).toEqual({});
  });

  it('ad boşsa hata ad alanına bağlanır', () => {
    expect(errorsOf({ ...base(), name: ' ' })).toEqual({ name: 'İndirim adı gerekli.' });
  });

  it('bogo: değer istenmez; al/bedava en az 1 — hata kendi alanında', () => {
    const f = { ...base(), type: 'bogo' as const, value: '' };
    expect(errorsOf(f)).toEqual({
      buyQuantity: "'Al' adedi en az 1 olmalı",
      getQuantity: "'Bedava' adedi en az 1 olmalı",
    });
    expect(errorsOf({ ...f, buyQuantity: '2' })).toEqual({ getQuantity: "'Bedava' adedi en az 1 olmalı" });
    expect(errorsOf({ ...f, buyQuantity: '2', getQuantity: '0' })).toHaveProperty('getQuantity');
    expect(errorsOf({ ...f, buyQuantity: '2', getQuantity: '1' })).toEqual({});
  });

  it('bulk_quantity: en az adet >= 2, yüzde 1-100', () => {
    const f = { ...base(), type: 'bulk_quantity' as const, value: '15' };
    expect(errorsOf(f)).toEqual({ minQuantity: 'En az adet 2 veya üzeri olmalı' });
    expect(errorsOf({ ...f, minQuantity: '1' })).toHaveProperty('minQuantity');
    expect(errorsOf({ ...f, minQuantity: '3' })).toEqual({});
    expect(errorsOf({ ...f, minQuantity: '3', value: '150' })).toEqual({ value: "Yüzde indirim 100'den büyük olamaz." });
    expect(errorsOf({ ...f, minQuantity: '3', value: '0' })).toEqual({ value: 'Geçerli bir indirim değeri girin.' });
  });

  it('bogo alanları bogo dışı türde, minQuantity bulk dışında doğrulanmaz', () => {
    expect(errorsOf({ ...base(), buyQuantity: '0', getQuantity: '0', minQuantity: '1' })).toEqual({});
  });

  it('mevcut kurallar: negatif/0 değer, yüzde > 100, seçili ürün yok', () => {
    expect(errorsOf({ ...base(), value: '-5' })).toEqual({ value: 'Geçerli bir indirim değeri girin.' });
    expect(errorsOf({ ...base(), value: '150' })).toEqual({ value: "Yüzde indirim 100'den büyük olamaz." });
    // sabit tutarda 100 üstü serbest
    expect(errorsOf({ ...base(), type: 'fixed_amount' as const, value: '150' })).toEqual({});
    expect(errorsOf({ ...base(), scope: 'product' as const })).toEqual({
      targetProductIds: 'Lütfen en az bir ürün seçin.',
    });
    expect(errorsOf({ ...base(), scope: 'product' as const, targetProductIds: ['p1'] })).toEqual({});
  });

  it('bozuk tarih RangeError yerine alan hatası verir', () => {
    expect(errorsOf({ ...base(), startDate: '2026-13-45' })).toHaveProperty('startDate');
    expect(errorsOf({ ...base(), endDate: '' })).toHaveProperty('endDate');
  });
});

describe('discountSchema: amount text (shared TL amount parser, web parity)', () => {
  const REFUSED = 'Tutar kabul edilmedi. Binlik ayracı kullanmayın; kuruş için virgül kullanın, örn. 1250,50';
  const fixed = () => ({ ...base(), type: 'fixed_amount' as const });

  it('"1.000" is Turkish grouping: refused on the TL value and both TL bounds, never 1 TL', () => {
    expect(errorsOf({ ...fixed(), value: '1.000' })).toEqual({ value: REFUSED });
    expect(errorsOf({ ...base(), minCartValue: '1.000' })).toEqual({ minCartValue: REFUSED });
    expect(errorsOf({ ...base(), maxDiscountAmount: '1.250,50' })).toEqual({ maxDiscountAmount: REFUSED });
  });

  it('a refused percent gets the value copy (the format copy speaks of kuruş)', () => {
    expect(errorsOf({ ...base(), value: '1.000' })).toEqual({ value: 'Geçerli bir indirim değeri girin.' });
  });

  it('accepts a decimal comma or dot and plain thousands', () => {
    expect(errorsOf({ ...fixed(), value: '1250,50', minCartValue: '1000', maxDiscountAmount: '99.90' })).toEqual({});
    expect(errorsOf({ ...base(), value: '12,5' })).toEqual({});
  });

  it('a fixed amount must be above 0; empty or zero bounds are no bound', () => {
    expect(errorsOf({ ...fixed(), value: '0,00' })).toEqual({ value: 'Geçerli bir indirim değeri girin.' });
    expect(errorsOf({ ...fixed(), value: '' })).toEqual({ value: 'Geçerli bir indirim değeri girin.' });
    expect(errorsOf({ ...base(), minCartValue: '0', maxDiscountAmount: '' })).toEqual({});
  });
});

describe('discountToFormValues', () => {
  it('prefills amounts with a decimal comma and no grouping, as the parser reads them back', () => {
    const d = {
      id: 'd1', code: 'YAZ', name: 'Yaz', description: null, type: 'fixed_amount', value: 1250.5,
      buyQuantity: null, getQuantity: null, minQuantity: null, scope: 'seller', targetProductIds: [],
      minCartValue: 1000, maxDiscountAmount: 99.9, usageLimitTotal: null, usageLimitPerUser: 1,
      usedCount: 0, isStackable: false, isActive: true,
      startDate: '2026-10-01T00:00:00.000Z', endDate: '2026-10-31T00:00:00.000Z',
      createdAt: '', isCurrentlyValid: true,
    } as Discount;
    expect(discountToFormValues(d)).toMatchObject({ value: '1250,50', minCartValue: '1000', maxDiscountAmount: '99,90' });
    expect(errorsOf({ ...base(), ...discountToFormValues(d), name: 'Yaz' })).toEqual({});
  });

  it('kayıttaki bogo indirimi form değerlerine taşır; eksik alanlar boş string', () => {
    const d = {
      id: 'd1', code: null, name: 'Bogo', description: null, type: 'bogo', value: 0,
      buyQuantity: 2, getQuantity: 1, minQuantity: null, scope: 'seller', targetProductIds: [],
      minCartValue: null, maxDiscountAmount: null, usageLimitTotal: null, usageLimitPerUser: 1,
      usedCount: 0, isStackable: false, isActive: true,
      startDate: '2026-10-01T00:00:00.000Z', endDate: '2026-10-31T00:00:00.000Z',
      createdAt: '', isCurrentlyValid: true,
    } as Discount;
    expect(discountToFormValues(d)).toMatchObject({
      // bogo has no value: 0 is no amount, so the field is empty (web `fromDiscount`).
      code: '', description: '', type: 'bogo', value: '', buyQuantity: '2', getQuantity: '1',
      minQuantity: '', startDate: '2026-10-01', endDate: '2026-10-31',
    });
  });
});

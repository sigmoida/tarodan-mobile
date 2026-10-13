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

describe('discountToFormValues', () => {
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
      code: '', description: '', type: 'bogo', value: '0', buyQuantity: '2', getQuantity: '1',
      minQuantity: '', startDate: '2026-10-01', endDate: '2026-10-31',
    });
  });
});

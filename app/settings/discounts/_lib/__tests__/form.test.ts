import { buildDiscountPayload } from '../form';
import { discountDefaultValues } from '../schema';
import { quantitySummary, valueLabel, type Discount } from '../types';

const base = () => ({ ...discountDefaultValues(), name: 'Kampanya' });

describe('buildDiscountPayload', () => {
  it('bogo: kodsuz, value 0, buy/get sayı; minQuantity yok', () => {
    const p = buildDiscountPayload({ ...base(), type: 'bogo', code: 'ABC', buyQuantity: '2', getQuantity: '1' });
    expect(p).toMatchObject({ type: 'bogo', code: undefined, value: 0, buyQuantity: 2, getQuantity: 1, minQuantity: undefined });
  });
  it('bulk_quantity: kodsuz, minQuantity + yüzde value', () => {
    const p = buildDiscountPayload({ ...base(), type: 'bulk_quantity', code: 'ABC', minQuantity: '3', value: '15' });
    expect(p).toMatchObject({ type: 'bulk_quantity', code: undefined, value: 15, minQuantity: 3, buyQuantity: undefined, getQuantity: undefined });
  });
  it('yüzde: kod korunur, adet alanları gitmez', () => {
    const p = buildDiscountPayload({ ...base(), code: ' yaz10 ', buyQuantity: '2', minQuantity: '3' });
    expect(p).toMatchObject({ type: 'percentage', code: 'yaz10', value: 10, buyQuantity: undefined, minQuantity: undefined });
  });
});

describe('buildDiscountPayload: amount text (shared TL amount parser, web parity)', () => {
  it('sends a decimal comma and plain thousands exactly', () => {
    const p = buildDiscountPayload({
      ...base(),
      type: 'fixed_amount',
      value: '1250,50',
      minCartValue: '1000',
      maxDiscountAmount: '99.90',
    });
    expect(p).toMatchObject({ value: 1250.5, minCartValue: 1000, maxDiscountAmount: 99.9 });
  });

  it('a zero bound is no bound: left out on create, cleared (null) on update', () => {
    const fields = { ...base(), minCartValue: '0', maxDiscountAmount: '0,00' };
    expect(buildDiscountPayload(fields)).toMatchObject({ minCartValue: undefined, maxDiscountAmount: undefined });
    expect(buildDiscountPayload(fields, true)).toMatchObject({ minCartValue: null, maxDiscountAmount: null });
  });
});

describe('buildDiscountPayload — güncelleme (PATCH): temizlenen alanlar null', () => {
  it('bogo -> yüzde: buyQuantity/getQuantity null gider (sunucuda eski değer kalmaz)', () => {
    const p = buildDiscountPayload({ ...base(), type: 'percentage', buyQuantity: '2', getQuantity: '1' }, true);
    expect(p.buyQuantity).toBeNull();
    expect(p.getQuantity).toBeNull();
    expect(p.minQuantity).toBeNull();
  });
  it('yüzde -> bulk: kod null (kodsuz-otomatik), minQuantity sayı; bogo alanları null', () => {
    const p = buildDiscountPayload({ ...base(), type: 'bulk_quantity', code: 'ESKI', minQuantity: '3', value: '15' }, true);
    expect(p.code).toBeNull();
    expect(p.minQuantity).toBe(3);
    expect(p.buyQuantity).toBeNull();
    expect(p.getQuantity).toBeNull();
  });
  it('boşaltılan isteğe bağlı alanlar null gider; dolu olanlar sayı', () => {
    const p = buildDiscountPayload({ ...base(), description: ' ', minCartValue: '', maxDiscountAmount: '50', usageLimitTotal: '' }, true);
    expect(p.description).toBeNull();
    expect(p.minCartValue).toBeNull();
    expect(p.usageLimitTotal).toBeNull();
    expect(p.maxDiscountAmount).toBe(50);
  });
  it('oluşturmada aynı alanlar null DEĞİL undefined (alan hiç gönderilmez)', () => {
    const p = buildDiscountPayload({ ...base(), type: 'percentage', buyQuantity: '2' });
    expect(p.buyQuantity).toBeUndefined();
    expect(p.minCartValue).toBeUndefined();
    expect(JSON.stringify(p)).not.toContain('null');
  });
  it('kod gerektiren türde dolu kod PATCH te de gider', () => {
    expect(buildDiscountPayload({ ...base(), code: ' yaz10 ' }, true).code).toBe('yaz10');
  });
});

describe('gösterim', () => {
  const t = (k: string, p?: Record<string, string | number>) => `${k}:${JSON.stringify(p)}`;
  const d = (o: Partial<Discount>) => ({ value: 0, type: 'percentage', ...o }) as Discount;
  it('valueLabel', () => {
    expect(valueLabel(d({ type: 'bogo', buyQuantity: 2, getQuantity: 1 }))).toBe('2+1');
    expect(valueLabel(d({ type: 'bulk_quantity', value: 15 }))).toBe('%15');
    expect(valueLabel(d({ type: 'percentage', value: 10 }))).toBe('%10');
  });
  it('quantitySummary yalnız adet koşullu türlerde', () => {
    expect(quantitySummary(d({ type: 'bogo', buyQuantity: 2, getQuantity: 1 }), t)).toContain('discount.bogoSummary');
    expect(quantitySummary(d({ type: 'bulk_quantity', minQuantity: 3, value: 15 }), t)).toContain('discount.bulkSummary');
    expect(quantitySummary(d({ type: 'percentage' }), t)).toBeNull();
  });
});

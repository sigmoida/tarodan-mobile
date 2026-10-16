/** Karşı teklif şemaları: admin fiyat tabanı (`floor`) alt sınırı. */
import i18n from '@/i18n/config';
import { buyerCounterSchema, sellerCounterSchema } from '../schema';

const t = i18n.getFixedT('tr');
const msg = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? null : r.error!.issues[0].message;

describe('sellerCounterSchema + taban', () => {
  const schema = sellerCounterSchema(100, 400, t, 250);

  it('taban altı reddedilir', () => {
    expect(msg(schema.safeParse({ amount: '200' }))).toBe('Karşı teklif en az 250,00 TL olmalıdır.');
  });

  it('taban ve üstü (ilan fiyatına kadar) geçer', () => {
    expect(schema.safeParse({ amount: '250' }).success).toBe(true);
    expect(schema.safeParse({ amount: '400' }).success).toBe(true);
  });

  it('taban yoksa eski kural aynen', () => {
    const plain = sellerCounterSchema(100, 400, t);
    expect(plain.safeParse({ amount: '101' }).success).toBe(true);
    expect(plain.safeParse({ amount: '99' }).success).toBe(false);
  });
});

describe('buyerCounterSchema + taban', () => {
  const schema = buyerCounterSchema(400, t, 250);

  it('taban altı reddedilir; taban ile satıcı tutarı arası geçer', () => {
    expect(msg(schema.safeParse({ amount: '249' }))).toBe('Karşı teklif en az 250,00 TL olmalıdır.');
    expect(schema.safeParse({ amount: '250' }).success).toBe(true);
    expect(schema.safeParse({ amount: '399' }).success).toBe(true);
  });

  it('satıcı tutarından düşük olma kuralı korunur', () => {
    expect(schema.safeParse({ amount: '400' }).success).toBe(false);
  });

  it('taban yoksa eski kural', () => {
    expect(buyerCounterSchema(400, t).safeParse({ amount: '10' }).success).toBe(true);
  });
});

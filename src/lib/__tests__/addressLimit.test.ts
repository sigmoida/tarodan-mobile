/** Adres limiti tek kaynak: sunucu 3 (user-address.service.ts); API değeri varsa o; sınırsız/bilinmeyen → Infinity. */
import { SERVER_MAX_ADDRESSES, resolveMaxAddresses } from '../addressLimit';

describe('resolveMaxAddresses', () => {
  it('değer yoksa sunucu limiti (3)', () => {
    expect(SERVER_MAX_ADDRESSES).toBe(3);
    expect(resolveMaxAddresses(undefined)).toBe(3);
    expect(resolveMaxAddresses(null)).toBe(3);
  });

  it('API değeri varsa onu kullanır', () => {
    expect(resolveMaxAddresses(5)).toBe(5);
  });

  it('sınırsız / geçersiz → Infinity (sayaç gizlenir)', () => {
    expect(resolveMaxAddresses(-1)).toBe(Infinity);
    expect(resolveMaxAddresses(0)).toBe(Infinity);
    expect(resolveMaxAddresses(Number.NaN)).toBe(Infinity);
  });
});

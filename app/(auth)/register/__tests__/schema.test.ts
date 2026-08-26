/**
 * `username` alanı — API 2026-07-30'dan beri `RegisterDto`de zorunlu.
 * Kural: 3-30 karakter, `^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$`, girişte küçük harfe
 * çevrilir. Regex anlamı: baş/son karakter harf/rakam olmalı — ortada nokta/alt
 * çizgi serbest (bkz. task brief + `_lib/schema.ts`).
 *
 * `usernameSchema`'nın kendi sınır testleri artık tek kaynağın yanında:
 * `src/utils/__tests__/validation.test.ts`. Burada yalnız `registerSchema`
 * entegrasyonu doğrulanır.
 */
import { buildRegisterSchema } from '../_lib/schema';
import { schemaT } from '@/test-utils';

// Şema artık `t`'yi argüman alan bir FABRİKA (gerekçe:
// `@/utils/validation` başı). Testler kuralları sınıyor, çeviriyi değil.
const registerSchema = buildRegisterSchema(schemaT);

const validRest = {
  displayName: 'Test Kullanıcı',
  email: 'test@demo.com',
  birthDate: '1990-01-01',
  password: 'Demo1234',
  confirmPassword: 'Demo1234',
  acceptTerms: true as const,
};

describe('registerSchema — username entegrasyonu', () => {
  it('geçerli username ile birlikte tüm form geçerli olur', () => {
    const result = registerSchema.safeParse({ ...validRest, username: 'Gorkem.Test' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.username).toBe('gorkem.test');
  });

  it('geçersiz username tüm formu reddettirir', () => {
    const result = registerSchema.safeParse({ ...validRest, username: 'ab' });
    expect(result.success).toBe(false);
  });

  it('username eksikse form reddedilir (API 400 parite — alan zorunlu)', () => {
    const { username: _drop, ...rest } = { ...validRest, username: 'gorkem' };
    const result = registerSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

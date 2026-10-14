import { firstPasswordViolation, passwordChecks } from '../passwordPolicy';

describe('passwordPolicy (sunucu ile birebir)', () => {
  it.each(['Şifre123!', 'ĞÜŞİÖÇ12ab', 'Demo1234', 'Yeni12345'])('geçerli: %s', (pw) => {
    expect(firstPasswordViolation(pw)).toBeNull();
  });

  it('72 sınırı dahil, 73 reddedilir', () => {
    expect(firstPasswordViolation(`Aa1${'x'.repeat(69)}`)).toBeNull();
    expect(firstPasswordViolation(`Aa1${'x'.repeat(70)}`)).toBe('max');
  });

  it('ihlaller', () => {
    expect(firstPasswordViolation('Ab1')).toBe('min');
    expect(firstPasswordViolation('demo1234')).toBe('uppercase');
    expect(firstPasswordViolation('DEMO1234')).toBe('lowercase');
    expect(firstPasswordViolation('Demoabcd')).toBe('number');
  });

  it('Türkçe harfler büyük/küçük sayılır', () => {
    expect(passwordChecks('şİ123456')).toMatchObject({ hasUppercase: true, hasLowercase: true });
  });
});

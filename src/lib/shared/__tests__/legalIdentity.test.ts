/**
 * B-2.4 · Vendored kimlik kuralları (`@tarodan/types/legal-identity.ts` kopyası).
 * Sunucu doğrulayıcıları aynı fonksiyonları çağırır; burada kopyanın kaynakla
 * aynı davrandığı örneklerle sabitlenir.
 */
import {
  isValidLegalName,
  isValidTckn,
  maskTckn,
  missingLegalIdentityFields,
  normalizeLegalName,
  normalizeTckn,
} from '../legalIdentity';

describe('legalIdentity (vendored)', () => {
  it('TCKN: algoritmaya uyan 11 hane geçer; biçim karakterleri atılır', () => {
    expect(isValidTckn('10000000146')).toBe(true);
    expect(isValidTckn('100 000 001-46')).toBe(true);
    expect(normalizeTckn(' 100.000.001-46 ')).toBe('10000000146');
  });

  it('TCKN: kısa/uzun, 0 ile başlayan ya da checksum hatalı numara geçmez', () => {
    expect(isValidTckn('1000000014')).toBe(false);
    expect(isValidTckn('100000001460')).toBe(false);
    expect(isValidTckn('01000000146')).toBe(false);
    expect(isValidTckn('12345678901')).toBe(false);
    expect(isValidTckn('10000000147')).toBe(false);
    expect(isValidTckn(null)).toBe(false);
  });

  it('ad: Türkçe harf, tek boşluk/tire/kesme; rakam ve 1 karakter geçmez', () => {
    expect(isValidLegalName('Ayşe Nur')).toBe(true);
    expect(isValidLegalName('Öz-Demir')).toBe(true);
    expect(isValidLegalName("D'Angelo")).toBe(true);
    expect(isValidLegalName('İğdeli')).toBe(true);
    expect(isValidLegalName('A')).toBe(false);
    expect(isValidLegalName('Ayşe2')).toBe(false);
    expect(isValidLegalName('Ayşe.')).toBe(false);
    expect(normalizeLegalName('  Ayşe   Nur ')).toBe('Ayşe Nur');
  });

  it('maske yalnız son iki haneyi gösterir; eksik alanlar sırayla', () => {
    expect(maskTckn('10000000146')).toBe('•••••••••46');
    expect(maskTckn('')).toBeNull();
    expect(missingLegalIdentityFields({ legalFirstName: 'A', legalLastName: ' ', nationalId: null })).toEqual([
      'legalLastName',
      'nationalId',
    ]);
  });
});

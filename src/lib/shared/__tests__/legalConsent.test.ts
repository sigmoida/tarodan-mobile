/**
 * B-2.3 · Onay kataloğunun saf kuralları (web `lib/consentGate.ts` +
 * `(auth)/_lib/auth.ts registrationConsentDocuments` ile aynı).
 */
import {
  canSubmitConsents,
  consentCheckKey,
  isLegalTextPath,
  legalRouteFor,
  registrationConsentDocuments,
  type PendingConsent,
} from '../legalConsent';

const p = (document: PendingConsent['document']): PendingConsent => ({
  document,
  version: 'v',
  reason: 'missing',
  path: null,
});

describe('legalConsent', () => {
  it('kayıt kutuları → acceptedConsents', () => {
    expect(registrationConsentDocuments({ acceptTerms: true, acceptKvkk: true })).toEqual([
      'terms',
      'privacy',
      'kvkk',
    ]);
    expect(registrationConsentDocuments({ acceptTerms: true, acceptKvkk: false })).toEqual([
      'terms',
      'privacy',
    ]);
    expect(registrationConsentDocuments({ acceptTerms: false, acceptKvkk: true })).toEqual(['kvkk']);
  });

  it('kapı ancak bekleyenlerin hepsi (sürümüyle) işaretliyken gönderilebilir', () => {
    const pending = [p('terms'), p('kvkk')];
    expect(canSubmitConsents(pending, new Set())).toBe(false);
    expect(canSubmitConsents(pending, new Set(['terms@v']))).toBe(false);
    expect(canSubmitConsents(pending, new Set(['terms@v', 'kvkk@v']))).toBe(true);
    expect(canSubmitConsents([], new Set(['terms@v']))).toBe(false);
  });

  it('işaret sürüme bağlı: eski sürümün işareti yeni sürümü karşılamaz', () => {
    const v2: PendingConsent = { ...p('terms'), version: 'v2' };
    expect(consentCheckKey(v2)).toBe('terms@v2');
    expect(canSubmitConsents([v2], new Set(['terms@v']))).toBe(false);
    expect(canSubmitConsents([v2], new Set(['terms']))).toBe(false);
    expect(canSubmitConsents([v2], new Set(['terms@v2']))).toBe(true);
  });

  it('web yolu → uygulama içi rota; bilinmeyen yol bağlantısız', () => {
    expect(legalRouteFor('/terms')).toBe('/terms');
    expect(legalRouteFor('/privacy')).toBe('/privacy');
    expect(legalRouteFor('/kvkk')).toBeNull();
    expect(legalRouteFor(null)).toBeNull();
  });

  it('yasal metin sayfaları kapıdan muaf', () => {
    expect(isLegalTextPath('/terms')).toBe(true);
    expect(isLegalTextPath('/privacy')).toBe(true);
    expect(isLegalTextPath('/')).toBe(false);
    expect(isLegalTextPath('/terms-of-sale')).toBe(false);
    expect(isLegalTextPath(null)).toBe(false);
  });
});

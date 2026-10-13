/**
 * B-2.3 · Onay kataloğunun saf kuralları (web `lib/consentGate.ts` +
 * `(auth)/_lib/auth.ts registrationConsentDocuments` ile aynı).
 */
import {
  canSubmitConsents,
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

  it('kapı ancak bekleyenlerin hepsi işaretliyken gönderilebilir', () => {
    const pending = [p('terms'), p('kvkk')];
    expect(canSubmitConsents(pending, new Set())).toBe(false);
    expect(canSubmitConsents(pending, new Set(['terms']))).toBe(false);
    expect(canSubmitConsents(pending, new Set(['terms', 'kvkk']))).toBe(true);
    expect(canSubmitConsents([], new Set(['terms']))).toBe(false);
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

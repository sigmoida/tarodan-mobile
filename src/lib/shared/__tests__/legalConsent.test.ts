/**
 * B-2.3 · Onay kataloğunun saf kuralları (web `lib/consentGate.ts` +
 * `(auth)/_lib/auth.ts registrationConsentDocuments` ile aynı).
 */
import tr from '@/i18n/lib/catalog/tr.json';
import en from '@/i18n/lib/catalog/en.json';
import {
  CONSENT_DOCUMENT_I18N_KEYS,
  CONSENT_DOCUMENT_KEYS,
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
    expect(legalRouteFor('/seller-agreement')).toBe('/seller-agreement');
    expect(legalRouteFor('/kvkk')).toBeNull();
    expect(legalRouteFor('/about')).toBeNull();
    expect(legalRouteFor(null)).toBeNull();
  });

  it('yasal metin sayfaları kapıdan muaf', () => {
    expect(isLegalTextPath('/terms')).toBe(true);
    expect(isLegalTextPath('/privacy')).toBe(true);
    // Altı yasal belgenin hepsi (WebView yalnız `/app/*`'da kalır, kaçış yolu yok).
    expect(isLegalTextPath('/distance-sales')).toBe(true);
    expect(isLegalTextPath('/cookies')).toBe(true);
    expect(isLegalTextPath('/seller-agreement')).toBe(true);
    expect(isLegalTextPath('/refund-policy')).toBe(true);
    expect(isLegalTextPath('/in-app-web')).toBe(false);
    expect(isLegalTextPath('/')).toBe(false);
    expect(isLegalTextPath('/terms-of-sale')).toBe(false);
    expect(isLegalTextPath(null)).toBe(false);
  });

  it('mirrors the 8 document keys of @tarodan/types, each with a title in both catalogs', () => {
    expect(CONSENT_DOCUMENT_KEYS).toEqual([
      'terms',
      'privacy',
      'kvkk',
      'distance_sales',
      'cookies',
      'marketing',
      'platform_service_sales',
      'withdrawal_waiver',
    ]);
    const get = (catalog: unknown, key: string) =>
      key.split('.').reduce<unknown>((cur, part) => (cur as Record<string, unknown> | undefined)?.[part], catalog);
    for (const key of CONSENT_DOCUMENT_KEYS) {
      expect(typeof get(tr, CONSENT_DOCUMENT_I18N_KEYS[key])).toBe('string');
      expect(typeof get(en, CONSENT_DOCUMENT_I18N_KEYS[key])).toBe('string');
    }
  });
});

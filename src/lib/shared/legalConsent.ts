/**
 * Hukuki onay kataloğu — `tarodan-app/packages/types/src/legal-consent.ts`
 * dosyasının mobilin ihtiyaç duyduğu kısmı (belge anahtarları, hangilerinin
 * hesap için zorunlu olduğu, metin yolları, `GET /consents/me/pending`
 * sözleşmesi). Kaynakla birebir tutulmalı: sürüm ve kanıt sunucuda
 * damgalanır, istemci yalnız "kabul ettim" der. Bu yüzden SÜRÜM numaraları
 * burada TUTULMAZ; kapıyı açan bilgi (hangi belge, hangi sürüm) her zaman
 * sunucudan gelir.
 */

export const CONSENT_DOCUMENT_KEYS = [
  'terms',
  'privacy',
  'kvkk',
  'distance_sales',
  'cookies',
  'marketing',
] as const;

export type ConsentDocumentKey = (typeof CONSENT_DOCUMENT_KEYS)[number];

/** Yeniden-onay sebebi: hiç kaydı yok mu, yoksa eski sürümü mü onaylamış. */
export type PendingConsentReason = 'missing' | 'outdated';

export interface PendingConsent {
  document: ConsentDocumentKey;
  /** Onaylanması istenen (yürürlükteki) sürüm. */
  version: string;
  reason: PendingConsentReason;
  /** Metnin web yolu (`/terms`, `/privacy`…); metni olmayan belgede null. */
  path: string | null;
}

/** `GET /consents/me/pending` ve `POST /consents/me/accept` yanıtı. Boş liste = kapı açık. */
export interface PendingConsentsResponse {
  pending: PendingConsent[];
}

/**
 * Belge adı için katalog anahtarı (web `CONSENT_DOCUMENT_I18N_KEYS` ile aynı
 * anahtarlar).
 */
export const CONSENT_DOCUMENT_I18N_KEYS = {
  terms: 'legal.termsTitle',
  privacy: 'legal.privacyTitle',
  kvkk: 'legal.kvkkTitle',
  distance_sales: 'legal.distanceSalesTitle',
  cookies: 'legal.cookiesTitle',
  marketing: 'legal.marketingConsentTitle',
} as const satisfies Record<ConsentDocumentKey, string>;

/**
 * Metin yolu → uygulama içi rota. Web yolları mobil rotalarla aynı adı taşıyor
 * (`app/terms.tsx`, `app/privacy.tsx`, …); KVKK'nın ayrı sayfası yok, web gibi
 * `/privacy`'ye gider (yol sunucudan gelir). Bilinmeyen bir yol null döner ve
 * belge adı bağlantısız çizilir.
 */
const IN_APP_LEGAL_ROUTES = ['/terms', '/privacy', '/distance-sales', '/cookies'] as const;
export type LegalRoute = (typeof IN_APP_LEGAL_ROUTES)[number];

export function legalRouteFor(path: string | null | undefined): LegalRoute | null {
  if (!path) return null;
  return (IN_APP_LEGAL_ROUTES as readonly string[]).includes(path) ? (path as LegalRoute) : null;
}

/** Zorunlu adım kapısının gösterilmediği yollar: onaylanacak metinlerin sayfaları. */
export function isLegalTextPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return IN_APP_LEGAL_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Bir onay kutusunun kimliği: belge + SÜRÜM (`terms@2026-08-05`). İşaret
 * sürüme bağlıdır: kapı açıkken (ör. ön plana dönüşte) belgenin yeni sürümü
 * gelirse kullanıcının eski sürüme koyduğu işaret yenisine geçmez; yeni metin
 * yeniden işaretlenmeden gönderilemez.
 */
export function consentCheckKey(p: Pick<PendingConsent, 'document' | 'version'>): string {
  return `${p.document}@${p.version}`;
}

/**
 * Kapı ancak bekleyen belgelerin HEPSİ, bekledikleri sürümle işaretlenince
 * gönderilebilir (web `canSubmitConsents`; mobilde anahtar `consentCheckKey`).
 */
export function canSubmitConsents(
  pending: readonly PendingConsent[],
  checked: ReadonlySet<string>,
): boolean {
  return pending.length > 0 && pending.every((p) => checked.has(consentCheckKey(p)));
}

/**
 * Kayıt formundaki kutular → `acceptedConsents` (web `registrationConsentDocuments`).
 * Kullanım şartları kutusu iki belgeyi (şartlar + gizlilik) kapsar, KVKK ayrı kutudur.
 */
export function registrationConsentDocuments(values: {
  acceptTerms: boolean;
  acceptKvkk: boolean;
}): ConsentDocumentKey[] {
  return [
    ...(values.acceptTerms ? (['terms', 'privacy'] as const) : []),
    ...(values.acceptKvkk ? (['kvkk'] as const) : []),
  ];
}

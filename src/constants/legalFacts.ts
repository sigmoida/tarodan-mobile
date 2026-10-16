/**
 * Native kalan ekranların (İletişim, Yardım/SSS, destek formu) ortak kullandığı
 * kanonik künye ve iletişim bilgileri — tek doğruluk kaynağı; ekranlar bu
 * sabitleri import eder, değer birbirinden ayrışamaz.
 *
 * Yasal belgelerin (koşullar, gizlilik, mesafeli satış, çerez, satıcı
 * sözleşmesi, iade politikası) metni mobilde tutulmaz: ekranlar web'in uygulama
 * modu sayfasını WebView'de gösterir (`@/lib/legal/webDocs`). İade süresi gibi
 * politika değerleri admin'den gelir (`useTimingValues`).
 *
 * Gerçek bir destek telefonu / WhatsApp hattı henüz tanımlı değildir. Eskiden
 * "0850 XXX XX XX" yer tutucusu vardı ve düğmeler uydurma numaraları arıyordu
 * (Apple 2.1/2.3 yer tutucu içerik). Gerçek hat gelince buraya sabit olarak
 * eklenip Yardım/İletişim ekranlarına geri bağlanmalı.
 */

/**
 * Hukuki künye — ana repodaki TEK KAYNAĞIN kopyası:
 * `apps/web/src/lib/legal/platform-entity.ts` (origin/development).
 *
 * Değerler burada DÜZENLENMEZ. Tüzel kişi bilgisi değişirse önce orada
 * değişir, sonra buraya kopyalanır — iki yerde bağımsız düzenlenen bir künye
 * tam olarak bu kusuru doğurdu.
 */
export const LEGAL_ENTITY = {
  brand: 'TARODAN',
  legalName:
    'Serhatlar Oyuncak Temizlik Gıda Maddeleri İnşaat Sanayi ve Ticaret Limited Şirketi',
  /** Sözleşme metnindeki haliyle: vergi/MERSİS numarası ve bağlı olunan yer. */
  taxRegistration: '7620277268 – Torbalı / İZMİR',
  address: 'Yenişehir Mah. 1145/2 No:3 Torbalı / İZMİR',
  phone: '0 232 433 41 42',
  email: 'destek@tarodan.com.tr',
  kep: 'serhatlaroyuncak@hs03.kep.tr',
  website: 'www.tarodan.com.tr',
} as const;

/** Genel destek e-postası (web ile birebir aynı, LEGAL_ENTITY.email ile eşleşir). */
export const SUPPORT_EMAIL = 'destek@tarodan.com.tr';

/**
 * Statik bilgi / legal sayfalarının ortak kullandığı kanonik politika ve iletişim
 * bilgileri (faq, help, refund-policy, returns-exchanges, contact, distance-sales,
 * seller-agreement, buyer-protection, platform-hizmet-bedeli, terms, privacy ...).
 *
 * Bu değerler eskiden 10+ sayfaya elle kopyalanıyor ve birbiriyle çelişiyordu
 * (iade süresi 7 vs 14 gün, komisyon %5/%3/%2, her sayfada farklı sahte telefon).
 * Tek doğruluk kaynağı burasıdır; sayfalar bu sabitleri import eder, böylece değer
 * tekrar birbirinden ayrışamaz.
 *
 * Doğrulanmış kaynaklar:
 * - Hukuki metinlerdeki iade süresi 14 gün (Mesafeli Sözleşmeler Yönetmeliği asgarisi;
 *   web'in hukuki metinleri de sabit). Uygulamanın GERÇEK iade penceresi admin'den
 *   yönetilir (`GET /timing-rules` → `returnWindowDays`, teslimde siparişe
 *   `returnWindowEndsAt` olarak damgalanır); ekranlar `useTimingValues` kullanır.
 * - Komisyon DB-driven (CommissionRule), %5'ten başlar; sabit %3/%2 tier yoktur.
 * - Genel destek e-postası web ile birebir aynı: destek@tarodan.com.tr.
 * - Gerçek bir destek telefonu henüz tanımlı değildir; tüm sayfalarda tutarlı
 *   placeholder gösterilir, gerçek numara gelince yalnızca burası güncellenir.
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

// — İade süreleri (gün) —

/**
 * Hukuki metinlerdeki (mesafeli satış, iade politikası, iade/değişim) cayma süresi.
 * Backend'de artık sabit `COOLING_OFF_DAYS` yok: pencere admin'den yönetilen
 * `returnWindowDays` (asgari 14). Hukuki olmayan ekranlar (SSS, Yardım, sipariş
 * detayı) bu sabiti DEĞİL `useTimingValues().returnWindowDays`'i kullanır.
 */
export const RETURN_REQUEST_DAYS = 14;

/** İade ürünü satıcıya ulaştıktan sonra iade tutarının ödenme süresi. */
export const REFUND_PAYOUT_DAYS = 14;

/** Hasarlı / hatalı ürün için fotoğraflı bildirim süresi. */
export const DAMAGE_REPORT_DAYS = 3;

// — İletişim —

/** Genel destek e-postası (web ile birebir aynı, LEGAL_ENTITY.email ile eşleşir). */
export const SUPPORT_EMAIL = 'destek@tarodan.com.tr';

/**
 * Amaca özel posta kutuları — ayrı adreslerdir, çelişki değildir. Gerçek alan
 * adı `tarodan.com.tr`dir (`tarodan.com`'un MX kaydı yok); yerel kısımlar
 * (info/legal/privacy/...) LEGAL_ENTITY'nin dışındadır, yalnız TLD düzeltildi.
 */
export const COMPANY_INFO_EMAIL = 'info@tarodan.com.tr';
export const LEGAL_EMAIL = 'legal@tarodan.com.tr';
export const PRIVACY_EMAIL = 'privacy@tarodan.com.tr';
export const SELLER_SUPPORT_EMAIL = 'seller-support@tarodan.com.tr';
export const SECURITY_EMAIL = 'security@tarodan.com.tr';
export const IP_EMAIL = 'ip@tarodan.com.tr';

/**
 * Destek telefonu / WhatsApp hattı henüz YOK. Eskiden burada "0850 XXX XX XX"
 * yer tutucusu vardı ve düğmeler uydurma numaraları arıyordu (Apple 2.1/2.3
 * yer tutucu içerik). Gerçek hat gelince buraya sabit olarak eklenip
 * Yardım/İletişim ekranlarına geri bağlanmalı.
 */

// — Komisyon —

/**
 * Komisyonun kullanıcıya gösterilen açıklaması. Canlı komisyon DB-driven
 * (CommissionRule) olduğundan ve %5'ten başlayıp kategoriye / üyeliğe göre
 * değiştiğinden, sabit %5/%3/%2 tier metni yerine bu dürüst, aralık tabanlı
 * ifade kullanılır.
 */
export const COMMISSION_SUMMARY =
  "Satış tutarı üzerinden %5'ten başlayan platform komisyonu kesilir. " +
  "Komisyon oranı ürün kategorisine göre değişebilir ve Premium/Business üyelikte düşer. " +
  "Net oran satış sırasında gösterilir.";

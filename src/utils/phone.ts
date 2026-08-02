/**
 * Phone utilities — TEK KAYNAK (§5): ülke kodu listesi, alan formatlayıcısı ve
 * E.164 ayrıştırıcısı. Adres, checkout, profil ve kurumsal kayıt formlarının
 * tamamı buradan besleniyor; ayrı bir "route-local telefon" kopyası YOK.
 *
 * ## Neden bu dosya yeniden yazıldı
 *
 * Eski `formatPhoneNumber` on haneden fazlasını **sessizce KIRPIYOR**, eski
 * `normalizePhoneForPayload` da sonuca körü körüne ülke kodu ekliyordu. Sonuç:
 * `^\+90[0-9]{10}$` regex'ini geçen ama ULAŞILAMAZ numaralar, kullanıcıya
 * hiçbir hata gösterilmeden (ölçüldü):
 *
 *   `00905321234567` → `+900905321234`
 *   `+1 415 555 0100` → `+901415555010`
 *   `05321234567890` → `+905321234567`
 *
 * Bu yol kargo adresi ve iletişim telefonu topluyor; yanlış numara = kuryenin
 * ulaşamadığı teslimat. Yeni kural tek cümle:
 *
 * > Kullanıcının yazdığı numara sessizce başka bir numaraya DÖNÜŞMEZ.
 * > Ya geçerli olduğu gibi normalize edilir, ya reddedilir.
 */

export interface CountryCode {
  code: string;
  country: string;
  name: string;
}

export const countryCodes: CountryCode[] = [
  { code: '+90', country: 'TR', name: 'Türkiye' },
  { code: '+1', country: 'US', name: 'ABD/Kanada' },
  { code: '+44', country: 'GB', name: 'İngiltere' },
  { code: '+49', country: 'DE', name: 'Almanya' },
  { code: '+33', country: 'FR', name: 'Fransa' },
  { code: '+39', country: 'IT', name: 'İtalya' },
  { code: '+34', country: 'ES', name: 'İspanya' },
  { code: '+31', country: 'NL', name: 'Hollanda' },
  { code: '+32', country: 'BE', name: 'Belçika' },
  { code: '+41', country: 'CH', name: 'İsviçre' },
  { code: '+43', country: 'AT', name: 'Avusturya' },
  { code: '+46', country: 'SE', name: 'İsveç' },
  { code: '+47', country: 'NO', name: 'Norveç' },
  { code: '+45', country: 'DK', name: 'Danimarka' },
  { code: '+358', country: 'FI', name: 'Finlandiya' },
  { code: '+7', country: 'RU', name: 'Rusya' },
  { code: '+971', country: 'AE', name: 'BAE' },
  { code: '+966', country: 'SA', name: 'Suudi Arabistan' },
  { code: '+20', country: 'EG', name: 'Mısır' },
  { code: '+81', country: 'JP', name: 'Japonya' },
  { code: '+86', country: 'CN', name: 'Çin' },
  { code: '+82', country: 'KR', name: 'Güney Kore' },
  { code: '+61', country: 'AU', name: 'Avustralya' },
  { code: '+64', country: 'NZ', name: 'Yeni Zelanda' },
];

export const DEFAULT_COUNTRY_CODE = '+90';

/** Geçersiz TR numarası için TEK mesaj — şema, form ve `PhoneInput` aynısını gösterir. */
export const PHONE_INVALID_MESSAGE = 'Geçerli bir telefon numarası girin (5XX XXX XX XX)';

/** API sözleşmesi: `phone` / `contactPhone` alanları bu regex'e uyar. */
const TR_PHONE_REGEX = /^\+90[0-9]{10}$/;

/** Gruplanmış TR gösteriminin lokal hane sayısı (5XX XXX XX XX). */
const TR_LOCAL_DIGITS = 10;

/**
 * Girdinin başındaki **en fazla bir** `90` ülke kodu ve **en fazla bir** `0`
 * şehirlerarası öneki soyulur.
 *
 * ⚠️ `0090…` KARARI — bilerek çözülmez, reddedilir:
 * bir `90` ve bir `0` soyulduktan sonra `0090532…`'ten geriye `0532…`'nin değil
 * `905…`'in kalması gerekirdi; regex sırayla `90`? (eşleşmez, `00` ile başlıyor)
 * sonra `0`? (bir sıfır) soyar ve geriye `0905321234567` kalır — on haneli `5…`
 * değil, reddedilir. Gerekçe:
 *  1. Alanın yanında zaten `+90` ülke kodu seçili ve placeholder `5XX XXX XX XX`;
 *     `0090…` yazmak alanın sözleşmesini aşan bir ÇEVİRME öneki.
 *  2. Kabul etmek "kaç tane baştaki sıfırı soyayım?" sorusunu açar; her ek soyma
 *     kuralı bir numarayı sessizce BAŞKA bir numaraya çevirmenin yeni bir yolu
 *     olur (`000532…` yazım hatası da geçerli sanılırdı). Kural bu haliyle
 *     sınırlı ve denetlenebilir: en fazla bir `90`, en fazla bir `0`.
 *  3. Maliyet asimetrik: reddetmek kullanıcıya bir tuş vuruşuna mal olur ve
 *     Türkçe bir hata gösterir; kabul etmek yanlış tahminde ulaşılamaz bir
 *     teslimat telefonuna mal olur.
 * Karar UYGULAMA GENELİNDE tek: kurumsal kayıt, adres, profil ve checkout aynı
 * ayrıştırıcıyı çağırır (testle çivilendi).
 */
function stripTrPrefixes(digits: string): string {
  return digits.replace(/^(?:90)?0?/, '');
}

/**
 * Ham telefon girdisini E.164'e (`+905XXXXXXXXX`) çevirir; **çözemezse `null`**.
 * Kırpma yok — on haneye sığmayan girdi reddedilir, kısaltılmaz.
 */
export function parseE164TrPhone(raw: string | null | undefined): string | null {
  const local = stripTrPrefixes((raw ?? '').replace(/\D/g, ''));
  if (!/^5\d{9}$/.test(local)) return null;
  const e164 = `${DEFAULT_COUNTRY_CODE}${local}`;
  // API sözleşmesine karşı son kontrol.
  return TR_PHONE_REGEX.test(e164) ? e164 : null;
}

/**
 * ALAN formatlayıcısı — her tuş vuruşunda koşar, kullanıcı gönderilecek değeri
 * yazarken görür.
 *
 * TR'de baştaki `90` / `0` önekleri normalize edilir ve numara `5XX XXX XX XX`
 * biçiminde gruplanır. **On haneye sığmayan girdi KIRPILMAZ**: ham metin olduğu
 * gibi geri döner, böylece kullanıcı ne yazdığını görür ve doğrulama reddedebilir.
 * TR dışı ülke kodlarında davranış eskisiyle aynı: yalnız rakam-dışı temizlik.
 */
export function formatPhoneNumber(value: string, countryCode: string = DEFAULT_COUNTRY_CODE): string {
  const digits = value.replace(/\D/g, '');
  if (countryCode !== DEFAULT_COUNTRY_CODE) return digits;

  const local = stripTrPrefixes(digits);
  if (local.length > TR_LOCAL_DIGITS) return value;
  if (local.length <= 3) return local;
  if (local.length <= 6) return `${local.slice(0, 3)} ${local.slice(3)}`;
  if (local.length <= 8) return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8)}`;
}

/** `formatPhoneNumber`'ın TR'ye sabitlenmiş tek argümanlı hâli (`transform` prop'ları için). */
export function formatTrPhoneField(raw: string): string {
  return formatPhoneNumber(raw, DEFAULT_COUNTRY_CODE);
}

/** Telefon numarası zaten bir ülke kodu prefix'i içeriyor mu? */
export function hasCountryCodePrefix(phone: string): boolean {
  const clean = phone.replace(/\s/g, '');
  return countryCodes.some((cc) => clean.startsWith(cc.code));
}

/**
 * Payload için telefonu doğrular + normalize eder; **çözemezse `null`**.
 *
 * - `+90` seçiliyken sıkı TR ayrıştırma (`parseE164TrPhone`) — kırpma/tahmin yok.
 * - TR dışı ülke kodlarında DAVRANIŞ DEĞİŞMEDİ: boşluklar temizlenir, zaten ülke
 *   kodu varsa olduğu gibi döner, yoksa seçili kod prefix'lenir. Bu ülkeler için
 *   yerel numara planını bilmiyoruz; uydurma bir uzunluk kuralı koymak, düzeltmek
 *   istediğimiz "tahmin" hatasının aynısı olurdu.
 */
export function parsePhoneForPayload(
  phone: string | null | undefined,
  countryCode: string,
): string | null {
  const clean = (phone ?? '').replace(/\s/g, '');
  if (!clean) return null;
  if (countryCode === DEFAULT_COUNTRY_CODE) return parseE164TrPhone(clean);
  if (hasCountryCodePrefix(clean)) return clean;
  return countryCode + clean;
}

/** Alan girdisi seçili ülke kodu için gönderilebilir mi? (`PhoneInput`/form gate'leri) */
export function isValidPhoneInput(phone: string | null | undefined, countryCode: string): boolean {
  return parsePhoneForPayload(phone, countryCode) !== null;
}

/**
 * Payload için normalize edilmiş telefon; **çözemezse boş string**.
 *
 * ⚠️ Artık DOĞRULAR: geçersiz girdide eskiden olduğu gibi bozuk bir E.164
 * uydurmaz, `''` döner — böylece bozuk numara backend'e sızmaz. Hatayı KULLANICIYA
 * gösterebilmek için çağıran taraf `parsePhoneForPayload`/`isValidPhoneInput` ile
 * gönderimden ÖNCE kontrol etmeli; bu fonksiyon yalnızca son emniyet kemeridir.
 */
export function normalizePhoneForPayload(phone: string | undefined, countryCode: string): string {
  return parsePhoneForPayload(phone, countryCode) ?? '';
}

/**
 * Kayıtlı (muhtemelen "+90532…" formatındaki) numarayı ülke kodu + formatlı
 * lokal parçaya ayırır. Eşleşen kod yoksa varsayılan ülke kodu kabul edilir.
 */
export function splitPhone(full: string | undefined): { countryCode: string; phone: string } {
  const clean = (full ?? '').replace(/\s/g, '');
  // En uzun kod önce denenmeli (+9 yok ama +1 / +1X gibi çakışmalara karşı güvenli)
  const cc = [...countryCodes]
    .sort((a, b) => b.code.length - a.code.length)
    .find((c) => clean.startsWith(c.code));
  if (cc) return { countryCode: cc.code, phone: formatPhoneNumber(clean.slice(cc.code.length), cc.code) };
  return { countryCode: DEFAULT_COUNTRY_CODE, phone: formatPhoneNumber(clean, DEFAULT_COUNTRY_CODE) };
}

/** Ülke koduna göre tipik placeholder. */
export function getPhonePlaceholder(countryCode: string, fallback = 'Telefon'): string {
  return countryCode === DEFAULT_COUNTRY_CODE ? '5XX XXX XX XX' : fallback;
}

import { DEFAULT_COUNTRY_CODE, formatPhoneNumber } from '@/utils/phone';

/** API sözleşmesi: `BusinessRegisterDto.phone` / `contactPhone`. */
const TR_PHONE_REGEX = /^\+90[0-9]{10}$/;

/**
 * Girdinin başındaki **en fazla bir** `90` ülke kodu ve **en fazla bir** `0`
 * şehirlerarası öneki soyulur — TEK KAYNAK: hem alan formatlayıcısı hem şema
 * ayrıştırıcısı bunu kullanır, ikisi ayrışamaz.
 *
 * `0090…` (uluslararası çevirme öneki) bilerek çözülmez: bir `0` soyulduktan
 * sonra geriye `0905…` kalır, on haneli `5…` değildir, reddedilir. Onu `+90`'a
 * çevirmek girdiyi tahmin etmek olurdu; kullanıcı hatayı görüp düzeltsin.
 */
function stripTrPrefixes(digits: string): string {
  return digits.replace(/^(?:90)?0?/, '');
}

/**
 * Ham telefon girdisini E.164'e (`+905XXXXXXXXX`) çevirir; **çözemezse `null`**.
 *
 * ⚠️ Bilerek `formatPhoneNumber` KULLANMAZ: o bir ALAN formatlayıcısıdır ve on
 * haneden fazlasını kırpar. Şema seviyesinde kullanılınca bu sessiz KIRPMA
 * oluyordu — `00905321234567` → `+900905321234`, `+1 415 555 0100` →
 * `+901415555010`, `05321234567890` → `+905321234567`: `^\+90[0-9]{10}$`'a uyan
 * ama ULAŞILAMAZ numaralar, kullanıcıya hiçbir hata gösterilmeden. Burada kırpma
 * yok; birebir çözülemeyen girdi reddedilir.
 */
export function parseE164TrPhone(raw: string): string | null {
  const local = stripTrPrefixes(raw.replace(/\D/g, ''));
  if (!/^5\d{9}$/.test(local)) return null;
  const e164 = `${DEFAULT_COUNTRY_CODE}${local}`;
  // API sözleşmesine karşı son kontrol.
  return TR_PHONE_REGEX.test(e164) ? e164 : null;
}

/**
 * Alan formatlayıcısı — her tuş vuruşunda koşar, böylece kullanıcı GÖNDERİLECEK
 * değeri yazarken görür (eski formdaki `PhoneInput` davranışı).
 *
 * Paylaşılan `formatPhoneNumber` gruplamayı yapar, ama on haneden fazlasını
 * kırpar; bu formda kırpma yasak. Fazla haneli girdide ham metin olduğu gibi
 * bırakılır: kullanıcı yazdığını görür, şema da Türkçe hatayla reddeder.
 */
export function formatTrPhoneField(raw: string): string {
  if (stripTrPrefixes(raw.replace(/\D/g, '')).length > 10) return raw;
  return formatPhoneNumber(raw, DEFAULT_COUNTRY_CODE);
}

/**
 * Kargo çıkış adresi kapısı — saf kural (web `useDispatchAddress` ile aynı).
 *
 * Kargo sözleşmesi GÖNDERİCİYİ zorunlu tutar: adresi ya da geçerli cep numarası
 * olmayan satıcının siparişinde koli açılamaz ve sipariş sessizce kargosuz
 * kalır. Bu yüzden eksiklik satış anında değil, satıcı ilan verirken yakalanır.
 *
 * Seçim kuralı API ile BİREBİR aynı olmalı: varsayılan adres varsa o, yoksa
 * ilk kayıt (`addresses: { orderBy: { isDefault: 'desc' }, take: 1 }`). Farklı
 * seçersek kapı "tamam" derken taşıyıcıya başka bir adres gider.
 */

/** Kapı için gereken alanlar — tam adres modeli değil. */
export interface DispatchAddressCandidate {
  id?: string;
  phone?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  isDefault?: boolean;
}

export interface DispatchAddressStatus {
  /** Taşıyıcıya gönderilebilecek geçerli bir çıkış adresi var mı. */
  hasDispatchAddress: boolean;
  /** Kayıt VAR ama kullanılamaz — "ekle" değil "düzelt" denmeli. */
  needsFix: boolean;
}

/**
 * Saklanan/iletilen biçim: `+90` + 5 ile başlayan 10 haneli cep numarası
 * (`@tarodan/types` `TR_PHONE_E164`). Genel `^\+90\d{10}$` regex'i sabit hatları
 * (`+9021…`) da geçirir; taşıyıcı bunları göndericide reddeder.
 */
const TR_MOBILE_E164 = /^\+905\d{9}$/;

export function isValidDispatchPhone(value: string | null | undefined): boolean {
  return typeof value === 'string' && TR_MOBILE_E164.test(value);
}

export function pickDispatchAddress(
  list: readonly DispatchAddressCandidate[] | null | undefined,
): DispatchAddressCandidate | undefined {
  if (!list || list.length === 0) return undefined;
  return list.find((a) => a.isDefault) ?? list[0];
}

export function dispatchAddressStatus(
  list: readonly DispatchAddressCandidate[] | null | undefined,
): DispatchAddressStatus {
  const a = pickDispatchAddress(list);
  const hasDispatchAddress =
    !!a &&
    !!a.address?.trim() &&
    !!a.city?.trim() &&
    !!a.district?.trim() &&
    isValidDispatchPhone(a.phone);
  return { hasDispatchAddress, needsFix: !!a && !hasDispatchAddress };
}

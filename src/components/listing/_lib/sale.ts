/**
 * İlan indirimi — form durumu ↔ API payload'ı ve komisyon önizlemesinin hangi
 * fiyatla sorulacağı. Web `packages/listing-form/src/form/sale-data.ts` +
 * `NewListingContext` (`saleIsActive`) paritesi; saf, test edilebilir.
 *
 * Formdaki "Fiyat" indirim ÖNCESİ fiyattır; indirimli fiyat ondan küçükse
 * indirim uygulanır. Etkin fiyatı sunucu türetir — istemci yalnız önizleme
 * için "şu an hangi fiyattan satılır" sorusunu cevaplar.
 */

export interface SaleFields {
  /** Formdaki fiyat (indirim öncesi). */
  price: string;
  salePrice: string;
  /** `YYYY-MM-DD` (DateField) ya da boş. */
  saleStartDate: string;
  saleEndDate: string;
}

export interface SalePayload {
  originalPrice: number | null;
  salePrice: number | null;
  saleStartDate: string | null;
  saleEndDate: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

/** Yerel takvim günü → `YYYY-MM-DD` (DateField biçimi). */
export function toLocalDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Web `createEmptySaleData` varsayılanı: bugün başlar, 7 gün sürer. */
export function defaultSaleDates(now: Date = new Date()): { saleStartDate: string; saleEndDate: string } {
  return {
    saleStartDate: toLocalDay(now),
    saleEndDate: toLocalDay(new Date(now.getTime() + 7 * DAY_MS)),
  };
}

const asIso = (day: string): string | null => (day ? new Date(day).toISOString() : null);

/**
 * İndirim alanları — indirim yoksa hepsi `null` (sunucu varsa eskisini temizler).
 * `POST /products` de kabul ediyor; sunucu `salePrice < max(originalPrice, price)`
 * ise ürünü indirimli açar.
 */
export function salePayload({ price, salePrice, saleStartDate, saleEndDate }: SaleFields): SalePayload {
  const formPrice = Number(price);
  const sale = salePrice ? Number(salePrice) : 0;
  const hasSale = sale > 0 && formPrice > sale && sale !== formPrice;
  if (!hasSale) {
    return { originalPrice: null, salePrice: null, saleStartDate: null, saleEndDate: null };
  }
  return {
    originalPrice: formPrice,
    salePrice: sale,
    saleStartDate: asIso(saleStartDate),
    saleEndDate: asIso(saleEndDate),
  };
}

/** İndirim geçerli mi VE bugün başlangıç–bitiş penceresinde mi (web `saleIsActive`). */
export function isSaleActive(fields: SaleFields, now: number = Date.now()): boolean {
  const p = salePayload(fields);
  if (p.salePrice == null) return false;
  const startsAt = p.saleStartDate ? new Date(p.saleStartDate).getTime() : null;
  const endsAt = p.saleEndDate ? new Date(p.saleEndDate).getTime() : null;
  return (startsAt == null || now >= startsAt) && (endsAt == null || now <= endsAt);
}

/**
 * Geçerli bir indirim İLERİ bir tarihte başlıyorsa o gün (`YYYY-MM-DD`), aksi
 * halde `null` — formdaki "İndirim … tarihinde başlar" ipucu için.
 */
export function saleStartsLater(fields: SaleFields, now: number = Date.now()): string | null {
  const p = salePayload(fields);
  if (p.salePrice == null || !p.saleStartDate) return null;
  return new Date(p.saleStartDate).getTime() > now ? fields.saleStartDate : null;
}

/**
 * Komisyon önizlemesinin sorulacağı tutar: indirim BUGÜN geçerliyse indirimli
 * fiyat, değilse normal fiyat. Satıcının göreceği hak ediş, alıcının o an
 * ödeyeceği fiyattan hesaplanır.
 */
export function commissionPreviewAmount(fields: SaleFields, now: number = Date.now()): string {
  return isSaleActive(fields, now) ? String(Number(fields.salePrice)) : fields.price;
}

/** `YYYY-MM-DD` → yerel dilde uzun tarih ("21 Ekim 2026"); bozuk girdide aynen döner. */
export function formatSaleDay(day: string, locale: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return day;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

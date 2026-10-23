/**
 * Format helpers ported from apps/web/src/lib/format.ts.
 * Mobile uyumunu (parite) korumak için her fonksiyonun imzası ve davranışı web ile birebir aynıdır.
 */
import type { TFunction } from 'i18next';
import i18n from '@/i18n/config';

/**
 * Para biçimi dilden BAĞIMSIZ ve web (`packages/shared/src/money.ts`) ile
 * birebir aynı: "1.234,50 TL" — tr-TR ayraçları, her zaman 2 ondalık, ₺ yok.
 * Bu bir Türkiye pazaryeri; fiyat İngilizce arayüzde de aynı yazılır
 * (web'de de öyle). Intl örneği bir kez kurulur — pahalı olan kurulumdur.
 */
const tlNumberFmt = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Backend'den brand/scale/category bazen string ("AutoArt"), bazen obje ({id,name,slug}) gelir.
 * <Text> içine doğrudan koyulamayacağı için her iki şekli de string'e indirger.
 */
export function asLabel(value: unknown, fallback: string = ''): string {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const v = value as { name?: unknown; title?: unknown; slug?: unknown };
    if (typeof v.name === 'string') return v.name;
    if (typeof v.title === 'string') return v.title;
    if (typeof v.slug === 'string') return v.slug;
  }
  return fallback;
}

export function formatPrice(price: number | string | null | undefined): string {
  return `${formatPriceNumber(price)} TL`;
}

/**
 * "0,00 TL - 500,00 TL" — fiyat aralığı (filtre çipi / kayıtlı arama özeti).
 * Boş alt sınır 0, boş üst sınır "∞" sayılır.
 */
export function formatPriceRange(
  min: number | string | null | undefined,
  max: number | string | null | undefined,
): string {
  return `${formatPrice(min || 0)} - ${max ? formatPrice(max) : '∞'}`;
}

/** Sunucu tutarı henüz bilinmiyorken basılan yer tutucu. */
export const PRICE_PLACEHOLDER = '—';

/**
 * Sunucudan gelen bir para alanını KULLANILABİLİR bir sayıya indirger; alan
 * gerçek bir sayı DEĞİLSE `null`.
 *
 * Neden `Number(...)` yetmiyor: `Number(null)` = **0**, `Number('')` = **0**,
 * `Number(undefined)` = **NaN**. "Quote geldi mi?" kapısı (`summary != null`)
 * alanın kendisi hakkında hiçbir şey söylemez; sunucu bir gün `total: null`
 * döndürürse `Number(null)` sıfıra düşer, `total == null` kontrolü false olur ve
 * kullanıcı ETKİN bir "Onayla ve Öde (0,00 TL)" butonu görür. Kapı bu yüzden
 * alan seviyesinde: sayı değilse tutar YOK sayılır (yer tutucu + devre dışı buton).
 *
 * - `number` → sonlu ise aynen; `NaN` / `±Infinity` → `null`
 * - `-0` → `0` (işaretli sıfır ayrı bir tutar değil; "-0,00 TL" basılmaz)
 * - boş olmayan sayısal `string` → sayı (sunucu bir gün decimal'i string
 *   gönderirse tolere edilir); `''` / `'  '` / `'abc'` → `null`
 * - `null` / `undefined` / diğer her şey → `null`
 */
export function serverAmount(value: unknown): number | null {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : NaN;
  if (!Number.isFinite(n)) return null;
  return n === 0 ? 0 : n;
}

/**
 * Sunucu-yetkili tutar gösterimi.
 *
 * `formatPrice(null)` "0,00 TL", `formatPrice(NaN)` de "0,00 TL" döndürür — bu,
 * fiyat henüz yüklenmemişken ya da quote hata verdiğinde ekranda GERÇEKMİŞ gibi
 * duran bir sıfır bırakır (kullanıcı "Onayla ve Öde (0,00 TL)" görür). Sunucudan
 * gelen bir alan yoksa VEYA sayı değilse tutar yerine yer tutucu basılır —
 * istemcide sayı uydurulmaz.
 */
export function formatServerPrice(price: number | string | null | undefined): string {
  const amount = serverAmount(price);
  return amount == null ? PRICE_PLACEHOLDER : formatPrice(amount);
}

/** `formatPrice`'ın " TL" son eksiz hâli ("1.234,50"). */
export function formatPriceNumber(price: number | string | null | undefined): string {
  if (price === null || price === undefined) {
    return tlNumberFmt.format(0);
  }

  const numPrice = typeof price === 'string' ? parseFloat(price) : price;

  if (isNaN(numPrice)) {
    return tlNumberFmt.format(0);
  }

  return tlNumberFmt.format(numPrice);
}

// A star rating reads with the UI locale's decimal separator ("4,5" / "4.5").
const ratingFmts = new Map<string, Intl.NumberFormat>();
const ratingFmt = (locale: string): Intl.NumberFormat => {
  let fmt = ratingFmts.get(locale);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    ratingFmts.set(locale, fmt);
  }
  return fmt;
};

/**
 * A 0 to 5 review average with exactly one decimal in the UI locale: "4,5" (tr), "4.5" (en).
 * Web `formatRating` (`apps/web/src/lib/format.ts`). The seller trust score has its own
 * two-decimal `formatTrustRating` in `@/types/seller-trust`.
 */
export function formatRating(value: number, locale: string): string {
  return ratingFmt(locale).format(value);
}

/** Sayaç biçimi (görüntülenme/beğeni) — web `formatCount`: "1.590"; dil sabit tr-TR. */
export function formatCount(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('tr-TR');
}

// Varsayılan dil ARAYÜZ dili: eskiden sabit 'tr' idi ve ürün detayındaki durum
// rozeti İngilizce cihazda "Yeni Gibi" gösteriyordu.
export function formatCondition(
  condition: string | null | undefined,
  locale: string = i18n.language === 'en' ? 'en' : 'tr',
): string {
  if (!condition) return locale === 'en' ? 'Unknown' : 'Bilinmiyor';

  const conditionMap: Record<string, { tr: string; en: string }> = {
    'new': { tr: 'Yeni', en: 'New' },
    'like_new': { tr: 'Yeni Gibi', en: 'Like New' },
    'very_good': { tr: 'Çok İyi', en: 'Very Good' },
    'good': { tr: 'İyi', en: 'Good' },
    'fair': { tr: 'Orta', en: 'Fair' },
    'poor': { tr: 'Kötü', en: 'Poor' },
  };

  const normalized = condition.toLowerCase().trim();
  const mapped = conditionMap[normalized];

  if (mapped) {
    return locale === 'en' ? mapped.en : mapped.tr;
  }

  return condition.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

export function formatOrderStatus(status: string | null | undefined, locale: string = 'tr'): string {
  if (!status) return locale === 'en' ? 'Unknown' : 'Bilinmiyor';

  const statusMap: Record<string, { tr: string; en: string }> = {
    'pending_payment': { tr: 'Ödeme Bekleniyor', en: 'Pending Payment' },
    'paid': { tr: 'Ödeme Alındı', en: 'Paid' },
    'preparing': { tr: 'Hazırlanıyor', en: 'Preparing' },
    'shipped': { tr: 'Kargoya Verildi', en: 'Shipped' },
    'in_transit': { tr: 'Yolda', en: 'In Transit' },
    'out_for_delivery': { tr: 'Dağıtımda', en: 'Out for Delivery' },
    'delivered': { tr: 'Teslim Edildi', en: 'Delivered' },
    'awaiting_buyer_confirmation': { tr: 'Alıcı Onayı Bekleniyor', en: 'Awaiting Buyer Confirmation' },
    'completed': { tr: 'Tamamlandı', en: 'Completed' },
    'cancelled': { tr: 'İptal Edildi', en: 'Cancelled' },
    'refund_requested': { tr: 'İade Talep Edildi', en: 'Refund Requested' },
    'refunded': { tr: 'İade Edildi', en: 'Refunded' },
  };

  const normalized = status.toLowerCase().trim();
  const mapped = statusMap[normalized];

  if (mapped) {
    return locale === 'en' ? mapped.en : mapped.tr;
  }

  return status.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

export function formatProductStatus(status: string | null | undefined, locale: string = 'tr'): string {
  if (!status) return locale === 'en' ? 'Unknown' : 'Bilinmiyor';

  const statusMap: Record<string, { tr: string; en: string }> = {
    'pending': { tr: 'Onay Bekliyor', en: 'Pending' },
    'active': { tr: 'Aktif', en: 'Active' },
    'reserved': { tr: 'Rezerve', en: 'Reserved' },
    'sold': { tr: 'Satıldı', en: 'Sold' },
    'inactive': { tr: 'Pasif', en: 'Inactive' },
    'rejected': { tr: 'Reddedildi', en: 'Rejected' },
  };

  const normalized = status.toLowerCase().trim();
  const mapped = statusMap[normalized];

  if (mapped) {
    return locale === 'en' ? mapped.en : mapped.tr;
  }

  return status.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

export function formatShipmentStatus(status: string | null | undefined, locale: string = 'tr'): string {
  if (!status) return locale === 'en' ? 'Unknown' : 'Bilinmiyor';

  const statusMap: Record<string, { tr: string; en: string }> = {
    'pending': { tr: 'Beklemede', en: 'Pending' },
    'label_created': { tr: 'Etiket Oluşturuldu', en: 'Label Created' },
    'picked_up': { tr: 'Teslim Alındı', en: 'Picked Up' },
    'in_transit': { tr: 'Yolda', en: 'In Transit' },
    'out_for_delivery': { tr: 'Dağıtımda', en: 'Out for Delivery' },
    'delivered': { tr: 'Teslim Edildi', en: 'Delivered' },
    'returned': { tr: 'İade Edildi', en: 'Returned' },
    'failed': { tr: 'Başarısız', en: 'Failed' },
  };

  const normalized = status.toLowerCase().trim();
  const mapped = statusMap[normalized];

  if (mapped) {
    return locale === 'en' ? mapped.en : mapped.tr;
  }

  return status.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

export function formatTradeStatus(status: string | null | undefined, locale: string = 'tr'): string {
  if (!status) return locale === 'en' ? 'Unknown' : 'Bilinmiyor';

  const statusMap: Record<string, { tr: string; en: string }> = {
    'pending': { tr: 'Beklemede', en: 'Pending' },
    'accepted': { tr: 'Kabul Edildi', en: 'Accepted' },
    'rejected': { tr: 'Reddedildi', en: 'Rejected' },
    'cancelled': { tr: 'İptal Edildi', en: 'Cancelled' },
    'completed': { tr: 'Tamamlandı', en: 'Completed' },
    'in_progress': { tr: 'Devam Ediyor', en: 'In Progress' },
    'shipping': { tr: 'Kargo Aşamasında', en: 'Shipping' },
    'awaiting_confirmation': { tr: 'Onay Bekleniyor', en: 'Awaiting Confirmation' },
    'initiator_shipped': { tr: 'Gönderen Kargoya Verdi', en: 'Initiator Shipped' },
    'receiver_shipped': { tr: 'Alıcı Kargoya Verdi', en: 'Receiver Shipped' },
    'both_shipped': { tr: 'Her İki Taraf Kargoda', en: 'Both Shipped' },
    'initiator_received': { tr: 'Gönderen Teslim Aldı', en: 'Initiator Received' },
    'receiver_received': { tr: 'Alıcı Teslim Aldı', en: 'Receiver Received' },
    'disputed': { tr: 'Anlaşmazlık', en: 'Disputed' },
  };

  const normalized = status.toLowerCase().trim();
  const mapped = statusMap[normalized];

  if (mapped) {
    return locale === 'en' ? mapped.en : mapped.tr;
  }

  return status.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

export function formatOfferStatus(status: string | null | undefined, locale: string = 'tr'): string {
  if (!status) return locale === 'en' ? 'Unknown' : 'Bilinmiyor';

  const statusMap: Record<string, { tr: string; en: string }> = {
    'pending': { tr: 'Beklemede', en: 'Pending' },
    'accepted': { tr: 'Kabul Edildi', en: 'Accepted' },
    'rejected': { tr: 'Reddedildi', en: 'Rejected' },
    'expired': { tr: 'Süresi Doldu', en: 'Expired' },
    'cancelled': { tr: 'İptal Edildi', en: 'Cancelled' },
    'counter_offered': { tr: 'Karşı Teklif Yapıldı', en: 'Counter Offered' },
    'countered': { tr: 'Karşı Teklif Yapıldı', en: 'Countered' },
  };

  const normalized = status.toLowerCase().trim();
  const mapped = statusMap[normalized];

  if (mapped) {
    return locale === 'en' ? mapped.en : mapped.tr;
  }

  return status.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

/**
 * "12 Ekim 2026" — uygulamanın tek uzun tarih biçimi. Geçersiz/boş tarih → `null`
 * (çağıran satırı düşürür, çökmez); geçersiz yerel etiket → cihaz varsayılan yereli.
 */
export function formatLongDate(
  value: string | Date | null | undefined,
  locale: string,
): string | null {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return null;
  const options = { day: 'numeric', month: 'long', year: 'numeric' } as const;
  try {
    return date.toLocaleDateString(locale, options);
  } catch {
    return date.toLocaleDateString(undefined, options);
  }
}

/**
 * Relative date formatter: "2 saat önce", "3 gün önce", "tam tarih"
 *
 * `localeOrT` da bir `TFunction` verilirse (i18n-aware çağrı yerleri, örn.
 * bildirim satırı) katalogdan ICU plural'lı `time.relative.*` anahtarları
 * okunur — İngilizce "1 minute ago" / "2 minutes ago" ayrımı böyle doğru çıkar.
 * String bir locale ('tr'/'en') verilirse davranış DEĞİŞMEDİ: eski sabit
 * metinler (par-format-parity.test.ts bunu kilitliyor).
 */
export function formatRelativeDate(
  date: string | Date | null | undefined,
  // D10'un çevirmen aşırı yüklemesi + D13'ün aktif-dil varsayılanı birlikte:
  // çağıran `t` verebilir; vermezse metin AKTİF dile düşer, sabit 'tr'ye değil.
  localeOrT: string | TFunction = i18n.language,
): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (typeof localeOrT === 'function') {
    const t = localeOrT;
    if (diffSec < 60) return t('time.relative.justNow');
    if (diffMin < 60) return t('time.relative.minutes', { count: diffMin });
    if (diffHr < 24) return t('time.relative.hours', { count: diffHr });
    if (diffDay < 7) return t('time.relative.days', { count: diffDay });
    return formatLongDate(d, t('common.dateLocale'))!; // `d` yukarıda doğrulandı
  }

  const locale = localeOrT;
  if (locale === 'en') {
    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHr < 24) return `${diffHr} hr ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
    return formatLongDate(d, 'en-US')!;
  }

  if (diffSec < 60) return 'Az önce';
  if (diffMin < 60) return `${diffMin} dk önce`;
  if (diffHr < 24) return `${diffHr} sa önce`;
  if (diffDay < 7) return `${diffDay} gün önce`;
  return formatLongDate(d, 'tr-TR')!;
}

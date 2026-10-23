import { stripLocalePrefix } from '@/lib/deeplinks';
import { ownWebHosts } from '@/lib/web';
import { parseStrictUrl } from '@/lib/security/url';
import { inAppWebHref, resolveRemovedPage } from '@/lib/navigation/removedPages';
import { listingsToSearchHref } from '@/lib/navigation/searchHref';
import { listingIdFromParam } from '@/lib/product/listingParam';

/**
 * Backend `link` alanları WEB rotaları için interpole ediliyor (ör.
 * /listings/:id, /trades/:id, /messages?thread=:id). Mobil expo-router
 * rotaları farklı olduğundan link'i mobil rotaya çeviriyoruz. Eşleşme yoksa
 * null döner → çağıran taraf data tabanlı fallback'e düşer.
 *
 * Hem uygulama içi bildirim listesi (app/notifications/index.tsx) hem de
 * push bildirimi tap handler'ı (src/services/push.ts) bu fonksiyonu kullanır;
 * aksi halde push ile gelen /messages?thread=<id> mobilde geçersiz rota olup
 * boş ekran açıyordu.
 */
/**
 * Uygulamanın kimlik/slug biçimi: UUID, sayı, `a-z0-9_-` slug. Bildirim/push linki
 * sunucu verisi ama karşı tarafın girdisini taşıyabilir; çözülmüş değer expo-router
 * parametresi olarak API yoluna girer (`x/../../offers/<id>/accept` gibi bir kimlik
 * isteği başka uca yönlendirebiliyordu). Biçime uymayan değer rotaya hiç girmez.
 */
const SAFE_ROUTE_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

export function isSafeRouteId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_ROUTE_ID_RE.test(value);
}

/** Yol segmenti üst sınırı (çözülmüş uzunluk): kimlik/slug için fazlasıyla yeterli. */
const MAX_SEGMENT_LENGTH = 128;
/** Slug karakterleri: Unicode harf/rakam + `._~:@-` (Türkçe slug, e-posta benzeri token, sürüm noktası). */
const SAFE_SEGMENT_RE = /^[\p{L}\p{N}._~:@-]+$/u;
// Yol ayracı ve kontrol karakterleri (izinli kümede zaten yok; açık yedek savunma).
// eslint-disable-next-line no-control-regex
const PATH_BREAK_RE = /[\\/\u0000-\u001f\u007f]/;

/**
 * Bir YOL SEGMENTİ rota parametresi olarak ekrana, oradan `apiPath` ile (segment başına
 * kodlanarak) API yoluna gider; tehlikeli olan yalnız yol kaçışıdır. Bu yüzden kimlik biçimini
 * (`isSafeRouteId`) dayatmak yerine yalnız şunları reddederiz: bozuk kodlama, boş / `.` / `..`,
 * `/` `\` (kodlanmış `%2F` dahil) ve kontrol karakteri içeren, aşırı uzun ya da izinli küme
 * dışı (boşluk, `?`, `#`, `%`…) segmentler. Kimlik biçimi yalnız kimlik bekleyen rotalarda ayrıca
 * aranır (`isIdSegment`, bkz. `toMobileRoute`).
 */
export function isSafePathSegment(raw: string): boolean {
  if (!raw) return false;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return false;
  }
  if (!decoded || decoded === '.' || decoded === '..') return false;
  if (decoded.length > MAX_SEGMENT_LENGTH) return false;
  if (PATH_BREAK_RE.test(decoded)) return false;
  return SAFE_SEGMENT_RE.test(decoded);
}

/** Kimlik bekleyen yol segmenti: çözülmüş hâli kimlik biçimine (`isSafeRouteId`) uymalı. */
function isIdSegment(raw: string | undefined): boolean {
  return decodeSafeRouteId(raw) !== null;
}

/** Yüzde kodlu sorgu değerini çözer; bozuk kodlama ya da biçim dışı kimlik → null. */
function decodeSafeRouteId(raw: string | undefined): string | null {
  if (!raw) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return isSafeRouteId(decoded) ? decoded : null;
}

/** Web `/profile/<bölüm>` liste ekranları → mobil karşılıkları. */
const PROFILE_LIST_ROUTES: Record<string, string> = {
  orders: '/orders',
  trades: '/trades',
  offers: '/offers',
  messages: '/messages',
  favorites: '/(tabs)/favorites',
  payments: '/settings/payments',
  notifications: '/notifications',
};

export function toMobileRoute(link: string): string | null {
  if (!link || link.includes('{{')) return null; // interpole edilmemiş şablon
  // Mobilden kaldırılan sayfalar (SSS → Yardım; bilgi/CMS sayfaları → uygulama
  // içi web ekranı). Karar tek yerde: `@/lib/navigation/removedPages`.
  const removed = resolveRemovedPage(link);
  if (removed) return removed.kind === 'route' ? removed.route : inAppWebHref(removed.url);
  const [rawPath, rawQuery] = link.split('?');
  const rawPathNoSlash = rawPath.replace(/\/+$/, '');
  // Web [locale] segmenti: /en/listings/123 → /listings/123. Soyma kurali tek
  // kaynakta (@/lib/deeplinks) — dislama kontrolu de ayni kurali kullaniyor.
  const path = stripLocalePrefix(rawPathNoSlash);

  // /messages?thread=<id> → /messages/<id>  (RN'de URLSearchParams'a güvenmeden)
  if (path === '/messages') {
    const thread = decodeSafeRouteId(rawQuery?.match(/(?:^|&)thread=([^&]+)/)?.[1]);
    return thread ? `/messages/${thread}` : '/messages';
  }

  // Yol segmentleri rota parametresi olarak ekrana, oradan API yoluna gider: yol kaçışı
  // içeren (kodlanmış `/`, `..`, `?`, kontrol karakteri …) bir segment varsa link eşlenmez.
  // Slug'lar (Türkçe harf, `.`, `@`, `:`) geçer; kimlik biçimi yalnız kimlik bekleyen
  // rotalarda aşağıda ayrıca aranır.
  if (!path.split('/').filter(Boolean).every(isSafePathSegment)) return null;
  // /offers?tab=received → /offers
  if (path === '/offers') return '/offers';

  // Sorgu parametresini koruyarak aynı yola geçir (token/e-posta taşıyan yollar).
  const withQuery = (route: string) => (rawQuery ? `${route}?${rawQuery}` : route);

  // Ödeme dönüş URL'leri BİLİNÇLİ olarak eşlenmez: PayTR turu WebView içinde
  // yakalanır (bkz. docs/mobile-parity/04 §5). Uygulama dışına çıkarsa akış kopar.
  if (path === '/payment/success' || path === '/payment/fail' || path === '/payment/failure') {
    return null;
  }

  // Token taşıyan kimlik yolları — mobil rota adı web ile aynı.
  if (path === '/verify-email' || path === '/reset-password' || path === '/forgot-password') {
    return withQuery(path);
  }

  // Kurumsal davet: web /corporate/invite → mobil /corporate-invite
  if (path === '/corporate/invite') return withQuery('/corporate-invite');

  // Misafir sipariş takibi: web /track-order → mobil /order-track
  if (path === '/track-order') return withQuery('/order-track');

  const seg = path.split('/').filter(Boolean);
  const [head, id] = seg;

  switch (head) {
    case 'listings': {
      // Web listing detail `/listings/<slug>-<uuid>` -> mobile `/product/<uuid>`; `/listings/<segment>/edit`
      // -> the mobile edit screen; the bare list -> the search screen with its filter / sort query kept
      // as is (`/listings?discountOnly=true` -> `/search?discountOnly=true`; same names as web).
      if (!id) return listingsToSearchHref(rawQuery);
      // The uuid is the key and the slug is decoration (ADR 0017): a bare uuid, an upper-case uuid and
      // a stale slug all map to the same route. A segment without a uuid maps to nothing.
      const listingId = listingIdFromParam(id);
      if (!listingId) return null;
      return seg[2] === 'edit' ? `/listing/${listingId}/edit` : `/product/${listingId}`;
    }
    case 'trades':
      // web çoğul → mobil tekil; liste → tab
      if (!id) return '/trades';
      return isIdSegment(id) ? `/trade/${id}` : null;
    case 'profile': {
      const [, section, sectionId] = seg;
      if (section === 'listings') return '/settings/my-listings';
      if (section === 'earnings') return '/settings/payments';
      // web /profile/<bölüm>/:id → mobil detay rotaları
      if (sectionId && ['orders', 'trades', 'refund-requests'].includes(section ?? '')) {
        if (!isIdSegment(sectionId)) return null;
        if (section === 'orders') return `/orders/${sectionId}`;
        if (section === 'trades') return `/trade/${sectionId}`;
        return `/refund-requests/${sectionId}`;
      }
      // Liste bölümleri (yönetici yayını hedef linki bunları kullanabilir — izin listesi
      // `@tarodan/types` NOTIFICATION_INTERNAL_PATHS): profil sekmesi yerine ilgili ekran.
      if (!sectionId && section && PROFILE_LIST_ROUTES[section]) return PROFILE_LIST_ROUTES[section]!;
      return '/(tabs)/profile';
    }
    case 'refund-requests':
      // web /refund-requests/:id → mobil iade detayı (alıcı+satıcı erişebilir);
      // liste → alıcının kendi iade talepleri
      if (!id) return '/refund-requests';
      return isIdSegment(id) ? `/refund-requests/${id}` : null;
    // Sipariş: ödeme / iade / teslim uçlarına giden kimlik — kimlik biçimi şart.
    case 'orders':
      return seg.slice(1).every(isIdSegment) ? path : null;
    // The product screen: `/product/<segment>[/reviews]` is canonicalised to the bare uuid like
    // `/listings/<segment>` (the screen accepts the segment too, but the route stays one shape).
    case 'product': {
      if (!id) return path;
      const listingId = listingIdFromParam(id);
      return listingId ? ['', 'product', listingId, ...seg.slice(2)].join('/') : null;
    }
    // `/products/unavailable/<segment>`: the listing uuid is taken out like `/listings/<segment>`.
    case 'products': {
      if (seg[1] !== 'unavailable' || !seg[2]) return path;
      const listingId = listingIdFromParam(seg[2]);
      return listingId ? `/products/unavailable/${listingId}` : null;
    }
    // Same name as the mobile route: passed through as is (read-only; the id may be a slug).
    case 'collections':
    case 'favorites':
    case 'pricing':
      return path;
    // web satıcı sipariş yolu /seller/orders/:id → mobil satış detayı /sales/:id;
    // diğer /seller/:id yolları (satıcı profili) mobilde aynı ad.
    case 'seller':
      if (id === 'orders') {
        if (!seg[2]) return '/sales';
        return isIdSegment(seg[2]) ? `/sales/${seg[2]}` : null;
      }
      return path;
    // Üyelik bildirimleri (süre doluyor / doldu / kart gerekli): web /membership →
    // mobil üyelik ekranı. Dijital satış kapalıyken ekran yalnız bilgi gösterir.
    case 'membership':
      return '/membership';
    default:
      return null;
  }
}

/* ------------------------------------------------------------------------- *
 * Bildirim çözümleyicisi — TEK katman.
 *
 * Uygulama içi liste, push tap ve derin bağlantı AYNI kararı vermeli. Önceden
 * iki ayrı çözümleyici vardı ve ölçülebilir biçimde ayrışıyorlardı
 * (`docs/superpowers/reports/2026-08-11-bildirim-sozlesmesi-olcum.md`).
 * ------------------------------------------------------------------------- */

/** Çözümleyicinin okuduğu ASGARİ bildirim şekli. */
export type NotificationLike = {
  type?: string | null;
  link?: string | null;
  data?: Record<string, any> | null;
};

/**
 * Serbest hedefi güvenli bir YOLA indirger. Kural: yalnız `/…` göreli yol ya da
 * TANIDIK host üzerinden `https://`. `javascript:`, özel scheme, protokol-göreli
 * `//host` ve yabancı host reddedilir — bildirim gövdesi sunucudan gelen veri,
 * doğrudan gezinme girdisi değil.
 */
function safePathFromLink(link: string | null | undefined): string | null {
  if (!link || typeof link !== 'string') return null;
  const raw = link.trim();
  if (!raw) return null;

  // `//evil.com/x` protokol-göreli: tarayıcıda host'a gider, yol sanılmamalı.
  if (raw.startsWith('//')) return null;
  if (raw.startsWith('/')) return raw;

  // Katı https (`@/lib/security/url`): http:, javascript:, tarodanx:, mailto:, `user@`, port … dışarıda.
  const parsed = parseStrictUrl(raw);
  if (!parsed) return null;
  // Yalnız BU ortamın alan adları (production'da staging linki rota kaynağı sayılmaz).
  if (!ownWebHosts().has(parsed.host)) return null;
  return `${parsed.path}${parsed.search}${parsed.hash}`;
}

/**
 * Bildirim → mobil rota. Sıra ÖLÇÜMDEN çıktı, dokümandan değil:
 *
 * 1. `data`'daki tipli kimlikler. Üst seviye `link` web yolu ve kayıp bilgi
 *    taşıyabiliyor — grup ödemesinde `/profile/orders` (liste) gelirken `data`
 *    `checkoutGroupId` ile grubu tanımlıyordu.
 * 2. `data.link`, sonra `link` — yol eşlemesinden geçer.
 * 3. Hiçbiri değilse `null`: kart gösterilir, tıklama kapalı. Sessizce başka bir
 *    ekrana atmak kullanıcıyı yanıltır.
 */
/**
 * Tipin hem link'i hem kimliklerini geçersiz kıldığı istisnalar. Kısa tutun:
 * her tipe satır yazmak `type` listesinin eksik olduğu gerçeğiyle çatışır
 * (ölçümde 11 tipin 8'i delta dosyasında yoktu). Buraya yalnız hedefin
 * kimlikten TÜRETİLEMEDİĞİ tipler girer.
 */
const TYPE_OVERRIDES: Record<string, string> = {
  // Ortak link /listings/:id'ye gidiyor — ürün sayfası yanlış ekran. Karşı
  // teklif alıcının başlattığı pazarlıktır → "Gönderilen" sekmesi.
  offer_counter: '/offers?tab=sent',
};

/** Ürün artık alınamıyor — detay yerine "satışta değil" ekranı. */
const OUT_OF_STOCK_TYPES = new Set([
  'order_cancelled_out_of_stock',
  'offer_cancelled_out_of_stock',
  'back_in_stock',
]);

/**
 * Link web'in SATICI sipariş yolu mu (`/seller/orders/:id`)? API satıcıya giden
 * ve `audience` taşımayan tiplerde (order_cancelled_seller, product_sold,
 * refund_*_seller …) hedefi bu desenle üretir (`notification-link.ts`).
 */
function isSellerOrderLink(link: string | null | undefined): boolean {
  const path = safePathFromLink(link);
  if (!path) return false;
  const clean = stripLocalePrefix(path.split('?')[0]!.replace(/\/+$/, ''));
  return clean === '/seller/orders' || clean.startsWith('/seller/orders/');
}

/**
 * SON ÇARE: `audience` da `link` de yokken tip adından satıcı say. Push
 * payload'ı `{ ...dto.data, type }` — `link` yalnız in-app kayıtta tutuluyor
 * (notification-dispatch.service.ts), yani push dokunuşunda satıcı tipleri
 * `audience`/`link` taşımaz. Liste API'de SELLER_ORDER kullanan tiplerdir:
 * `*_seller` son ekli sipariş/iade tipleri + product_sold + cargo_movement_missing.
 * TODO: sunucu push verisine `audience` ya da `link` eklediğinde bu yedek
 * kaldırılabilir (sunucu işi S5).
 */
function isSellerOrderType(type: string | null | undefined): boolean {
  if (!type) return false;
  return (
    type.endsWith('_seller') ||
    type === 'product_sold' ||
    type === 'cargo_movement_missing' ||
    SELLER_ONLY_TYPES.has(type)
  );
}

/**
 * YALNIZ satıcıya giden ama eski kayıtlarda linki satıcı sipariş yolu OLMAYAN tipler.
 * `payment_received` satıcının "Yeni Sipariş" bildirimidir: eski zil satırları
 * `/profile/payments` linkiyle kayıtlı, eski push'lar `audience` taşımıyordu — ikisi de alıcının
 * sipariş ekranını açıyordu. Tip, linkten ÖNCE değerlendirilir.
 */
const SELLER_ONLY_TYPES = new Set(['payment_received']);

/** Sipariş bildiriminin hedef kitlesi: önce audience, sonra satıcıya özgü tip, link deseni, tip adı. */
function isSellerAudience(n: NotificationLike | null | undefined): boolean {
  const d = n?.data || {};
  if (d.audience === 'seller') return true;
  if (d.audience === 'buyer') return false;
  const type = n?.type ?? d.type;
  if (typeof type === 'string' && SELLER_ONLY_TYPES.has(type)) return true;
  const links = [d.link, n?.link].filter(Boolean);
  if (links.length > 0) return links.some(isSellerOrderLink);
  // Push payload'ında `type` data içinde de gelir.
  return isSellerOrderType(n?.type ?? d.type);
}

/** `data` kimliği: sayı metne çevrilir; biçim dışı değer (`isSafeRouteId`) yok sayılır. */
function safeId(value: unknown): string | undefined {
  const v = typeof value === 'number' && Number.isFinite(value) ? String(value) : value;
  return isSafeRouteId(v) ? v : undefined;
}

export function notificationRoute(n: NotificationLike | null | undefined): string | null {
  const d = n?.data || {};

  const override = n?.type ? TYPE_OVERRIDES[n.type] : undefined;
  if (override) return override;

  // Stok kalmayan ürün: `/product/:id` yerine "artık satışta değil" ekranı.
  // Kimlik aynı, hedefi ayıran tek sinyal tip — bu yüzden kimliklerden önce.
  if (n?.type && OUT_OF_STOCK_TYPES.has(n.type)) {
    const pid = safeId(d.productId ?? d.product_id);
    if (pid) return `/products/unavailable/${pid}`;
  }

  // `audience` aynı tipin alıcı/satıcı ekranını seçer; satıcı sipariş ekranı ayrı.
  // Yalnız satıcıya giden tiplerde API `audience` göndermez; sıra: `audience`,
  // link deseni, son çare tip adı (bkz. isSellerAudience).
  const isSeller = isSellerAudience(n);

  const orderId = safeId(d.orderId ?? d.order_id);
  const groupId = safeId(d.checkoutGroupId ?? d.checkout_group_id);
  const tradeId = safeId(d.tradeId ?? d.trade_id);
  const offerId = safeId(d.offerId ?? d.offer_id);
  const threadId = safeId(d.threadId ?? d.thread_id);
  const productId = safeId(d.productId ?? d.product_id);
  const collectionId = safeId(d.collectionId ?? d.collection_id);
  const userId = safeId(d.userId ?? d.user_id);

  // Sipariş grubun ÖNÜNDE: sunucu tek siparişi bildiğinde `orderId`'yi de
  // spesifik link'i de veriyor, yalnız grubu bildiğinde link listeye düşüyor.
  // Grup, sipariş kimliği yokken doğru (ve tek) hedef.
  if (orderId) return isSeller ? `/sales/${orderId}` : `/orders/${orderId}`;
  if (groupId) return `/orders/group/${groupId}`;
  if (tradeId) return `/trade/${tradeId}`;
  if (offerId) return `/offers/${offerId}`;
  if (threadId) return `/messages/${threadId}`;
  if (productId) return `/product/${productId}`;
  if (collectionId) return `/collections/${collectionId}`;
  if (userId) return `/seller/${userId}`;

  // `data.link` üst seviye `link`'ten daha spesifik olabiliyor (ölçüldü), önce o.
  for (const candidate of [d.link, n?.link]) {
    const path = safePathFromLink(candidate);
    if (!path) continue;
    const route = toMobileRoute(path);
    if (route) return route;
  }
  return null;
}

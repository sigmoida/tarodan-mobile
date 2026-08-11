import { deepLinkConfig, stripLocalePrefix } from '@/lib/deeplinks';

/**
 * Backend `link` alanları WEB rotaları için interpole ediliyor (ör.
 * /listings/:id, /trades/:id, /messages?thread=:id). Mobil expo-router
 * rotaları farklı olduğundan link'i mobil rotaya çeviriyoruz. Eşleşme yoksa
 * null döner → çağıran taraf data tabanlı fallback'e düşer.
 *
 * Hem uygulama içi bildirim listesi (app/(tabs)/notifications.tsx) hem de
 * push bildirimi tap handler'ı (src/services/push.ts) bu fonksiyonu kullanır;
 * aksi halde push ile gelen /messages?thread=<id> mobilde geçersiz rota olup
 * boş ekran açıyordu.
 */
export function toMobileRoute(link: string): string | null {
  if (!link || link.includes('{{')) return null; // interpole edilmemiş şablon
  const [rawPath, rawQuery] = link.split('?');
  const rawPathNoSlash = rawPath.replace(/\/+$/, '');
  // Web [locale] segmenti: /en/listings/123 → /listings/123. Soyma kurali tek
  // kaynakta (@/lib/deeplinks) — dislama kontrolu de ayni kurali kullaniyor.
  const path = stripLocalePrefix(rawPathNoSlash);

  // /messages?thread=<id> → /messages/<id>  (RN'de URLSearchParams'a güvenmeden)
  if (path === '/messages') {
    const thread = rawQuery?.match(/(?:^|&)thread=([^&]+)/)?.[1];
    return thread ? `/messages/${decodeURIComponent(thread)}` : '/(tabs)/messages';
  }
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
      // web: ürün detayı /listings/:id → mobil /product/:id; /listings/:id/edit →
      // mobil ilan düzenleme; liste → arama
      if (!id) return '/(tabs)/search';
      return seg[2] === 'edit' ? `/listing/${id}/edit` : `/product/${id}`;
    }
    case 'trades':
      // web çoğul → mobil tekil; liste → tab
      return id ? `/trade/${id}` : '/trades';
    case 'profile': {
      const [, section, sectionId] = seg;
      if (section === 'listings') return '/settings/my-listings';
      if (section === 'earnings') return '/settings/payments';
      // web /profile/<bölüm>/:id → mobil detay rotaları
      if (section === 'orders' && sectionId) return `/orders/${sectionId}`;
      if (section === 'trades' && sectionId) return `/trade/${sectionId}`;
      if (section === 'refund-requests' && sectionId) return `/refund-requests/${sectionId}`;
      return '/(tabs)/profile';
    }
    case 'refund-requests':
      // web /refund-requests/:id → mobil iade detayı (alıcı+satıcı erişebilir);
      // liste → alıcının kendi iade talepleri
      return id ? `/refund-requests/${id}` : '/refund-requests';
    // Mobil rotalarla birebir uyumlu — olduğu gibi geçir
    case 'orders':
    case 'product':
    case 'products': // /products/unavailable/:id
    case 'collections':
    case 'seller':
    case 'favorites':
    case 'pricing':
      return path;
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

  const https = raw.match(/^https:\/\/([^/?#]+)(.*)$/i);
  if (!https) return null; // http:, javascript:, tarodanx:, mailto: … hepsi dışarıda
  const host = https[1]!.toLowerCase().replace(/:\d+$/, '');
  if (!deepLinkConfig.hosts.includes(host)) return null;
  const rest = https[2] || '/';
  return rest.startsWith('/') ? rest : `/${rest}`;
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

export function notificationRoute(n: NotificationLike | null | undefined): string | null {
  const d = n?.data || {};

  const override = n?.type ? TYPE_OVERRIDES[n.type] : undefined;
  if (override) return override;

  // Stok kalmayan ürün: `/product/:id` yerine "artık satışta değil" ekranı.
  // Kimlik aynı, hedefi ayıran tek sinyal tip — bu yüzden kimliklerden önce.
  if (n?.type && OUT_OF_STOCK_TYPES.has(n.type)) {
    const pid = d.productId ?? d.product_id;
    if (pid) return `/products/unavailable/${pid}`;
  }

  // `audience` aynı tipin alıcı/satıcı ekranını seçer; satıcı sipariş ekranı ayrı.
  const isSeller = d.audience === 'seller';

  const orderId = d.orderId ?? d.order_id;
  const groupId = d.checkoutGroupId ?? d.checkout_group_id;
  const tradeId = d.tradeId ?? d.trade_id;
  const offerId = d.offerId ?? d.offer_id;
  const threadId = d.threadId ?? d.thread_id;
  const productId = d.productId ?? d.product_id;
  const collectionId = d.collectionId ?? d.collection_id;
  const userId = d.userId ?? d.user_id;

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

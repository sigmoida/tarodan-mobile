import { stripLocalePrefix } from '@/lib/deeplinks';

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

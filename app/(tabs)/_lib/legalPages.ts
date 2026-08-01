import type { Ionicons } from '@expo/vector-icons';

/**
 * CMS'te (`GET /pages`) yayınlanan hukuki sayfalar.
 *
 * Liste ucu yalnız `{ slug, updatedAt }` döndürür — başlık içermez — bu yüzden
 * etiketler burada tutulur; menü başlıkları için ayrıca istek atmaya gerek kalmaz.
 *
 * `about` ve `faq` bilinçli olarak DIŞARIDA: ikisinin de uygulamada sabit
 * ekranı var (`/about`, `/help`); CMS sürümlerini bağlamak aynı içeriği
 * kullanıcıya iki ayrı yerden gösterirdi.
 */
export const LEGAL_PAGES: ReadonlyArray<{
  slug: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}> = [
  { slug: 'privacy', label: 'Gizlilik Politikası', icon: 'lock-closed-outline' },
  { slug: 'terms', label: 'Kullanım Koşulları', icon: 'document-text-outline' },
  { slug: 'cookie-policy', label: 'Çerez Politikası', icon: 'shield-outline' },
] as const;

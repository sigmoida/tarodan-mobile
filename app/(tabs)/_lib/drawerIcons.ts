import type { IconName } from '@/ui';

/**
 * Yan menü satır ikonları — satır anahtarına (`ProfileMenuItem.key`) göre. Menü modeli
 * (`profileMenu.ts`) ikon taşımaz; profil ekranı ikonsuz kalır. Tanımsız anahtar (bilgi/hukuki
 * sayfalar dahil) `DEFAULT_DRAWER_ICON` alır.
 */
export const DEFAULT_DRAWER_ICON: IconName = 'document-text';

const DRAWER_ICONS: Record<string, IconName> = {
  favorites: 'heart',
  // Alışveriş
  listings: 'tag',
  orders: 'shopping-bag',
  sales: 'truck',
  trades: 'arrows-right-left',
  offers: 'paper-airplane',
  discounts: 'receipt-percent',
  // Finans
  payments: 'banknotes',
  'payment-methods': 'credit-card',
  'payment-history': 'clock',
  refunds: 'arrow-uturn-left',
  // Koleksiyon
  collections: 'rectangle-stack',
  'liked-collections': 'star',
  'account-following': 'user-group',
  'saved-searches': 'magnifying-glass',
  // Analiz
  analytics: 'chart-bar',
  // İletişim
  support: 'lifebuoy',
  help: 'question-mark-circle',
  // Bilgi
  about: 'information-circle',
  authenticity: 'shield-check',
  'collectors-guide': 'academic-cap',
  'platform-fee': 'building-storefront',
};

export function drawerIconFor(key: string): IconName {
  return DRAWER_ICONS[key] ?? DEFAULT_DRAWER_ICON;
}

// Ürün durum/stok uyarısı (web `ProductStaticInfoView` NOTICES) — tek kaynak.
import type { TFunction } from 'i18next';
import type { Product } from './types';

export interface ProductNotice {
  variant: 'warning' | 'danger' | 'default';
  title: string;
  subtitle: string | null;
}

/**
 * Aksiyon düğmelerinin üstündeki uyarı. Statü `active` değilse statü öncelikli; aktif ama stok
 * 0 ise "stok bitti". Uyarı gerekmiyorsa null (aktif + stokta).
 */
export function getProductNotice(product: Product, t: TFunction): ProductNotice | null {
  const available =
    product.availableQuantity !== undefined && product.availableQuantity !== null
      ? product.availableQuantity
      : product.quantity;
  const key =
    product.status && product.status !== 'active' ? product.status : available === 0 ? 'stockFinished' : null;
  if (!key) return null;

  const notices: Record<string, ProductNotice> = {
    reserved: {
      variant: 'warning',
      title: t('product.statusReserved'),
      subtitle: t('product.statusReservedDesc'),
    },
    sold: { variant: 'danger', title: t('product.statusSold'), subtitle: t('product.statusSoldDesc') },
    pending: {
      variant: 'default',
      title: t('product.statusPending'),
      subtitle: t('product.statusPendingDesc'),
    },
    inactive: {
      variant: 'default',
      title: t('product.statusInactive'),
      subtitle: t('product.statusInactiveDesc'),
    },
    rejected: {
      variant: 'danger',
      title: t('product.statusRejected'),
      subtitle: t('product.statusRejectedDesc'),
    },
    stockFinished: {
      variant: 'warning',
      title: t('product.stockFinished'),
      subtitle: t('product.stockFinishedDesc'),
    },
  };
  return notices[key] ?? { variant: 'default', title: t('common.removed'), subtitle: null };
}

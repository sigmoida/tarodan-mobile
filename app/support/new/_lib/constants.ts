import { theme } from '@/ui';
import type { TFunction } from 'i18next';

const { colors } = theme;

// id'ler backend TicketCategory enum'u ile birebir (payment, shipping, trade, account, product, technical, other)
// Modül kapsamında import-zamanı dondurulmaması için build fonksiyonu (CLAUDE.md §2 kuralı).
export const buildSupportCategories = (t: TFunction) => [
  { id: 'shipping', name: t('support.new.category.shipping'), icon: 'cube-outline' },
  { id: 'payment', name: t('support.new.category.payment'), icon: 'card-outline' },
  { id: 'account', name: t('support.new.category.account'), icon: 'person-outline' },
  { id: 'product', name: t('support.new.category.product'), icon: 'pricetag-outline' },
  { id: 'trade', name: t('support.new.category.trade'), icon: 'swap-horizontal' },
  { id: 'other', name: t('support.category.other'), icon: 'ellipsis-horizontal' },
];

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const buildPriorityOptions = (t: TFunction) => [
  { id: 'low', name: t('support.low'), color: colors.success[600]! },
  { id: 'medium', name: t('support.medium'), color: colors.warning[600]! },
  { id: 'high', name: t('support.high'), color: colors.danger[600]! },
];

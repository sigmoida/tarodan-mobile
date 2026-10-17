import type { TFunction } from 'i18next';

// id'ler backend TicketCategory enum'u ile birebir (payment, shipping, trade, account, product, technical, other)
// Modül kapsamında import-zamanı dondurulmaması için build fonksiyonu (src/i18n/CLAUDE.md › Build labels at call time kuralı).
export const buildSupportCategories = (t: TFunction) => [
  { id: 'shipping', name: t('support.new.category.shipping') },
  { id: 'payment', name: t('support.new.category.payment') },
  { id: 'account', name: t('support.new.category.account') },
  { id: 'product', name: t('support.new.category.product') },
  { id: 'trade', name: t('support.new.category.trade') },
  { id: 'other', name: t('support.category.other') },
];

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const buildPriorityOptions = (t: TFunction) => [
  { id: 'low', name: t('support.low') },
  { id: 'medium', name: t('support.medium') },
  { id: 'high', name: t('support.high') },
];

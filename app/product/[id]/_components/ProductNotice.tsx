import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/ui';
import { getProductNotice } from '../_lib/notice';
import type { Product } from '../_lib/types';

/** Durum/stok uyarısı (web `ProductStaticInfoView` NOTICES): rozet satırının hemen altı, açıklamadan önce. */
export function ProductNotice({ product }: { product: Product }) {
  const { t } = useTranslation();
  const notice = getProductNotice(product, t);
  if (!notice) return null;
  return (
    <Alert testID="product-notice" variant={notice.variant} title={notice.title}>
      {notice.subtitle ?? undefined}
    </Alert>
  );
}

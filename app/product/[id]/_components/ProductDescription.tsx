import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, SectionCard, Text, theme } from '@/ui';
import { getProductNotice } from '../_lib/notice';
import type { Product } from '../_lib/types';

/** "Açıklama" kartı + durum/stok uyarısı (web: açıklama SectionCard'ı, altında Alert). */
export function ProductDescription({ product }: { product: Product }) {
  const { t } = useTranslation();
  const notice = getProductNotice(product, t);
  return (
    <>
      <SectionCard title={t('product.description')}>
        <Text variant="bodySm" tone="muted" style={{ lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed }}>
          {product.description || t('product.noDescription')}
        </Text>
      </SectionCard>

      {notice ? (
        <Alert
          testID="product-notice"
          variant={notice.variant}
          title={notice.title}
        >
          {notice.subtitle ?? undefined}
        </Alert>
      ) : null}
    </>
  );
}

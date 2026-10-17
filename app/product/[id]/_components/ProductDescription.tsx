import React from 'react';
import { useTranslation } from 'react-i18next';
import { SectionCard, Text, theme } from '@/ui';
import type { Product } from '../_lib/types';

/** "Açıklama" kartı (web: açıklama SectionCard'ı). Durum uyarısı artık başlık bloğunda (`ProductNotice`). */
export function ProductDescription({ product }: { product: Product }) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('product.description')}>
      <Text variant="bodySm" tone="muted" style={{ lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed }}>
        {product.description || t('product.noDescription')}
      </Text>
    </SectionCard>
  );
}

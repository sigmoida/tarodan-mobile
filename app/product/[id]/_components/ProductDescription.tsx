import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Alert, SectionCard, Text, theme } from '@/ui';
import { getProductNotice } from '../_lib/notice';
import type { Product } from '../_lib/types';

const { colors, iconSize } = theme;

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
          icon={
            <Ionicons
              name={notice.variant === 'default' ? 'information-circle-outline' : 'warning-outline'}
              size={iconSize.md}
              color={
                notice.variant === 'danger'
                  ? colors.danger[600]
                  : notice.variant === 'warning'
                    ? colors.warning[600]
                    : colors.text.muted
              }
            />
          }
        >
          {notice.subtitle ?? undefined}
        </Alert>
      ) : null}
    </>
  );
}

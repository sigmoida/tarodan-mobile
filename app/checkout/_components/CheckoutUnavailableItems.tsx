import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Alert, Text, theme } from '@/ui';
import type { QuoteUnavailableItem } from '@/lib/api';
import { unavailableReason } from '../_lib/status';

/**
 * Ödemeye dahil EDİLMEYEN satırlar. Bu kart yalnız bilgilendirir — tutarların
 * hiçbiri buradan türetilmez, toplam `pricing.summary.total`'dır.
 */
export const CheckoutUnavailableItems = React.memo(function CheckoutUnavailableItems({
  items,
  titleFor,
}: {
  items: QuoteUnavailableItem[];
  /**
   * `productId` → sepetteki ürün adı. Gerekçe metni tek başına yetmez: iki ürün
   * aynı kodla ayrılırsa kullanıcı aynı cümleyi iki kez görür, HANGİ ürünlerin
   * çıkarıldığını anlayamaz. Ad `quote.items[]`'ta yoktur (ayrılan satır orada
   * yok), sepet satırından gelir.
   */
  titleFor?: (productId: string) => string | undefined;
}) {
  const { t } = useTranslation();
  if (!items.length) return null;

  return (
    <Alert variant="warning" title={t('checkout.unavailableTitle')}>
      <View style={{ gap: theme.spacing[2] }}>
        {items.map((item) => {
          const title = titleFor?.(item.productId);
          return (
            <View key={item.productId}>
              {title ? (
                <Text variant="bodySm" weight="semibold" tone="heading">{title}</Text>
              ) : null}
              <Text variant="bodySm" tone="muted">{unavailableReason(item, t)}</Text>
            </View>
          );
        })}
      </View>
    </Alert>
  );
});

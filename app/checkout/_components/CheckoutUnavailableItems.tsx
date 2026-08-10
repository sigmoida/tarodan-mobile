import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Text, theme } from '@/ui';
import { Ionicons } from '@expo/vector-icons';
import type { QuoteUnavailableItem } from '@/lib/api';
import { unavailableReason } from '../_lib/status';

/**
 * Ödemeye dahil EDİLMEYEN satırlar. Bu kart yalnız bilgilendirir — tutarların
 * hiçbiri buradan türetilmez, toplam `pricing.summary.total`'dır.
 */
export function CheckoutUnavailableItems({
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
    <Card style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="alert-circle" size={18} color={theme.colors.warning[600]!} />
        <Text variant="body" style={styles.title}>{t('checkout.unavailableTitle')}</Text>
      </View>
      {items.map((item) => {
        const title = titleFor?.(item.productId);
        return (
          <View key={item.productId} style={styles.line}>
            {title ? (
              <Text variant="caption" style={styles.name}>{title}</Text>
            ) : null}
            <Text variant="caption" tone="muted">{unavailableReason(item, t)}</Text>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[3],
    backgroundColor: theme.colors.warning[50]!,
    borderWidth: 1,
    borderColor: theme.colors.warning[200]!,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] },
  title: { fontWeight: '600', flex: 1 },
  line: { marginTop: theme.spacing[2] },
  name: { fontWeight: '600' },
});

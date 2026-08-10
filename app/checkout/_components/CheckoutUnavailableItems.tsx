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
export function CheckoutUnavailableItems({ items }: { items: QuoteUnavailableItem[] }) {
  const { t } = useTranslation();
  if (!items.length) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="alert-circle" size={18} color={theme.colors.warning[600]!} />
        <Text variant="body" style={styles.title}>{t('checkout.unavailableTitle')}</Text>
      </View>
      {items.map((item) => (
        <Text key={item.productId} variant="caption" tone="muted" style={styles.reason}>
          {unavailableReason(item, t)}
        </Text>
      ))}
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
  reason: { marginTop: theme.spacing[1] },
});

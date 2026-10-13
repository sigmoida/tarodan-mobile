import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar, Badge, SectionCard, Text, theme } from '@/ui';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Trade } from '../_lib/types';

/** Takas başlığı (numara, karşı teklif rozeti, tarih) + karşı taraf satırı. */
export function TradeInfoCard({
  trade,
  isInitiator,
  otherParty,
}: {
  trade: Trade;
  isInitiator: boolean;
  otherParty: { id: string; displayName: string };
}) {
  const { t } = useTranslation();
  return (
    <SectionCard bodyStyle={styles.body}>
      <View style={styles.top}>
        <Text variant="h3" tone="heading">{t('trade.tradeNumberTitle', { number: trade.tradeNumber })}</Text>
        {trade.version && trade.version > 1 ? (
          <Badge variant="default" size="sm">{t('trade.counterOfferNumber', { number: trade.version - 1 })}</Badge>
        ) : null}
      </View>
      <Text variant="caption" tone="muted">
        {format(new Date(trade.createdAt), 'dd MMMM yyyy HH:mm', { locale: tr })}
      </Text>

      <Pressable
        style={styles.otherParty}
        onPress={() => router.push(`/seller/${otherParty.id}`)}
        accessibilityRole="link"
      >
        <Avatar name={otherParty.displayName} size="md" />
        <View style={styles.otherPartyInfo}>
          <Text variant="bodySm" tone="muted">{isInitiator ? t('order.buyer') : t('trade.initiatorLabel')}</Text>
          <Text variant="body" weight="medium" tone="heading">{otherParty.displayName}</Text>
        </View>
      </Pressable>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  body: { gap: theme.spacing[1] },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing[2] },
  otherParty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    marginTop: theme.spacing[3],
    paddingTop: theme.spacing[3],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.DEFAULT,
  },
  otherPartyInfo: { flex: 1 },
});

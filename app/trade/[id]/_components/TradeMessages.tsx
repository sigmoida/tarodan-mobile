import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SectionCard, Text, theme } from '@/ui';
import type { Trade } from '../_lib/types';

const { colors, radius, spacing } = theme;

export function TradeMessages({ trade }: { trade: Trade }) {
  const { t } = useTranslation();
  if (!(trade.initiatorMessage || trade.receiverMessage)) return null;
  return (
    <SectionCard title={t('message.messages')} bodyStyle={styles.body}>
      {trade.initiatorMessage && (
        <View style={styles.messageBox}>
          <Text variant="caption" weight="medium" tone="primary">{trade.initiatorName ?? t('common.user')}:</Text>
          <Text variant="body">{trade.initiatorMessage}</Text>
        </View>
      )}
      {trade.receiverMessage && (
        <View style={styles.messageBox}>
          <Text variant="caption" weight="medium" tone="primary">{trade.receiverName ?? t('common.user')}:</Text>
          <Text variant="body">{trade.receiverMessage}</Text>
        </View>
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing[2] },
  messageBox: { backgroundColor: colors.surface.alt, padding: spacing[3], borderRadius: radius.lg, gap: spacing[1] },
});

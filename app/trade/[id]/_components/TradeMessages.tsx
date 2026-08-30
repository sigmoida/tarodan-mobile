import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Text, theme } from '@/ui';
import type { Trade } from '../_lib/types';

const { colors } = theme;

export function TradeMessages({ trade }: { trade: Trade }) {
  const { t } = useTranslation();
  if (!(trade.initiatorMessage || trade.receiverMessage)) return null;
  return (
    <Card style={styles.card}>
      <Text variant="label" style={styles.sectionTitle}>{t('message.messages')}</Text>
      {trade.initiatorMessage && (
        <View style={styles.messageBox}>
          <Text variant="caption" style={styles.messageSender}>{trade.initiatorName ?? t('common.user')}:</Text>
          <Text variant="body">{trade.initiatorMessage}</Text>
        </View>
      )}
      {trade.receiverMessage && (
        <View style={styles.messageBox}>
          <Text variant="caption" style={styles.messageSender}>{trade.receiverName ?? t('common.user')}:</Text>
          <Text variant="body">{trade.receiverMessage}</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { margin: theme.spacing[4], marginTop: theme.spacing[0], backgroundColor: colors.surface.DEFAULT },
  sectionTitle: { marginBottom: theme.spacing[3], color: colors.text.heading },
  messageBox: { backgroundColor: colors.surface.alt, padding: theme.spacing[3], borderRadius: theme.radius.xl, marginBottom: theme.spacing[2] },
  messageSender: { color: colors.primary[600]!, fontWeight: '500', marginBottom: theme.spacing[1] },
});

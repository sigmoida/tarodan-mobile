import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, theme } from '@/ui';
import type { SavedCard } from '@/lib/api';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import { savedCardBadges, type CardBadgeTone } from '../_lib/badges';
import { styles } from '../_lib/styles';

const { colors } = theme;

const TONE: Record<CardBadgeTone, { backgroundColor: string; color: string }> = {
  neutral: { backgroundColor: colors.surface.alt, color: colors.text.muted },
  primary: { backgroundColor: colors.primary[50], color: colors.primary[700] },
  success: { backgroundColor: colors.success[50]!, color: colors.success[600]! },
  warning: { backgroundColor: colors.warning[50]!, color: colors.warning[600]! },
  info: { backgroundColor: colors.info[50]!, color: colors.info[600]! },
};

/** Kayıtlı kart satırının rozetleri (şema, varsayılan, mağaza, oto-yenileme/CVV, kurumsal). */
export function SavedCardBadges({ card }: { card: SavedCard }) {
  const { t } = useTranslation();
  const badges = savedCardBadges(card, t, CAN_BUY_DIGITAL);
  if (badges.length === 0) return null;
  return (
    <View style={styles.badges}>
      {badges.map((b) => (
        <Text key={b.key} testID={`card-badge-${b.key}`} variant="caption" style={[styles.badge, TONE[b.tone]]}>
          {b.label}
        </Text>
      ))}
    </View>
  );
}

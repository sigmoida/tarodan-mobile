import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, type BadgeProps } from '@/ui';
import type { SavedCard } from '@/lib/api';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import { savedCardBadges, type CardBadgeTone } from '../_lib/badges';
import { styles } from '../_lib/styles';

/** Rozet tonu → web Badge varyantı (tek sözlük). */
const VARIANT: Record<CardBadgeTone, NonNullable<BadgeProps['variant']>> = {
  neutral: 'outline',
  primary: 'default',
  success: 'success',
  warning: 'warning',
  info: 'info',
};

/** Kayıtlı kart satırının rozetleri (şema, varsayılan, oto-yenileme/CVV, kurumsal — web gibi). */
export function SavedCardBadges({ card }: { card: SavedCard }) {
  const { t } = useTranslation();
  const badges = savedCardBadges(card, t, CAN_BUY_DIGITAL);
  if (badges.length === 0) return null;
  return (
    <View style={styles.badges}>
      {badges.map((b) => (
        <Badge key={b.key} testID={`card-badge-${b.key}`} size="sm" variant={VARIANT[b.tone]}>
          {b.label}
        </Badge>
      ))}
    </View>
  );
}

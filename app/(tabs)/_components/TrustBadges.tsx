import React from 'react';
import { View } from 'react-native';
import { Icon, Text, theme } from '@/ui';
import type { ResolvedTrustBadge } from '@/lib/hero/heroView';
import { badgeStyles as s } from '../_lib/heroStyles';

/**
 * Ana sayfa güven rozeti şeridi (admin'den, web ile aynı). Telefonda 3 sütun;
 * açıklama telefonda gizli (web gibi), başlık en çok 2 satır. Liste boşsa
 * hiçbir şey çizilmez. Taşma: `resolveTrustBadges` listeyi sınırlar.
 */
export function TrustBadges({ badges }: { badges: ResolvedTrustBadge[] }) {
  if (badges.length === 0) return null;
  return (
    <View style={s.section} testID="trust-badges">
      <View style={s.grid}>
        {badges.map((b) => (
          <View
            key={b.id}
            style={s.item}
            accessible
            accessibilityLabel={b.description ? `${b.title}. ${b.description}` : b.title}
          >
            <Icon name={b.icon} size={22} color={theme.colors.primary[500]} style={s.icon} />
            <Text variant="caption" tone="heading" weight="semibold" align="center" numberOfLines={2}>
              {b.title}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

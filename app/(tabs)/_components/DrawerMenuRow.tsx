import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge, Icon, Text, theme } from '@/ui';
import { drawerIconFor } from '../_lib/drawerIcons';
import type { ProfileMenuItem } from '../_lib/profileMenu';

const { colors, spacing, iconSize, controlHeight } = theme;

/** Yan menü satır/başlık yüksekliği (Reddit ~56pt) = controlHeight.xl. */
export const DRAWER_ROW_HEIGHT = controlHeight.xl;

interface DrawerMenuRowProps {
  item: ProfileMenuItem;
  /** Sayaç rozeti (bekleyen teklif/takas); 0 çizilmez. */
  count?: number;
  onPress: (to: string) => void;
}

/**
 * Yan menü satırı (Reddit): solda koyu 24pt outline ikon + 17pt regular etiket (+ opsiyonel alt
 * açıklama, metin/sayaç rozeti). Satır ~56pt.
 */
export function DrawerMenuRow({ item, count = 0, onPress }: DrawerMenuRowProps) {
  const primary = item.tone === 'primary';
  return (
    <Pressable
      testID={item.testID ?? `side-menu-item-${item.key}`}
      accessibilityRole="link"
      onPress={() => onPress(item.to)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Icon name={drawerIconFor(item.key)} size={iconSize.lg} color={colors.text.heading} />
      <View style={styles.labelBox}>
        <Text
          variant="h3"
          tone={primary ? 'primary' : 'heading'}
          weight={primary ? 'medium' : 'regular'}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        {item.description ? (
          <Text variant="bodySm" tone="muted" numberOfLines={2} testID={`${item.testID ?? `side-menu-item-${item.key}`}-description`}>
            {item.description}
          </Text>
        ) : null}
      </View>
      {item.rightBadge ? (
        <Badge variant="default" size="sm">
          {item.rightBadge}
        </Badge>
      ) : null}
      {count > 0 ? (
        <Badge
          variant="danger"
          appearance="solid"
          size="sm"
          testID={item.testID ? `${item.testID}-badge` : undefined}
        >
          {count > 99 ? '99+' : String(count)}
        </Badge>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: DRAWER_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  pressed: { backgroundColor: colors.surface.alt },
  labelBox: { flex: 1 },
});

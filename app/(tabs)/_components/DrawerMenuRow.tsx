import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Badge, Icon, Text, theme } from '@/ui';
import { drawerIconFor } from '../_lib/drawerIcons';
import type { ProfileMenuItem } from '../_lib/profileMenu';

const { colors, spacing, iconSize, minTouchTarget, inactiveIconColor } = theme;

interface DrawerMenuRowProps {
  item: ProfileMenuItem;
  /** Sayaç rozeti (bekleyen teklif/takas); 0 çizilmez. */
  count?: number;
  onPress: (to: string) => void;
}

/** Yan menü satırı: soldaki işlev ikonu (gri) + etiket (+ metin/sayaç rozeti). */
export function DrawerMenuRow({ item, count = 0, onPress }: DrawerMenuRowProps) {
  const primary = item.tone === 'primary';
  return (
    <Pressable
      testID={item.testID ?? `side-menu-item-${item.key}`}
      accessibilityRole="link"
      onPress={() => onPress(item.to)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Icon name={drawerIconFor(item.key)} size={iconSize.md} color={inactiveIconColor} />
      <Text
        variant="body"
        tone={primary ? 'primary' : 'body'}
        weight={primary ? 'medium' : 'regular'}
        style={styles.label}
        numberOfLines={1}
      >
        {item.label}
      </Text>
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
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  pressed: { backgroundColor: colors.surface.alt },
  label: { flex: 1 },
});

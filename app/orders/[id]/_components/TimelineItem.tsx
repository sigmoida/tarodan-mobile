import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, theme } from '@/ui';

const { colors, spacing } = theme;

/** Zaman çizelgesi adımı: durum noktası + bağlayıcı çizgi + etiket/tarih (süs ikonu yok). */
export function TimelineItem({
  label,
  date,
  isActive,
  isLast = false,
  testID,
}: {
  label: string;
  date: string;
  isActive: boolean;
  isLast?: boolean;
  testID?: string;
}) {
  return (
    <View testID={testID} style={styles.item}>
      <View style={styles.rail}>
        <View style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]} />
        {!isLast && <View style={[styles.line, isActive ? styles.lineActive : styles.lineInactive]} />}
      </View>
      <View style={styles.content}>
        <Text variant="bodySm" weight={isActive ? 'medium' : 'regular'} tone={isActive ? 'heading' : 'subtle'}>
          {label}
        </Text>
        <Text variant="caption" tone="muted">
          {date}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: spacing[3] },
  rail: { alignItems: 'center', width: spacing[4] },
  dot: { width: spacing[3], height: spacing[3], borderRadius: theme.radius.full, marginTop: spacing[1] },
  dotActive: { backgroundColor: colors.primary[600]! },
  dotInactive: { backgroundColor: colors.border.DEFAULT },
  line: { width: 2, flex: 1, marginVertical: spacing[1] },
  lineActive: { backgroundColor: colors.primary[600]! },
  lineInactive: { backgroundColor: colors.border.DEFAULT },
  content: { flex: 1, paddingBottom: spacing[4] },
});

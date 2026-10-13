import React from 'react';
import { Pressable } from 'react-native';
import { Text, ListRowCard } from '@/ui';
import { styles } from '../_lib/styles';

/** İstatistik kartı — değer + etiket (ikonsuz), opsiyonel dokunma. */
export function StatCard({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string | number;
  onPress?: () => void;
}) {
  return (
    <ListRowCard direction="column" gap={1} style={styles.statCard} onPress={onPress} disabled={!onPress}>
      <Text variant="h2">{value}</Text>
      <Text variant="caption">{label}</Text>
    </ListRowCard>
  );
}

/** Hızlı işlem satırı — yalnız etiket (web sade liste). */
export function QuickAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress} accessibilityRole="link">
      <Text variant="body">{label}</Text>
    </Pressable>
  );
}

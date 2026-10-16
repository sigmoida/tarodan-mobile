import React from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import { SkeletonBlock, SkeletonLine, theme } from '@/ui';
import { PROFILE_ROW_METRICS as RM } from './ProfileRow';

export interface SkeletonMenuRowProps {
  /** `ProfileRow` ile aynı: `flat` (56pt, kartsız) · `card` (48pt, `SectionCard` içinde). */
  variant?: 'flat' | 'card';
  /** Soldaki ikon yer tutucusu (varsayılan açık). */
  icon?: boolean;
  /** Sağdaki chevron yer tutucusu (varsayılan açık). */
  chevron?: boolean;
  labelWidth?: DimensionValue;
  testID?: string;
}

/**
 * `ProfileRow` iskeleti — satırla AYNI yükseklik, yatay dolgu ve aralık (`PROFILE_ROW_METRICS`):
 * 24'lük ikon + gövde satırı etiket + 20'lik chevron kutusu. Menü gelince satırlar yerinden oynamaz.
 */
export function SkeletonMenuRow({
  variant = 'flat',
  icon = true,
  chevron = true,
  labelWidth = '55%',
  testID,
}: SkeletonMenuRowProps) {
  return (
    <View style={[styles.row, RM[variant]]} testID={testID}>
      {icon ? <SkeletonBlock width={RM.iconSize} height={RM.iconSize} borderRadius={theme.radius.md} /> : null}
      <View style={styles.label}>
        <SkeletonLine variant="body" width={labelWidth} />
      </View>
      {chevron ? (
        <View style={styles.chevron}>
          <SkeletonBlock width={RM.chevronSize / 2} height={RM.chevronSize / 2} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: RM.gap },
  label: { flex: 1 },
  chevron: { width: RM.chevronSize, height: RM.chevronSize, alignItems: 'center', justifyContent: 'center' },
});

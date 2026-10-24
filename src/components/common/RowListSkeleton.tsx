import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonListRow, theme, usePageContentStyle } from '@/ui';

const { spacing } = theme;

/**
 * Satır listeleri (adres, engellenen, bildirim…) için yükleniyor iskeleti — `SkeletonListRow`
 * (avatar + iki satır metin) dizisi, `PageShell` `loadingFallback`'i olarak kullanılır (liste
 * ekranlarında spinner yok). Görünüm/animasyon `@/ui` yükleme modülünden (tek sürücü).
 * Large screens: full width with the tablet gutter, like the lists it stands for.
 */
export const RowListSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  const listStyle = usePageContentStyle(styles.list);
  return (
    <View style={listStyle} testID="row-list-skeleton">
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonListRow key={i} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: { padding: spacing[4], gap: spacing[4] },
});

export default RowListSkeleton;

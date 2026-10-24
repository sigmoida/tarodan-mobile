import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonListRow, theme, useReadableContentStyle, type ContentWidth } from '@/ui';

const { spacing } = theme;

/**
 * Satır listeleri (adres, engellenen, bildirim…) için yükleniyor iskeleti — `SkeletonListRow`
 * (avatar + iki satır metin) dizisi, `PageShell` `loadingFallback`'i olarak kullanılır (liste
 * ekranlarında spinner yok). Görünüm/animasyon `@/ui` yükleme modülünden (tek sürücü).
 * Row lists take the readable width on large screens, so the skeleton does too; a `full` page
 * (card grid) passes `contentWidth="full"` so nothing jumps when the content arrives.
 */
export const RowListSkeleton: React.FC<{ rows?: number; contentWidth?: ContentWidth }> = ({
  rows = 5,
  contentWidth = 'readable',
}) => {
  const readableStyle = useReadableContentStyle(styles.list);
  return (
    <View style={contentWidth === 'readable' ? readableStyle : styles.list} testID="row-list-skeleton">
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

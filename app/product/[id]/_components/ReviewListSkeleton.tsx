import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBlock, SkeletonLine, SkeletonSectionCard, theme } from '@/ui';

const { iconSize, spacing } = theme;

const ROWS = 4;
/** Beş yıldız: ikon boyu × 5 + ikon arası boşluk (`ReviewRow` yıldız satırı). */
const STARS_WIDTH = iconSize.sm * 5 + spacing[0.5] * 4;

/** Tek değerlendirme satırı yer tutucusu: yazar + yıldızlar, başlık, iki satır metin, tarih. */
function ReviewRowSkeleton({ divided }: { divided: boolean }) {
  return (
    <View style={[styles.review, divided && styles.divided]}>
      <View style={styles.header}>
        <SkeletonLine variant="bodySm" width="35%" />
        <SkeletonBlock width={STARS_WIDTH} height={iconSize.sm} />
      </View>
      <SkeletonLine variant="bodySm" width="50%" />
      <SkeletonLine variant="bodySm" width="95%" />
      <SkeletonLine variant="bodySm" width="70%" />
      <SkeletonLine variant="caption" width="25%" />
    </View>
  );
}

/**
 * Ürün değerlendirmeleri listesi iskeleti (`ListEmptyComponent`, ilk yükleme) — puan özeti kartı
 * (yıldız + ortalama + sayı) ve `ReviewRow` geometrisinde dört satır. `useDelayedLoading` ile çağrılır.
 */
export function ReviewListSkeleton() {
  return (
    <View testID="reviews-skeleton">
      <SkeletonSectionCard title={false} style={styles.summary}>
        <View style={styles.summaryRow}>
          <SkeletonBlock width={iconSize.md} height={iconSize.md} />
          <SkeletonLine variant="h2" width={spacing[10]} />
          <SkeletonLine variant="bodySm" width="30%" />
        </View>
      </SkeletonSectionCard>
      {Array.from({ length: ROWS }, (_, i) => (
        <ReviewRowSkeleton key={i} divided={i > 0} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { marginBottom: spacing[3] },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  review: { gap: spacing[1], paddingVertical: spacing[3] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divided: { borderTopWidth: 1, borderTopColor: theme.colors.border.DEFAULT },
});

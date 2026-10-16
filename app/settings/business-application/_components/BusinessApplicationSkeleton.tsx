import React from 'react';
import { StyleSheet } from 'react-native';
import { SkeletonButton, SkeletonChipTabs, SkeletonField, SkeletonPage, SkeletonSectionCard, theme } from '@/ui';

const DETAIL_FIELDS = 7;

/**
 * Kurumsal başvuru iskeleti (`PageShell` `loadingFallback`) — üç sekme çipi ve varsayılan
 * "Şirket bilgileri" sekmesi: tek `SectionCard` içinde 7 form alanı + kaydet düğmesi.
 */
export function BusinessApplicationSkeleton() {
  return (
    <SkeletonPage testID="business-application-skeleton">
      <SkeletonChipTabs count={3} />
      <SkeletonSectionCard style={styles.card}>
        {Array.from({ length: DETAIL_FIELDS }, (_, i) => (
          <SkeletonField key={i} />
        ))}
        <SkeletonButton />
      </SkeletonSectionCard>
    </SkeletonPage>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing[3] },
});

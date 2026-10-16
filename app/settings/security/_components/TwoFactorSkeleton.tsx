import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  SkeletonBlock,
  SkeletonLine,
  SkeletonPage,
  SkeletonSectionCard,
  theme,
} from '@/ui';
import { QR_SIZE } from '../_lib/styles';

const { controlHeight, radius, radiusRole, spacing } = theme;

/** Adım başlığı: numara dairesi (`spacing[6]`) + başlık satırı. */
function StepHeadSkeleton() {
  return (
    <View style={styles.stepHead}>
      <SkeletonBlock width={spacing[6]} height={spacing[6]} borderRadius={radius.full} />
      <SkeletonLine variant="body" width="55%" />
    </View>
  );
}

/**
 * İki adımlı doğrulama iskeleti (`PageShell` `loadingFallback`) — kurulum akışının şekli: "Kurulum"
 * kartı içinde 1) QR'ı tara (ipucu, QR çerçevesi, gizli anahtar satırı), 2) kodu gir (ipucu, kod
 * alanı). Doğrula düğmesi alt barda olduğu için yüklenirken çizilmez.
 */
export function TwoFactorSkeleton() {
  return (
    <SkeletonPage testID="two-factor-skeleton">
      <SkeletonSectionCard style={styles.stack}>
        <StepHeadSkeleton />
        <SkeletonLine variant="bodySm" width="90%" />
        <View style={styles.qr}>
          <SkeletonBlock width={QR_SIZE} height={QR_SIZE} borderRadius={radiusRole.card} />
        </View>
        <SkeletonLine variant="bodySm" width="75%" />
        <View style={styles.secretRow}>
          <SkeletonBlock height={controlHeight.md} borderRadius={radiusRole.card} style={styles.secret} />
          <SkeletonBlock width={controlHeight.md} height={controlHeight.md} borderRadius={radiusRole.button} />
        </View>
        <StepHeadSkeleton />
        <SkeletonLine variant="bodySm" width="80%" />
        <SkeletonBlock width="100%" height={controlHeight.md} borderRadius={radiusRole.input} />
      </SkeletonSectionCard>
    </SkeletonPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing[3] },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  qr: { alignSelf: 'center' },
  secretRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  secret: { flex: 1 },
});

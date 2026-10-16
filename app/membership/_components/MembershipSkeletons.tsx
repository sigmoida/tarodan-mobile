import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Card,
  Divider,
  ListRowCard,
  SkeletonBlock,
  SkeletonButton,
  SkeletonKeyValueRow,
  SkeletonLine,
  SkeletonPage,
  SkeletonSectionCard,
  SkeletonSwitchRow,
  theme,
} from '@/ui';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';

const { controlHeight, iconSize, radius, spacing } = theme;

/** Özellik satırları (onay işareti ikonu + `bodySm` metin) — `TierFeatureList` boyutunda. */
function FeatureLines({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.features}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.feature}>
          <SkeletonBlock width={iconSize.sm} height={iconSize.sm} />
          <SkeletonLine variant="bodySm" width={i % 2 ? '70%' : '85%'} />
        </View>
      ))}
    </View>
  );
}

/** Plan kartı: ad (h3), fiyat (yalnız satın alma açıkken), ayırıcı, özellikler, isteğe bağlı düğme. */
function TierCardSkeleton({ price, button }: { price: boolean; button: boolean }) {
  return (
    <Card variant="bordered" padding={5}>
      <View style={styles.tierBody}>
        <SkeletonLine variant="h3" width="35%" />
        {price ? <SkeletonLine variant="displaySm" width="45%" /> : null}
        <Divider />
        <FeatureLines />
        {button ? <SkeletonButton /> : null}
      </View>
    </Card>
  );
}

/**
 * Üyelik ana ekranı iskeleti — "Mevcut plan" kartı (ad satırı; satın alma açıkken yönetim satırı),
 * "Planları keşfet" satır kartı ve (yalnız `CAN_BUY_DIGITAL`) dönem anahtarı + plan kartları.
 */
export function MembershipSkeleton() {
  return (
    <SkeletonPage testID="membership-skeleton">
      <SkeletonSectionCard>
        <View style={styles.planBody}>
          <SkeletonLine variant="h2" width="35%" />
          {CAN_BUY_DIGITAL ? (
            <ListRowCard padding={3}>
              <SkeletonLine variant="bodySm" width="80%" />
            </ListRowCard>
          ) : null}
        </View>
      </SkeletonSectionCard>
      <ListRowCard>
        <View style={styles.exploreText}>
          <SkeletonLine variant="body" width="50%" />
          <SkeletonLine variant="bodySm" width="85%" />
        </View>
        <SkeletonBlock width={iconSize.md} height={iconSize.md} />
      </ListRowCard>
      {CAN_BUY_DIGITAL ? (
        <>
          <SkeletonBlock width="100%" height={controlHeight.md} borderRadius={radius.lg} />
          <TierCardSkeleton price button />
          <TierCardSkeleton price button />
        </>
      ) : null}
    </SkeletonPage>
  );
}

/** Üyelik planları iskeleti — görünür plan kartları (ad, fiyat yalnız satın alma açıkken, özellikler). */
export function MembershipPlansSkeleton() {
  return (
    <SkeletonPage testID="membership-plans-skeleton">
      <TierCardSkeleton price={CAN_BUY_DIGITAL} button={false} />
      <TierCardSkeleton price={CAN_BUY_DIGITAL} button={false} />
      <TierCardSkeleton price={CAN_BUY_DIGITAL} button={false} />
    </SkeletonPage>
  );
}

/**
 * Üyelik yönetimi iskeleti — mevcut plan kartı (plan/durum rozetleri, dönem satırları, otomatik
 * yenileme anahtarı) ve plan değiştir / iptal eylem düğmeleri.
 */
export function MembershipManageSkeleton() {
  return (
    <SkeletonPage testID="membership-manage-skeleton">
      <SkeletonSectionCard>
        <View style={styles.planBody}>
          <View style={styles.badges}>
            <SkeletonBlock width={spacing[20]} height={spacing[6]} borderRadius={radius.full} />
            <SkeletonBlock width={spacing[16]} height={spacing[5]} borderRadius={radius.full} />
          </View>
          <Divider />
          <SkeletonKeyValueRow />
          <SkeletonKeyValueRow />
          <SkeletonKeyValueRow />
          <Divider />
          <SkeletonSwitchRow />
        </View>
      </SkeletonSectionCard>
      <SkeletonButton />
      <SkeletonButton />
    </SkeletonPage>
  );
}

const styles = StyleSheet.create({
  planBody: { gap: spacing[2] },
  badges: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  exploreText: { flex: 1, minWidth: 0, gap: spacing[0.5] },
  tierBody: { gap: spacing[3] },
  features: { gap: spacing[2] },
  feature: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
});

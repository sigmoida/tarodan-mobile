import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  SkeletonBlock,
  SkeletonKeyValueRow,
  SkeletonLine,
  SkeletonMediaRow,
  SkeletonPage,
  SkeletonSectionCard,
  SkeletonTimeline,
  theme,
} from '@/ui';

const { radius, spacing } = theme;

/**
 * Sipariş detayı iskeleti (`PageShell` `loadingFallback`) — gerçek kart sırası: durum kartı
 * (sipariş no + rozet, 4 adımlı zaman çizelgesi), ürün, satıcı, teslimat adresi ve ödeme özeti.
 * Durum kapılı kartlar (iptal/iade/fatura…) veriyle gelir; iskelet her siparişte olan çekirdeği gösterir.
 */
export function OrderDetailSkeleton() {
  return (
    <SkeletonPage testID="order-detail-skeleton">
      <SkeletonSectionCard title={false} style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <SkeletonLine variant="bodySm" width="45%" />
          <SkeletonBlock width={spacing[20]} height={spacing[6]} borderRadius={radius.full} />
        </View>
        <SkeletonTimeline steps={4} dot={spacing[3]} />
      </SkeletonSectionCard>
      <SkeletonSectionCard title={false}>
        <SkeletonMediaRow />
      </SkeletonSectionCard>
      <SkeletonSectionCard title={false}>
        <SkeletonLine variant="body" width="40%" />
        <SkeletonLine variant="bodySm" width="30%" />
      </SkeletonSectionCard>
      <SkeletonSectionCard>
        <View style={styles.address}>
          <SkeletonLine variant="body" width="40%" />
          <SkeletonLine variant="bodySm" width="85%" />
          <SkeletonLine variant="bodySm" width="55%" />
          <SkeletonLine variant="bodySm" width="45%" />
        </View>
      </SkeletonSectionCard>
      <SkeletonSectionCard>
        <View style={styles.rows}>
          <SkeletonKeyValueRow />
          <SkeletonKeyValueRow />
          <SkeletonKeyValueRow />
          <SkeletonKeyValueRow variant="h3" labelWidth="20%" valueWidth="30%" />
        </View>
      </SkeletonSectionCard>
    </SkeletonPage>
  );
}

const styles = StyleSheet.create({
  statusCard: { gap: spacing[4] },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  address: { gap: spacing[0.5] },
  rows: { gap: spacing[3] },
});

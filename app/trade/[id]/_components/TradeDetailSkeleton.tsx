import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  SkeletonAvatar,
  SkeletonBlock,
  SkeletonButton,
  SkeletonLine,
  SkeletonMediaRow,
  SkeletonPage,
  SkeletonSectionCard,
  theme,
} from '@/ui';

const { radius, radiusRole, spacing, iconSize } = theme;

/** Bir tarafın ürün satırı: 48pt görsel + başlık/adet-fiyat satırları (`CompareItemRow`). */
function ItemRow() {
  return (
    <SkeletonMediaRow
      size={spacing[12]}
      lines={[
        { variant: 'bodySm', width: '70%' },
        { variant: 'caption', width: '40%' },
      ]}
    />
  );
}

function ItemSide() {
  return (
    <View style={styles.side}>
      <SkeletonLine variant="caption" width="30%" />
      <View style={styles.items}>
        <ItemRow />
        <ItemRow />
      </View>
      <View style={styles.totalRow}>
        <SkeletonLine variant="bodySm" width="35%" />
        <SkeletonLine variant="h3" width="25%" />
      </View>
    </View>
  );
}

/**
 * Takas detayı iskeleti (`PageShell` `loadingFallback`) — durum bandı, ilerleme kartı, takas başlığı
 * + karşı taraf, iki tarafın ürünleri ve alt eylem düğmeleri. Duruma bağlı kartlar (nakit, kargo,
 * koruma…) veriyle gelir.
 */
export function TradeDetailSkeleton() {
  return (
    <SkeletonPage testID="trade-detail-skeleton">
      {/* Durum bandı: 12 dolgu + büyük durum ikonu yüksekliği, köşe `radiusRole.card`. */}
      <SkeletonBlock width="100%" height={spacing[3] * 2 + iconSize.lg} borderRadius={radiusRole.card} />
      <SkeletonSectionCard title={false}>
        <View style={styles.stepper}>
          {Array.from({ length: 4 }, (_, i) => (
            <View key={i} style={styles.step}>
              <SkeletonBlock width={spacing[8]} height={spacing[8]} borderRadius={radius.full} />
              <SkeletonLine variant="caption" width="80%" />
            </View>
          ))}
        </View>
      </SkeletonSectionCard>
      <SkeletonSectionCard title={false}>
        <View style={styles.info}>
          <SkeletonLine variant="h3" width="45%" />
          <SkeletonLine variant="caption" width="35%" />
          <View style={styles.otherParty}>
            <SkeletonAvatar size="md" />
            <View style={styles.otherPartyInfo}>
              <SkeletonLine variant="bodySm" width="30%" />
              <SkeletonLine variant="body" width="50%" />
            </View>
          </View>
        </View>
      </SkeletonSectionCard>
      <SkeletonSectionCard title={false}>
        <ItemSide />
        <View style={styles.arrowRow}>
          <SkeletonBlock width="100%" height={iconSize.lg} />
        </View>
        <ItemSide />
      </SkeletonSectionCard>
      <SkeletonButton />
    </SkeletonPage>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing[2] },
  step: { flex: 1, alignItems: 'center', gap: spacing[2] },
  info: { gap: spacing[1] },
  otherParty: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginTop: spacing[3], paddingTop: spacing[3] },
  otherPartyInfo: { flex: 1 },
  side: { gap: spacing[2.5] },
  items: { gap: spacing[2] },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing[3] },
  arrowRow: { marginVertical: spacing[4] },
});

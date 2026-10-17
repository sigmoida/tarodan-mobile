import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ListRowCard, SkeletonAvatar, SkeletonBlock, SkeletonLine, theme } from '@/ui';

const { radius, spacing } = theme;

/** Takas ürün satırı: 44pt küçük görsel + başlık / adet satırı (`TradeCard` `ItemRow`). */
function ItemRowSkeleton() {
  return (
    <View style={styles.itemRow}>
      <SkeletonBlock width={44} height={44} borderRadius={radius.md} />
      <View style={styles.itemBody}>
        <SkeletonLine variant="bodySm" width="70%" />
        <SkeletonLine variant="caption" width="35%" />
      </View>
    </View>
  );
}

function SideSkeleton() {
  return (
    <View>
      <View style={styles.sideHeader}>
        <SkeletonLine variant="caption" width="25%" />
        <SkeletonLine variant="bodySm" width="20%" />
      </View>
      <View style={styles.itemList}>
        <ItemRowSkeleton />
      </View>
    </View>
  );
}

/**
 * `TradeCard` iskeleti — kartla aynı sıra ve boşluk: karşı taraf başlığı (avatar + iki satır + durum
 * rozeti), iki taraflı takas paneli (ayırıcı boşlukla) ve alt satır (tarih · numara · "Detaylar").
 */
export function SkeletonTradeCard({ testID }: { testID?: string }) {
  return (
    <ListRowCard direction="column" gap={0} style={styles.card} testID={testID}>
      <View style={styles.header}>
        <SkeletonAvatar size="md" />
        <View style={styles.headerText}>
          <SkeletonLine variant="caption" width="30%" />
          <SkeletonLine variant="body" width="55%" />
        </View>
        <SkeletonBlock width={spacing[16]} height={spacing[6]} borderRadius={radius.full} />
      </View>
      <View style={styles.panel}>
        <SideSkeleton />
        <View style={styles.divider} />
        <SideSkeleton />
      </View>
      <View style={styles.footer}>
        <SkeletonLine variant="caption" width="40%" />
        <SkeletonLine variant="caption" width="18%" />
      </View>
    </ListRowCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing[3] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[2.5], marginBottom: spacing[3] },
  headerText: { flex: 1 },
  panel: { padding: spacing[3] },
  sideHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemList: { gap: spacing[2], marginTop: spacing[2] },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2.5] },
  itemBody: { flex: 1 },
  // Takas oku ayırıcısı: 26pt daire + üst/alt boşluk (`TradeCard` `swapCircle`).
  divider: { height: 26, marginVertical: spacing[2.5] },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    marginTop: spacing[3],
    paddingTop: spacing[2.5],
  },
});

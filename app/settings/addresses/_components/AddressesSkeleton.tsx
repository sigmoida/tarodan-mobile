import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ListRowCard,
  SkeletonBlock,
  SkeletonField,
  SkeletonLine,
  SkeletonPage,
  SkeletonSectionCard,
  theme,
} from '@/ui';

const { controlHeight, radius, spacing } = theme;

/** Tek kayıtlı adres satırı yer tutucusu — `AddressCard` ile aynı çerçeve/dolgu: başlık, ad, telefon, adres, sağda iki ikon düğmesi. */
function AddressRowSkeleton() {
  return (
    <ListRowCard gap={4} style={styles.row}>
      <View style={styles.rowBody}>
        <SkeletonLine variant="label" width="35%" style={styles.rowTitle} />
        <SkeletonLine variant="bodySm" width="50%" />
        <SkeletonLine variant="bodySm" width="45%" />
        <SkeletonLine variant="bodySm" width="90%" style={styles.rowDetail} />
        <SkeletonLine variant="bodySm" width="60%" />
      </View>
      <View style={styles.rowActions}>
        <SkeletonBlock width={controlHeight.sm} height={controlHeight.sm} borderRadius={radius.md} />
        <SkeletonBlock width={controlHeight.sm} height={controlHeight.sm} borderRadius={radius.md} />
      </View>
    </ListRowCard>
  );
}

/**
 * Adres listesi iskeleti (`PageShell` `loadingFallback`) — "1/3 adres kayıtlı" satırı ve tek
 * `SectionCard` içinde üç adres satırı (gerçek ekranın düzeni).
 */
export function AddressesSkeleton() {
  return (
    <SkeletonPage testID="addresses-skeleton">
      <SkeletonLine variant="bodySm" width="40%" />
      <SkeletonSectionCard title={false}>
        <View style={styles.list}>
          <AddressRowSkeleton />
          <AddressRowSkeleton />
          <AddressRowSkeleton />
        </View>
      </SkeletonSectionCard>
    </SkeletonPage>
  );
}

/**
 * Adres formu iskeleti (`addresses/[id]/edit` yüklenirken) — tek `SectionCard` içinde form alanları:
 * başlık, ad, telefon, adres (çok satırlı), il, ilçe, posta kodu ve "varsayılan yap" satırı.
 */
export function AddressFormSkeleton() {
  return (
    <SkeletonPage testID="address-form-skeleton">
      <SkeletonSectionCard title={false}>
        <SkeletonField />
        <SkeletonField />
        <SkeletonField />
        <SkeletonField multiline />
        <SkeletonField />
        <SkeletonField />
        <SkeletonField />
        <SkeletonLine variant="body" width="45%" />
      </SkeletonSectionCard>
    </SkeletonPage>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing[3] },
  row: { alignItems: 'flex-start' },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { marginBottom: spacing[1] },
  rowDetail: { marginTop: spacing[1] },
  rowActions: { flexDirection: 'row', gap: spacing[1] },
});

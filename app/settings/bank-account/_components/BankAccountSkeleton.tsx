import React from 'react';
import { StyleSheet } from 'react-native';
import { SkeletonField, SkeletonLine, SkeletonPage, SkeletonSectionCard, theme } from '@/ui';

/**
 * Banka hesabı iskeleti (`PageShell` `loadingFallback`) — tek `SectionCard`: ödeme ipucu (iki
 * satır) ve üç form alanı (hesap sahibi, IBAN, vergi no). Kayıtlı hesap özeti ve "Kaydet" alt barı
 * veriye bağlı/yüklenirken çizilmez.
 */
export function BankAccountSkeleton() {
  return (
    <SkeletonPage testID="bank-account-skeleton">
      <SkeletonSectionCard title={false}>
        <SkeletonLine variant="bodySm" width="95%" />
        <SkeletonLine variant="bodySm" width="65%" style={styles.hint} />
        <SkeletonField />
        <SkeletonField />
        <SkeletonField />
      </SkeletonSectionCard>
    </SkeletonPage>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: theme.spacing[3] },
});

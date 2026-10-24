import { View } from 'react-native';
import { theme } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { PageShell } from '@/components/common/PageShell';
import UserActionsButton from '@/components/UserActionsSheet';
import { useSellerProfile } from './_hooks/useSellerProfile';
import { SellerProfileCard } from './_components/SellerProfileCard';
import { SellerTabs } from './_components/SellerTabs';
import { SellerProfileSkeleton } from './_components/SellerProfileSkeleton';

/**
 * Satıcı herkese açık profili — PageShell (üstte şikayet/engelle menüsü) içinde başlık kartı ve
 * sekmeler. `useSellerProfile` 5 sorgu, yenileme, aktif sekme ve mesaj/takip işleyicilerinin sahibi.
 */
export default function SellerProfileScreen() {
  const { t } = useTranslation();
  const f = useSellerProfile();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  return (
    <PageShell
      title={t('seller.sellerProfile')}
      onBack={goBack}
      // Listing / collection grids: full width on tablets (more columns), not the readable width.
      contentWidth="full"
      loading={f.isLoading}
      loadingFallback={<SellerProfileSkeleton />}
      error={f.loadFailed || undefined}
      onRetry={f.retry}
      empty={!f.isLoading && !f.seller}
      emptyState={{
        icon: 'user',
        title: t('seller.notFound'),
        subtitle: t('seller.notFoundDesc'),
        actionLabel: t('common.goBack'),
        onAction: goBack,
      }}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
      right={
        f.seller && !f.isOwnProfile ? (
          // Apple App Review 1.2: satıcı profilinden şikayet + engelleme.
          <UserActionsButton
            testID="seller-actions-button"
            userId={f.sellerId}
            userName={f.seller.displayName || f.seller.companyName || ''}
            glass
            onBlocked={goBack}
          />
        ) : undefined
      }
    >
      {f.seller ? (
        <View style={{ gap: theme.spacing[4] }}>
          <SellerProfileCard f={f} />
          <SellerTabs f={f} />
        </View>
      ) : null}
    </PageShell>
  );
}

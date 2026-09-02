import { View, ScrollView } from 'react-native';
import { Spinner, Text, ScreenHeader, EmptyState, theme } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedRefreshControl } from '@/components/common';
import UserActionsButton from '@/components/UserActionsSheet';
import { styles } from './_lib/styles';
import { useSellerProfile } from './_hooks/useSellerProfile';
import { SellerProfileCard } from './_components/SellerProfileCard';
import { SellerTabs } from './_components/SellerTabs';

/**
 * Seller public profile — THIN screen. The `useSellerProfile` controller owns
 * the 5 queries, refresh, active tab, and message handler; this file renders
 * the loading/not-found gates and composes the profile card + tabs.
 */
export default function SellerProfileScreen() {
  const { t } = useTranslation();
  const f = useSellerProfile();

  if (f.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size="lg" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!f.seller) {
    return (
      <EmptyState
        fullscreen
        icon="person-outline"
        title={t('seller.notFound')}
        actionLabel={t('common.goBack')}
        onAction={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('seller.sellerProfile')}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        right={
          f.isOwnProfile ? null : (
            // Apple App Review 1.2: satıcı profilinden şikayet + engelleme.
            <UserActionsButton
              testID="seller-actions-button"
              userId={f.sellerId}
              userName={f.seller.displayName || f.seller.companyName || ''}
              color={theme.colors.white}
              onBlocked={() =>
                router.canGoBack() ? router.back() : router.replace('/(tabs)')
              }
            />
          )
        }
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<ThemedRefreshControl refreshing={f.refreshing} onRefresh={f.onRefresh} />}
      >
        <SellerProfileCard f={f} />
        <SellerTabs f={f} />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

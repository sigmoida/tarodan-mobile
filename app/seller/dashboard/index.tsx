import { View, ScrollView, RefreshControl } from 'react-native';
import { theme } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenHeader, EmptyState, ScreenLoader } from '@/components/common';
import { useSellerDashboard } from './_hooks/useSellerDashboard';
import { styles } from './_lib/styles';
import {
  WelcomeCard,
  StatsGrid,
  QuickActions,
  SummaryCard,
} from './_components/DashboardSections';

const { colors } = theme;

export default function SellerDashboardScreen() {
  const { t } = useTranslation();
  const f = useSellerDashboard();

  if (!f.isAuthenticated) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('sellerDashboard.title')} />
        <EmptyState
          fullscreen
          icon="storefront-outline"
          title={t('sellerDashboard.loginPrompt')}
          actionLabel={t('common.login')}
          onAction={() => router.push('/(auth)/login')}
        />
      </View>
    );
  }

  if (f.isLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('sellerDashboard.title')} />
        <ScreenLoader />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('sellerDashboard.title')} subtitle={f.user?.displayName} />
      <ScrollView
        contentContainerStyle={styles.scrollBody}
        refreshControl={
          <RefreshControl
            refreshing={f.isRefetching}
            onRefresh={f.refresh}
            colors={[colors.primary[600]!]}
            tintColor={colors.primary[600]!}
          />
        }
      >
        <WelcomeCard f={f} />
        <StatsGrid f={f} />
        <QuickActions />
        <SummaryCard f={f} />
      </ScrollView>
    </View>
  );
}

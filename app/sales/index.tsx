import { View, FlatList } from 'react-native';
import { EmptyState, SkeletonCard, pageListContentStyle } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import { useSales } from './_hooks/useSales';
import { useSaleActions } from './_hooks/useSaleActions';
import { styles } from './_lib/styles';
import { SalesEarnings } from './_components/SalesEarnings';
import { SalesFilterChips } from './_components/SalesFilterChips';
import { SaleCard } from './_components/SaleCard';
import { ShipDialog } from './_modals/ShipDialog';

/**
 * Satışlarım — PageShell (`list` modu) + kazanç kartı + filtre chip'leri + SaleCard listesi.
 * Yükleme Skeleton; boş durum chip'leri gizlemez. Gönderim diyaloğu `overlay`'de.
 */
export default function SalesScreen() {
  const { t } = useTranslation();
  const s = useSales();
  const actions = useSaleActions();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  if (!s.isAuthenticated) {
    return (
      <PageShell
        title={t('sellerDashboard.mySales')}
        onBack={back}
        empty
        emptyState={{
          icon: 'storefront-outline',
          title: t('sellerDashboard.mySales'),
          description: t('sale.authGateSubtitle'),
          actionLabel: t('common.login'),
          onAction: () => router.push('/(auth)/login'),
        }}
      />
    );
  }

  const loading = s.isLoading && s.sales.length === 0;

  return (
    <PageShell
      title={t('sellerDashboard.mySales')}
      onBack={back}
      mode="list"
      overlay={<ShipDialog actions={actions} />}
    >
      <FlatList
        data={loading ? [] : s.filteredSales}
        keyExtractor={(sale) => sale.id}
        contentContainerStyle={[pageListContentStyle, styles.list]}
        refreshing={s.refreshing}
        onRefresh={s.onRefresh}
        ListHeaderComponent={
          <View style={styles.header}>
            <SalesEarnings totalEarnings={s.totalEarnings} pendingEarnings={s.pendingEarnings} />
            <SalesFilterChips filter={s.filter} onSelect={s.setFilter} />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.list}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : (
            <EmptyState
              icon="cart-outline"
              title={t('sale.emptyTitle')}
              description={t('sale.emptySubtitle')}
              actionLabel={t('product.createListing')}
              onAction={() => router.push('/(tabs)/sell')}
            />
          )
        }
        renderItem={({ item: sale }) => <SaleCard sale={sale} actions={actions} />}
      />
    </PageShell>
  );
}

import { View, FlatList, RefreshControl } from 'react-native';
import { Button, Spinner, Text, theme, ScreenHeader } from '@/ui';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSales } from './_hooks/useSales';
import { useSaleActions } from './_hooks/useSaleActions';
import { styles } from './_lib/styles';
import { SalesAuthGate } from './_components/SalesAuthGate';
import { SalesEarnings } from './_components/SalesEarnings';
import { SalesFilterChips } from './_components/SalesFilterChips';
import { SaleCard } from './_components/SaleCard';
import { ShipDialog } from './_modals/ShipDialog';

const { colors } = theme;

export default function SalesScreen() {
  const { t } = useTranslation();
  const s = useSales();
  const actions = useSaleActions();

  if (!s.isAuthenticated) {
    return <SalesAuthGate />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('sellerDashboard.mySales')}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />

      <SalesEarnings totalEarnings={s.totalEarnings} pendingEarnings={s.pendingEarnings} />

      <SalesFilterChips filter={s.filter} onSelect={s.setFilter} />

      {s.isLoading && s.sales.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Spinner size="lg" />
        </View>
      ) : s.filteredSales.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color={colors.text.subtle} />
          <Text variant="h3" style={styles.emptyTitle}>{t('sale.emptyTitle')}</Text>
          <Text variant="body" tone="muted" style={styles.emptySubtitle}>
            {t('sale.emptySubtitle')}
          </Text>
          <Button
            variant="primary"
            title={t('product.createListing')}
            onPress={() => router.push('/(tabs)/sell')}
            style={{ alignSelf: 'center' }}
          />
        </View>
      ) : (
        <FlatList
          data={s.filteredSales}
          keyExtractor={(sale) => sale.id}
          style={styles.salesList}
          refreshControl={
            <RefreshControl refreshing={s.refreshing} onRefresh={s.onRefresh} colors={[colors.primary[600]!]} />
          }
          ListFooterComponent={<View style={{ height: 100 }} />}
          renderItem={({ item: sale }) => <SaleCard sale={sale} actions={actions} />}
        />
      )}

      <ShipDialog actions={actions} />
    </View>
  );
}

import { View, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenLoader, ErrorState } from '@/ui';
import { ScreenHeader, ThemedRefreshControl } from '@/components/common';
import { useSaleDetail } from './_hooks/useSaleDetail';
import { styles } from './_lib/styles';
import { SaleDetailBody } from './_components/SaleDetailBody';

export default function SaleDetailScreen() {
  const { t } = useTranslation();
  const f = useSaleDetail();

  if (f.isLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('order.orderDetails')} />
        <ScreenLoader />
      </View>
    );
  }

  if (f.error || !f.order) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('order.orderDetails')} />
        <ErrorState fullscreen onRetry={() => f.refetch()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={
          f.order.orderNumber
            ? t('sale.orderNumberTitle', { number: f.order.orderNumber })
            : t('order.order')
        }
      />
      <ScrollView
        contentContainerStyle={styles.scrollBody}
        refreshControl={<ThemedRefreshControl refreshing={f.refreshing} onRefresh={f.onRefresh} />}
      >
        <SaleDetailBody f={f} />
      </ScrollView>
    </View>
  );
}

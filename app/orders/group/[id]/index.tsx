import { useTranslation } from 'react-i18next';
import { View, ScrollView, RefreshControl } from 'react-native';
import { Button, Snackbar, Spinner, Text, ScreenHeader, theme } from '@/ui';
import { CancelOrderModal } from '@/components/orders/CancelOrderModal';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOrderGroup } from './_hooks/useOrderGroup';
import { styles } from './_lib/styles';
import { GroupHeader, GroupOrderRow } from './_components/GroupSections';

const { colors } = theme;

export default function OrderGroupDetailScreen() {
  const { t } = useTranslation();
  const f = useOrderGroup();

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Sipariş Detayı"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      />

      {f.isLoading ? (
        <View style={styles.center}>
          <Spinner size="lg" />
        </View>
      ) : f.error || !f.group ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.text.subtle} />
          <Text style={styles.errorText}>{t('order.groupLoadFailed')}</Text>
          <Button variant="primary" title="Tekrar Dene" onPress={() => f.refetch()} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl refreshing={f.refreshing} onRefresh={f.onRefresh} colors={[colors.primary[600]!]} />
          }
        >
          <GroupHeader group={f.group} />
          {f.group.orders.map((order) => (
            <GroupOrderRow key={order.id} order={order} multi={f.group!.orders.length > 1} />
          ))}
          {/*
            Sepetin tamamını iptal — web'de 2026-08-12'den beri var. Kapı
            `cancel.available`: tek kalem bile kargoya verilmişse sunucu
            reddediyor, butonu göstermek kullanıcıyı o hataya yürütürdü.
          */}
          {f.cancel.available ? (
            <Button
              testID="group-cancel-button"
              variant="outline"
              icon="close-circle-outline"
              fullWidth
              title={t('order.cancelOrder')}
              onPress={f.cancel.open}
              disabled={f.cancel.isPending}
              style={{ marginTop: theme.spacing[4], borderColor: colors.danger[600]! }}
            />
          ) : null}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      <CancelOrderModal
        isOpen={f.cancel.visible}
        onClose={f.cancel.close}
        onConfirm={f.cancel.confirm}
        willRefund={f.cancel.willRefund}
        pending={f.cancel.isPending}
      />

      <Snackbar
        visible={f.snackbar.visible}
        onDismiss={f.dismissSnackbar}
        duration={3500}
        variant={f.snackbar.variant}
      >
        {f.snackbar.message}
      </Snackbar>
    </View>
  );
}

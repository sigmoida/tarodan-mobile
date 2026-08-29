import { View, ScrollView, RefreshControl } from 'react-native';
import { Chip, Snackbar, Spinner, theme } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenHeader, EmptyState } from '@/components/common';
import { usePayments } from './_hooks/usePayments';
import { styles } from './_lib/styles';
import { buildStatusOptions } from './_lib/status';
import { PaymentCard } from './_components/PaymentCard';

const { colors } = theme;

export default function PaymentsScreen() {
  const { t } = useTranslation();
  const f = usePayments();
  const statusOptions = buildStatusOptions(t);

  if (!f.isAuthenticated) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('mobile.settingsPayments')} />
        <EmptyState
          icon="lock-closed-outline"
          title={t('listing.loginRequiredTitle')}
          subtitle={t('payment.myPaymentsLoginSubtitle')}
          actionLabel={t('common.login')}
          onAction={() => router.push('/(auth)/login' as any)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('mobile.settingsPayments')} />

      {/* Status filtresi */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {statusOptions.map((opt) => (
          <Chip
            key={opt.value || 'all'}
            label={opt.label}
            variant="primary"
            selected={f.statusFilter === opt.value}
            onPress={() => f.setStatusFilter(opt.value)}
            style={styles.filterChip}
          />
        ))}
      </ScrollView>

      {f.paymentsQuery.isLoading ? (
        <View style={styles.loading}>
          <Spinner size="lg" />
        </View>
      ) : f.payments.length === 0 ? (
        <EmptyState
          icon="card-outline"
          title={t('payment.noPaymentsTitle')}
          subtitle={
            f.statusFilter
              ? t('payment.noPaymentsFilteredSubtitle')
              : t('payment.noPaymentsSubtitle')
          }
        />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ padding: theme.spacing[4], paddingBottom: theme.spacing[8] }}
          refreshControl={
            <RefreshControl
              refreshing={f.paymentsQuery.isFetching}
              onRefresh={() => f.paymentsQuery.refetch()}
              colors={[colors.primary[600]!]}
            />
          }
        >
          {f.payments.map((p) => (
            <PaymentCard key={p.id} p={p} f={f} />
          ))}
        </ScrollView>
      )}

      <Snackbar
        visible={f.snackbar.visible}
        onDismiss={() => f.setSnackbar({ visible: false, message: '' })}
        duration={2000}
        variant="success"
      >
        {f.snackbar.message}
      </Snackbar>
    </View>
  );
}

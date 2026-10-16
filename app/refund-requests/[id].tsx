import { useRefundStatusConfig } from '@/lib/shared/refundStatus';
import { View } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { Button, SectionCard, Text, StatusBadge, appAlert, theme } from '@/ui';
import { refundReasonLabel } from '@/lib/shared/status-configs';
import { useState, useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { refundsApi } from '@/lib/api';
import { qk, useAppMutation } from '@/lib/query';
import { formatPrice } from '@/utils/format';
import { useAuthStore } from '@/stores/authStore';
import { FOCUS_LIST_STALE_MS, useRefetchStaleOnFocus } from '@/hooks/useRefetchStaleOnFocus';
import { captureException } from '@/services/sentry';
import { PageShell } from '@/components/common/PageShell';
import { refundHistoryActionLabel } from './_lib/history';
import { styles } from './_lib/styles';

function formatDate(value?: string): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** İade talebi detayı — PageShell + SectionCard dizisi (durum/ürün, bilgiler, zaman çizelgesi, iptal). */
export default function RefundDetailScreen() {
  const { t } = useTranslation();
  const refundStatusConfig = useRefundStatusConfig();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);

  // Anahtar sorgu ile odak tazelemesi arasında tek yerde.
  const detailKey = qk.refunds.detail(String(id ?? ''));
  const { data, isLoading, refetch } = useQuery({
    queryKey: detailKey,
    queryFn: async () => {
      const res: any = await refundsApi.getById(id as string);
      return (res?.data?.data ?? res?.data ?? res) as any;
    },
    enabled: isAuthenticated && !!id,
    // Durum satıcıdan değişir: dönüşte bundan eskiyse tazelenir.
    staleTime: FOCUS_LIST_STALE_MS,
  });

  const cancelMutation = useAppMutation(() => refundsApi.cancel(id as string), {
    invalidates: [qk.refunds.all],
    success: t('refund.cancel.successMessage'),
    error: t('common.genericError'),
    onSuccess: () => {
      refetch();
    },
    onError: (e) => captureException(e, { level: 'error', tags: { flow: 'refund.detail.cancel' } }),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Ekrana dönüşte yalnız bayatsa tazele (her odakta değil; ilk açılışta ikinci istek yok).
  useRefetchStaleOnFocus([detailKey], isAuthenticated && !!id);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  if ((isLoading && !data) || !data) {
    return (
      <PageShell
        title={t('refund.detail.title')}
        onBack={back}
        loading={isLoading && !data}
        empty={!isLoading && !data}
        emptyState={{ icon: 'receipt-percent', title: t('refund.detail.notFound'), subtitle: t('emptyState.notFoundHint') }}
      />
    );
  }

  const rr = data;
  const isRequester = !!user?.id && rr.requesterId === user.id;
  const canCancel = isRequester && rr.status === 'pending_review';
  const history: Array<{ action?: string; at?: string; by?: string }> =
    Array.isArray(rr?.metadata?.history) ? rr.metadata.history : [];
  const productTitle = rr.order?.product?.title ?? t('order.product');
  const productImage = rr.order?.product?.images?.[0];

  return (
    <PageShell title={t('refund.detail.title')} onBack={back} refreshing={refreshing} onRefresh={onRefresh}>
      {/* Durum + sipariş no */}
      <SectionCard bodyStyle={styles.card}>
        <View style={styles.cardHeader}>
          <Text variant="caption" tone="muted">
            #{rr.refundNumber ?? rr.order?.orderNumber ?? String(rr.id).slice(0, 8)}
          </Text>
          <StatusBadge status={rr.status} config={refundStatusConfig} size="sm" />
        </View>
        <View style={styles.productRow}>
          {productImage ? (
            <AppImage source={productImage} style={styles.productImage} />
          ) : (
            <View style={styles.productImage} />
          )}
          <View style={styles.productInfo}>
            <Text variant="body" weight="medium" tone="heading" numberOfLines={2}>{productTitle}</Text>
            <Text variant="body" weight="semibold" style={{ color: theme.priceColor.detail }}>
              {formatPrice(rr.amount)}
            </Text>
          </View>
        </View>
      </SectionCard>

      {/* İade bilgileri */}
      <SectionCard title={t('refund.detail.infoTitle')} bodyStyle={styles.card}>
        <Row label={t('common.reason')} value={refundReasonLabel(rr.reason, t)} />
        {rr.description ? <Row label={t('common.description')} value={rr.description} /> : null}
        {rr.order?.seller?.displayName ? <Row label={t('product.seller')} value={rr.order.seller.displayName} /> : null}
        {rr.requester?.displayName && !isRequester ? <Row label={t('order.buyer')} value={rr.requester.displayName} /> : null}
        {rr.returnTrackingNumber ? <Row label={t('refund.detail.trackingLabel')} value={rr.returnTrackingNumber} /> : null}
        {rr.createdAt ? <Row label={t('refund.detail.requestDateLabel')} value={formatDate(rr.createdAt)} /> : null}
      </SectionCard>

      {/* Zaman çizelgesi (web'de yok; sade hali) */}
      {history.length > 0 ? (
        <SectionCard title={t('refund.detail.timelineTitle')} bodyStyle={styles.card}>
          {history.map((h, i) => (
            <View key={i} style={styles.timelineRow}>
              <View style={styles.timelineDot} />
              <View style={{ flex: 1 }}>
                <Text variant="bodySm">{refundHistoryActionLabel(h.action, t)}</Text>
                <Text variant="caption" tone="muted">{formatDate(h.at)}</Text>
              </View>
            </View>
          ))}
        </SectionCard>
      ) : null}

      {canCancel ? (
        <Button
          variant="danger"
          fullWidth
          title={t('refund.cancel.cta')}
          onPress={() =>
            appAlert(t('refund.cancel.confirmTitle'), t('refund.cancel.confirmBody'), [
              { text: t('order.cancelConfirmNo'), style: 'cancel' },
              { text: t('order.cancelShort'), style: 'destructive', onPress: () => cancelMutation.mutate() },
            ])
          }
          isLoading={cancelMutation.isPending}
        />
      ) : null}
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="bodySm" tone="muted">{label}</Text>
      <Text variant="bodySm" weight="medium" style={styles.rowValue}>{value}</Text>
    </View>
  );
}

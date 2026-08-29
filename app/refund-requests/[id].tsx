import { useRefundStatusConfig } from '@/lib/shared/refundStatus';
import { View, ScrollView, StyleSheet, Image, RefreshControl } from 'react-native';
import {
  Button,
  Card,
  Spinner,
  Text,
  StatusBadge,
  theme,
  ScreenHeader,
  appAlert,
} from '@/ui';
import type { BadgeVariant } from '@/ui';
import { refundReasonLabel } from '@/lib/shared/status-configs';
import { useState, useCallback } from 'react';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { refundsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { captureException } from '@/services/sentry';

const { colors } = theme;

// Süreç (metadata.history) aksiyon adlarının katalog karşılığı (refund.service appendHistory).
const buildActionLabels = (t: TFunction): Record<string, string> => ({
  return_opened: t('refund.history.returnOpened'),
  accepted_by_seller: t('refund.history.acceptedBySeller'),
  rejected_by_seller: t('refund.history.rejectedBySeller'),
  cancelled_by_buyer: t('refund.history.cancelledByBuyer'),
  refund_completed: t('refund.history.refundCompleted'),
  policy_overridden: t('refund.history.policyOverridden'),
  return_shipping_payer_changed: t('refund.history.payerChanged'),
});

function formatPrice(value?: number): string {
  const n = Number(value ?? 0);
  return `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value?: string): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function RefundDetailScreen() {
  const { t } = useTranslation();
  const refundStatusConfig = useRefundStatusConfig();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const actionLabels = buildActionLabels(t);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['refund-requests', 'detail', id],
    queryFn: async () => {
      const res: any = await refundsApi.getById(id as string);
      return (res?.data?.data ?? res?.data ?? res) as any;
    },
    enabled: isAuthenticated && !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['refund-requests'] });
  };

  const cancelMutation = useMutation({
    mutationFn: () => refundsApi.cancel(id as string),
    onSuccess: () => {
      appAlert(t('common.success'), t('refund.cancel.successMessage'));
      invalidate();
      refetch();
    },
    onError: (e: any) => {
      captureException(e, { level: 'error', tags: { flow: 'refund.detail.cancel' } });
      appAlert(t('common.error'), e?.response?.data?.message || t('common.genericError'));
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  if (isLoading && !data) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('refund.detail.title')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
        <View style={styles.loadingContainer}><Spinner size="lg" /></View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('refund.detail.title')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.text.subtle} />
          <Text variant="h3" style={styles.emptyTitle}>{t('refund.detail.notFound')}</Text>
        </View>
      </View>
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
    <View style={styles.container}>
      <ScreenHeader title={t('refund.detail.title')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary[600]!]} />}
      >
        {/* Durum + sipariş no */}
        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardHeader}>
            <Text variant="caption" style={styles.muted}>
              #{rr.refundNumber ?? rr.order?.orderNumber ?? String(rr.id).slice(0, 8)}
            </Text>
            <StatusBadge status={rr.status} config={refundStatusConfig} size="sm" />
          </View>
          <View style={styles.productRow}>
            {productImage ? (
              <Image source={{ uri: productImage }} style={styles.productImage} />
            ) : (
              <View style={[styles.productImage, styles.productImagePlaceholder]}>
                <Ionicons name="image-outline" size={22} color={colors.text.subtle} />
              </View>
            )}
            <View style={styles.productInfo}>
              <Text variant="label" numberOfLines={2}>{productTitle}</Text>
              <Text variant="h3" style={styles.amount}>{formatPrice(rr.amount)}</Text>
            </View>
          </View>
        </Card>

        {/* İade bilgileri */}
        <Card variant="elevated" style={styles.card}>
          <Text variant="label" style={styles.sectionTitle}>{t('refund.detail.infoTitle')}</Text>
          <Row label={t('common.reason')} value={refundReasonLabel(rr.reason, t)} />
          {rr.description ? <Row label={t('common.description')} value={rr.description} /> : null}
          {rr.order?.seller?.displayName ? <Row label={t('product.seller')} value={rr.order.seller.displayName} /> : null}
          {rr.requester?.displayName && !isRequester ? <Row label={t('order.buyer')} value={rr.requester.displayName} /> : null}
          {rr.returnTrackingNumber ? <Row label={t('refund.detail.trackingLabel')} value={rr.returnTrackingNumber} /> : null}
          {rr.createdAt ? <Row label={t('refund.detail.requestDateLabel')} value={formatDate(rr.createdAt)} /> : null}
        </Card>

        {/* Zaman çizelgesi */}
        {history.length > 0 ? (
          <Card variant="elevated" style={styles.card}>
            <Text variant="label" style={styles.sectionTitle}>{t('refund.detail.timelineTitle')}</Text>
            {history.map((h, i) => (
              <View key={i} style={styles.timelineRow}>
                <View style={styles.timelineDot} />
                <View style={{ flex: 1 }}>
                  <Text variant="caption">{actionLabels[h.action ?? ''] ?? h.action ?? '—'}</Text>
                  <Text variant="caption" style={styles.muted}>{formatDate(h.at)}</Text>
                </View>
              </View>
            ))}
          </Card>
        ) : null}

        {canCancel ? (
          <View style={styles.actions}>
            <Button
              variant="ghost"
              title={t('refund.cancel.cta')}
              onPress={() =>
                appAlert(t('refund.cancel.confirmTitle'), t('refund.cancel.confirmBody'), [
                  { text: t('order.cancelConfirmNo'), style: 'cancel' },
                  { text: t('order.cancelShort'), style: 'destructive', onPress: () => cancelMutation.mutate() },
                ])
              }
              isLoading={cancelMutation.isPending}
            />
          </View>
        ) : null}
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" style={styles.rowLabel}>{label}</Text>
      <Text variant="caption" style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.alt },
  scroll: { flex: 1, paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[3] },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing[8] },
  emptyTitle: { marginTop: theme.spacing[4] },
  card: { marginBottom: theme.spacing[3] },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[2.5] },
  muted: { color: colors.text.muted },
  productRow: { flexDirection: 'row', gap: theme.spacing[3], alignItems: 'center' },
  productImage: { width: 56, height: 56, borderRadius: theme.radius.xl, backgroundColor: colors.surface.alt },
  productImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1, gap: theme.spacing[0.5] },
  amount: { marginTop: theme.spacing[0.5], color: colors.primary[600]! },
  sectionTitle: { marginBottom: theme.spacing[2] },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: theme.spacing[1], gap: theme.spacing[3] },
  rowLabel: { color: colors.text.muted },
  rowValue: { flex: 1, textAlign: 'right' },
  timelineRow: { flexDirection: 'row', gap: theme.spacing[2.5], alignItems: 'flex-start', paddingVertical: theme.spacing[1.5] },
  timelineDot: { width: 8, height: 8, borderRadius: theme.radius.md, backgroundColor: colors.primary[600]!, marginTop: 5 },
  actions: { marginTop: theme.spacing[1], marginBottom: theme.spacing[2] },
});

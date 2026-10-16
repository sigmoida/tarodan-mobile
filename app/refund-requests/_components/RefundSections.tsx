import React from 'react';
import { View, Pressable } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Chip, EmptyState, SectionCard, StatusBadge, Text, theme, appAlert, useDelayedLoading } from '@/ui';
import { refundReasonLabel } from '@/lib/shared/status-configs';
import { useRefundStatusConfig } from '@/lib/shared/refundStatus';

import { styles } from '../_lib/styles';
import { RefundCardSkeleton } from './RefundCardSkeleton';
import { formatPrice } from '../_lib/format';
import type { RefundRequestRow } from '../_lib/types';
import type { RefundRequestsController } from '../_hooks/useRefundRequests';

type Props = { f: RefundRequestsController };

/** Alıcı / satıcı sekmeleri. */
export function RefundTabs({ f }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.tabRow}>
      <Chip
        testID="refunds-tab-buyer"
        label={t('refund.tabMine')}
        selected={f.tab === 'buyer'}
        onPress={() => f.setTab('buyer')}
        style={styles.tabChip}
      />
      <Chip
        testID="refunds-tab-seller"
        label={t('refund.tabOpenedAgainstMe')}
        selected={f.tab === 'seller'}
        onPress={() => f.setTab('seller')}
        style={styles.tabChip}
      />
    </View>
  );
}

/**
 * Satıcı sekmesinin salt-okunur uyarısı.
 *
 * API'de onay/ret ucu tanımlı değil (üretilen katalogda yalnız beş iade ucu
 * var). Buton koymak olmayan bir yetki vaat ederdi; durum açıkça yazılır.
 */
export function RefundSellerNote({ f }: Props) {
  const { t } = useTranslation();
  if (f.tab !== 'seller') return null;
  return (
    <Alert variant="info" testID="refunds-seller-readonly-note">
      {t('refund.sellerReadonlyNote')}
    </Alert>
  );
}

/** Tek talep kartı. */
function RefundCard({ f, rr }: Props & { rr: RefundRequestRow }) {
  const { t } = useTranslation();
  const statusConfig = useRefundStatusConfig();
  // İptal ucu alıcıya ait — satıcı sekmesinde gösterilmez.
  const canCancel = f.tab === 'buyer' && rr.status === 'pending_review';
  const open = () => router.push(`/refund-requests/${rr.id}` as never);

  return (
    <SectionCard bodyStyle={styles.card}>
      <View style={styles.cardHeader}>
        <Text variant="caption" tone="muted">
          #{rr.order?.orderNumber ?? rr.id.slice(0, 8)}
        </Text>
        <StatusBadge status={rr.status} config={statusConfig} size="sm" />
      </View>

      <Pressable onPress={open} style={styles.productRow} accessibilityRole="button">
        {rr.order?.product?.images?.[0] ? (
          <AppImage source={rr.order.product.images[0]} style={styles.productImage} />
        ) : (
          <View style={styles.productImage} />
        )}
        <View style={styles.productInfo}>
          <Text variant="body" weight="medium" tone="heading" numberOfLines={2}>
            {rr.order?.product?.title ?? t('order.product')}
          </Text>
          <Text variant="bodySm" tone="muted">
            {t('refund.reasonLabel', { reason: refundReasonLabel(rr.reason, t) })}
          </Text>
          {f.tab === 'seller'
            ? rr.requester?.displayName && (
                <Text variant="bodySm" tone="muted">
                  {t('refund.requesterLabel', { name: rr.requester.displayName })}
                </Text>
              )
            : rr.order?.seller?.displayName && (
                <Text variant="bodySm" tone="muted">
                  {t('refund.sellerLabel', { name: rr.order.seller.displayName })}
                </Text>
              )}
        </View>
        <Text variant="body" weight="semibold" style={{ color: theme.priceColor.detail }}>
          {formatPrice(rr.amount)}
        </Text>
      </Pressable>

      {canCancel && (
        <Button
          variant="outline"
          size="sm"
          title={t('refund.cancel.cta')}
          onPress={() =>
            appAlert(t('refund.cancel.confirmTitle'), t('refund.cancel.confirmBody'), [
              { text: t('trade.dispute.cancelCta'), style: 'cancel' },
              {
                text: t('order.cancelShort'),
                style: 'destructive',
                onPress: () => f.cancelMutation.mutate(rr.id),
              },
            ])
          }
          isLoading={f.cancelMutation.isPending && f.cancelMutation.variables === rr.id}
        />
      )}
    </SectionCard>
  );
}

/** Liste — yükleniyor (Skeleton) / boş / dolu üç hâli kendi içinde kapılar. */
export function RefundList({ f }: Props) {
  const { t } = useTranslation();
  const initialLoading = f.isLoading && f.refunds.length === 0;
  // İlk yükleme iskeleti gecikmeli: <150 ms süren yüklemede hiç çizilmez (göz kırpma yok).
  const showSkeleton = useDelayedLoading(initialLoading);
  if (initialLoading || showSkeleton) {
    if (!showSkeleton) return null;
    return (
      <View style={styles.list} testID="refunds-skeleton">
        <RefundCardSkeleton />
        <RefundCardSkeleton />
      </View>
    );
  }
  if (f.refunds.length === 0) {
    return (
      <EmptyState
        icon="receipt-percent"
        title={f.tab === 'seller' ? t('refund.emptySellerTitle') : t('refund.emptyBuyerTitle')}
        subtitle={f.tab === 'seller' ? t('refund.emptySellerSubtitle') : t('refund.emptyBuyerSubtitle')}
      />
    );
  }
  return (
    <View style={styles.list}>
      {f.refunds.map((rr) => (
        <RefundCard key={rr.id} f={f} rr={rr} />
      ))}
    </View>
  );
}

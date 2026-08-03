import React from 'react';
import { View, ScrollView, RefreshControl, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip, Spinner, StatusBadge, Text, theme, appAlert } from '@/ui';
import { refundReasonLabel } from '@/lib/shared/status-configs';
import { useRefundStatusConfig } from '@/lib/shared/refundStatus';

import { styles } from '../_lib/styles';
import { formatPrice } from '../_lib/format';
import type { RefundRequestRow } from '../_lib/types';
import type { RefundRequestsController } from '../_hooks/useRefundRequests';

const { colors } = theme;

type Props = { f: RefundRequestsController };

/** Giriş yapılmamışsa tüm ekranın yerine geçen kapı. */
export function RefundAuthGate({ f }: Props) {
  if (f.isAuthenticated) return null;
  return (
    <View style={styles.centeredContainer}>
      <Ionicons name="receipt-outline" size={64} color={colors.primary[600]!} />
      <Text variant="h2" style={styles.title}>İadelerim</Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        İade taleplerinizi görmek için giriş yapın
      </Text>
      <Button
        variant="primary"
        title="Giriş Yap"
        onPress={() => router.push('/(auth)/login')}
        style={{ alignSelf: 'center' }}
      />
    </View>
  );
}

/** Alıcı / satıcı sekmeleri. */
export function RefundTabs({ f }: Props) {
  return (
    <View style={styles.tabRow}>
      <Chip
        testID="refunds-tab-buyer"
        label="Taleplerim"
        selected={f.tab === 'buyer'}
        onPress={() => f.setTab('buyer')}
        style={styles.tabChip}
      />
      <Chip
        testID="refunds-tab-seller"
        label="Bana Açılanlar"
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
  if (f.tab !== 'seller') return null;
  return (
    <View style={styles.readonlyNote} testID="refunds-seller-readonly-note">
      <Ionicons name="information-circle-outline" size={18} color={colors.info[600]!} />
      <Text variant="caption" style={styles.readonlyNoteText}>
        Size açılan iade talepleri. Onay ve ret işlemleri şu an uygulamadan
        yapılamıyor; talep süreci destek ekibi tarafından yürütülür.
      </Text>
    </View>
  );
}

/** Boş durum — metni sekmeye göre değişir. */
export function RefundEmpty({ f }: Props) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={80} color={colors.text.subtle} />
      <Text variant="h3" style={styles.emptyTitle}>
        {f.tab === 'seller' ? 'Size açılan iade talebi yok' : 'İade talebiniz yok'}
      </Text>
      <Text variant="body" tone="muted" style={styles.emptySubtitle}>
        {f.tab === 'seller'
          ? 'Sattığınız ürünler için açılan iade talepleri burada görünür'
          : 'Bir siparişiniz için açtığınız iade talepleri burada görünür'}
      </Text>
    </View>
  );
}

/** Tek talep kartı. */
function RefundCard({ f, rr }: Props & { rr: RefundRequestRow }) {
  const statusConfig = useRefundStatusConfig();
  // İptal ucu alıcıya ait — satıcı sekmesinde gösterilmez.
  const canCancel = f.tab === 'buyer' && rr.status === 'pending_review';

  return (
    <Pressable onPress={() => router.push(`/refund-requests/${rr.id}` as never)}>
      <Card variant="elevated" style={styles.card}>
        <View style={styles.cardHeader}>
          <Text variant="caption" style={styles.orderNumber}>
            #{rr.order?.orderNumber ?? rr.id.slice(0, 8)}
          </Text>
          <StatusBadge status={rr.status} config={statusConfig} size="sm" />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.productRow}>
            {rr.order?.product?.images?.[0] ? (
              <Image source={{ uri: rr.order.product.images[0] }} style={styles.productImage} />
            ) : (
              <View style={[styles.productImage, styles.productImagePlaceholder]}>
                <Ionicons name="image-outline" size={22} color={colors.text.subtle} />
              </View>
            )}
            <View style={styles.productInfo}>
              <Text variant="label" numberOfLines={2}>
                {rr.order?.product?.title ?? 'Ürün'}
              </Text>
              <Text variant="caption" style={styles.muted}>
                Sebep: {refundReasonLabel(rr.reason)}
              </Text>
              {f.tab === 'seller'
                ? rr.requester?.displayName && (
                    <Text variant="caption" style={styles.muted}>
                      Talep eden: {rr.requester.displayName}
                    </Text>
                  )
                : rr.order?.seller?.displayName && (
                    <Text variant="caption" style={styles.muted}>
                      Satıcı: {rr.order.seller.displayName}
                    </Text>
                  )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.text.subtle} />
          </View>
          <Text variant="h3" style={styles.amount}>
            {formatPrice(rr.amount)}
          </Text>
        </View>

        {canCancel && (
          <View style={styles.actions}>
            <Button
              variant="ghost"
              title="Talebi İptal Et"
              onPress={() =>
                appAlert(
                  'İade talebini iptal et',
                  'Bu iade talebini iptal etmek istediğinize emin misiniz?',
                  [
                    { text: 'Vazgeç', style: 'cancel' },
                    {
                      text: 'İptal Et',
                      style: 'destructive',
                      onPress: () => f.cancelMutation.mutate(rr.id),
                    },
                  ],
                )
              }
              isLoading={f.cancelMutation.isPending && f.cancelMutation.variables === rr.id}
              style={styles.actionBtn}
            />
          </View>
        )}
      </Card>
    </Pressable>
  );
}

/** Liste — yükleniyor / boş / dolu üç hâli kendi içinde kapılar. */
export function RefundList({ f }: Props) {
  if (f.isLoading && f.refunds.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size="lg" />
      </View>
    );
  }
  if (f.refunds.length === 0) return <RefundEmpty f={f} />;

  return (
    <ScrollView
      style={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={f.refreshing}
          onRefresh={f.onRefresh}
          colors={[colors.primary[600]!]}
        />
      }
    >
      {f.refunds.map((rr) => (
        <RefundCard key={rr.id} f={f} rr={rr} />
      ))}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

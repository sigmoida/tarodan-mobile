import { View, ScrollView, StyleSheet, RefreshControl, Image, Pressable } from 'react-native';
import { Button, Card, Chip, ScreenHeader, Spinner, StatusBadge, Text, appAlert, theme } from '@/ui';
import type { BadgeVariant } from '@/ui';
import { refundReasonLabel } from '@/lib/shared/status-configs';
import { useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { refundsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { captureException } from '@/services/sentry';

const { colors } = theme;

// Alıcı perspektifi durum etiketleri — RefundRequestStatus enum'ının TÜM değerleri
// (web refund-requests buyer rolü ile parite). Eksik durum = StatusBadge ham enum gösterir.
const refundStatusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
  pending_review: { label: 'Satıcı İncelemesinde', variant: 'warning' },
  approved: { label: 'Onaylandı', variant: 'success' },
  wait_for_delivery: { label: 'İade Kargosu Bekleniyor', variant: 'info' },
  return_shipment_open: { label: 'İade Kargosu Açıldı', variant: 'info' },
  return_in_transit: { label: 'İade Kargoda', variant: 'primary' },
  return_delivered: { label: 'Satıcıya Ulaştı', variant: 'success' },
  refunded: { label: 'İade Edildi', variant: 'success' },
  rejected: { label: 'Reddedildi', variant: 'danger' },
  disputed: { label: 'İncelemede (İtiraz)', variant: 'warning' },
  cancelled: { label: 'İptal Edildi', variant: 'danger' },
};

interface BuyerRefund {
  id: string;
  status: string;
  reason: string;
  /** Satıcı sekmesinde talebi AÇAN kullanıcı (alıcı sekmesinde gelmez). */
  requester?: { id: string; displayName?: string };
  amount?: number;
  description?: string;
  createdAt?: string;
  order?: { orderId?: string; orderNumber?: string; product?: { title?: string; images?: string[] }; seller?: { displayName?: string } };
}

function formatPrice(value?: number): string {
  const n = Number(value ?? 0);
  return `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BuyerRefundRequestsScreen() {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  /**
   * Alıcı sekmesi kendi taleplerini (`/me`), satıcı sekmesi kendisine AÇILAN
   * talepleri (`/seller`) gösterir. Satıcı sekmesi salt okunur — aksiyon ucu
   * yok (bkz. `__tests__/sellerInbox.test.tsx`).
   */
  const [tab, setTab] = useState<'buyer' | 'seller'>('buyer');

  const unwrap = (res: any): BuyerRefund[] => {
    const payload = res?.data?.data ?? res?.data ?? res;
    return (Array.isArray(payload) ? payload : payload?.items ?? payload?.data ?? []) as BuyerRefund[];
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['refund-requests', tab],
    queryFn: async () =>
      unwrap(tab === 'seller' ? await refundsApi.getSeller() : await refundsApi.getMine()),
    enabled: isAuthenticated,
  });

  const refunds = data ?? [];

  const cancelMutation = useMutation({
    mutationFn: (id: string) => refundsApi.cancel(id),
    onSuccess: () => {
      appAlert('İptal edildi', 'İade talebiniz iptal edildi.');
      queryClient.invalidateQueries({ queryKey: ['refund-requests'] });
    },
    onError: (e: any) => {
      captureException(e, { level: 'error', tags: { flow: 'refund.buyer.cancel' } });
      appAlert('Hata', e?.response?.data?.message || 'İşlem başarısız. Tekrar deneyin.');
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

  if (!isAuthenticated) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="receipt-outline" size={64} color={colors.primary[600]!} />
        <Text variant="h2" style={styles.title}>İadelerim</Text>
        <Text variant="body" tone="muted" style={styles.subtitle}>
          İade taleplerinizi görmek için giriş yapın
        </Text>
        <Button variant="primary" title="Giriş Yap" onPress={() => router.push('/(auth)/login')} style={{ alignSelf: 'center' }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="İade Talepleri" onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />

      <View style={styles.tabRow}>
        <Chip
          testID="refunds-tab-buyer"
          label="Taleplerim"
          selected={tab === 'buyer'}
          onPress={() => setTab('buyer')}
          style={styles.tabChip}
        />
        <Chip
          testID="refunds-tab-seller"
          label="Bana Açılanlar"
          selected={tab === 'seller'}
          onPress={() => setTab('seller')}
          style={styles.tabChip}
        />
      </View>

      {/* Satıcı sekmesinde aksiyon butonu YOK: API'de onay/ret ucu tanımlı
          değil (üretilen katalogda yalnız beş iade ucu var). Buton koymak
          olmayan bir yetki vaat ederdi; bunun yerine durum açıkça yazılır. */}
      {tab === 'seller' ? (
        <View style={styles.readonlyNote} testID="refunds-seller-readonly-note">
          <Ionicons name="information-circle-outline" size={18} color={colors.info[600]!} />
          <Text variant="caption" style={styles.readonlyNoteText}>
            Size açılan iade talepleri. Onay ve ret işlemleri şu an uygulamadan
            yapılamıyor; talep süreci destek ekibi tarafından yürütülür.
          </Text>
        </View>
      ) : null}

      {isLoading && refunds.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Spinner size="lg" />
        </View>
      ) : refunds.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color={colors.text.subtle} />
          <Text variant="h3" style={styles.emptyTitle}>
            {tab === 'seller' ? 'Size açılan iade talebi yok' : 'İade talebiniz yok'}
          </Text>
          <Text variant="body" tone="muted" style={styles.emptySubtitle}>
            {tab === 'seller'
              ? 'Sattığınız ürünler için açılan iade talepleri burada görünür'
              : 'Bir siparişiniz için açtığınız iade talepleri burada görünür'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary[600]!]} />
          }
        >
          {refunds.map((rr) => {
            // İptal ucu alıcıya ait — satıcı sekmesinde gösterilmez.
            const canCancel = tab === 'buyer' && rr.status === 'pending_review';
            return (
              <Pressable key={rr.id} onPress={() => router.push(`/refund-requests/${rr.id}` as any)}>
                <Card variant="elevated" style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text variant="caption" style={styles.orderNumber}>
                      #{rr.order?.orderNumber ?? rr.id.slice(0, 8)}
                    </Text>
                    <StatusBadge status={rr.status} config={refundStatusConfig} size="sm" />
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
                        {tab === 'seller' ? (
                          rr.requester?.displayName ? (
                            <Text variant="caption" style={styles.muted}>
                              Talep eden: {rr.requester.displayName}
                            </Text>
                          ) : null
                        ) : rr.order?.seller?.displayName ? (
                          <Text variant="caption" style={styles.muted}>
                            Satıcı: {rr.order.seller.displayName}
                          </Text>
                        ) : null}
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
                              { text: 'İptal Et', style: 'destructive', onPress: () => cancelMutation.mutate(rr.id) },
                            ],
                          )
                        }
                        isLoading={cancelMutation.isPending && cancelMutation.variables === rr.id}
                        style={styles.actionBtn}
                      />
                    </View>
                  )}
                </Card>
              </Pressable>
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[3],
  },
  tabChip: { flex: 1 },
  readonlyNote: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    alignItems: 'flex-start',
    marginHorizontal: theme.spacing[4],
    marginTop: theme.spacing[3],
    padding: theme.spacing[3],
    backgroundColor: colors.info[50]!,
    borderRadius: theme.radius.lg,
  },
  readonlyNoteText: { flex: 1, color: colors.info[700]! },
  container: { flex: 1, backgroundColor: colors.surface.alt },
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing[8], backgroundColor: colors.surface.DEFAULT },
  title: { marginTop: theme.spacing[4], marginBottom: theme.spacing[2] },
  subtitle: { textAlign: 'center', marginBottom: theme.spacing[6] },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing[8] },
  emptyTitle: { marginTop: theme.spacing[4], marginBottom: theme.spacing[2] },
  emptySubtitle: { textAlign: 'center' },
  list: { flex: 1, paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[3] },
  card: { marginBottom: theme.spacing[3] },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[2] },
  orderNumber: { color: colors.text.muted },
  cardBody: { gap: theme.spacing[1] },
  productRow: { flexDirection: 'row', gap: theme.spacing[2.5], alignItems: 'center' },
  productImage: { width: 52, height: 52, borderRadius: theme.radius.xl, backgroundColor: colors.surface.alt },
  productImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1, gap: theme.spacing[0.5] },
  muted: { color: colors.text.muted },
  amount: { marginTop: theme.spacing[1.5], color: colors.primary[600]! },
  actions: { flexDirection: 'row', gap: theme.spacing[3], marginTop: theme.spacing[3.5] },
  actionBtn: { flex: 1 },
});

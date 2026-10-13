import { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Chip, EmptyState, ErrorState, SkeletonCard, pageListContentStyle, theme } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { tradesApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { TradeCard, type TradeCardTrade } from '@/components/trade/TradeCard';
import type { TFn } from './trade/[id]/_lib/types';

const { spacing } = theme;

// "Kargoda" filtresi artık sunucu tarafında (statusGroup=shipping) yapılıyor;
// istemci tarafı statü listesine gerek kalmadı.
type TradesTabFilter = 'all' | 'pending' | 'shipping' | 'completed' | 'cancelled' | 'rejected';

// Sunucu sayaçları yalnızca ilk 4 grup için var; iptal/red sayaçsız gösterilir.
// Etiketler katalogdan — module-scope dizi import-zamanı DONMASIN diye
// `buildFilters(t)` fonksiyonu (CLAUDE.md §2), her render'da yeniden kurulur.
function buildFilters(t: TFn): {
  value: TradesTabFilter;
  label: string;
  countKey?: 'all' | 'pending' | 'shipping' | 'completed';
}[] {
  return [
    { value: 'all', label: t('common.all'), countKey: 'all' },
    { value: 'pending', label: t('trade.filterPending'), countKey: 'pending' },
    { value: 'shipping', label: t('trade.filterInTransit'), countKey: 'shipping' },
    { value: 'completed', label: t('trade.filterCompleted'), countKey: 'completed' },
    { value: 'cancelled', label: t('common.cancel') },
    { value: 'rejected', label: t('trade.filterRejected') },
  ];
}

/** Takaslarım — PageShell (list modu) + sarmalanan filtre chip'leri (sayaçlı) + TradeCard listesi. */
export default function TradesScreen() {
  const { t } = useTranslation();
  const FILTERS = buildFilters(t);
  const { isAuthenticated, user } = useAuthStore();
  const [filter, setFilter] = useState<TradesTabFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: tradesPayload, isLoading, isError, refetch } = useQuery({
    queryKey: ['trades', filter],
    queryFn: async () => {
      // pageSize:100 → liste tek sayfada (çoğu kullanıcı için tamamı). 'Kargoda' artık
      // istemci tarafında değil, sunucuda (statusGroup) filtreleniyor → sayfaya takılmıyor.
      const params: Record<string, string> = { pageSize: '100' };
      if (filter === 'pending') params.status = 'pending';
      if (filter === 'completed') params.status = 'completed';
      if (filter === 'cancelled') params.status = 'cancelled';
      if (filter === 'rejected') params.status = 'rejected';
      if (filter === 'shipping') params.statusGroup = 'shipping';
      const res = await tradesApi.getAll(params);
      const body = res.data as { trades?: TradeCardTrade[]; data?: TradeCardTrade[] } | undefined;
      let list: TradeCardTrade[] = body?.trades ?? body?.data ?? [];
      if (!Array.isArray(list)) list = [];
      return { trades: list };
    },
    enabled: isAuthenticated,
  });

  const tradesList: TradeCardTrade[] = tradesPayload?.trades ?? [];

  // Segment sayaçları — filtreden/sayfalamadan bağımsız tek sunucu agregatı.
  // tc.all = profil "Takaslar" tile'ı ile birebir.
  const { data: countsResp, refetch: refetchCounts } = useQuery({
    queryKey: ['trades-status-counts'],
    queryFn: () => tradesApi.getStatusCounts(),
    enabled: isAuthenticated,
  });
  const tc = countsResp?.data ?? { all: 0, pending: 0, shipping: 0, completed: 0 };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchCounts()]);
    setRefreshing(false);
  }, [refetch, refetchCounts]);

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  // Stable renderItem (#75) — memoized TradeCard bails out unless the row changes.
  const renderTrade = useCallback(
    ({ item }: { item: (typeof tradesList)[number] }) => (
      <TradeCard trade={item} currentUserId={user?.id} />
    ),
    [user?.id],
  );

  if (!isAuthenticated) {
    return (
      <PageShell
        title={t('trade.myTrades')}
        onBack={handleBack}
        empty
        emptyState={{
          icon: 'arrows-right-left',
          title: t('membership.loginRequiredTitle'),
          subtitle: t('trade.tradeRequiresLogin'),
          actionLabel: t('common.login'),
          onAction: () => router.push('/(auth)/login'),
        }}
      />
    );
  }

  return (
    <PageShell title={t('trade.myTrades')} onBack={handleBack} mode="list">
      <FlatList
        data={isError || isLoading ? [] : tradesList}
        contentContainerStyle={pageListContentStyle}
        refreshing={refreshing}
        onRefresh={onRefresh}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTrade}
        ListHeaderComponent={
          // Durum filtreleri — web gibi sarmalanan (wrap) chip satırı
          <View style={styles.filterRow}>
            {FILTERS.map((f) => {
              const count = f.countKey ? (tc as Record<string, number>)[f.countKey] : undefined;
              return (
                <Chip
                  key={f.value}
                  label={`${f.label}${count != null ? ` (${count})` : ''}`}
                  selected={filter === f.value}
                  onPress={() => setFilter(f.value)}
                />
              );
            })}
          </View>
        }
        ListEmptyComponent={
          isError ? (
            <ErrorState message={t('trade.listLoadFailedHint')} onRetry={() => refetch()} />
          ) : isLoading ? (
            <View style={styles.skeletons}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : (
            <EmptyState
              icon="arrows-right-left"
              title={t('trade.noTrades')}
              subtitle={filter === 'all' ? t('trade.noTradesHint') : t('trade.noTradesFilteredHint')}
              actionLabel={t('trade.searchListingsCta')}
              onAction={() => router.push('/search')}
            />
          )
        }
      />
    </PageShell>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  skeletons: { gap: spacing[3] },
});

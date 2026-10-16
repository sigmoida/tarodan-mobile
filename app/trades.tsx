import { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useQuery, useQueries } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChipTabs, EmptyState, ErrorState, SkeletonCard, pageListContentStyle, theme, usePageScrollHandler } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { tradesApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { listWindowing } from '@/lib/list/windowing';
import { TradeCard, type TradeCardTrade } from '@/components/trade/TradeCard';
import type { TFn } from './trade/[id]/_lib/types';

const { spacing } = theme;

const tradeKey = (item: TradeCardTrade) => String(item.id);

// "Kargoda" filtresi artık sunucu tarafında (statusGroup=shipping) yapılıyor;
// istemci tarafı statü listesine gerek kalmadı.
type TradesTabFilter = 'all' | 'pending' | 'shipping' | 'completed' | 'cancelled' | 'rejected';

// Sunucu sayaçları (status-counts) yalnızca ilk 4 grup için var; İptal/Reddedilen sayaçları
// `getAll({ status, pageSize: 1 }).total` ile tamamlanır → ChipTabs tek kural: sayaç ya HEPSİNDE
// ya hiçbirinde (hepsi yüklenene dek sayısız etiket).
// Etiketler katalogdan — module-scope dizi import-zamanı DONMASIN diye
// `buildFilters(t)` fonksiyonu (CLAUDE.md §2), her render'da yeniden kurulur.
function buildFilters(t: TFn): {
  value: TradesTabFilter;
  label: string;
  countKey: 'all' | 'pending' | 'shipping' | 'completed' | 'cancelled' | 'rejected';
}[] {
  return [
    { value: 'all', label: t('common.all'), countKey: 'all' },
    { value: 'pending', label: t('trade.filterPending'), countKey: 'pending' },
    { value: 'shipping', label: t('trade.filterInTransit'), countKey: 'shipping' },
    { value: 'completed', label: t('trade.filterCompleted'), countKey: 'completed' },
    { value: 'cancelled', label: t('common.cancel'), countKey: 'cancelled' },
    { value: 'rejected', label: t('trade.filterRejected'), countKey: 'rejected' },
  ];
}

/** Takaslarım — PageShell (list modu) + sarmalanan filtre chip'leri (sayaçlı) + TradeCard listesi. */
export default function TradesScreen() {
  const { t } = useTranslation();
  const FILTERS = buildFilters(t);
  const { isAuthenticated, user } = useAuthStore();
  const [filter, setFilter] = useState<TradesTabFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const page = usePageScrollHandler();

  const { data: tradesPayload, isLoading, isError, refetch } = useQuery({
    queryKey: qk.trades.list({ filter }),
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
    queryKey: qk.trades.statusCounts,
    queryFn: () => tradesApi.getStatusCounts(),
    enabled: isAuthenticated,
  });
  // İptal / Reddedilen sayaçları (status-counts'ta yok): pageSize=1 ile yalnız `total` okunur.
  // Anahtar `statusCounts` önekini paylaşır → takas oluşunca/ödemede aynı invalidate tazeler.
  const extraCounts = useQueries({
    queries: (['cancelled', 'rejected'] as const).map((status) => ({
      queryKey: qk.trades.statusCountBy(status),
      queryFn: async () => {
        const res = await tradesApi.getAll({ status, pageSize: '1' });
        const total = (res.data as { total?: number } | undefined)?.total;
        return typeof total === 'number' ? total : null;
      },
      enabled: isAuthenticated,
    })),
  });
  const [cancelledCount, rejectedCount] = extraCounts.map((q) => q.data);
  const tc = countsResp?.data;
  // Sayaçlar ya hep birlikte görünür ya hiç; ek sayaçlar (İptal/Reddedilen) alınamazsa sunucunun
  // 4 grubu yine gösterilir (eski davranış) — tek bir yan istek hatası tüm sayaçları silmesin.
  const extrasReady = typeof cancelledCount === 'number' && typeof rejectedCount === 'number';
  const extrasFailed = extraCounts.some((q) => q.isError || (q.isSuccess && q.data == null));
  const allCounts: Partial<Record<string, number>> | undefined = !tc
    ? undefined
    : extrasReady
      ? { ...tc, cancelled: cancelledCount, rejected: rejectedCount }
      : extrasFailed
        ? tc
        : undefined;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchCounts(), ...extraCounts.map((q) => q.refetch())]);
    setRefreshing(false);
  }, [refetch, refetchCounts, extraCounts]);

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
    <PageShell title={t('trade.myTrades')} onBack={handleBack} mode="list" scroll={page}>
      <Animated.FlatList
        {...page.listProps}
        data={isError || isLoading ? [] : tradesList}
        contentContainerStyle={page.contentStyle(pageListContentStyle)}
        refreshing={refreshing}
        onRefresh={onRefresh}
        keyExtractor={tradeKey}
        renderItem={renderTrade}
        {...listWindowing}
        ListHeaderComponent={
          // Durum filtreleri — tek satır, yatay kaydırılan sekmeler (sayaçlar hepsinde ya da hiçbirinde)
          <ChipTabs
            testID="trades-filters"
            value={filter}
            onChange={setFilter}
            items={FILTERS.map((f) => ({
              key: f.value,
              label: f.label,
              count: allCounts?.[f.countKey],
            }))}
          />
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
  skeletons: { gap: spacing[3] },
});

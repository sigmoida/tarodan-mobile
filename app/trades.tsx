import { useState, useCallback } from 'react';
import { View, FlatList, RefreshControl, Pressable, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  Button,
  ScreenHeader,
  Spinner,
  Text,
  VStack,
  theme,
} from '@/ui';
import { tradesApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { TradeCard, type TradeCardTrade } from '@/components/trade/TradeCard';
import type { TFn } from './trade/[id]/_lib/types';

const { colors, spacing } = theme;

// "Kargoda" filtresi artık sunucu tarafında (statusGroup=shipping) yapılıyor;
// istemci tarafı statü listesine gerek kalmadı.
type TradesTabFilter = 'all' | 'pending' | 'shipping' | 'completed' | 'cancelled' | 'rejected';

// Sunucu sayaçları yalnızca ilk 4 grup için var; iptal/red sayaçsız gösterilir.
// Etiketler katalogdan — module-scope dizi import-zamanı DONMASIN diye
// `buildFilters(t)` fonksiyonu (CLAUDE.md §2), her render'da yeniden kurulur.
function buildFilters(t: TFn): {
  value: TradesTabFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap | null;
  countKey?: 'all' | 'pending' | 'shipping' | 'completed';
}[] {
  return [
    { value: 'all', label: t('common.all'), icon: null, countKey: 'all' },
    { value: 'pending', label: t('trade.filterPending'), icon: 'time-outline', countKey: 'pending' },
    { value: 'shipping', label: t('trade.filterInTransit'), icon: 'cube-outline', countKey: 'shipping' },
    { value: 'completed', label: t('trade.filterCompleted'), icon: 'checkmark-circle-outline', countKey: 'completed' },
    { value: 'cancelled', label: t('common.cancel'), icon: 'close-circle-outline' },
    { value: 'rejected', label: t('trade.filterRejected'), icon: 'ban-outline' },
  ];
}

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
      <View style={{ flex: 1, backgroundColor: colors.surface.DEFAULT }}>
        <ScreenHeader title={t('trade.myTrades')} onBack={handleBack} />
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: spacing[8],
          }}
        >
          <Text variant="h2" align="center" style={{ marginBottom: spacing[4] }}>
            {t('membership.loginRequiredTitle')}
          </Text>
          <Text variant="body" tone="muted" align="center" style={{ marginBottom: spacing[6] }}>
            {t('trade.tradeRequiresLogin')}
          </Text>
          <Button
            variant="primary"
            title={t('common.login')}
            onPress={() => router.push('/(auth)/login')}
            style={{ alignSelf: 'center' }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.DEFAULT }}>
      <ScreenHeader title={t('trade.myTrades')} onBack={handleBack} />

      {/* Status filters — web gibi sarmalanan (wrap) çip satırı */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.value;
          const count = f.countKey ? (tc as Record<string, number>)[f.countKey] : undefined;
          return (
            <Pressable
              key={f.value}
              onPress={() => setFilter(f.value)}
              style={[styles.filterPill, active && styles.filterPillActive]}
            >
              {f.icon ? (
                <Ionicons
                  name={f.icon}
                  size={14}
                  color={active ? colors.white : colors.text.muted}
                />
              ) : null}
              <Text
                variant="caption"
                weight="medium"
                style={{ color: active ? colors.white : colors.text.body }}
              >
                {f.label}
                {count != null ? ` (${count})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isError ? (
        <VStack gap={3} align="center" padding={6} style={{ marginTop: spacing[8] }}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger[500]!} />
          <Text variant="body" align="center">
            {t('trade.listLoadFailedHint')}
          </Text>
          <Button variant="primary" title={t('common.tryAgain')} onPress={() => refetch()} />
        </VStack>
      ) : isLoading ? (
        <Spinner style={{ marginTop: spacing[8] }} />
      ) : (
        <FlatList
          data={tradesList}
          contentContainerStyle={{ padding: spacing[4], paddingTop: spacing[2] }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTrade}
          ListEmptyComponent={
            <VStack gap={3} align="center" style={{ marginTop: spacing[10] }}>
              <Ionicons name="swap-horizontal" size={56} color={colors.border.strong} />
              <Text variant="h3" align="center">
                {t('trade.noTrades')}
              </Text>
              <Text
                variant="body"
                tone="muted"
                align="center"
                style={{ paddingHorizontal: spacing[6] }}
              >
                {filter === 'all'
                  ? t('trade.noTradesHint')
                  : t('trade.noTradesFilteredHint')}
              </Text>
              <Button
                variant="primary"
                title={t('trade.searchListingsCta')}
                onPress={() => router.push('/search')}
                style={{ marginTop: spacing[2] }}
              />
            </VStack>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 999,
    backgroundColor: colors.surface.alt,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  filterPillActive: {
    backgroundColor: colors.primary[600]!,
    borderColor: colors.primary[600]!,
  },
});

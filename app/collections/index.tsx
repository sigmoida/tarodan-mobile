import { useCallback } from 'react';
import { View, RefreshControl } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  theme,
  EmptyState,
  ErrorState,
  pageListContentStyle,
  SkeletonCard,
  Spinner,
  usePageScrollHandler,
} from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { listWindowing } from '@/lib/list/windowing';
import { PageShell } from '@/components/common/PageShell';
import { useCollectionsBrowse } from './_hooks/useCollectionsBrowse';
import { styles } from './_lib/browseStyles';
import { CollectionCard } from '@/components/collection/CollectionCard';
import { CollectionsInfoCard } from './_components/CollectionsInfoCard';
import { CollectionsToolbar } from './_components/CollectionsToolbar';
import { CollectionsSheets } from './_components/CollectionsSheets';

const { colors } = theme;

const collectionKey = (item: { id: string | number }) => String(item.id);

/**
 * Koleksiyonlar (web `/collections`): PageShell + "Herkese açık / Benim" sekmeleri (Benim yalnız
 * girişli), sunucu araması, kategori filtresi ve sıralama (SelectSheet) ile 2 sütun koleksiyon
 * kartları; herkese açık liste sonsuz kaydırılır. Yüklenirken iskelet, boşken EmptyState.
 */
export default function CollectionsScreen() {
  const { t } = useTranslation();
  const f = useCollectionsBrowse();
  const page = usePageScrollHandler();
  const renderCollection = useCallback(
    ({ item }: { item: any }) => (
      <View style={styles.cell}>
        <CollectionCard item={item} />
      </View>
    ),
    [],
  );
  const mineEmpty = f.activeTab === 'mine' && !f.hasSearch;

  return (
    <PageShell
      title={t('collection.collections')}
      mode="list"
      scroll={page}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      overlay={<CollectionsSheets f={f} />}
    >
      <Animated.FlatList
        {...page.listProps}
        testID="collections-list"
        data={f.isLoading ? [] : f.collections}
        renderItem={renderCollection}
        keyExtractor={collectionKey}
        {...listWindowing}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={page.contentStyle([pageListContentStyle, styles.footer])}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onEndReached={f.loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={f.refreshing}
            onRefresh={f.onRefresh}
            progressViewOffset={page.topInset}
            colors={[colors.primary[600]!]}
            tintColor={colors.primary[600]!}
          />
        }
        ListHeaderComponent={<CollectionsToolbar f={f} />}
        ListEmptyComponent={
          f.isLoading ? (
            <View style={styles.skeletons} testID="collections-skeleton">
              <View style={styles.cell}>
                <SkeletonCard />
              </View>
              <View style={styles.cell}>
                <SkeletonCard />
              </View>
            </View>
          ) : f.isError ? (
            <ErrorState onRetry={() => void f.refetch()} />
          ) : (
            <EmptyState
              testID="collections-empty"
              icon="rectangle-stack"
              title={mineEmpty ? t('collection.noCollections') : t('collection.browseEmptyTitle')}
              subtitle={mineEmpty ? t('collection.startBuildingToday') : t('search.tryDifferent')}
            />
          )
        }
        ListFooterComponent={
          <>
            {f.isFetchingNextPage ? <Spinner testID="collections-next-page" /> : null}
            {f.isPremiumMember ? null : <CollectionsInfoCard isAuthenticated={f.isAuthenticated} />}
          </>
        }
      />
    </PageShell>
  );
}

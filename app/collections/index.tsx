import { useCallback, useMemo } from 'react';
import { View, RefreshControl, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  theme,
  EmptyState,
  ErrorState,
  PAGE_GUTTER,
  gridCellWidth,
  pageListContentStyle,
  Spinner,
  useDelayedLoading,
  useGridColumns,
  usePageScrollHandler,
} from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { listWindowing } from '@/lib/list/windowing';
import { PageShell } from '@/components/common/PageShell';
import { ListFooterRetry } from '@/components/common/ListFooterRetry';
import { useCollectionsBrowse } from './_hooks/useCollectionsBrowse';
import { COLLECTION_GRID_GAP, styles } from './_lib/browseStyles';
import { CollectionCard } from '@/components/collection/CollectionCard';
import { SkeletonCollectionCard } from '@/components/collection/SkeletonCollectionCard';
import { CollectionsInfoCard } from './_components/CollectionsInfoCard';
import { CollectionsToolbar } from './_components/CollectionsToolbar';
import { CollectionsSheets } from './_components/CollectionsSheets';

const { colors } = theme;

const collectionKey = (item: { id: string | number }) => String(item.id);
const SKELETON_ROWS = [0, 1];

/**
 * Collections (web `/collections`): PageShell + "Public / Mine" tabs (Mine only when signed in),
 * server search, category filter and sort (SelectSheet), collection cards (2 columns on phones,
 * more on tablets: `useGridColumns`); the public list scrolls infinitely. Skeleton while loading,
 * EmptyState when empty.
 */
export default function CollectionsScreen() {
  const { t } = useTranslation();
  const f = useCollectionsBrowse();
  const page = usePageScrollHandler();
  const columns = useGridColumns();
  // Fixed cell width: a short last row keeps the card size instead of stretching across the row.
  const { width: windowWidth } = useWindowDimensions();
  const cellStyle = useMemo(
    () => ({ width: gridCellWidth(windowWidth - 2 * PAGE_GUTTER, columns, COLLECTION_GRID_GAP) }),
    [windowWidth, columns],
  );
  const renderCollection = useCallback(
    ({ item }: { item: any }) => (
      <View style={cellStyle}>
        <CollectionCard item={item} />
      </View>
    ),
    [cellStyle],
  );
  const mineEmpty = f.activeTab === 'mine' && !f.hasSearch;
  // İlk yükleme iskeleti gecikmeli: <150 ms süren yüklemede hiç çizilmez (göz kırpma yok).
  const showSkeleton = useDelayedLoading(f.isLoading);

  return (
    <PageShell
      title={t('collection.collections')}
      mode="list"
      contentWidth="full"
      scroll={page}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      overlay={<CollectionsSheets f={f} />}
    >
      <Animated.FlatList
        {...page.listProps}
        // `numColumns` cannot change in place (rotation, fold/unfold): re-mount on a new count.
        key={`columns-${columns}`}
        testID="collections-list"
        data={f.isLoading ? [] : f.collections}
        renderItem={renderCollection}
        keyExtractor={collectionKey}
        {...listWindowing}
        numColumns={columns}
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
          f.isLoading || showSkeleton ? (
            showSkeleton ? (
              <View style={styles.skeletonRows} testID="collections-skeleton">
                {SKELETON_ROWS.map((row) => (
                  <View key={row} style={styles.skeletons}>
                    {Array.from({ length: columns }, (_, c) => (
                      <View key={c} style={cellStyle}>
                        <SkeletonCollectionCard />
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ) : null
          ) : f.isError ? (
            <ErrorState placement="list" onRetry={() => void f.refetch()} />
          ) : (
            <EmptyState
              placement="list"
              testID="collections-empty"
              icon="rectangle-stack"
              title={mineEmpty ? t('collection.noCollections') : t('collection.browseEmptyTitle')}
              subtitle={mineEmpty ? t('collection.startBuildingToday') : t('search.tryDifferent')}
            />
          )
        }
        ListFooterComponent={
          <>
            {f.loadMoreFailed ? <ListFooterRetry onRetry={f.retryLoadMore} testID="collections-next-page-retry" /> : null}
            {f.isFetchingNextPage ? <Spinner testID="collections-next-page" /> : null}
            {f.isPremiumMember ? null : <CollectionsInfoCard isAuthenticated={f.isAuthenticated} />}
          </>
        }
      />
    </PageShell>
  );
}

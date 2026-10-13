import { View, RefreshControl } from 'react-native';
import Animated from 'react-native-reanimated';
import { theme, Chip, EmptyState, Input, pageListContentStyle, SkeletonCard, usePageScrollHandler } from '@/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import { useCollectionsBrowse } from './_hooks/useCollectionsBrowse';
import { styles } from './_lib/browseStyles';
import { CollectionCard } from '@/components/collection/CollectionCard';
import { CollectionsInfoCard } from './_components/CollectionsInfoCard';

const { colors } = theme;

/**
 * Koleksiyonlar (web `/collections`): PageShell + arama, Tümü/Popüler/Yeni çipleri ve 2 sütun
 * koleksiyon kartları; yüklenirken iskelet, boşken EmptyState.
 */
export default function CollectionsScreen() {
  const { t } = useTranslation();
  const f = useCollectionsBrowse();
  const page = usePageScrollHandler();

  return (
    <PageShell
      title={t('collection.collections')}
      mode="list"
      scroll={page}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
    >
      <Animated.FlatList
        {...page.listProps}
        data={f.isLoading ? [] : f.filteredCollections}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <CollectionCard item={item} />
          </View>
        )}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={page.contentStyle([pageListContentStyle, styles.footer])}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={f.isRefetching}
            onRefresh={f.refetch}
            progressViewOffset={page.topInset}
            colors={[colors.primary[600]!]}
            tintColor={colors.primary[600]!}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Input
              placeholder={t('collection.browsePlaceholder')}
              value={f.searchQuery}
              onChangeText={f.setSearchQuery}
              leftIconName="magnifying-glass"
            />
            <View style={styles.chips}>
              <Chip label={t('common.all')} selected={f.activeFilter === 'all'} onPress={() => f.setActiveFilter('all')} />
              <Chip
                label={t('common.popular')}
                selected={f.activeFilter === 'popular'}
                onPress={() => f.setActiveFilter('popular')}
              />
              <Chip label={t('common.new')} selected={f.activeFilter === 'recent'} onPress={() => f.setActiveFilter('recent')} />
            </View>
          </View>
        }
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
          ) : (
            <EmptyState
              icon="rectangle-stack"
              title={t('collection.browseEmptyTitle')}
              subtitle={t('search.tryDifferent')}
            />
          )
        }
        ListFooterComponent={f.isPremiumMember ? null : <CollectionsInfoCard isAuthenticated={f.isAuthenticated} />}
      />
    </PageShell>
  );
}

import React, { useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ErrorState, PageHeader, SectionCardAction, theme } from '@/ui';
import { CATEGORY_GRID_COLUMNS } from '../_lib/layout';
import type { CategoryGroup, CategoryTileData } from '../_lib/groups';
import { GridSkeleton } from './CategoriesSkeleton';
import { CategoryTile } from './CategoryTile';
import { ParentCrumb } from './ParentCrumb';

const { colors, spacing } = theme;

/** Son satırdaki boş hücreler (kutular satırı doldurmasın, hizalı kalsın). */
type Cell = CategoryTileData | { id: string; spacer: true };

function withSpacers(tiles: CategoryTileData[]): Cell[] {
  const rest = tiles.length % CATEGORY_GRID_COLUMNS;
  if (rest === 0) return tiles;
  return [
    ...tiles,
    ...Array.from({ length: CATEGORY_GRID_COLUMNS - rest }, (_, i) => ({ id: `spacer-${i}`, spacer: true as const })),
  ];
}

const keyExtractor = (cell: Cell) => cell.id;

interface CategoryGridProps {
  title: string;
  tiles: CategoryTileData[];
  /** Grubun veri durumu: `loading` iskelet, `error` "yüklenemedi" + tekrar dene (kutu yokken). */
  status: CategoryGroup['status'];
  onRetry: () => void;
  footer?: CategoryGroup['footer'];
  /** Alt kategori düzeyindeyken başlığın üstünde "‹ Üst kategori" kırıntısı. */
  canGoBack: boolean;
  parentTitle: string;
  onBack: () => void;
  onPressTile: (tile: CategoryTileData) => void;
  onPressFooter: (href: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}

/**
 * Sağ alan: seçili grubun (ya da inilen kategorinin) `PageHeader` başlığı + 3 sütunlu ızgara (+ altta
 * `SectionCardAction` bağlantısı, ör. "Tüm Üreticiler"). Kaydırılabilir, çekip yenilenir; başlık
 * listenin başlığıdır (birlikte kayar).
 */
export function CategoryGrid({
  title,
  tiles,
  status,
  onRetry,
  footer,
  canGoBack,
  parentTitle,
  onBack,
  onPressTile,
  onPressFooter,
  refreshing,
  onRefresh,
  bottomInset,
}: CategoryGridProps) {
  const { t } = useTranslation();
  const data = useMemo(() => withSpacers(tiles), [tiles]);

  const renderItem = useCallback(
    ({ item }: { item: Cell }) => (
      <View style={styles.cell}>
        {'spacer' in item ? null : <CategoryTile tile={item} onPress={onPressTile} />}
      </View>
    ),
    [onPressTile],
  );

  const header = useMemo(
    () => (
      <PageHeader
        testID="categories-header"
        title={title}
        breadcrumb={canGoBack ? <ParentCrumb parentTitle={parentTitle} onPress={onBack} /> : undefined}
      />
    ),
    [title, canGoBack, parentTitle, onBack],
  );

  const empty =
    status === 'loading' ? (
      <GridSkeleton />
    ) : status === 'error' ? (
      <ErrorState
        placement="inline"
        title={t('nav.categoriesLoadFailed')}
        onRetry={onRetry}
        testID="categories-group-error"
      />
    ) : null;

  const footerLink =
    footer && tiles.length > 0 ? (
      <View style={styles.footer}>
        <SectionCardAction testID="categories-footer-link" label={footer.label} onPress={() => onPressFooter(footer.href)} />
      </View>
    ) : null;

  return (
    <FlatList
      style={styles.grid}
      testID="categories-grid"
      data={data}
      numColumns={CATEGORY_GRID_COLUMNS}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      columnWrapperStyle={styles.row}
      contentContainerStyle={[styles.content, { paddingBottom: spacing[4] + bottomInset }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary[600]!]}
          tintColor={colors.primary[600]!}
        />
      }
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={footerLink}
    />
  );
}

const styles = StyleSheet.create({
  grid: { flex: 1 },
  content: { paddingHorizontal: spacing[2], paddingTop: spacing[3] },
  row: { gap: spacing[1] },
  cell: { flex: 1 },
  footer: { alignItems: 'center', marginTop: spacing[3] },
});

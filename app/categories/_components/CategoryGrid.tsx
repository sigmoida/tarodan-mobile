import React, { useCallback, useLayoutEffect, useMemo } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { ErrorState, SectionCardAction, theme } from '@/ui';
import { useCategoryGridColumns } from '../_lib/layout';
import type { CategoryGroup, CategoryTileData } from '../_lib/groups';
import { GridSkeleton } from './CategoriesSkeleton';
import { CategoryTile } from './CategoryTile';
import { ParentCrumb } from './ParentCrumb';
import type { CategoriesScroll } from '../_hooks/useCategoriesScroll';

const { colors, spacing } = theme;

/** Son satırdaki boş hücreler (kutular satırı doldurmasın, hizalı kalsın). */
type Cell = CategoryTileData | { id: string; spacer: true };

function withSpacers(tiles: CategoryTileData[], columns: number): Cell[] {
  const rest = tiles.length % columns;
  if (rest === 0) return tiles;
  return [
    ...tiles,
    ...Array.from({ length: columns - rest }, (_, i) => ({ id: `spacer-${i}`, spacer: true as const })),
  ];
}

const keyExtractor = (cell: Cell) => cell.id;

interface CategoryGridProps {
  tiles: CategoryTileData[];
  /** Grubun veri durumu: `loading` iskelet, `error` "yüklenemedi" + tekrar dene (kutu yokken). */
  status: CategoryGroup['status'];
  onRetry: () => void;
  footer?: CategoryGroup['footer'];
  /** Alt kategori düzeyindeyken ızgaranın üstünde "‹ Üst kategori" kırıntısı. */
  canGoBack: boolean;
  parentTitle: string;
  onBack: () => void;
  onPressTile: (tile: CategoryTileData) => void;
  onPressFooter: (href: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
  /** Üst barın kaydırma sinyali: ızgara bar ALTINDAN kayar (iOS inset / Android üst dolgu). */
  scroll: CategoriesScroll;
}

/**
 * Right-hand area: the tile grid (2 columns on phones, more on tablets: `useCategoryGridColumns`),
 * with a `SectionCardAction` link below (e.g. "All manufacturers"). No title band (the selected
 * group is highlighted in the rail). On a subcategory level a "< Parent category" crumb leads the
 * grid (it scrolls along). Scrollable, pull to refresh.
 */
export function CategoryGrid({
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
  scroll,
}: CategoryGridProps) {
  const { t } = useTranslation();
  // Izgara her grup/düzey değişiminde yeniden kurulur (en başta): bayat ofset kenarı açık bırakmasın.
  const { resetGrid } = scroll;
  useLayoutEffect(() => {
    resetGrid();
  }, [resetGrid]);
  const columns = useCategoryGridColumns();
  const data = useMemo(() => withSpacers(tiles, columns), [tiles, columns]);

  const renderItem = useCallback(
    ({ item }: { item: Cell }) => (
      <View style={styles.cell}>
        {'spacer' in item ? null : <CategoryTile tile={item} onPress={onPressTile} />}
      </View>
    ),
    [onPressTile],
  );

  // Başlık bandı YOK: seçili grup rayda zaten vurgulu. Alt kategori düzeyinde yalnız "‹ Üst kategori"
  // kırıntısı (geri dönüş yolu) kalır.
  const header = useMemo(
    () =>
      canGoBack ? (
        <View style={styles.crumb} testID="categories-crumb-row">
          <ParentCrumb parentTitle={parentTitle} onPress={onBack} />
        </View>
      ) : null,
    [canGoBack, parentTitle, onBack],
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
    <Animated.FlatList
      // `numColumns` cannot change in place (rotation, fold/unfold): re-mount on a new count.
      key={`columns-${columns}`}
      style={styles.grid}
      {...scroll.page.scrollProps}
      onScroll={scroll.onGridScroll}
      scrollEventThrottle={16}
      testID="categories-grid"
      data={data}
      numColumns={columns}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      columnWrapperStyle={styles.row}
      contentContainerStyle={scroll.page.contentStyle([styles.content, { paddingBottom: spacing[4] + bottomInset }])}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          progressViewOffset={scroll.page.topInset}
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
  // Satırlar arası dikey boşluk = sütunlar arası boşluk (kutular birbirine yapışmasın).
  row: { gap: spacing[2], marginBottom: spacing[2] },
  cell: { flex: 1 },
  footer: { alignItems: 'center', marginTop: spacing[3] },
  crumb: { marginBottom: spacing[2] },
});

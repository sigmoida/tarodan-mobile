import React, { useCallback, useLayoutEffect, useMemo } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { ErrorState, SectionCardAction, theme } from '@/ui';
import { CATEGORY_GRID_COLUMNS } from '../_lib/layout';
import type { CategoryGroup, CategoryTileData } from '../_lib/groups';
import { GridSkeleton } from './CategoriesSkeleton';
import { CategoryTile } from './CategoryTile';
import { ParentCrumb } from './ParentCrumb';
import type { CategoriesScroll } from '../_hooks/useCategoriesScroll';

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
 * Sağ alan: 2 sütunlu ızgara (+ altta `SectionCardAction` bağlantısı, ör. "Tüm Üreticiler"); başlık
 * bandı yok (seçili grup rayda vurgulu). Alt kategori düzeyinde ızgaranın başında "‹ Üst kategori"
 * kırıntısı (birlikte kayar). Kaydırılabilir, çekip yenilenir.
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
  const data = useMemo(() => withSpacers(tiles), [tiles]);

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
      style={styles.grid}
      {...scroll.page.scrollProps}
      onScroll={scroll.onGridScroll}
      scrollEventThrottle={16}
      testID="categories-grid"
      data={data}
      numColumns={CATEGORY_GRID_COLUMNS}
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

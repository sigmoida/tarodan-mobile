import { Dimensions } from 'react-native';
import { theme } from '@/ui';
import { CONDITION_OPTIONS } from '@/utils/productFilters';

const { width } = Dimensions.get('window');
const { spacing, typography } = theme;

export const CARD_WIDTH = (width - 48) / 2;
export const PAGE_SIZE = 24;

// Üst çubuklar (arama + filtre) için tahmini başlangıç yüksekliği; gerçek değer onLayout ile ölçülür.
export const COLLAPSIBLE_ESTIMATE = 180;

// Sonuç ızgarasının FlatList'i `numColumns` kullanıyor — `getItemLayout`'un
// aldığı offset hesabına bu değer tek kaynaktan gitsin diye burada sabitliyoruz
// (search.tsx içindeki FlatList prop'u da bunu import ediyor).
export const SEARCH_NUM_COLUMNS = 2;

// Satır yüksekliği — SearchResultCard'ın gerçek metriklerinden türetilmiş
// (aynı desen: `_lib/styles.ts`'teki POPULAR_RAIL_MIN_HEIGHT). Kart görseli
// sabit (CARD_WIDTH tabanlı kare) ve başlık numberOfLines={2} ile sınırlı
// olduğu için satır yüksekliği sabit — kart tasarımı değişirse bu sayı da
// otomatik değişsin diye ham sayı yazmıyoruz:
//   - productImage.height === CARD_WIDTH (searchStyles.ts: imageWrap/productImage kare)
//   - + productCardWrapper.marginBottom (satırlar arası boşluk; columnWrapperStyle
//     `listRow`'da marginBottom/gap YOK, o yüzden aralık tamamen buradan geliyor)
//   - + productContent dikey padding'i (theme.spacing[3] × 2, üst+alt)
//   - + başlık: `bodySm` varyantı, numberOfLines={2}
//     (fontSize.sm × lineHeight.normal) × 2 satır
//   - + marka/ölçek meta satırı: `caption` varyantı, marginTop spacing[0.5]
//     (spacing[0.5] + fontSize.xs × lineHeight.normal)
//   - + fiyat satırı: `h3` varyantı, marginTop spacing[1]
//     (spacing[1] + fontSize.lg × lineHeight.snug)
const SEARCH_CARD_IMAGE_HEIGHT = CARD_WIDTH;
const SEARCH_CARD_ROW_GAP = spacing[4];
const SEARCH_CARD_CONTENT_PADDING = spacing[3] * 2;
const SEARCH_CARD_TITLE_HEIGHT = typography.fontSize.sm * typography.lineHeight.normal * 2;
const SEARCH_CARD_META_HEIGHT = spacing[0.5] + typography.fontSize.xs * typography.lineHeight.normal;
const SEARCH_CARD_PRICE_HEIGHT = spacing[1] + typography.fontSize.lg * typography.lineHeight.snug;

export const SEARCH_ROW_HEIGHT =
  SEARCH_CARD_IMAGE_HEIGHT +
  SEARCH_CARD_ROW_GAP +
  SEARCH_CARD_CONTENT_PADDING +
  SEARCH_CARD_TITLE_HEIGHT +
  SEARCH_CARD_META_HEIGHT +
  SEARCH_CARD_PRICE_HEIGHT;

/**
 * Pure `getItemLayout` for the 2-column search results grid. `index` is the
 * flat item index (not the row index) — offset must divide by `numColumns`,
 * not multiply the index directly, or the grid's scroll position corrupts.
 */
export function getSearchItemLayout(_data: unknown, index: number) {
  const row = Math.floor(index / SEARCH_NUM_COLUMNS);
  return { length: SEARCH_ROW_HEIGHT, offset: SEARCH_ROW_HEIGHT * row, index };
}

export const conditionLabel = (v: string) =>
  CONDITION_OPTIONS.find((c) => c.value === v)?.label || v;

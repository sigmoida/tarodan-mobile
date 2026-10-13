import { Dimensions, Platform } from 'react-native';
import type { TFunction } from 'i18next';
import { buildConditionOptions } from '@/utils/productFilters';

const { width } = Dimensions.get('window');

export const CARD_WIDTH = (width - 48) / 2;
export const PAGE_SIZE = 24;

// NOT: Üst çubukların yüksekliği için tahmini bir sabit (eski COLLAPSIBLE_ESTIMATE)
// bilerek YOK. Çubukların içeriği dinamik (aktif filtre çipleri satırı koşullu),
// bu yüzden yükseklik yalnızca `onLayout` ile ölçülür; ölçüm gelene kadar liste
// gizli tutulur (bkz. useSearch → barsMeasured). Tahmin + düzeltme turu listeyi
// ilk boyamada yeniden yerleştiriyordu.

// Sonuç ızgarasının FlatList'i `numColumns` kullanıyor — tek kaynaktan gitsin
// diye burada sabitliyoruz (search.tsx içindeki FlatList prop'u bunu import
// ediyor). NOT: `getItemLayout` buradan kaldırıldı (bkz. task-3-report.md
// düzeltme notu) — kart yüksekliği koşullu puan satırı + tek/iki satırlık
// başlık nedeniyle 272.8–315.8pt arasında değişiyor, sabit değil.
export const SEARCH_NUM_COLUMNS = 2;

export const conditionLabel = (v: string, t: TFunction) =>
  buildConditionOptions(t).find((c) => c.value === v)?.label || v;

/**
 * Liste sanallaştırma ayarları. `numColumns > 1` iken VirtualizedList'in "öğe"si SATIRDIR:
 * ızgarada 4 satır = 8 kart, 3 satırlık batch = 6 kart. Tek sütunda (liste görünümü) öğe = kart
 * ve kart daha alçak, bu yüzden sayılar kart sayısı hedeflenerek ayrı hesaplanır.
 * Hedef: ilk boyama ≈ ekranı dolduran kart sayısı, her batch ≈ 6 kart (JS turu kısa kalsın).
 */
export function getSearchListTuning(columns: number) {
  const grid = columns > 1;
  return {
    initialNumToRender: grid ? 4 : 7,
    maxToRenderPerBatch: grid ? 3 : 4,
    updateCellsBatchingPeriod: 50,
    windowSize: 7,
    // iOS'ta kazanç az, bazı durumlarda boş/yanıp sönen görsel riski var → yalnız Android.
    removeClippedSubviews: Platform.OS === 'android',
  } as const;
}

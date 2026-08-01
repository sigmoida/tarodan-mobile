import { Dimensions } from 'react-native';
import { CONDITION_OPTIONS } from '@/utils/productFilters';

const { width } = Dimensions.get('window');

export const CARD_WIDTH = (width - 48) / 2;
export const PAGE_SIZE = 24;

// Üst çubuklar (arama + filtre) için tahmini başlangıç yüksekliği; gerçek değer onLayout ile ölçülür.
export const COLLAPSIBLE_ESTIMATE = 180;

// Sonuç ızgarasının FlatList'i `numColumns` kullanıyor — tek kaynaktan gitsin
// diye burada sabitliyoruz (search.tsx içindeki FlatList prop'u bunu import
// ediyor). NOT: `getItemLayout` buradan kaldırıldı (bkz. task-3-report.md
// düzeltme notu) — kart yüksekliği koşullu puan satırı + tek/iki satırlık
// başlık nedeniyle 272.8–315.8pt arasında değişiyor, sabit değil.
export const SEARCH_NUM_COLUMNS = 2;

export const conditionLabel = (v: string) =>
  CONDITION_OPTIONS.find((c) => c.value === v)?.label || v;

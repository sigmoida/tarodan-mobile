export const PAGE_SIZE = 24;

// NOT: Üst çubukların yüksekliği için tahmini bir sabit (eski COLLAPSIBLE_ESTIMATE)
// bilerek YOK. Çubukların içeriği dinamik (aktif filtre çipleri satırı koşullu),
// bu yüzden yükseklik yalnızca `onLayout` ile ölçülür; ölçüm gelene kadar liste
// gizli tutulur (bkz. useSearch → barsMeasured). Tahmin + düzeltme turu listeyi
// ilk boyamada yeniden yerleştiriyordu.

// The result grid's column count is the shared listing-grid rule (`useProductGridColumns`,
// `@/components/product`): 2 on phones, more on tablets. There is no `getItemLayout`: the card
// height varies (optional rating row, one- or two-line title).

/**
 * FlashList v2 geri dönüşüm penceresi (px): görünür alanın alt/üstünde bu kadar içerik önceden çizilir.
 * FlatList'in `windowSize` / `initialNumToRender` / `maxToRenderPerBatch` ayarlarının karşılığıdır;
 * hücreler geri dönüştürüldüğü için batch/pencere sayısı yerine tek ayar yeter. ~2 kart satırı
 * (ızgarada ≈ 290pt/satır) hızlı kaydırmada boşluk göstermez, JS turunu da şişirmez.
 */
export const SEARCH_DRAW_DISTANCE = 600;

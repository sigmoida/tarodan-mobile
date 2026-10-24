import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { spacing } = theme;

/** Gap between collection cards, across and down (web `gap-3`). */
export const COLLECTION_GRID_GAP = spacing[3];

// Koleksiyon tarama listesi: web `CollectionCard` (kare kapak, rounded kart, sahip altlığı) + liste düzeni.
export const styles = StyleSheet.create({
  header: { gap: spacing[3] },
  row: { gap: COLLECTION_GRID_GAP },
  skeletonRows: { gap: COLLECTION_GRID_GAP },
  skeletons: { flexDirection: 'row', gap: COLLECTION_GRID_GAP },
  footer: { gap: spacing[4], paddingBottom: spacing[16] },
});

import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { spacing } = theme;

// Koleksiyon tarama listesi: web `CollectionCard` (kare kapak, rounded kart, sahip altlığı) + liste düzeni.
export const styles = StyleSheet.create({
  header: { gap: spacing[3] },
  row: { gap: spacing[3] },
  cell: { flex: 1 },
  skeletonRows: { gap: spacing[3] },
  skeletons: { flexDirection: 'row', gap: spacing[3] },
  footer: { gap: spacing[4], paddingBottom: spacing[16] },
});

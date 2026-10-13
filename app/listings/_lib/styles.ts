import { StyleSheet } from 'react-native';
import { PRODUCT_GRID_GAP } from '@/components/product';
import { theme } from '@/ui';

export const styles = StyleSheet.create({
  header: { gap: theme.spacing[3] },
  // Tüm kartlar ve reklam satırları arasındaki dikey aralık = ızgara aralığı (web gap-3).
  content: { gap: PRODUCT_GRID_GAP, paddingBottom: theme.spacing[16] },
  // Satır = 2 kart yan yana (reklam satırı araya girebildiği için FlatList sütunu kullanılmaz).
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});

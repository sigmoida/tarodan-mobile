import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

export const styles = StyleSheet.create({
  list: { gap: spacing[2] },
  // Segment switch above the search field (the list's gap is only between rows).
  listHeader: { gap: spacing[3], marginBottom: spacing[1] },
  rowContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  thumb: {
    width: spacing[16],
    height: spacing[16],
    borderRadius: radiusRole.productCard,
    backgroundColor: colors.surface.alt,
  },
  rowInfo: { flex: 1, minWidth: 0, gap: spacing[0.5] },
  // Seçim kutusu yuvası: kutu boyutunda, satırın orta çizgisinde (ListRowCard `alignItems: center`).
  toggle: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  // Bekleme göstergesi kutuyla aynı 20pt yuvada: satır zıplamaz.
  toggleSlot: { width: spacing[5], height: spacing[5], alignItems: 'center', justifyContent: 'center' },
});

// Custom item form (web `CustomItemForm`: stacked fields, a 64 pt image thumbnail beside its buttons).
export const formStyles = StyleSheet.create({
  fields: { gap: spacing[3] },
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  thumb: {
    width: spacing[16],
    height: spacing[16],
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radiusRole.productCard,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.alt,
  },
  thumbImage: { width: '100%', height: '100%' },
  imageActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
});

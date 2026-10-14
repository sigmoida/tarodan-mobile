import { StyleSheet } from 'react-native';
import { PAGE_GUTTER, PAGE_SECTION_GAP, theme } from '@/ui';

const { colors, spacing } = theme;

// Route-local stylesheet (§12) — D1b referans düzeni: token'lar, sayısal ham değer yok.
export const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingBottom: spacing[24],
  },
  // Liste başlığı (günlük hak uyarısı) sayfa kenar boşluğunda; satırlar tam genişlik.
  listHeader: {
    paddingHorizontal: PAGE_GUTTER,
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    gap: spacing[3],
  },
  skeletonList: {
    paddingHorizontal: PAGE_GUTTER,
    gap: PAGE_SECTION_GAP,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  skeletonText: {
    flex: 1,
  },
  productRefText: {
    marginTop: spacing[0.5],
    color: colors.primary[600],
  },
});

import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { spacing } = theme;

// Yardım merkezi route-local stilleri: yalnız yerleşim boşlukları. Kartlar, başlıklar ve
// metinler `@/ui` SectionCard / Text / `DocBlocks`'tan gelir.
export const styles = StyleSheet.create({
  quickLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing[4],
    rowGap: spacing[3],
  },
  faqCategory: {
    marginBottom: spacing[2],
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minHeight: theme.minTouchTarget,
  },
  categoryTitle: {
    flex: 1,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: theme.minTouchTarget,
  },
  contactInfo: {
    flex: 1,
    gap: spacing[0.5],
  },
  appInfo: {
    alignItems: 'center',
    gap: spacing[2],
  },
  appLinks: {
    flexDirection: 'row',
    gap: spacing[4],
  },
});

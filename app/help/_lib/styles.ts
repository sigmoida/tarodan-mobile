import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { spacing, colors, radiusRole } = theme;

// Yardım merkezi route-local stilleri: yalnız yerleşim boşlukları. Kartlar, başlıklar ve
// metinler `@/ui` SectionCard / Text / `DocBlocks`'tan gelir.
export const styles = StyleSheet.create({
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
  // Açık kategorinin soruları: zeminli, sol vurgulu, girintili panel (kategori satırından ayrışır).
  questionList: {
    marginTop: spacing[1],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.surface.alt,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary[500],
    borderRadius: radiusRole.card,
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
});

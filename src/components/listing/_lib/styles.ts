import { StyleSheet } from 'react-native';
import { PAGE_SECTION_GAP, theme } from '@/ui';

const { colors } = theme;

// ---------------------------------------------------------------------------
// ListingForm — ekran iskeleti stilleri. Bölüm stilleri
// kendi dosyalarında (`_sections/*`), hepsi `@/ui` primitiflerinden.
// ---------------------------------------------------------------------------
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
  },
  fill: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[10],
    gap: PAGE_SECTION_GAP,
  },
});

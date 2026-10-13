import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, typography, radiusRole } = theme;

// Arama ekranının route-local stylesheet'i. Kart ve sıralama paneli artık ortak
// (`@/components/product`); burada yalnız arama kutusu, öneri paneli ve liste düzeni kalır.
export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.DEFAULT },
  // Sonuç alanı: absolute üst çubukları barındırır; yukarı kayan çubukları kırpar.
  resultsArea: { flex: 1, position: 'relative', overflow: 'hidden' },
  // Üst çubuklar (arama + filtre + çipler + sayım) — absolute katman, liste üstünde durur.
  collapsibleBars: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    backgroundColor: colors.surface.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  searchSection: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    backgroundColor: colors.surface.DEFAULT,
    position: 'relative',
    zIndex: 10,
  },
  searchAnchor: {
    position: 'relative',
    zIndex: 20,
  },
  searchInputContainer: {
    marginBottom: spacing[0],
  },
  searchInputField: {
    borderColor: colors.primary[500],
  },
  searchInputFieldOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  recentSearchesDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: -1,
    backgroundColor: colors.surface.elevated,
    borderBottomLeftRadius: radiusRole.input,
    borderBottomRightRadius: radiusRole.input,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.primary[500],
    ...theme.shadow.medium,
    zIndex: 100,
  },
  acSection: {
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  acSectionTitle: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1.5],
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.subtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  acItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    minHeight: theme.minTouchTarget,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  acItemText: { fontSize: typography.fontSize.sm, color: colors.text.heading, flex: 1 },
  acItemMeta: { fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing[0.5] },
  recentSearchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  recentSearchesTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.heading,
  },
  clearRecentText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    fontWeight: typography.fontWeight.medium,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.minTouchTarget,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  recentSearchText: { flex: 1, fontSize: typography.fontSize.sm, color: colors.text.heading },
  controls: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  chips: { paddingHorizontal: spacing[4] },
  resultsCount: { paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
  listContent: { padding: spacing[4], paddingTop: spacing[2], gap: spacing[3] },
  // Üst çubuklar ölçülene kadar liste görünmez ama YERLEŞİR (opacity, display değil):
  // doğru üst boşlukla tek seferde konumlanır, kullanıcı ara kareyi görmez.
  listHidden: { opacity: 0 },
  listRow: { gap: spacing[3] },
  scrollTopFab: { position: 'absolute', right: spacing[4], bottom: spacing[6], zIndex: 50 },
});

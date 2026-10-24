import { StyleSheet } from 'react-native';
import { PAGE_GUTTER, PAGE_SECTION_GAP, theme } from '@/ui';
import { MASTER_PANE_FRACTION } from './layout';

const { colors, spacing } = theme;

// Route-local stylesheet (app/CLAUDE.md › Worked examples) — D1b referans düzeni: token'lar, sayısal ham değer yok.
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
  // --- Master–detail (expanded and wider windows) ---
  masterDetail: { flex: 1, flexDirection: 'row', backgroundColor: colors.surface.DEFAULT },
  masterPane: { flex: MASTER_PANE_FRACTION },
  detailPane: {
    flex: 1 - MASTER_PANE_FRACTION,
    borderLeftWidth: 1,
    borderLeftColor: colors.border.DEFAULT,
  },
  // Narrowed below expanded with a thread open: the inbox pane stays mounted but hidden.
  paneHidden: { display: 'none' },
  fill: { flex: 1 },
  // The open thread's row in the inbox (pressed-state tone, kept while it is open).
  threadRowSelected: { backgroundColor: colors.surface.alt },
  productRefText: {
    marginTop: spacing[0.5],
    color: colors.primary[600],
  },
});

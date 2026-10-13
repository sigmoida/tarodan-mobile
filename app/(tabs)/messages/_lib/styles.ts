import { StyleSheet } from 'react-native';
import { PAGE_GUTTER, PAGE_SECTION_GAP, theme } from '@/ui';

const { colors, spacing, typography } = theme;

// Route-local stylesheet (§12) — D1b referans düzeni: token'lar, sayısal ham değer yok.
export const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingBottom: spacing[24],
  },
  // Liste başlığı (PageHeader + uyarı + arama) sayfa kenar boşluğunda; satırlar tam genişlik.
  listHeader: {
    paddingHorizontal: PAGE_GUTTER,
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    gap: spacing[3],
  },
  search: {
    marginBottom: spacing[0],
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
  threadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PAGE_GUTTER,
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
  },
  threadItemUnread: {
    backgroundColor: colors.primary[50],
  },
  threadItemPressed: {
    backgroundColor: colors.surface.alt,
  },
  threadContent: {
    flex: 1,
    marginLeft: spacing[3],
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantName: {
    flex: 1,
    color: colors.text.heading,
  },
  threadTime: {
    color: colors.text.muted,
    marginLeft: spacing[2],
  },
  productRefText: {
    marginTop: spacing[0.5],
    color: colors.primary[600],
  },
  lastMessage: {
    color: colors.text.muted,
    marginTop: spacing[1],
  },
  unreadText: {
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.heading,
  },
  unreadBadge: {
    marginLeft: spacing[2],
  },
});

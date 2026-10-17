import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing } = theme;

// Route-local stylesheet (app/CLAUDE.md › Worked examples).
export const styles = StyleSheet.create({
  headerCount: {
    color: colors.text.muted,
    paddingHorizontal: spacing[2],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[2],
  },
  searchName: {
    flex: 1,
  },
  queryText: {
    color: colors.text.heading,
    marginTop: spacing[2],
    fontStyle: 'italic',
  },
  filtersText: {
    marginTop: spacing[1],
  },
  divider: {
    marginVertical: spacing[3],
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaInfo: {
    flex: 1,
  },
  notifyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  notifyText: {
    flex: 1,
  },
});

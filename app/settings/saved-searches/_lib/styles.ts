import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { spacing } = theme;

// Route-local stylesheet (app/CLAUDE.md › Worked examples).
export const styles = StyleSheet.create({
  list: {
    gap: spacing[3],
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  savedOn: {
    marginTop: spacing[2],
  },
  divider: {
    marginVertical: spacing[3],
  },
});

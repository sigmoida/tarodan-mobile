import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { spacing } = theme;

// Route-local stylesheet (app/CLAUDE.md › Worked examples): cards are web Card.
export const styles = StyleSheet.create({
  paymentCard: {
    gap: spacing[2],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  headerText: {
    flex: 1,
    gap: spacing[0.5],
  },
  // Status badge on the left, date pushed to the right on the same row.
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  metaDate: {
    marginLeft: 'auto',
  },
});

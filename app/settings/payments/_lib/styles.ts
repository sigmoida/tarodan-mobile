import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

// Route-local stylesheet (§12) — kartlar web Card.
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  failureBox: {
    backgroundColor: colors.danger[50]!,
    padding: spacing[2],
    borderRadius: radiusRole.card,
  },
});

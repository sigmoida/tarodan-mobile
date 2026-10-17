import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing } = theme;

// Satıcı panosu route-local stylesheet'i — SectionCard/Card dili, token'lı.
export const styles = StyleSheet.create({
  welcomeText: {
    gap: spacing[1],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  statCard: { flexBasis: '47%', flexGrow: 1 },
  quickAction: {
    minHeight: theme.minTouchTarget,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1.5],
  },
});

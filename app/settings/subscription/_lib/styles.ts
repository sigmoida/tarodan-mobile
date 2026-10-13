import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing } = theme;

// Abonelik ayarları ekranının route-local stylesheet'i — SectionCard/Card dili, token'lı.
export const styles = StyleSheet.create({
  planBody: {
    gap: spacing[3],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  features: {
    gap: spacing[2],
  },
  billingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: theme.minTouchTarget,
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  billingInfo: {
    flex: 1,
  },
  billingAmount: {
    alignItems: 'flex-end',
    gap: spacing[1],
  },
  actionRow: {
    minHeight: theme.minTouchTarget,
    justifyContent: 'center',
    paddingVertical: spacing[2],
    gap: spacing[0.5],
  },
});

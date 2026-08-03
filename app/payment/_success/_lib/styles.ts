import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors } = theme;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
  },
  scrollBody: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing[6],
    gap: theme.spacing[2.5],
  },
  iconWrap: {
    marginBottom: theme.spacing[2],
  },
  title: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '800',
    color: colors.text.heading,
    textAlign: 'center',
    includeFontPadding: true,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.DEFAULT,
    padding: theme.spacing[4],
    marginTop: theme.spacing[4],
    gap: theme.spacing[2.5],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.text.muted,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.heading,
  },
  actions: {
    width: '100%',
    marginTop: theme.spacing[6],
    gap: theme.spacing[2.5],
  },
  btn: {
    borderRadius: theme.radius['2xl'],
  },
});

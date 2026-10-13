import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors } = theme;

// Route-local stylesheet (§12). Monolitten BİREBİR taşındı.
export const styles = StyleSheet.create({
  planBody: { gap: theme.spacing[2] },
  container: {
    flex: 1,
    backgroundColor: colors.surface.alt,
  },
  content: {
    flex: 1,
    padding: theme.spacing[4],
  },
  planCard: {
    marginBottom: theme.spacing[6],
    borderWidth: 2,
    backgroundColor: colors.surface.DEFAULT,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[4],
  },
  planName: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
  },
  planPrice: {
    fontSize: theme.typography.fontSize['4xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.heading,
    marginTop: theme.spacing[1],
  },
  planPeriod: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular,
    color: colors.text.muted,
  },
  featuresCompact: {
    gap: theme.spacing[2],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    marginLeft: theme.spacing[2],
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.heading,
  },
  moreFeatures: {
    marginLeft: theme.spacing[6],
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.heading,
    marginBottom: theme.spacing[3],
  },
  paymentCard: {
    marginBottom: theme.spacing[6],
    backgroundColor: colors.surface.DEFAULT,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[2],
  },
  paymentOptionText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.snug,
    color: colors.text.muted,
  },
  summaryCard: {
    marginBottom: theme.spacing[4],
    backgroundColor: colors.surface.DEFAULT,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[2],
  },
  summaryLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.muted,
  },
  summaryValue: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.heading,
  },
  vatNote: {
    fontSize: theme.typography.fontSize.xs,
    color: colors.text.muted,
    marginTop: theme.spacing[0.5],
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.DEFAULT,
    marginVertical: theme.spacing[3],
  },
  totalLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.heading,
  },
  totalValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.primary[600]!,
  },
  terms: {
    fontSize: theme.typography.fontSize.xs,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: theme.spacing[4],
    lineHeight: theme.typography.fontSize.xs * theme.typography.lineHeight.normal,
  },
  termsLink: {
    color: colors.primary[600]!,
    textDecorationLine: 'underline',
  },
  payButton: {
    borderRadius: theme.radius.lg,
  },
});

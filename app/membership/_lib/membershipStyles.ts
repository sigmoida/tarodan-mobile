import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors } = theme;

// Üyelik ekranının route-local stylesheet'i (monolitten birebir taşındı).
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.alt,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    margin: theme.spacing[4],
    padding: theme.spacing[3],
    borderRadius: theme.radius['2xl'],
    backgroundColor: colors.danger[50]!,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.danger[600]!,
  },
  errorBannerText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: colors.danger[600]!,
  },
  errorBannerRetry: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.danger[600]!,
  },
  loadingText: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.muted,
  },
  scrollView: {
    flex: 1,
  },

  // Pending Payment Banner
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning[100]!,
    borderColor: colors.warning[500]!,
    borderWidth: 1,
    marginHorizontal: theme.spacing[4],
    marginTop: theme.spacing[4],
    borderRadius: theme.radius.lg,
    padding: theme.spacing[3.5],
    gap: theme.spacing[2.5],
  },
  pendingBannerText: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: colors.warning[800]!,
  },
  pendingSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: colors.warning[700]!,
    marginTop: theme.spacing[0.5],
  },

  // Current Plan Card
  currentPlanCard: {
    backgroundColor: colors.surface.elevated,
    marginHorizontal: theme.spacing[4],
    marginTop: theme.spacing[4],
    borderRadius: theme.radius['3xl'],
    padding: theme.spacing[5],
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  currentPlanIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  currentPlanLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.muted,
    marginBottom: theme.spacing[1],
  },
  currentPlanName: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
  },
  currentPlanExpiry: {
    fontSize: theme.typography.fontSize.xs,
    color: colors.text.subtle,
    marginTop: theme.spacing[1.5],
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1.5],
    marginTop: theme.spacing[3],
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.xl,
    backgroundColor: colors.primary[50]!,
  },
  manageButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: colors.primary[600]!,
  },

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface.elevated,
    marginHorizontal: theme.spacing[4],
    marginTop: theme.spacing[5],
    borderRadius: theme.radius.lg,
    padding: theme.spacing[1],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing[2.5],
    borderRadius: theme.radius['2xl'],
    gap: theme.spacing[1.5],
  },
  toggleButtonActive: {
    backgroundColor: colors.primary[600]!,
  },
  toggleText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: colors.text.muted,
  },
  toggleTextActive: {
    color: colors.white,
  },
  discountBadge: {
    backgroundColor: colors.success[100]!,
    paddingHorizontal: theme.spacing[1.5],
    paddingVertical: theme.spacing[0.5],
    borderRadius: theme.radius.lg,
  },
  discountBadgeText: {
    fontSize: theme.typography.fontSize['2xs'],
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.success[800]!,
  },

  // Tier Cards
  tierCardsContainer: {
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[5],
    paddingBottom: theme.spacing[2],
    gap: theme.spacing[3],
  },
  tierCard: {
    width: 280,
    backgroundColor: colors.surface.elevated,
    borderRadius: theme.radius['3xl'],
    padding: theme.spacing[5],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 420,
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderTopRightRadius: theme.radius['2xl'],
    borderBottomLeftRadius: theme.radius.lg,
  },
  popularBadgeText: {
    color: colors.white,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
  },
  currentBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
    paddingHorizontal: theme.spacing[2.5],
    paddingVertical: theme.spacing[1],
    borderTopLeftRadius: theme.radius['2xl'],
    borderBottomRightRadius: theme.radius.lg,
  },
  currentBadgeText: {
    color: colors.white,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
  },
  tierIconCircle: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing[3],
    marginBottom: theme.spacing[2.5],
  },
  tierName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing[1],
  },
  tierPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: theme.spacing[0.5],
  },
  tierPriceFree: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.heading,
  },
  tierPrice: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.heading,
  },
  tierPricePeriod: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.muted,
    marginLeft: theme.spacing[0.5],
  },
  tierMonthlyEquiv: {
    fontSize: theme.typography.fontSize.xs,
    color: colors.text.subtle,
    marginBottom: theme.spacing[0.5],
  },
  tierDivider: {
    height: 1,
    backgroundColor: colors.border.DEFAULT,
    marginVertical: theme.spacing[3.5],
  },
  tierFeatures: {
    gap: theme.spacing[2.5],
  },
  tierFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  tierFeatureText: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.heading,
    flex: 1,
  },
  tierButton: {
    marginTop: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.radius['2xl'],
    alignItems: 'center',
  },
  tierButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
  },
});

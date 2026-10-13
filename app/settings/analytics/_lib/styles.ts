import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radius, radiusRole } = theme;

/** Basit çubuk grafiğin yüksekliği ve çubuk genişliği (pt). */
const CHART_HEIGHT = 120;
const BAR_WIDTH = 24;
const BAR_MIN_HEIGHT = 4;

// Analitik ekranının route-local stylesheet'i — SectionCard/Card dili, token'lı.
export const styles = StyleSheet.create({
  overviewRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  overviewCard: { flex: 1, alignItems: 'center', gap: spacing[1] },
  simpleChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    paddingHorizontal: spacing[2],
  },
  chartBar: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: spacing[1],
  },
  bar: {
    width: BAR_WIDTH,
    backgroundColor: colors.primary[500]!,
    borderRadius: radius.sm,
    minHeight: BAR_MIN_HEIGHT,
  },
  barLabel: {
    marginTop: spacing[2],
  },
  chartFooter: {
    marginTop: spacing[4],
    alignItems: 'center',
  },
  listingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: theme.minTouchTarget,
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  listingRank: {
    width: spacing[8],
  },
  listingInfo: {
    flex: 1,
    gap: spacing[0.5],
  },
  listingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  listingStatGap: {
    marginLeft: spacing[3],
  },
  premiumFeatures: {
    gap: spacing[1],
    marginBottom: spacing[2],
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    padding: spacing[3],
    backgroundColor: colors.surface.alt,
    borderRadius: radiusRole.card,
    gap: spacing[1],
  },
});

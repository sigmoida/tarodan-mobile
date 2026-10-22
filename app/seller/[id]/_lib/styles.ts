import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

// Satıcı profili: web `SellerHeader` (kenarlıklı kart, MetricCard ızgarası) + sekmeler + sekme içerikleri.
export const styles = StyleSheet.create({
  header: { gap: spacing[4] },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  identityInfo: { flex: 1, minWidth: 0, gap: spacing[1] },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing[2] },
  name: { flexShrink: 1 },
  flex: { flex: 1 },
  // Pressable wrapper of the trust badge: hugs the badge, rounds the Android ripple to its corner.
  trustBadge: { alignSelf: 'flex-start', maxWidth: '100%', borderRadius: radiusRole.badge },
  trustInfo: { gap: spacing[3] },
  trustFactors: { gap: spacing[1] },
  trustFactor: { flexDirection: 'row', gap: spacing[2] },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  // Beyaz profil kartı içinde gri ton döşeme (web'de beyaz+çerçeve; mobilde kart içinde kart ayrışsın diye surface.alt).
  metric: {
    width: '47%',
    flexGrow: 1,
    gap: spacing[0.5],
    padding: spacing[4],
    borderRadius: radiusRole.card,
    backgroundColor: colors.surface.alt,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing[3] },
  cell: { width: '48%' },
  showMore: { marginTop: spacing[3] },
  review: { gap: spacing[1], paddingVertical: spacing[3] },
  reviewDivided: { borderTopWidth: 1, borderTopColor: colors.border.DEFAULT },
  reviewsAverage: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  reviewInfo: { flex: 1, minWidth: 0, gap: spacing[0.5] },
  stars: { flexDirection: 'row', alignItems: 'center', gap: spacing[0.5] },
});

import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, radius, radiusRole, spacing } = theme;

/** Liste satırındaki ilan görseli (pt). */
const THUMB = 100;
/** Durum noktası (pt). */
const DOT = 6;

// İlan yönetimi ekranının route-local stylesheet'i — web Card/SectionCard dili, token'lı.
export const styles = StyleSheet.create({
  progressBar: {
    marginTop: spacing[2],
  },
  chipRow: {
    gap: spacing[2],
  },
  listingCard: { alignItems: 'stretch' },
  listingImage: {
    width: THUMB,
    height: THUMB,
    borderRadius: radiusRole.productCard,
    backgroundColor: colors.surface.alt,
  },
  listingInfo: {
    flex: 1,
    marginLeft: spacing[3],
    gap: spacing[1],
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  listingTitle: {
    flex: 1,
  },
  listingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  statusDot: {
    width: DOT,
    height: DOT,
    borderRadius: radius.full,
  },
  rejectionBox: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radiusRole.card,
    backgroundColor: colors.danger[50]!,
  },
  // Sol üst (görselin köşesi): sağ üstte ⋮ menü düğmesi var, kutu onu örtmemeli.
  selectCheck: {
    position: 'absolute',
    top: spacing[2],
    left: spacing[2],
    zIndex: 1,
    padding: spacing[1],
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  // Sütun: ButtonRow tam genişlik alır (içerik genişlikli satır çocuğu olursa ölçüm yanlış çıkar).
  expiredBar: {
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radiusRole.card,
    backgroundColor: colors.surface.alt,
  },
  bannerButton: {
    marginTop: spacing[2],
    alignSelf: 'flex-start',
  },
  fab: {
    position: 'absolute',
    right: spacing[4],
    bottom: spacing[6],
  },
  menuItem: {
    minHeight: theme.minTouchTarget,
    justifyContent: 'center',
  },
});

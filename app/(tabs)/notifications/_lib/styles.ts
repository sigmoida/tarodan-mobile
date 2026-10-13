import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radius, radiusRole } = theme;

/** Satır solundaki tip ikonu / ürün görseli kutusu ve okunmamış noktası (pt). */
const LEADING = 40;
const DOT = 8;

// Route-local stylesheet (§12) — satırlar web Card (bordered, rounded-lg), token'lı.
export const styles = StyleSheet.create({
  footerSpinner: { paddingVertical: spacing[4] },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  separator: { height: spacing[2] },
  titleSpacing: { marginBottom: spacing[1] },
  messageSpacing: { marginBottom: spacing[1.5] },
  emptyList: {
    flexGrow: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface.elevated,
    padding: spacing[3.5],
    borderRadius: radiusRole.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  itemUnread: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[200],
  },
  iconContainer: {
    width: LEADING,
    height: LEADING,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  thumb: {
    width: LEADING,
    height: LEADING,
    borderRadius: radiusRole.productCard,
    marginRight: spacing[3],
    backgroundColor: colors.surface.alt,
  },
  content: {
    flex: 1,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: radius.full,
    backgroundColor: colors.primary[500],
    marginLeft: spacing[2],
    marginTop: spacing[1.5],
  },
});

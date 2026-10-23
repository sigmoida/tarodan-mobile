import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radius, radiusRole } = theme;

/** Row photo / status icon box (pt). */
const THUMB = 44;

// Route-local stylesheet (app/CLAUDE.md › Worked examples): rows are web Card (bordered, rounded-lg).
export const styles = StyleSheet.create({
  // Clips the trigger's pressed background and ripple to the card corners.
  card: {
    overflow: 'hidden',
  },
  trigger: {
    padding: spacing[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconContainer: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
    backgroundColor: colors.surface.alt,
  },
  productImage: {
    width: THUMB,
    height: THUMB,
    borderRadius: radiusRole.productCard,
    marginRight: spacing[3],
    backgroundColor: colors.gray[100],
  },
  paymentInfo: {
    flex: 1,
    marginRight: spacing[3],
    gap: spacing[0.5],
  },
  paymentRight: {
    alignItems: 'flex-end',
    gap: spacing[1],
  },
  details: {
    paddingTop: 0,
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
  // A long description wraps on the right instead of pushing the label out.
  detailValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
});

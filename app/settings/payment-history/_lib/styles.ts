import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radius, radiusRole } = theme;

/** Satırdaki görsel / durum ikonu kutusu (pt). */
const THUMB = 44;

// Route-local stylesheet (§12) — satırlar web Card (bordered, rounded-lg).
export const styles = StyleSheet.create({
  statusIconContainer: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
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
});

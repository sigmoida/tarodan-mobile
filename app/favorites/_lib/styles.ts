import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

/** Satırdaki ürün görseli (pt). */
const THUMB = 100;

// Route-local stylesheet (§12) — satır kartı web Card (bordered), token'lı.
export const styles = StyleSheet.create({
  moreButton: {
    alignSelf: 'center',
    marginTop: spacing[2],
  },
  card: {
    marginBottom: spacing[3],
  },
  cardContent: {
    flexDirection: 'row',
    padding: spacing[3],
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
  },
  productImage: {
    width: THUMB,
    height: THUMB,
    borderRadius: radiusRole.productCard,
    backgroundColor: colors.surface.alt,
  },
  productInfo: {
    flex: 1,
    marginLeft: spacing[3],
    justifyContent: 'center',
    gap: spacing[1],
  },
  statusBadge: {
    alignSelf: 'flex-start',
  },
  actions: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

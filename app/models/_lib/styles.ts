import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

// Model tarama listesi: marka başına SectionCard + 2 sütun model kartı (ürün kartıyla aynı dil).
export const styles = StyleSheet.create({
  filters: { gap: spacing[3] },
  // flexGrow:0 + alignItems:center → yatay ScrollView çipleri dikeyde germesin.
  chipsScroll: { flexGrow: 0 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing[3] },
  modelCard: {
    width: '48%',
    overflow: 'hidden',
    borderRadius: radiusRole.productCard,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
  },
  pressed: { opacity: 0.85 },
  modelImage: { aspectRatio: 1, backgroundColor: colors.surface.alt },
  modelImageFill: { width: '100%', height: '100%' },
  modelBody: { padding: spacing[2.5], gap: spacing[0.5] },
});

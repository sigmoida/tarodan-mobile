import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

// Model detayı: kapak görseli + başlık bandı, ürünler SectionCard'ı (2 sütun ProductCard).
export const styles = StyleSheet.create({
  hero: { gap: spacing[3] },
  heroImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    borderRadius: radiusRole.card,
    backgroundColor: colors.surface.alt,
  },
  heroImageFill: { width: '100%', height: '100%' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  brandLogo: {
    width: spacing[6],
    height: spacing[6],
    borderRadius: radiusRole.avatar,
    backgroundColor: colors.surface.alt,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing[3] },
  cell: { width: '48%' },
});

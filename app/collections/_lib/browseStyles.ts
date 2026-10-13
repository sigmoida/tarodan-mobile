import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

// Koleksiyon tarama listesi: web `CollectionCard` (kare kapak, rounded kart, sahip altlığı) + liste düzeni.
export const styles = StyleSheet.create({
  header: { gap: spacing[3] },
  chips: { flexDirection: 'row', gap: spacing[2] },
  row: { gap: spacing[3] },
  cell: { flex: 1 },
  card: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: radiusRole.productCard,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
  },
  pressed: { opacity: 0.85 },
  cover: { aspectRatio: 1, backgroundColor: colors.surface.alt },
  coverImage: { width: '100%', height: '100%' },
  body: { flex: 1, padding: spacing[2.5], gap: spacing[0.5] },
  meta: {
    marginTop: 'auto',
    paddingTop: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counters: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  counter: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  owner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
  },
  skeletons: { flexDirection: 'row', gap: spacing[3] },
  footer: { gap: spacing[4], paddingBottom: spacing[16] },
});

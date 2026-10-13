import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

// Koleksiyon düzenleme: SectionCard bölümleri; kapak 16:9.
export const styles = StyleSheet.create({
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    borderRadius: radiusRole.card,
    backgroundColor: colors.surface.alt,
  },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border.DEFAULT,
    borderRadius: radiusRole.card,
  },
  coverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    padding: spacing[2],
    backgroundColor: colors.overlay.black50,
  },
  fields: { gap: spacing[3] },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] },
  switchText: { flex: 1, gap: spacing[0.5] },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: spacing[2] },
  divided: { borderTopWidth: 1, borderTopColor: colors.border.DEFAULT },
  itemContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  itemImage: {
    width: spacing[12],
    height: spacing[12],
    borderRadius: radiusRole.productCard,
    backgroundColor: colors.surface.alt,
  },
  itemTitle: { flex: 1 },
});

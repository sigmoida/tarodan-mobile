import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

// Koleksiyon detayı: web `CollectionHeaderCard` + içerik SectionCard'ı.
export const styles = StyleSheet.create({
  header: { gap: spacing[4] },
  topRow: { flexDirection: 'row', gap: spacing[4] },
  cover: {
    width: spacing[24] + spacing[8],
    height: spacing[24] + spacing[8],
    overflow: 'hidden',
    borderRadius: radiusRole.card,
    backgroundColor: colors.surface.alt,
  },
  coverImage: { width: '100%', height: '100%' },
  headInfo: { flex: 1, minWidth: 0, gap: spacing[1.5] },
  // Ghost ikon düğmeleri (40pt kutu, 20pt ikon): ilk ikon metin kenarıyla hizalansın diye kutunun
  // iç boşluğu kadar sola kaydırılır; dokunma alanı hitSlop ile 44pt.
  headActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginLeft: -spacing[2.5] },
  ownerChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderRadius: radiusRole.chip,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.DEFAULT,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
  },
  counters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing[4] },
  counter: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  ownerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  itemsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing[3] },
  itemCell: { width: '48%' },
});

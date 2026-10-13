import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

// Koleksiyon oluştur: web formu gibi SectionCard bölümleri; kapak 16:9 yükleme alanı.
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
  coverRemove: { position: 'absolute', top: spacing[2], right: spacing[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  fields: { gap: spacing[3] },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] },
  switchText: { flex: 1, gap: spacing[0.5] },
});

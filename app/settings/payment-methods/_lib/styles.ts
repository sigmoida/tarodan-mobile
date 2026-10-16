import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

export const styles = StyleSheet.create({
  // SectionCard gövdesi: satırlar arası web `space-y-3`.
  list: { gap: spacing[3] },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radiusRole.card,
    padding: spacing[4],
  },
  cardInfo: { flex: 1, gap: spacing[1] },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1.5] },
  secureText: { textAlign: 'center' },
});

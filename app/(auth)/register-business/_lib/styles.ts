import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

// Kurumsal başvuru formunun route-local stylesheet'i. Kabuk (logo, başlık, zemin) `AuthShell`'de.
export const styles = StyleSheet.create({
  form: {
    width: '100%',
  },
  tabs: {
    marginBottom: spacing[5],
  },
  infoCard: {
    backgroundColor: colors.primary[50],
    padding: spacing[4],
    borderRadius: radiusRole.card,
    gap: spacing[1],
  },
});

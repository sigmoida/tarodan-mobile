import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { spacing } = theme;

// Kayıt formunun route-local stylesheet'i. Kabuk (üst bar, zemin) `AuthShell`'de.
export const styles = StyleSheet.create({
  /** Input kendi alt boşluğunu (8) taşır: 8 + 8 = web `space-y-4` (16). */
  form: {
    width: '100%',
    gap: spacing[2],
  },
  /** Sekmeler ile ilk alan arası: 8 (form gap) + 8 = 16. */
  tabs: {
    marginBottom: spacing[2],
  },
  /** Telefon + Doğum Tarihi yan yana (iki eşit sütun). */
  pair: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  pairItem: {
    flex: 1,
  },
  submit: {
    marginTop: spacing[4],
  },
});

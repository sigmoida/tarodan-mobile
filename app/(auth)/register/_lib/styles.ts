import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { spacing } = theme;

// Kayıt formunun route-local stylesheet'i. Kabuk (logo, başlık, zemin) `AuthShell`'de.
export const styles = StyleSheet.create({
  /** Input kendi alt boşluğunu (8) taşır: 8 + 8 = web `space-y-4` (16). */
  form: {
    width: '100%',
    gap: spacing[2],
  },
  tabs: {
    marginBottom: spacing[5],
  },
  /** Alan altındaki açıklama satırı — Input'un kendi alt boşluğunu yukarı çeker.
   *  Negatif marj için token yok; `-theme.spacing[1]` (=-4pt) token türevi. */
  fieldHint: {
    marginTop: -spacing[1],
    marginBottom: spacing[2],
  },
  legalLinks: {
    marginTop: spacing[2],
  },
  submit: {
    marginTop: spacing[4],
  },
});

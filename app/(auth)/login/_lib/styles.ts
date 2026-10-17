import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing } = theme;

// Giriş formunun route-local stylesheet'i. Kabuk (üst bar, zemin) `AuthShell`'de.
export const styles = StyleSheet.create({
  root: {
    width: '100%',
    gap: spacing[4],
  },
  form: {
    width: '100%',
    // Input kendi alt boşluğunu (8) taşır: 8 + 8 = web `space-y-4` (16).
    gap: spacing[2],
  },
  forgotLink: {
    alignSelf: 'flex-end',
    // Form `gap`'ini (8) geri al: bağlantı şifre alanına yalnız Input'un kendi alt boşluğuyla (8) bitişir.
    marginTop: -spacing[2],
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginVertical: spacing[2],
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.DEFAULT,
  },
  /** Web `uppercase`: "veya" → "VEYA". */
  upper: {
    textTransform: 'uppercase',
  },
  notice: {
    marginBottom: spacing[2],
  },
  underline: {
    textDecorationLine: 'underline',
  },
  terms: {
    gap: spacing[1],
    marginVertical: spacing[1],
  },
});

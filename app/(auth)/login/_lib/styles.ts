import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing } = theme;

// Giriş formunun route-local stylesheet'i. Kabuk (logo, başlık, zemin) `AuthShell`'de.
export const styles = StyleSheet.create({
  form: {
    width: '100%',
    gap: spacing[4],
  },
  forgotLink: {
    alignSelf: 'flex-end',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.DEFAULT,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    height: theme.controlHeight.lg,
    borderRadius: theme.radiusRole.button,
    backgroundColor: colors.black,
  },
  appleButtonText: {
    color: colors.white,
  },
  disabled: {
    opacity: 0.5,
  },
  terms: {
    gap: spacing[1],
  },
});

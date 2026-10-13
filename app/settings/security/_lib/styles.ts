import { StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

/** 2FA QR görseli kenarı (pt). */
const QR_SIZE = 200;

// Güvenlik ekranının route-local stylesheet'i — SectionCard satırları, token'lı.
export const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    minHeight: theme.minTouchTarget,
  },
  settingText: {
    flex: 1,
    gap: spacing[0.5],
  },
  infoText: {
    marginTop: spacing[3],
  },
  actionButton: {
    marginTop: spacing[3],
  },
  tips: {
    gap: spacing[2],
  },
  dialogInput: {
    marginBottom: spacing[3],
  },
  dialogText: {
    marginBottom: spacing[4],
  },
  dialogStack: {
    gap: spacing[3],
  },
  qrImage: {
    width: QR_SIZE,
    height: QR_SIZE,
    alignSelf: 'center',
  },
  secretContainer: {
    backgroundColor: colors.gray[100],
    padding: spacing[3],
    borderRadius: radiusRole.card,
    marginBottom: spacing[4],
  },
  secretText: {
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  phoneMessage: {
    marginTop: spacing[3],
    textAlign: 'center',
  },
});

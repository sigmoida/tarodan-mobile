import { Platform, StyleSheet } from 'react-native';
import { theme } from '@/ui';

const { colors, spacing, radius, radiusRole } = theme;

/** 2FA QR görseli kenarı (pt) — web `width={200}`. */
export const QR_SIZE = 200;
/** Adım numarası dairesi (web `h-6 w-6`). */
const STEP_DOT = spacing[6];

// Route-local stylesheet of the security screens (hub, password, 2FA, phone, connected accounts), tokens only.
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
  stack: {
    gap: spacing[3],
  },
  /** Connected accounts row: brand mark + name/badge/e-mail (web `flex items-center gap-3`). */
  providerHead: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  providerTitle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing[2],
  },
  stepHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  stepDot: {
    width: STEP_DOT,
    height: STEP_DOT,
    borderRadius: radius.full,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrFrame: {
    alignSelf: 'center',
    padding: spacing[4],
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
    borderRadius: radiusRole.modal,
    backgroundColor: colors.surface.elevated,
  },
  qrImage: {
    width: QR_SIZE,
    height: QR_SIZE,
  },
  qrFallback: {
    width: QR_SIZE,
    height: QR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.alt,
  },
  secretRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  secretBox: {
    flex: 1,
    backgroundColor: colors.surface.alt,
    borderRadius: radiusRole.card,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  mono: {
    // Web `font-mono`. iOS'ta 'monospace' adlı aile yok (Menlo sistem fontu); Android'de var.
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  codeInput: {
    textAlign: 'center',
  },
  codesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  codeCell: {
    // 2 sütun (web `grid-cols-2 gap-2`): yarım genişlik eksi aradaki boşluğun yarısı.
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface.alt,
    borderRadius: radiusRole.card,
    paddingVertical: spacing[2],
    alignItems: 'center',
  },
  modalHint: {
    marginBottom: spacing[3],
  },
  resend: {
    alignSelf: 'center',
    paddingVertical: spacing[2],
  },
});

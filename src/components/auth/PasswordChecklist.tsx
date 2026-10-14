import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, theme, Icon } from '@/ui';
import { passwordChecks } from '@/utils/passwordPolicy';

const { colors, spacing, radius, radiusRole } = theme;

const CHECK_BOX = spacing[4];

/** Parola kuralları (web `passwordChecks`) — kural metni `auth.pwReq*` (kayıt/şifre değiştirme ile ortak). */
export { passwordChecks };

/** Tek gereksinim satırı: sağlanınca yeşil + onay, aksi halde gri nokta (web `PasswordRequirement`). */
export const PasswordRequirement: React.FC<{ met: boolean; text: string }> = ({ met, text }) => (
  <View style={styles.requirement}>
    <View style={[styles.mark, met ? styles.markMet : styles.markUnmet]}>
      {met ? (
        <Icon name="check" size={10} color={colors.success[600]} />
      ) : (
        <View style={styles.dot} />
      )}
    </View>
    <Text variant="caption" tone={met ? 'success' : 'subtle'} style={styles.requirementText}>
      {text}
    </Text>
  </View>
);

/** Canlı gereksinim paneli (web `PasswordChecklist`): `bg-surface` kutu, 2 sütun. */
export const PasswordChecklist: React.FC<{ password: string }> = ({ password }) => {
  const { t } = useTranslation();
  const c = passwordChecks(password);
  return (
    <View style={styles.panel} testID="password-checklist">
      <Text variant="caption" weight="medium" tone="muted">
        {t('auth.pwReqTitle')}
      </Text>
      <View style={styles.grid}>
        <PasswordRequirement met={c.hasMinLength} text={t('auth.pwReqMinLength')} />
        <PasswordRequirement met={c.hasUppercase} text={t('auth.pwReqUppercase')} />
        <PasswordRequirement met={c.hasLowercase} text={t('auth.pwReqLowercase')} />
        <PasswordRequirement met={c.hasNumber} text={t('auth.pwReqNumber')} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: radiusRole.modal,
    padding: spacing[4],
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing[2],
    rowGap: spacing[2],
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    width: '48%',
  },
  requirementText: {
    flexShrink: 1,
  },
  mark: {
    width: CHECK_BOX,
    height: CHECK_BOX,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markMet: {
    backgroundColor: colors.success[100],
  },
  markUnmet: {
    backgroundColor: colors.surface.alt,
  },
  dot: {
    width: spacing[1.5],
    height: spacing[1.5],
    borderRadius: radius.full,
    backgroundColor: colors.border.strong,
  },
});

export default PasswordChecklist;

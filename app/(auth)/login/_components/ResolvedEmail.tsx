import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Text, theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

/** Web `ResolvedEmail`: salt okunur gri kutuda e-posta + "Farklı e-posta kullan" (1. adıma döner). */
export function ResolvedEmail({ email, onChange }: { email: string; onChange: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.box} testID="login-resolved-email">
      <Text variant="bodySm" tone="body" numberOfLines={1} style={styles.email}>
        {email}
      </Text>
      <Button
        testID="login-change-email-button"
        variant="link"
        size="sm"
        title={t('auth.useDifferentEmail')}
        onPress={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    paddingLeft: spacing[3],
    paddingRight: spacing[1],
    minHeight: theme.controlHeight.md,
    marginBottom: spacing[2],
    borderRadius: radiusRole.input,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.alt,
  },
  email: {
    flex: 1,
  },
});

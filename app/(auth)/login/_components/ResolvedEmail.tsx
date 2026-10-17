import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, theme } from '@/ui';

const { colors, spacing, radiusRole } = theme;

/** Web `ResolvedEmail`: salt okunur gri kutuda e-posta + "Farklı e-posta kullan" (1. adıma döner). */
export function ResolvedEmail({ email, onChange }: { email: string; onChange: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.box} testID="login-resolved-email">
      <Text variant="bodySm" tone="body" numberOfLines={1} style={styles.email}>
        {email}
      </Text>
      {/* Aynı Text varyantı → e-postayla aynı satır yüksekliği ve taban çizgisi (Button link'in
          kendi min yüksekliği/dolgusu hizayı kaydırıyordu). */}
      <Pressable
        testID="login-change-email-button"
        accessibilityRole="button"
        onPress={onChange}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Text variant="bodySm" weight="medium" tone="primary" numberOfLines={1}>
          {t('auth.useDifferentEmail')}
        </Text>
      </Pressable>
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
    paddingRight: spacing[3],
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
  pressed: { opacity: 0.6 },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { theme, Button, Modal, Text } from '@/ui';

const { colors } = theme;

interface AuthRequiredSheetProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  message?: string;
  /** Girişten sonra yönlendirilecek ekran (opsiyonel) */
  redirectTo?: string;
}

/**
 * Giriş gerektiren işlemlerde açılan alt sayfa. Web'deki AuthRequiredModal paritesi.
 */
export function AuthRequiredSheet({
  visible,
  onDismiss,
  title,
  message,
  redirectTo,
}: AuthRequiredSheetProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('listing.loginRequiredTitle'); // reuse
  const resolvedMessage = message ?? t('listing.loginRequiredMessage');
  const goLogin = () => {
    onDismiss();
    const url = redirectTo
      ? `/(auth)/login?redirectTo=${encodeURIComponent(redirectTo)}`
      : '/(auth)/login';
    router.push(url as any);
  };

  const goRegister = () => {
    onDismiss();
    router.push('/(auth)/register');
  };

  return (
    <Modal isOpen={visible} onClose={onDismiss} title={resolvedTitle}>
      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed-outline" size={32} color={colors.primary[600]!} />
        </View>
        <Text variant="body" tone="muted" style={styles.message}>
          {resolvedMessage}
        </Text>

        <Button
          variant="primary"
          title={t('common.login')}
          onPress={goLogin}
          style={styles.fullWidth}
        />
        <Button
          variant="outline"
          title={t('auth.createAccount')}
          onPress={goRegister}
          style={styles.fullWidth}
        />
        <Button variant="ghost" title={t('seller.cancel')} onPress={onDismiss} style={styles.fullWidth} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary[50]!,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[4],
  },
  message: {
    textAlign: 'center',
    marginBottom: theme.spacing[5],
  },
  fullWidth: {
    width: '100%',
  },
});

export default AuthRequiredSheet;

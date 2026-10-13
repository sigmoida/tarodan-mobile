import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Text, Button, Alert, ScreenLoader, theme } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { toHandle } from '@/utils/validation';
import { AuthShell } from '@/components/auth/AuthShell';
import { useCorporateInvite } from './_hooks/useCorporateInvite';

/**
 * Kurumsal davet aktivasyonu — THIN ekran. Davet e-postasındaki bağlantı
 * (universal link / tarodan://corporate-invite?token=) buraya düşer.
 * Kullanıcı adı BİR KEZ belirlenir ve değiştirilemez.
 */
export default function CorporateInviteScreen() {
  const { t } = useTranslation();
  const f = useCorporateInvite();
  const toLogin = () => router.replace('/(auth)/login' as never);

  // Yüklenirken de standart kabuk: üst bar + geri oku görünür, kullanıcı sıkışmaz.
  if (f.isLoading) {
    return (
      <AuthShell title={t('auth.corporateInviteTitle')} onBack={toLogin}>
        <ScreenLoader fullscreen={false} />
      </AuthShell>
    );
  }

  if (f.isInvalid) {
    return (
      <AuthShell
        title={t('auth.corporateInviteTitle')}
        onBack={toLogin}
      >
        <View testID="invite-invalid" style={styles.stack}>
          <Alert variant="danger" title={t('auth.corporateInviteInvalid')}>
            {t('auth.corporateInviteInvalidDesc')}
          </Alert>
          <Button onPress={toLogin}>{t('auth.backToLogin')}</Button>
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t('auth.corporateActivateTitle')}
      hero="auth_default"
      onBack={toLogin}
    >
      <View style={styles.stack}>
        <View style={styles.company}>
          <Text variant="h3">{f.invitation?.companyTitle}</Text>
          <Text variant="caption" tone="muted">
            {f.invitation?.companyEmail}
          </Text>
        </View>

        <Alert variant="info" title={t('auth.usernamePermanentTitle')}>
          {t('settings.usernamePermanentWarningBody')}
        </Alert>

        <Form form={f.form}>
          <FormInput
            testID="invite-username"
            name="username"
            label={t('auth.usernameLabel')}
            placeholder="tarodan.kurumsal"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={30}
            // Girişte küçük harfe çevir — kullanıcı kalıcı handle'ını olduğu
            // gibi görür, şemadaki `.toLowerCase()` emniyet kemeri.
            transform={toHandle}
          />
          <FormInput
            testID="invite-password"
            name="password"
            label={t('auth.password')}
            secureTextEntry
            helperText={t('auth.corporatePasswordHelp')}
          />
          <FormInput
            testID="invite-password-confirm"
            name="passwordConfirm"
            label={t('auth.passwordRepeatLabel')}
            secureTextEntry
          />
        </Form>

        <Button testID="invite-submit" onPress={f.onSubmit} isLoading={f.isSubmitting}>
          {t('auth.corporateActivateSubmit')}
        </Button>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  stack: { gap: theme.spacing[4] },
  company: { gap: theme.spacing[1] },
});

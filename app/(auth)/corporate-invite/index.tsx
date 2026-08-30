import { View, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import {
  Text,
  Button,
  Card,
  Alert,
  ScreenHeader,
  ScreenLoader,
  theme,
} from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { toHandle } from '@/utils/validation';
import { useCorporateInvite } from './_hooks/useCorporateInvite';

/**
 * Kurumsal davet aktivasyonu — THIN ekran. Davet e-postasındaki bağlantı
 * (universal link / tarodan://corporate-invite?token=) buraya düşer.
 * Kullanıcı adı BİR KEZ belirlenir ve değiştirilemez.
 */
export default function CorporateInviteScreen() {
  const { t } = useTranslation();
  const f = useCorporateInvite();

  if (f.isLoading) return <ScreenLoader />;

  if (f.isInvalid) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface.DEFAULT }}>
        <ScreenHeader title={t('auth.corporateInviteTitle')} onBack={() => router.replace('/(auth)/login' as never)} />
        <View testID="invite-invalid" style={{ padding: theme.spacing[4], gap: theme.spacing[4] }}>
          <Alert variant="danger" title={t('auth.corporateInviteInvalid')}>
            {t('auth.corporateInviteInvalidDesc')}
          </Alert>
          <Button onPress={() => router.replace('/(auth)/login' as never)}>{t('auth.backToLogin')}</Button>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface.DEFAULT }}>
      <ScreenHeader title={t('auth.corporateActivateTitle')} onBack={() => router.replace('/(auth)/login' as never)} />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing[4], gap: theme.spacing[4] }}
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <Text variant="h3">{f.invitation?.companyTitle}</Text>
          <Text variant="caption" style={{ color: theme.colors.text.muted }}>
            {f.invitation?.companyEmail}
          </Text>
        </Card>

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
      </ScrollView>
    </View>
  );
}

import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, ScreenHeader, Text, theme } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { toHandle } from '@/utils/validation';
import { useClaimUsername } from './_hooks/useClaimUsername';

export default function UsernameScreen() {
  const { t } = useTranslation();
  const f = useClaimUsername();

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('settings.usernameLink')} onBack={() => router.back()} />
      <View style={styles.body}>
        {f.claimed ? (
          <Card testID="username-claimed">
            <Text variant="h3">@{f.currentUsername}</Text>
            <Text variant="bodySm" style={styles.hint}>
              {t('settings.usernameClaimedHint')}
            </Text>
          </Card>
        ) : (
          <>
            <Alert
              variant="warning"
              title={t('settings.usernamePermanentWarningTitle')}
              testID="username-permanent-warning"
            >
              {t('settings.usernamePermanentWarningBody')}
            </Alert>
            <Form form={f.form}>
              <FormInput
                name="username"
                label={t('auth.usernameLabel')}
                placeholder="kaan.merakli"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
                // Girişte küçük harfe çevir — kullanıcı kalıcı handle'ını
                // olduğu gibi görür, şemadaki `.toLowerCase()` emniyet kemeri.
                transform={toHandle}
                testID="username-input"
              />
              <Button
                title={t('settings.usernameSetButton')}
                onPress={f.submit}
                isLoading={f.isSubmitting}
                testID="username-submit"
              />
            </Form>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface.DEFAULT },
  body: { padding: theme.spacing[4], gap: theme.spacing[4] },
  hint: { color: theme.colors.text.muted, marginTop: theme.spacing[1] },
});

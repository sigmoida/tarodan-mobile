import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Alert, Button, SectionCard, Text, theme } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { PageShell } from '@/components/common/PageShell';
import { toHandle } from '@/utils/validation';
import { useClaimUsername } from './_hooks/useClaimUsername';

export default function UsernameScreen() {
  const { t } = useTranslation();
  const f = useClaimUsername();

  return (
    <PageShell title={t('settings.usernameLink')}>
      {f.claimed ? (
        <SectionCard testID="username-claimed">
          <Text variant="h3">@{f.currentUsername}</Text>
          <Text variant="bodySm" style={styles.hint}>
            {t('settings.usernameClaimedHint')}
          </Text>
        </SectionCard>
      ) : (
        <>
          <Alert
            variant="warning"
            title={t('settings.usernamePermanentWarningTitle')}
            testID="username-permanent-warning"
          >
            {t('settings.usernamePermanentWarningBody')}
          </Alert>
          <SectionCard bodyStyle={styles.form}>
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
          </SectionCard>
        </>
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: theme.spacing[3] },
  hint: { color: theme.colors.text.muted, marginTop: theme.spacing[1] },
});

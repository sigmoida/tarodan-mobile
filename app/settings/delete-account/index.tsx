import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Input } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { ReauthModal } from '@/components/auth/ReauthModal';
import { useAuthStore } from '@/stores/authStore';
import { useDeleteAccount } from './_hooks/useDeleteAccount';
import { DeleteAccountBlockers } from './_components/DeleteAccountBlockers';

/**
 * Delete account, the native twin of the web `DangerZoneSection` dialog (its own screen): a
 * warning and the "type DELETE to confirm" field; "Yes, delete" in the bottom bar enables only
 * once the keyword is typed, then the confirm step ("Confirm it's you") runs. Blockers stay on
 * screen with their paths; success signs out locally and goes home (`useDeleteAccount`).
 */
export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const f = useDeleteAccount();

  // Silme sonrası çıkış sürerken boş duruma düşmesin (ana sayfaya geçiliyor).
  if (!isAuthenticated && !f.deleted) {
    return (
      <PageShell
        title={t('settings.deleteAccount')}
        empty
        emptyState={{
          icon: 'user',
          title: t('membership.loginRequiredTitle'),
          subtitle: t('emptyState.loginRequiredHint'),
          actionLabel: t('common.login'),
          onAction: () => router.push('/(auth)/login'),
        }}
      />
    );
  }

  return (
    <PageShell
      title={t('settings.deleteAccount')}
      overlay={<ReauthModal {...f.reauthModal} />}
      footer={
        <Button
          variant="danger"
          size="lg"
          fullWidth
          title={t('collection.yesDelete')}
          onPress={f.submit}
          isLoading={f.busy}
          disabled={!f.canSubmit}
          testID="delete-account-submit"
        />
      }
    >
      <Alert variant="danger" testID="delete-account-warning">
        {t('settings.deleteAccountWarning')}
      </Alert>
      {f.failure ? <DeleteAccountBlockers failure={f.failure} /> : null}
      <Input
        testID="delete-account-confirm-input"
        label={t('settings.deleteAccountTypePrompt', { keyword: f.keyword })}
        placeholder={f.keyword}
        value={f.confirmText}
        onChangeText={f.setConfirmText}
        editable={!f.busy}
        autoCapitalize="characters"
        autoCorrect={false}
        spellCheck={false}
        autoComplete="off"
        returnKeyType="done"
      />
    </PageShell>
  );
}

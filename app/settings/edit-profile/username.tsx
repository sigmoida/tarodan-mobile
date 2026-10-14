import { useTranslation } from 'react-i18next';
import { Button } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { goBackOrHome } from '@/components/common/goBackOrHome';
import { useAuthStore } from '@/stores/authStore';
import { useClaimUsername } from './_hooks/useClaimUsername';
import { UsernameClaimForm, UsernameReadOnly } from './_sections/UsernameClaimForm';

/**
 * Kullanıcı adı — Profili düzenle'deki satırdan YALNIZ belirlenebilir hesapta
 * (`usernameClaimed === false`, sosyal girişle açılmış) açılır: uyarı + giriş + onaylı kayıt
 * (alt çubuk "Kaydet"), başarıda geri döner. Ad belirlenmişse salt okunur gösterilir.
 */
export default function UsernameScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  if (user?.usernameClaimed !== false) {
    return (
      <PageShell title={t('auth.usernameLabel')}>
        {user?.username ? <UsernameReadOnly username={user.username} /> : null}
      </PageShell>
    );
  }
  return <ClaimUsernameScreen />;
}

/** Ayrı bileşen: uygunluk sorgusu (`useClaimUsername`) yalnız belirlenebilir hesapta bağlanır. */
function ClaimUsernameScreen() {
  const { t } = useTranslation();
  const f = useClaimUsername({ onClaimed: goBackOrHome });

  return (
    <PageShell
      title={t('auth.usernameLabel')}
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          title={t('common.save')}
          onPress={f.submit}
          isLoading={f.isSubmitting}
          disabled={!f.canSubmit}
          testID="username-submit"
        />
      }
    >
      <UsernameClaimForm f={f} />
    </PageShell>
  );
}

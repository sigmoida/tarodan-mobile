import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { appAlert, toast } from '@/ui';
import { useZodForm } from '@/ui/form';
import { userApi, errorText } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useUsernameAvailability } from '@/hooks/useUsernameAvailability';
import { useUsernameFieldStatus } from '@/hooks/useUsernameFieldStatus';
import { buildClaimUsernameSchema } from '../_lib/schema';
import { useRefreshAccount } from './useRefreshAccount';

/**
 * Kullanıcı adı BİR KEZ belirlenir (`PATCH /users/me/username`; sunucu ikinci
 * kez 409 verir). Bu hook yalnız belirlenebilir hesapta (sosyal girişle açılmış,
 * `usernameClaimed === false`) bağlanır: uygunluk kontrolü + onay + mutasyon.
 * Kendi ekranında (`edit-profile/username`); başarıda `onClaimed` (ekran geri döner).
 */
export function useClaimUsername({ onClaimed }: { onClaimed?: () => void } = {}) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const refreshAccount = useRefreshAccount();

  // Dil değişince şema yeniden kurulur — aksi halde hata metni ilk dilde donar.
  const schema = useMemo(() => buildClaimUsernameSchema(t), [t]);
  const form = useZodForm(schema, { defaultValues: { username: '' } });
  const rawUsername = form.watch('username') ?? '';

  const availability = useUsernameAvailability(rawUsername, user?.username);
  const status = useUsernameFieldStatus(availability, form.formState.errors.username?.message);

  const claim = useMutation({
    mutationFn: (username: string) => userApi.claimUsername(username),
    onSuccess: async (res, requested) => {
      const username = (res.data as { username?: string })?.username ?? requested;
      updateUser({ username, usernameClaimed: true });
      await refreshAccount();
      toast.success(t('profile.usernameSaved'));
      onClaimed?.();
    },
    onError: (e) => {
      // 409 (alınmış / zaten belirlenmiş) alanın altında; başka hata kullanıcının
      // karar vermesi gereken bir durum → dialog. Açık modal yok, appAlert güvenli.
      const httpStatus = (e as { response?: { status?: number } })?.response?.status;
      const message = errorText(e, t('settings.usernameSetFailedBody'));
      if (httpStatus === 409) {
        form.setError('username', { type: 'server', message });
        // Başka cihazda belirlenmiş olabilir: hesabı yenile ki bölüm salt okunura dönsün.
        void refreshAccount();
      }
      else appAlert(t('settings.usernameSetFailedTitle'), message);
    },
  });

  // Geri alınamaz işlem → onay. Onaydan sonra mutasyon (modal açık değil).
  const confirmAndClaim = (username: string) =>
    appAlert(
      t('profile.usernameConfirmTitle'),
      t('profile.usernameConfirmBody', { username }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), onPress: () => claim.mutate(username) },
      ],
    );

  const blocked = availability.checking || availability.available === false;

  return {
    form,
    status,
    currentUsername: user?.username ?? '',
    canSubmit: !blocked && !claim.isPending,
    isSubmitting: claim.isPending,
    submit: form.handleSubmit((v) => {
      if (blocked) return;
      confirmAndClaim(v.username.trim().toLowerCase());
    }),
  };
}

export type ClaimUsernameController = ReturnType<typeof useClaimUsername>;

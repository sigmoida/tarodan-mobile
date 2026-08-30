import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { appAlert } from '@/ui';
import { useZodForm } from '@/ui/form';
import { userApi, errorText } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { buildClaimUsernameSchema } from '../_lib/schema';

export function useClaimUsername() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const claimed = !!user?.usernameClaimed;

  // Dil değişince şema yeniden kurulur — aksi halde hata metni ilk dilde donar.
  const schema = useMemo(() => buildClaimUsernameSchema(t), [t]);
  const form = useZodForm(schema, { defaultValues: { username: '' } });

  const claim = useMutation({
    mutationFn: (username: string) => userApi.claimUsername(username),
    onSuccess: (res) => {
      const username = (res.data as { username?: string })?.username;
      if (username) updateUser({ username, usernameClaimed: true });
      appAlert(t('settings.usernameSetTitle'), t('settings.usernameSetBody'));
      router.back();
    },
    onError: (e) =>
      appAlert(t('settings.usernameSetFailedTitle'), errorText(e, t('settings.usernameSetFailedBody'))),
  });

  return {
    claimed,
    currentUsername: user?.username ?? '',
    form,
    submit: form.handleSubmit((v) => claim.mutate(v.username.trim().toLowerCase())),
    isSubmitting: claim.isPending,
  };
}

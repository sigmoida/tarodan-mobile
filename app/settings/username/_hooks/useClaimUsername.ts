import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { appAlert } from '@/ui';
import { useZodForm } from '@/ui/form';
import { userApi, errorText } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { claimUsernameSchema } from '../_lib/schema';

export function useClaimUsername() {
  const { user, updateUser } = useAuthStore();
  const claimed = !!user?.usernameClaimed;

  const form = useZodForm(claimUsernameSchema, { defaultValues: { username: '' } });

  const claim = useMutation({
    mutationFn: (username: string) => userApi.claimUsername(username),
    onSuccess: (res) => {
      const username = (res.data as { username?: string })?.username;
      if (username) updateUser({ username, usernameClaimed: true });
      appAlert('Kullanıcı adı belirlendi', 'Kullanıcı adınız kalıcı olarak kaydedildi.');
      router.back();
    },
    onError: (e) => appAlert('Belirlenemedi', errorText(e, 'Kullanıcı adı kaydedilemedi.')),
  });

  return {
    claimed,
    currentUsername: user?.username ?? '',
    form,
    submit: form.handleSubmit((v) => claim.mutate(v.username.trim().toLowerCase())),
    isSubmitting: claim.isPending,
  };
}

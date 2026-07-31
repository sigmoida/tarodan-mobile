import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { appAlert } from '@/ui';
import { useZodForm } from '@/ui/form';
import { userApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { usernameSchema } from '../_lib/schema';

const errorText = (e: unknown, fallback: string): string => {
  const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(m) ? m.join('\n') : (m ?? fallback);
};

export function useClaimUsername() {
  const { user, updateUser } = useAuthStore();
  const claimed = !!user?.usernameClaimed;

  const form = useZodForm(usernameSchema, { defaultValues: { username: '' } });

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

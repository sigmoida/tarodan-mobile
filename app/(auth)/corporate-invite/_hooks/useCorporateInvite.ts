import { useMemo } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import { useZodForm } from '@/ui/form';
import { authApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { buildCorporateInviteSchema, type CorporateInviteForm } from '../_lib/schema';

/**
 * Kurumsal davet aktivasyonu controller'ı: daveti doğrulayan sorgu ve aktivasyon
 * mutation'ını sahiplenir. Token yoksa sorgu HİÇ çalışmaz (form da gösterilmez).
 */
export function useCorporateInvite() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : undefined;

  const invitationQuery = useQuery({
    queryKey: qk.auth.corporateInvitation(token ?? ''),
    queryFn: async () => (await authApi.getCorporateInvitation(token!)).data,
    enabled: !!token,
    retry: false,
  });

  // Dil değişince şema yeniden kurulur — aksi halde hata metni ilk dilde donar.
  const schema = useMemo(() => buildCorporateInviteSchema(t), [t]);
  const form = useZodForm(schema);

  const activateMutation = useMutation({
    mutationFn: (values: CorporateInviteForm) =>
      authApi.activateCorporateInvitation({
        token: token!,
        username: values.username.trim(),
        password: values.password,
      }),
    onSuccess: () => {
      appAlert(t('auth.corporateActivatedTitle'), t('auth.corporateActivatedBody'));
      router.replace('/(auth)/login' as never);
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const raw = err?.response?.data?.message;
      appAlert(t('common.error'), Array.isArray(raw) ? raw.join('\n') : raw || t('auth.corporateActivationFailed'));
    },
  });

  return {
    token,
    invitation: invitationQuery.data,
    isLoading: !!token && invitationQuery.isLoading,
    /** Token yok VEYA davet doğrulanamadı (400) — form gösterilmez. */
    isInvalid: !token || invitationQuery.isError,
    form,
    isSubmitting: activateMutation.isPending,
    onSubmit: form.handleSubmit((values) => activateMutation.mutate(values)),
  };
}

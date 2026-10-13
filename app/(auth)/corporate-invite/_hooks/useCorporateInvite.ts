import { useMemo } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/ui';
import { useZodForm } from '@/ui/form';
import { authApi } from '@/lib/api';
import { qk, useAppMutation } from '@/lib/query';
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

  const activateMutation = useAppMutation(
    (values: CorporateInviteForm) =>
      authApi.activateCorporateInvitation({
        token: token!,
        username: values.username.trim(),
        password: values.password,
      }),
    {
      error: t('auth.corporateActivationFailed'),
      onSuccess: () => {
        // Önce ekran değişir, sonra toast (kök katmanda, navigasyonu aşar) — "Tamam" bekletme yok.
        router.replace('/(auth)/login' as never);
        toast.success(t('auth.corporateActivatedBody'));
      },
    },
  );

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

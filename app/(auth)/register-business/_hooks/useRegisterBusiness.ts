import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import { useZodForm } from '@/ui/form';
import { authApi } from '@/lib/api';
import { registerBusinessSchema, type RegisterBusinessForm } from '../_lib/schema';

/**
 * Kurumsal ön-başvuru controller'ı — `useZodForm` + kayıt mutation'ını sahiplenir.
 *
 * Bu adım HESAP OLUŞTURMAZ: `BusinessRegisterDto` bir ön başvurudur (canlıda
 * doğrulandı — task-3-report.md). Admin onayının ardından davet e-postasındaki
 * bağlantıdan kullanıcı adı/şifre `corporate-invite` akışında belirlenir; bu
 * yüzden burada şifre alanı YOK ve başarı sonrası token kaydı / otomatik giriş
 * YAPILMAZ (önceki sürüm SecureStore'a token yazıp `/seller/dashboard`'a
 * yönlendiriyordu — API hiçbir zaman token dönmediği için bu her zaman no-op'tu).
 */
export function useRegisterBusiness() {
  const form = useZodForm(registerBusinessSchema, {
    defaultValues: { acceptTerms: false },
  });

  const registerMutation = useMutation({
    mutationFn: (values: RegisterBusinessForm) =>
      authApi.registerBusiness({
        authorizedFullName: values.authorizedFullName,
        companyLegalName: values.companyLegalName,
        companyTitle: values.companyTitle,
        companyAddress: values.companyAddress,
        companyEmail: values.companyEmail,
        phone: values.phone,
        // Opsiyonel alanlar boşsa hiç GÖNDERİLMEZ — DTO'yla birebir (fazla alan yok).
        ...(values.kepAddress ? { kepAddress: values.kepAddress } : {}),
        ...(values.contactPhone ? { contactPhone: values.contactPhone } : {}),
      }),
    onSuccess: (response) => {
      const data = response.data as {
        applicationId?: string;
        status?: string;
        email?: string;
        message?: string;
      };
      appAlert(
        'Başvurunuz alındı',
        `${data.email ?? 'Belirttiğiniz e-posta adresi'} için kurumsal satıcı başvurunuz ` +
          'incelemeye alındı. Admin onayının ardından davet e-postanızdaki bağlantıdan ' +
          'kullanıcı adınızı ve şifrenizi belirleyebileceksiniz.',
        [{ text: 'Tamam', onPress: () => router.replace('/(auth)/login') }],
      );
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const raw = err?.response?.data?.message;
      appAlert(
        'Başvuru gönderilemedi',
        Array.isArray(raw) ? raw.join('\n') : raw || 'Başvurunuz gönderilemedi. Lütfen tekrar deneyin.',
      );
    },
  });

  const onSubmit = form.handleSubmit((values) => registerMutation.mutate(values));

  return {
    form,
    registerMutation,
    onSubmit,
  };
}

export type RegisterBusinessController = ReturnType<typeof useRegisterBusiness>;

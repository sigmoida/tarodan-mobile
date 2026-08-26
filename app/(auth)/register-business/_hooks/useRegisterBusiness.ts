import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import { useZodForm } from '@/ui/form';
import { authApi, errorText } from '@/lib/api';
import { buildRegisterBusinessSchema, type RegisterBusinessForm } from '../_lib/schema';

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
  const { t } = useTranslation();
  // Dil değişince şema yeniden kurulur — aksi halde hata metni ilk dilde donar.
  const schema = useMemo(() => buildRegisterBusinessSchema(t), [t]);
  const form = useZodForm(schema, {
    // Her string alan `''` ile başlamalı: dokunulmamış alan RHF'te `undefined`
    // kalırsa zod `invalid_type` üretir ve kullanıcı tamamen Türkçe bir ekranda
    // İngilizce "Required" görür. Boş formda submit en sık gidilen hata yolu.
    defaultValues: {
      authorizedFullName: '',
      companyLegalName: '',
      companyTitle: '',
      companyAddress: '',
      companyEmail: '',
      kepAddress: '',
      phone: '',
      contactPhone: '',
      acceptTerms: false,
    },
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
      const lines = [
        `${data.email ?? 'Belirttiğiniz e-posta adresi'} için kurumsal satıcı başvurunuz ` +
          'incelemeye alındı. Admin onayının ardından davet e-postanızdaki bağlantıdan ' +
          'kullanıcı adınızı ve şifrenizi belirleyebileceksiniz.',
      ];
      // Başvuru numarası destek için tek referans — uç 5/dk limitli, kullanıcı
      // "gitti mi?" diye tekrar denemesin.
      if (data.applicationId) lines.push(`Başvuru numaranız: ${data.applicationId}`);
      appAlert('Başvurunuz alındı', lines.join('\n\n'), [
        { text: 'Tamam', onPress: () => router.replace('/(auth)/login') },
      ]);
    },
    onError: (e: unknown) => {
      const status = (e as { response?: { status?: number } })?.response?.status;
      appAlert(
        'Başvuru gönderilemedi',
        // Uç 5/dk throttle'lı; ham gövde NestJS'in iç sınıf adını
        // ("ThrottlerException: Too Many Requests") döndürüyor — kullanıcıya gösterilmez.
        status === 429
          ? 'Çok fazla deneme yaptınız, lütfen bir dakika sonra tekrar deneyin.'
          : // Paylaşılan helper: dizi mesajları birleştirir, boş dizi/boş string
            // fallback'e düşer (elle yazılan sürüm boş gövdeli alert üretiyordu).
            errorText(e, 'Başvurunuz gönderilemedi. Lütfen tekrar deneyin.'),
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

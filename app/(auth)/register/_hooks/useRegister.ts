import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { toast } from '@/ui';
import { useZodForm } from '@/ui/form';
import { authApi } from '@/lib/api';
import { registrationConsentDocuments } from '@/lib/shared/legalConsent';
import { buildRegisterSchema, type RegisterForm } from '../_lib/schema';
import { useUsernameAvailability } from '@/hooks/useUsernameAvailability';
import { useSocialSignIn } from '@/hooks/useSocialSignIn';
import { IS_MAESTRO } from '@/config/maestro';
import { useResendVerification } from './useResendVerification';

/**
 * "Bu e-posta zaten kayıtlı" — kasıtlı olarak fırlatılan, KULLANICIYA
 * gösterilecek hata.
 *
 * Ayrı bir sınıf, çünkü ayrım eskiden mesajın `'Bu e-posta'` ile başlamasına
 * bakıyordu: metin çevrilir çevrilmez o kontrol İngilizce'de tutmayacak ve
 * kasıtlı hata sessizce yutulup kullanıcı "kayıt olamıyorum ama sebep yok"
 * durumunda kalacaktı. Sınıf kimliği dilden bağımsız.
 */
class EmailTakenError extends Error {}

/**
 * Register controller — owns the RHF+zod form, the register mutation and the
 * back handler. Lifted verbatim from the monolithic screen (§12).
 */
export function useRegister() {
  const { t } = useTranslation();
  // Dil değişince şema yeniden kurulur — aksi halde hata metni ilk dilde donar.
  const schema = useMemo(() => buildRegisterSchema(t), [t]);
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useZodForm(schema, {
    // HER metin alanı '' ile başlamalı: tanımsız bırakılan alan zod'un
    // `invalid_type_error` dalına düşüyor ve Türkçe arayüzde İngilizce
    // "Required" yazıyordu (alanın kendi çevrilmiş mesajı yerine).
    defaultValues: {
      username: '',
      displayName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
      acceptKvkk: false,
      acceptsMarketingEmails: false,
      // Maestro spinner DateField'ı süremez; test modunda geçerli (18+) bir
      // doğum tarihi öndoldurulur. Prod'da IS_MAESTRO false → '' .
      birthDate: IS_MAESTRO ? '1990-01-01' : '',
    },
  });

  const usernameValue = watch('username') ?? '';
  const usernameAvailability = useUsernameAvailability(usernameValue);
  const social = useSocialSignIn();

  // Kayıt başarılıysa formun yerine web "Neredeyse Tamam!" durumu çizilir (aynı rota, ayrı akış
  // değil: geri dönüş yok, yalnız girişe/doğrulamaya yönlendirir). Doluysa durum açık.
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const resend = useResendVerification(registeredEmail);

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      // Kayıttan önce e-posta durumunu sor (web ile parite). Backend zaten 409
      // döner ama gerekçeyi ayırt etmez: `hasPassword: false` = hesap Google/Apple
      // ile açılmış, kullanıcının şifre denemesi hiçbir zaman tutmayacak.
      // Uç erişilemezse kayıt engellenmemeli — hata sessizce yutulur.
      try {
        const res = await authApi.checkEmail(data.email);
        const body = res.data;
        if (body?.exists) {
          throw new EmailTakenError(
            body.hasPassword
              ? t('auth.emailAlreadyRegistered')
              : t('auth.emailRegisteredWithSocial'),
          );
        }
      } catch (error) {
        // Yalnız yukarıdaki bilinçli hatayı yeniden fırlat; ağ/5xx hatasını yut.
        if (error instanceof EmailTakenError) throw error;
      }

      return authApi.register({
        username: data.username,
        displayName: data.displayName,
        email: data.email,
        password: data.password,
        // Telefon boşsa HİÇ gönderilmez; doluysa E.164 (şema normalize eder).
        ...(data.phone ? { phone: data.phone } : {}),
        acceptsMarketingEmails: data.acceptsMarketingEmails === true,
        // Boş bırakıldıysa alan HİÇ gönderilmez ('' göndermek sunucu tarafında
        // "geçerli bir tarih giriniz" hatası verir); opsiyonelliğin karşılığı bu.
        ...(data.birthDate ? { birthDate: data.birthDate } : {}),
        // Sürüm ve zaman sunucuda damgalanır; burada yalnız hangi belgelerin
        // onaylandığı söylenir. Eksik kalırsa yeniden-onay kapısı ilk girişte ister.
        acceptedConsents: registrationConsentDocuments(data),
      });
    },
    onSuccess: (_res, data) => {
      setRegisteredEmail(data.email);
      // İlk doğrulama e-postası kayıtla birlikte gitti → tekrar gönder hemen açılmaz.
      resend.startCooldown();
      toast.success(t('auth.registerSuccessVerify'));
    },
  });

  const onSubmit = (data: RegisterForm) => {
    // Kesin "alınmış" yanıtı gelmişse gönderme (buton zaten disabled olur —
    // burası ikinci bir bariyer). Sorgu henüz bilinmiyorsa (undefined) engellemez;
    // sunucu son sözü söyler.
    if (usernameAvailability.available === false) return;
    registerMutation.mutate(data);
  };

  const handleBack = () => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'));
  // Login yığında varsa ona dön (çift login ekranı olmaz), yoksa aç.
  const goToLogin = () => router.dismissTo('/(auth)/login');
  const goToVerifyEmail = () => router.push('/(auth)/verify-email');

  return {
    control,
    handleSubmit,
    errors,
    registerMutation,
    onSubmit,
    handleBack,
    usernameAvailability,
    social,
    registeredEmail,
    resend,
    goToLogin,
    goToVerifyEmail,
  };
}

export type RegisterController = ReturnType<typeof useRegister>;

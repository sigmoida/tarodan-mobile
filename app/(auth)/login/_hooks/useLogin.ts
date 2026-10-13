import { logger } from '@/services/logger';
import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { appAlert, toast } from '@/ui';
import { useZodForm } from '@/ui/form';
import { CAN_BUY_DIGITAL, limitAlert } from '@/lib/purchases';
import { authApi } from '@/lib/api';
import { signInWithGoogle } from '@/services/googleSignin';
import { signInWithApple, isAppleAvailable } from '@/services/appleSignin';
import { useAuthStore } from '@/stores/authStore';
import { buildLoginSchema, TWO_FACTOR_CODE_PATTERN, type LoginForm } from '../_lib/schema';
import { IS_MAESTRO } from '@/config/maestro';

/**
 * Web `useLoginFlow` ile aynı adımlar: `email` (e-posta + sosyal giriş) → `password`
 * (kayıtlı + şifreli hesap) ya da `googleOnly` (kayıtlı ama şifresiz, Google ile açılmış).
 * Geçiş sunucudaki `POST /auth/check-email` yanıtına göre yapılır (istemci tarafı tahmin yok).
 */
export type LoginStep = 'email' | 'password' | 'googleOnly';

/**
 * Login controller — owns the RHF form (zod), the two-step identify flow, the login +
 * resend-verification mutations, Google/Apple social sign-in, guest-continue, and the
 * Maestro fallback submit. Parola girişinin kendisi (2FA, doğrulanmamış e-posta, kurumsal
 * yükseltme) önceki sürümden değişmeden taşındı; yalnız adım durumu eklendi.
 */
export function useLogin() {
  const { t } = useTranslation();
  const { login } = useAuthStore();
  const [step, setStep] = useState<LoginStep>('email');
  const [notRegistered, setNotRegistered] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requires2FA, setRequires2FA] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // Dil değişince şema yeniden kurulur — aksi halde hata metni ilk dilde donar.
  const schema = useMemo(() => buildLoginSchema(t), [t]);
  const form = useZodForm(schema, {
    defaultValues: { email: '', password: '', twoFactorCode: '' },
  });
  const { handleSubmit, getValues, setError, setValue, trigger } = form;

  const loginMutation = useMutation({
    mutationFn: (data: LoginForm) =>
      authApi.login(data.email, data.password, data.twoFactorCode || undefined),
    onSuccess: async (response) => {
      const data = response.data as Record<string, unknown> & {
        tokens?: { accessToken?: string; refreshToken?: string };
        accessToken?: string;
        refreshToken?: string;
        user?: {
          email?: string;
        };
        requires2FA?: boolean;
      };

      // 200 + requires2FA: token verilmemiştir — hata değil, akış adımı.
      if (data.requires2FA === true) {
        setRequires2FA(true);
        setErrorMessage(null);
        return;
      }

      const accessToken = data.tokens?.accessToken || data.accessToken;
      const refreshToken = data.tokens?.refreshToken || data.refreshToken;
      const user = data.user;
      setErrorMessage(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await login(accessToken!, user as any, refreshToken);

      // Doğrulanmamış e-posta banner'ı yalnızca login HATASI ('verify/doğrula')
      // ile tetiklenir (onError); başarılı login her zaman doğrulanmış kullanıcıdandır.
      // Kurumsal yükseltme kontrolü web gibi /users/me'den okunur (login response'unda
      // companyName/taxId/membership yok).
      try {
        const profileResponse = (await authApi.getProfile()).data as {
          user?: Record<string, unknown>;
        } & Record<string, unknown>;
        const currentUser = (profileResponse?.user ?? profileResponse) as {
          companyName?: string | null;
          taxId?: string | null;
          membershipTier?: string | null;
          membership?: { tier?: { type?: string; name?: string } | null } | null;
        };
        const membershipTier =
          currentUser?.membership?.tier?.type ||
          currentUser?.membership?.tier?.name ||
          currentUser?.membershipTier ||
          'free';
        const isBusinessTier = String(membershipTier).toLowerCase().includes('business');
        const hasBusinessInfo = !!(currentUser?.companyName && currentUser?.taxId);
        if (hasBusinessInfo && !isBusinessTier) {
          // iOS'ta bu uyarı yalnız kurumsal üyeliğe satış yapmak için var;
          // satış yüzeyi kapalıyken gösterilecek nötr bir şey kalmıyor —
          // "Daha sonra" düğmesinin gittiği yere sessizce geç (Guideline 3.1.3).
          if (!CAN_BUY_DIGITAL) {
            router.replace('/' as never);
            return;
          }
          limitAlert({
            title: t('auth.corporateUpgradeTitle'),
            message: t('auth.corporateUpgradeBody'),
            cancelLabel: t('auth.corporateUpgradeLater'),
            upgradeLabel: t('auth.corporateUpgradeGo'),
            onUpgrade: () => router.replace('/membership' as never),
            onCancel: () => router.replace('/' as never),
          });
          return;
        }
      } catch {
        // Profil çekilemese bile login akışı devam etsin
      }

      router.replace('/' as never);
    },
    onError: (error: unknown) => {
      const e = error as { response?: { data?: { message?: string } }; message?: string };
      const msg = e?.response?.data?.message || e?.message || t('auth.loginFailed');
      logger.debug('Login hatası', { msg });
      const lower = msg.toLowerCase();
      if (lower.includes('doğrula') || lower.includes('verify') || lower.includes('doğrulanmadı')) {
        setUnverifiedEmail(getValues('email'));
        setErrorMessage(null);
      } else {
        setErrorMessage(msg);
      }
    },
  });

  const resendVerificationMutation = useMutation({
    mutationFn: () => authApi.resendVerification(unverifiedEmail ?? getValues('email')),
    onSuccess: () => {
      appAlert(t('auth.verificationResentTitle'), t('auth.verificationResentBody'));
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      appAlert(t('common.error'), err?.response?.data?.message || t('auth.verificationResendFailed'));
    },
  });

  // Adım 1 → 2: e-posta kayıtlı mı, şifresi var mı (web `identify`).
  const checkEmailMutation = useMutation({
    mutationFn: (email: string) => authApi.checkEmail(email),
  });

  const identify = async () => {
    setNotRegistered(false);
    // Maestro tap akışında RHF doğrulaması sessizce düşebiliyor (aşağıdaki fallback ile aynı
    // gerekçe); test derlemesinde e-posta biçimi elle denetlenir. Production'da dead-code.
    const valid = IS_MAESTRO
      ? /\S+@\S+/.test(getValues('email') ?? '')
      : await trigger('email');
    if (!valid) return;
    try {
      const res = await checkEmailMutation.mutateAsync(getValues('email'));
      if (!res.data?.exists) {
        setNotRegistered(true);
        return;
      }
      setStep(res.data.hasPassword ? 'password' : 'googleOnly');
    } catch {
      toast.error(t('error.somethingWrongDesc'));
    }
  };

  /** "Farklı e-posta kullan": 1. adıma dön, şifre/2FA/hata durumunu sıfırla (e-posta kalır). */
  const back = () => {
    setStep('email');
    setNotRegistered(false);
    setRequires2FA(false);
    setUnverifiedEmail(null);
    setErrorMessage(null);
    loginMutation.reset();
    setValue('password', '');
    setValue('twoFactorCode', '');
  };

  // Google ile açılmış (şifresiz) hesap için şifre belirleme bağlantısı (web `sendSetPassword`).
  const setPasswordMutation = useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
    onSuccess: () => toast.success(t('auth.setPasswordEmailSent')),
    onError: () => toast.error(t('auth.couldNotSendEmail')),
  });

  useEffect(() => {
    isAppleAvailable().then(setAppleAvailable);
  }, []);

  const handleGoogle = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const idToken = await signInWithGoogle();
      const response = await authApi.loginWithGoogle(idToken);
      const data = response.data as any;
      const accessToken = data.tokens?.accessToken || data.accessToken;
      const refreshToken = data.tokens?.refreshToken || data.refreshToken;
      const user = data.user;
      if (!accessToken) {
        appAlert(t('common.error'), t('auth.unexpectedLoginResponse'));
        return;
      }
      await login(accessToken, user, refreshToken);
      router.push('/' as never);
    } catch (e: any) {
      // İptal sessiz geçilir; diğer her hata KULLANICIYA gösterilir (önceden
      // sessiz yutuluyordu → "takılıyor" görüntüsü). Native status code'u da
      // ekle: DEVELOPER_ERROR → Google Cloud'da Android OAuth client/SHA-1 eksik.
      if (e?.code === 'SIGN_IN_CANCELLED' || e?.code === '-5') return;
      const apiMsg = e?.response?.data?.message;
      const detail = apiMsg || e?.message || t('common.unknownError');
      const code = e?.code ? ` (${t('common.errorCodeSuffix', { code: e.code })})` : '';
      appAlert(t('auth.googleSignInFailedTitle'), `${detail}${code}`);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleApple = async () => {
    if (appleLoading) return;
    setAppleLoading(true);
    try {
      const response = await authApi.loginWithApple(await signInWithApple());
      const data = response.data as any;
      const accessToken = data.tokens?.accessToken || data.accessToken;
      const refreshToken = data.tokens?.refreshToken || data.refreshToken;
      const user = data.user;
      if (!accessToken) {
        appAlert(t('common.error'), t('auth.unexpectedLoginResponse'));
        return;
      }
      await login(accessToken, user, refreshToken);
      router.push('/' as never);
    } catch (e: any) {
      // Kullanıcı iptali sessiz geçilir.
      if (e?.code === 'ERR_REQUEST_CANCELED') return;
      const apiMsg = e?.response?.data?.message;
      const detail = apiMsg || e?.message || t('common.unknownError');
      const code = e?.code ? ` (${t('common.errorCodeSuffix', { code: e.code })})` : '';
      appAlert(t('auth.appleSignInFailedTitle'), `${detail}${code}`);
    } finally {
      setAppleLoading(false);
    }
  };

  const onSubmit = (data: LoginForm) => {
    setErrorMessage(null);
    loginMutation.mutate(data);
  };

  /**
   * Misafir olarak devam et: giriş yapmadan akışa dön. Login ekranı her zaman
   * router.push ile açıldığı için geri dönülecek bir ekran varsa oraya
   * (örn. checkout misafir formu) döneriz; yoksa ana sayfaya yönlendiririz.
   */
  const continueAsGuest = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/' as never);
    }
  };

  /**
   * Maestro fallback: hook-form handleSubmit bazen Maestro tap akışında
   * silently fail oluyor. Test ortamında getValues() ile direkt mutate.
   * Production'da IS_MAESTRO derlemede false → branch dead-code.
   */
  const handleLoginPress = () => {
    if (IS_MAESTRO) {
      const v = getValues();
      // Maestro tap akışı RHF handleSubmit'i atlar; ama 2FA kodu yine de burada
      // doğrulanmalı — aksi halde geçersiz kod (örn. "12") sunucuya gider.
      if (v?.twoFactorCode && !TWO_FACTOR_CODE_PATTERN.test(v.twoFactorCode.trim())) {
        setError('twoFactorCode', {
          type: 'pattern',
          message: '6 haneli kod veya XXXX-XXXX yedek kod girin',
        });
        return;
      }
      if (v?.email && v?.password) {
        setErrorMessage(null);
        loginMutation.mutate({ email: v.email, password: v.password, twoFactorCode: v.twoFactorCode });
        return;
      }
    }
    handleSubmit(onSubmit)();
  };

  const errorBannerVisible = errorMessage || loginMutation.isError;

  return {
    form,
    step,
    email: form.watch('email'),
    notRegistered,
    identify,
    identifying: checkEmailMutation.isPending,
    back,
    sendSetPassword: () => setPasswordMutation.mutate(getValues('email')),
    settingPassword: setPasswordMutation.isPending,
    unverifiedEmail,
    setUnverifiedEmail,
    errorMessage,
    requires2FA,
    googleLoading,
    appleLoading,
    appleAvailable,
    loginMutation,
    resendVerificationMutation,
    handleGoogle,
    handleApple,
    continueAsGuest,
    handleLoginPress,
    errorBannerVisible,
  };
}

export type LoginController = ReturnType<typeof useLogin>;

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { authApi } from '@/lib/api';
import { registerSchema, type RegisterForm } from '../_lib/schema';
import { useUsernameAvailability } from './useUsernameAvailability';

/**
 * Register controller — owns the RHF+zod form, the register mutation and the
 * back handler. Lifted verbatim from the monolithic screen (§12).
 */
export function useRegister() {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      acceptTerms: false,
      // Maestro spinner DateField'ı süremez; test modunda geçerli (18+) bir
      // doğum tarihi öndoldurulur. Prod'da EXPO_PUBLIC_MAESTRO unset → '' .
      birthDate: process.env.EXPO_PUBLIC_MAESTRO === '1' ? '1990-01-01' : '',
    },
  });

  const usernameValue = watch('username') ?? '';
  const usernameAvailability = useUsernameAvailability(usernameValue);

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
          throw new Error(
            body.hasPassword
              ? 'Bu e-posta zaten kayıtlı. Aşağıdaki "Giriş Yap" bağlantısını kullanın.'
              : 'Bu e-posta Google veya Apple ile kayıtlı. Giriş ekranından o yöntemle devam edin.',
          );
        }
      } catch (error) {
        // Yalnız yukarıdaki bilinçli hatayı yeniden fırlat; ağ/5xx hatasını yut.
        if (error instanceof Error && error.message.startsWith('Bu e-posta')) throw error;
      }

      return authApi.register({
        username: data.username,
        displayName: data.displayName,
        email: data.email,
        password: data.password,
        birthDate: data.birthDate,
      });
    },
    onSuccess: () => router.replace('/(auth)/login'),
  });

  const onSubmit = (data: RegisterForm) => {
    // Kesin "alınmış" yanıtı gelmişse gönderme (buton zaten disabled olur —
    // burası ikinci bir bariyer). Sorgu henüz bilinmiyorsa (undefined) engellemez;
    // sunucu son sözü söyler.
    if (usernameAvailability.available === false) return;
    registerMutation.mutate(data);
  };

  const handleBack = () => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'));

  return {
    control,
    handleSubmit,
    errors,
    registerMutation,
    onSubmit,
    handleBack,
    usernameAvailability,
  };
}

export type RegisterController = ReturnType<typeof useRegister>;

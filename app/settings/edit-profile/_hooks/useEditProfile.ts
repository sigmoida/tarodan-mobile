import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { appAlert, toast } from '@/ui';
import { userApi, mediaApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { getPhoneInvalidMessage, splitPhone } from '@/utils/phone';
import { buildProfileSchema, type ProfileForm } from '../_lib/schema';
import { phoneToSend, resolvePhoneOutcome } from '../_lib/phoneOutcome';

type UpdateVars = {
  data: ProfileForm;
  /** `phoneToSend` sonucu: `undefined` → numaraya dokunulmaz, `''` → sil. */
  phone: string | undefined;
};

/**
 * Edit-profile controller — owns the RHF+zod form, the avatar pick + upload,
 * the phone country-code, the update mutation (avatar upload → JSON PATCH) and
 * the toast bildirimleri. Lifted verbatim from the monolithic screen (§12).
 */
export function useEditProfile() {
  const { t } = useTranslation();
  const { user, isAuthenticated, refreshUserData } = useAuthStore();
  const queryClient = useQueryClient();

  const [avatar, setAvatar] = useState<string | null>(null);

  const isBusinessTier = (user as any)?.membershipTier === 'business';

  const profileSchema = useMemo(
    () => buildProfileSchema(t, isBusinessTier),
    [t, isBusinessTier],
  );

  // Kayıtlı numara "+90532…" formatında gelir — ülke kodu + formatlı lokal parçaya ayır.
  const [phoneCountryCode, setPhoneCountryCode] = useState(
    () => splitPhone((user as any)?.phone || '').countryCode,
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
    setValue,
    watch,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || '',
      bio: user?.bio || '',
      phone: splitPhone((user as any)?.phone || '').phone,
      // İlk 10 karakteri al ("1990-01-31T00:00:00Z" -> "1990-01-31"); toISOString
      // saat dilimi kaymasından kaçınmak için Date round-trip'i yapma.
      birthDate: (user as any)?.birthDate ? String((user as any).birthDate).slice(0, 10) : '',
      companyName: (user as any)?.companyName || '',
      taxId: (user as any)?.taxId || '',
      taxOffice: (user as any)?.taxOffice || '',
    },
  });

  // Yalnız avatar DEĞERİ değişince eşle (`user` nesnesi her e-posta/kullanıcı adı
  // tazelemesinde yenilenir). Henüz kaydedilmemiş yerel seçim (http olmayan URI)
  // sunucudan gelen değerle ezilmez — presigned URL her çekimde farklı gelir.
  useEffect(() => {
    if (user?.avatar) {
      const serverAvatar = user.avatar;
      setAvatar((prev) => (prev && !prev.startsWith('http') ? prev : serverAvatar));
    }
  }, [user?.avatar]);

  const updateMutation = useMutation({
    mutationFn: async ({ data, phone }: UpdateVars) => {
      // 1. Avatar yerel olarak değiştiyse önce /media/upload/avatar'a yükle (web ile aynı akış),
      //    dönen anahtarı (key) avatarUrl olarak JSON PATCH ile gönder.
      let avatarUrl: string | undefined;
      if (avatar && avatar !== user?.avatar && !avatar.startsWith('http')) {
        const uploadRes = await mediaApi.uploadAvatar({
          uri: avatar,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        });
        avatarUrl = uploadRes.data?.key ?? uploadRes.data?.url;
      }

      const payload: Record<string, any> = {
        displayName: data.displayName,
        bio: data.bio,
        birthDate: data.birthDate,
      };
      if (avatarUrl) payload.avatarUrl = avatarUrl;

      // Kurumsal alanlar yalnızca business tier'da gönderilir (web ile parite).
      // Backend, non-business'ta companyName/taxId'yi yalnızca isCorporateSeller=true ile işler.
      if (isBusinessTier) {
        payload.companyName = data.companyName;
        payload.taxId = data.taxId;
        payload.taxOffice = data.taxOffice;
        payload.isCorporateSeller = !!data.companyName;
      }

      // Boş string'leri undefined'a çevir (validation hatalarını önlemek için — web ile aynı).
      Object.keys(payload).forEach((key) => {
        if (payload[key] === '') payload[key] = undefined;
      });
      // Telefon yalnız DEĞİŞTİYSE gider (bkz. `phoneToSend`) — aynı numarayı
      // yeniden göndermek sunucuda doğrulamayı düşürebilir. Silme `''` olarak
      // gider (sunucu null yazar); bu yüzden boş→undefined döngüsünden SONRA.
      if (phone !== undefined) payload.phone = phone;

      const res = await userApi.updateProfile(payload);
      return { sentPhone: phone, responsePhone: (res?.data as any)?.phone as string | undefined };
    },
    onSuccess: async ({ sentPhone, responsePhone }) => {
      // Store'u taze /users/me ile güncelle: mapApiUserToUser, API'nin döndürdüğü
      // 'avatarUrl' alanını UI'ın okuduğu 'avatar' alanına eşler. Aksi halde
      // updateUser ham yanıtı sığ merge ettiği için 'avatar' bayat kalır ve
      // profilde yeni foto görünmez. Web'deki refreshUser() ile parite.
      // Numara değiştiyse `isPhoneVerified` da burada false'a döner ("doğrulanmış
      // üye" kriteri, authStore.isVerifiedMember).
      const fresh = await refreshUserData();
      queryClient.invalidateQueries({ queryKey: ['user'] });
      // Yerel seçim yüklendi → sunucudaki değere dön (yoksa bir sonraki kayıtta
      // aynı fotoğraf yeniden yüklenirdi).
      if (fresh?.avatar) setAvatar(fresh.avatar);
      // Kayıt sonucu TAZE kullanıcıyla doğrulanır; tazeleme düştüyse PATCH
      // yanıtındaki (zarfsız kullanıcı nesnesi) telefona geri çekilinir.
      const savedPhone = fresh ? fresh.phone : responsePhone;
      const result = resolvePhoneOutcome(sentPhone, savedPhone);
      // Numara yazılmadı/silinmedi → formu hesaptaki GERÇEK değere geri al;
      // yoksa sonraki ilgisiz bir kayıt aynı numarayı yeniden gönderip uyarıyı
      // tekrar tetiklerdi. Mesaj bunu kullanıcıya söylüyor.
      if (result.outcome === 'notSaved' || result.outcome === 'notRemoved') {
        const restored = splitPhone(savedPhone ?? '');
        setPhoneCountryCode(restored.countryCode);
        setValue('phone', restored.phone);
        clearErrors('phone');
      }
      if (result.outcome === 'unchanged') {
        toast.success(t('profile.profileUpdated'));
        return;
      }
      if (result.outcome === 'removed') {
        toast.success(t('security.phoneRemoved'));
        return;
      }
      if (result.outcome === 'notRemoved') {
        toast.error(t('security.phoneNotRemoved'));
        return;
      }
      // B-1.7 — yeni numara: web gibi kaydı doğrulamaya bağla. Kaydedilmediyse
      // (başka hesapta doğrulanmamış duruyor) başarı DEĞİL; numarayı devralmanın
      // tek yolu SMS doğrulaması olduğu için yine oraya yönlendir. Bu ekranda
      // açık modal yok — appAlert güvenli.
      const goVerify = () =>
        router.push({ pathname: '/settings/security', params: { verifyPhone: result.phone } } as never);
      const notSaved = result.outcome === 'notSaved';
      appAlert(
        t(notSaved ? 'security.phoneNotSavedTitle' : 'security.phoneSavedVerifyTitle'),
        t(notSaved ? 'security.phoneNotSavedBody' : 'security.phoneSavedVerifyBody'),
        [
          { text: t('security.verifyLater'), style: 'cancel' },
          { text: t('security.verifyNow'), onPress: goVerify },
        ],
      );
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('collection.updateFailed'));
    },
  });

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  const onSubmit = (data: ProfileForm) => {
    // Telefon opsiyonel. DOLUYSA çözülebilmeli: eskiden fazla hane sessizce
    // kırpılıp yanlış numara kaydediliyordu. Şema ülke kodunu bilmediği için
    // gate burada; çözülemeyen numara gönderilmez.
    const phone = phoneToSend((user as any)?.phone, data.phone, phoneCountryCode);
    if (phone === null) {
      setError('phone', { type: 'manual', message: getPhoneInvalidMessage() });
      return;
    }
    clearErrors('phone');
    updateMutation.mutate({ data, phone });
  };

  const bioLength = watch('bio')?.length || 0;
  const companyNameValue = watch('companyName');

  return {
    user,
    isAuthenticated,
    control,
    errors,
    handleSubmit,
    onSubmit,
    avatar,
    pickAvatar,
    phoneCountryCode,
    setPhoneCountryCode,
    isBusinessTier,
    bioLength,
    companyNameValue,
    updateMutation,
  };
}

export type EditProfileController = ReturnType<typeof useEditProfile>;

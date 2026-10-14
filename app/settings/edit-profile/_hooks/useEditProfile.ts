import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { appAlert, toast } from '@/ui';
import { userApi } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api/errorText';
import { useAuthStore } from '@/stores/authStore';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { getPhoneInvalidMessage, splitPhone } from '@/utils/phone';
import { buildProfileSchema, type ProfileForm } from '../_lib/schema';
import { phoneToSend, resolvePhoneOutcome } from '../_lib/phoneOutcome';

type UpdateVars = {
  data: ProfileForm;
  /** `phoneToSend` sonucu: `undefined` → numaraya dokunulmaz, `''` → sil. */
  phone: string | undefined;
};

/**
 * Edit-profile controller — kişisel (+ işletme) bilgiler formu: RHF+zod, telefon ülke kodu,
 * güncelleme mutasyonu (JSON PATCH) ve toast bildirimleri. Fotoğraf ayrı (`useUploadAvatar`,
 * seçilince anında yüklenir); kullanıcı adı / e-posta kendi ekranlarında.
 *
 * `isDirty`: form ya da ülke kodu kayıtlı değerden farklı → alt çubuk "Kaydet" etkin ve
 * ekrandan çıkış onay ister (`useUnsavedChangesGuard`). Başarılı kayıtta kaydedilen değerler
 * yeni temel olur (form temizlenir).
 */
export function useEditProfile() {
  const { t } = useTranslation();
  const { user, isAuthenticated, refreshUserData } = useAuthStore();
  const queryClient = useQueryClient();

  const isBusinessTier = (user as any)?.membershipTier === 'business';

  const profileSchema = useMemo(
    () => buildProfileSchema(t, isBusinessTier),
    [t, isBusinessTier],
  );

  // Kayıtlı numara "+90532…" formatında gelir — ülke kodu + formatlı lokal parçaya ayır.
  // `savedCountryCode` kirlilik temelidir (RHF formunun dışında tutulan tek alan).
  const [savedCountryCode, setSavedCountryCode] = useState(
    () => splitPhone((user as any)?.phone || '').countryCode,
  );
  const [phoneCountryCode, setPhoneCountryCode] = useState(savedCountryCode);

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty: isFormDirty },
    setError,
    clearErrors,
    reset,
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

  const isDirty = isFormDirty || phoneCountryCode !== savedCountryCode;
  useUnsavedChangesGuard(isDirty);

  const updateMutation = useMutation({
    mutationFn: async ({ data, phone }: UpdateVars) => {
      const payload: Record<string, any> = {
        displayName: data.displayName,
        bio: data.bio,
        birthDate: data.birthDate,
      };

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
    onSuccess: async ({ sentPhone, responsePhone }, { data }) => {
      // Store'u taze /users/me ile güncelle (web refreshUser() paritesi). Numara değiştiyse
      // `isPhoneVerified` da burada false'a döner ("doğrulanmış üye" kriteri).
      const fresh = await refreshUserData();
      queryClient.invalidateQueries({ queryKey: ['user'] });
      // Kayıt sonucu TAZE kullanıcıyla doğrulanır; tazeleme düştüyse PATCH
      // yanıtındaki (zarfsız kullanıcı nesnesi) telefona geri çekilinir.
      const savedPhone = fresh ? fresh.phone : responsePhone;
      const result = resolvePhoneOutcome(sentPhone, savedPhone);
      // Kaydedilen değerler yeni temel → form temizlenir ("Kaydet" pasif, çıkış korumasız).
      // Numara yazılmadı/silinmedi → telefon hesaptaki GERÇEK değere geri alınır; yoksa
      // sonraki ilgisiz bir kayıt aynı numarayı yeniden gönderip uyarıyı tekrar tetiklerdi.
      let nextPhone = data.phone;
      let nextCountryCode = phoneCountryCode;
      if (result.outcome === 'notSaved' || result.outcome === 'notRemoved') {
        const restored = splitPhone(savedPhone ?? '');
        nextPhone = restored.phone;
        nextCountryCode = restored.countryCode;
        setPhoneCountryCode(nextCountryCode);
      }
      reset({ ...data, phone: nextPhone });
      setSavedCountryCode(nextCountryCode);

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
      // açık modal yok — appAlert güvenli. Doğrudan telefon doğrulama ekranı (kod orada
      // bir kez gider); güvenlik hub'ı aynı parametreyi eski derin bağlantılar için yönlendirir.
      const goVerify = () =>
        router.push({ pathname: '/settings/security/phone', params: { verifyPhone: result.phone } });
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
      toast.error(apiErrorMessage(error, t('collection.updateFailed')));
    },
  });

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
    isDirty,
    phoneCountryCode,
    setPhoneCountryCode,
    isBusinessTier,
    bioLength,
    companyNameValue,
    updateMutation,
  };
}

export type EditProfileController = ReturnType<typeof useEditProfile>;

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { toast } from '@/ui';
import { mediaApi, userApi } from '@/lib/api';
import { errorText } from '@/lib/api/errorText';
import { useAuthStore } from '@/stores/authStore';
import { useRefreshAccount } from './useRefreshAccount';

/**
 * Profil fotoğrafı — seçilince ANINDA yüklenir (web `useUploadAvatar` paritesi):
 * `/media/upload/avatar` → dönen anahtar `PATCH /users/me { avatarUrl }` → store tazelenir
 * (profil sekmesi de yeni fotoğrafı görür) + toast. Profil formunun "Kaydet"inden bağımsız.
 * Yükleme sürerken yerel önizleme gösterilir; hata olursa önizleme geri alınır.
 */
export function useUploadAvatar() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const refreshAccount = useRefreshAccount();
  const [preview, setPreview] = useState<string | null>(null);
  // Seçici açılmadan gelen ikinci dokunuş "picker already presented" ile reddedilir → tek giriş.
  const picking = useRef(false);

  const upload = useMutation({
    mutationFn: async (uri: string) => {
      const uploadRes = await mediaApi.uploadAvatar({ uri, name: 'avatar.jpg', type: 'image/jpeg' });
      const key: string | undefined = uploadRes.data?.key ?? uploadRes.data?.url;
      if (!key) throw new Error('avatar upload returned no key');
      await userApi.updateProfile({ avatarUrl: key });
    },
    onSuccess: async () => {
      // Store'daki `avatar` taze /users/me ile eşlenir (mapApiUserToUser `avatarUrl` → `avatar`).
      // Tazeleme düşerse yerel önizleme kalır — doğru fotoğraf zaten o.
      const fresh = await refreshAccount();
      if (fresh?.avatar) setPreview(null);
      toast.success(t('profile.photoUpdated'));
    },
    onError: (e) => {
      setPreview(null);
      // Gövde mesajı varsa o (ör. dosya türü/boyutu), yoksa genel metin — teknik `Error.message` gösterilmez.
      toast.error(errorText(e, t('profile.photoUploadFailed')));
    },
  });

  const pick = async () => {
    if (upload.isPending || picking.current) return;
    picking.current = true;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const uri = result.assets[0].uri;
      setPreview(uri);
      upload.mutate(uri);
    } catch {
      toast.error(t('profile.photoUploadFailed'));
    } finally {
      picking.current = false;
    }
  };

  return {
    /** Gösterilecek fotoğraf: yükleme sürerken yerel seçim, sonra sunucudaki. */
    avatar: preview ?? user?.avatar ?? null,
    /** `avatar` cihazdaki yerel seçim mi (resolveImageUrl cihaz URI'sini ancak izinle geçirir). */
    isLocalPreview: preview != null,
    pick,
    isUploading: upload.isPending,
  };
}

export type AvatarUploadController = ReturnType<typeof useUploadAvatar>;

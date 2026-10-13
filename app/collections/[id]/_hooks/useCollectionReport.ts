import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { appAlert } from '@/ui';
import { useAuthStore } from '@/stores/authStore';

/**
 * Koleksiyon şikayeti (Apple App Review 1.2: sahibi olmadığın koleksiyonu şikayet edebilmelisin).
 * Misafir: POST /user-reports 401 döner ve interceptor Modal açıkken oturumu kapatıp yönlendiriyordu
 * (iOS donma) — ürün sayfasıyla aynı, önce giriş diyaloğu.
 */
export function useCollectionReport() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [visible, setVisible] = useState(false);

  const open = () => {
    if (!isAuthenticated) {
      appAlert(t('collection.report'), t('product.signInToReport'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.login'), onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }
    setVisible(true);
  };

  return { visible, open, close: () => setVisible(false) };
}

import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@/ui';
import { userApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/services/logger';
import { matchesDeleteKeyword } from '../_lib/confirm';
import {
  describeDeleteAccountError,
  type DeleteAccountFailure,
} from '../_lib/deleteAccountError';

/**
 * Web gibi ana sayfa. `dismissTo`: kök yığındaki `(tabs)`'a geri döner (yeni örnek itmez) —
 * ama sekme gezgini son açık sekmeyi (Profil) koruyabilir; ardından `navigate` açıkça Ana
 * Sayfa sekmesini seçer. Kuyruk sırayla işlenir: `navigate` çalıştığında kökte odak zaten
 * `(tabs)` olduğundan aynı rota güncellenir (yeni `(tabs)` itilmez), iç gezgin index'e geçer.
 */
function goHomeTab(): void {
  router.dismissTo('/(tabs)');
  router.navigate('/(tabs)');
}

/**
 * Hesap silme controller'ı (web `useDeleteAccount` eşi). Sözleşme değişmez:
 * `DELETE /users/me`; sunucu hesabı anonimleştirir, engel varsa 400 `errors[]`/`details`.
 *
 * - Onay: kullanıcı anahtar kelimeyi yazmadan (`canSubmit`) istek atılmaz.
 * - Çift gönderim yok: ref kilidi (aynı karede iki dokunuş) + `isPending`; başarıdan sonra
 *   da kilitli kalır (çıkış/yönlendirme sürerken).
 * - Silme hatası ve çıkış ayrı `try`: silme reddi → engel listesi (`failure`); silme BAŞARILI
 *   olduktan sonra çıkış düşerse yine başarı akışı ("Hesap silinemedi" gösterilmez).
 * - Başarı: toast `settings.accountDeleted` → YALNIZ yerel çıkış
 *   (`logout({ reason: 'accountDeleted' })` — sunucu token'ları sildi; ağ çağrısı yok) → ana sayfa.
 */
export function useDeleteAccount() {
  const { t } = useTranslation();
  const logout = useAuthStore((s) => s.logout);
  const keyword = t('settings.deleteAccountKeyword');
  const [confirmText, setConfirmText] = useState('');
  const [failure, setFailure] = useState<DeleteAccountFailure | null>(null);
  const [deleted, setDeleted] = useState(false);
  const lock = useRef(false);

  const mutation = useMutation({ mutationFn: () => userApi.deleteAccount() });

  const confirmed = matchesDeleteKeyword(confirmText, keyword);
  const busy = mutation.isPending || deleted;

  const submit = useCallback(async () => {
    if (lock.current || !confirmed) return;
    lock.current = true;
    setFailure(null);

    try {
      await mutation.mutateAsync();
    } catch (error) {
      lock.current = false;
      const f = describeDeleteAccountError(error, t('profile.deleteAccountFailed'));
      if (f.blocked) setFailure(f);
      else toast.error(f.title);
      return;
    }

    // Hesap silindi — buradan sonra hiçbir hata "silinemedi" diye gösterilmez.
    setDeleted(true);
    toast.success(t('settings.accountDeleted'));
    try {
      await logout({ reason: 'accountDeleted' });
    } catch (error) {
      logger.captureException(error, { level: 'warning', tags: { flow: 'accountDeleted' } });
    }
    goHomeTab();
  }, [confirmed, logout, mutation, t]);

  return {
    keyword,
    confirmText,
    setConfirmText,
    canSubmit: confirmed && !busy,
    busy,
    deleted,
    failure,
    submit,
  };
}

export type DeleteAccountController = ReturnType<typeof useDeleteAccount>;

import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@/ui';
import { userApi } from '@/lib/api';
import { isServerOrNetworkFailure, isSessionEndedError } from '@/lib/api/reauthError';
import { useReauth } from '@/hooks/useReauth';
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
 * Account deletion controller (web `useDeleteAccount`): `DELETE /users/me`; the server
 * anonymises the account, or answers 400 `errors[]`/`details` when something blocks it.
 *
 * - Typed confirmation: no request until the keyword is typed (`canSubmit`).
 * - Step-up: the confirm step runs first and its token goes in `X-Reauth-Token`
 *   (`useReauth`). A device that cannot confirm (no password, no linked provider shown here)
 *   still sends the request without a token, which the API accepts while
 *   `auth_require_reauth_for_sensitive_actions` is off: deletion is never blocked on the device
 *   (App Store 5.1.1(v), Play account deletion). Cancelling the confirm step sends nothing.
 * - No double submit: a ref lock (two taps in one frame) plus `busy`; it stays locked after
 *   success (while sign-out and navigation run).
 * - The deletion error and the sign-out have separate `try`s: a refusal shows the blockers
 *   (`failure`); a sign-out failure after a SUCCESSFUL deletion still runs the success path.
 * - Success: toast `settings.accountDeleted`, then a LOCAL sign-out only
 *   (`logout({ reason: 'accountDeleted' })`, the server already dropped the tokens), then home.
 */
export function useDeleteAccount() {
  const { t } = useTranslation();
  const logout = useAuthStore((s) => s.logout);
  const keyword = t('settings.deleteAccountKeyword');
  const [confirmText, setConfirmText] = useState('');
  const [failure, setFailure] = useState<DeleteAccountFailure | null>(null);
  const [deleted, setDeleted] = useState(false);
  const lock = useRef(false);

  const reauth = useReauth('account_delete');
  const mutation = useMutation({
    mutationFn: (reauthToken: string | undefined) => userApi.deleteAccount(reauthToken),
    // The variables hold the step-up token: no cache entry after use.
    gcTime: 0,
  });

  const confirmed = matchesDeleteKeyword(confirmText, keyword);
  const busy = mutation.isPending || reauth.pending || deleted;
  const { run } = reauth;

  const submit = useCallback(async () => {
    if (lock.current || !confirmed) return;
    lock.current = true;
    setFailure(null);

    try {
      const outcome = await run((token) => mutation.mutateAsync(token), { allowUnconfirmed: true });
      if (outcome.status !== 'done') {
        lock.current = false;
        return;
      }
    } catch (error) {
      lock.current = false;
      // The client already handled an ended session (sign-out, login screen).
      if (isSessionEndedError(error)) return;
      if (isServerOrNetworkFailure(error)) {
        logger.captureException(error, { level: 'error', tags: { flow: 'account_delete' } });
      }
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
  }, [confirmed, logout, mutation, run, t]);

  return {
    keyword,
    confirmText,
    setConfirmText,
    canSubmit: confirmed && !busy,
    busy,
    deleted,
    failure,
    submit,
    reauthModal: reauth.modal,
  };
}

export type DeleteAccountController = ReturnType<typeof useDeleteAccount>;

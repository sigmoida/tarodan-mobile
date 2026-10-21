import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { useZodForm } from '@/ui/form';
import { goBackOrHome } from '@/components/common/goBackOrHome';
import { apiErrorMessage } from '@/lib/api/errorText';
import {
  isServerOrNetworkFailure,
  isSessionEndedError,
  signInMethodsErrorCode,
} from '@/lib/api/reauthError';
import { useReauth } from '@/hooks/useReauth';
import { useWriteSignInMethods } from '@/hooks/useSignInMethods';
import { captureException } from '@/services/sentry';
import { SIGN_IN_METHODS_ERROR_CODES } from '@/types/sign-in-methods';
import { setPasswordSchema, type SetPasswordValues } from '../_lib/schema';
import { useDoSetPassword } from './useDoSetPassword';

const EMPTY: SetPasswordValues = { newPassword: '', confirmPassword: '' };

/**
 * Set a first password (web `SecuritySection` set mode): the form, then the confirm step, then
 * `POST /auth/password/set` with the step-up token.
 *
 * - Success: toast, the hub shows "Change password" (the answer is written to the query), back.
 * - `409 PASSWORD_ALREADY_SET` (another device won the race): the server message, the methods
 *   are refreshed, back to the hub, which now offers "Change password".
 * - This device cannot confirm (Android fallback): the set-password mail goes out instead.
 * - A double tap sends once (ref lock); a step-up or set error never signs out (only 401 does).
 */
export function useSetPasswordFlow() {
  const { t } = useTranslation();
  const form = useZodForm(useMemo(() => setPasswordSchema(t), [t]), { defaultValues: EMPTY });
  const reauth = useReauth('password_set');
  const setPassword = useDoSetPassword();
  const writeMethods = useWriteSignInMethods();
  const lock = useRef(false);

  const submit = form.handleSubmit(async ({ newPassword }) => {
    if (lock.current) return;
    lock.current = true;
    try {
      const outcome = await reauth.run((reauthToken) => {
        if (!reauthToken) throw new Error('Set password without a step-up token');
        return setPassword.mutateAsync({ newPassword, reauthToken });
      });
      if (outcome.status === 'unavailable') {
        reauth.sendSetPasswordMail();
        return;
      }
      if (outcome.status !== 'done') return;
      toast.success(t('profile.security.setPasswordSuccess'));
      goBackOrHome();
    } catch (error) {
      if (isSessionEndedError(error)) return;
      if (signInMethodsErrorCode(error) === SIGN_IN_METHODS_ERROR_CODES.passwordAlreadySet) {
        toast.error(apiErrorMessage(error, t('common.operationFailed')));
        writeMethods(undefined);
        goBackOrHome();
        return;
      }
      if (isServerOrNetworkFailure(error)) {
        captureException(error, { level: 'error', tags: { flow: 'auth.password_set' } });
      }
      toast.error(apiErrorMessage(error, t('common.operationFailed')));
    } finally {
      lock.current = false;
    }
  });

  return {
    form,
    newPassword: form.watch('newPassword') ?? '',
    submit,
    busy: setPassword.isPending || reauth.pending || reauth.sendingMail,
    reauthModal: reauth.modal,
  };
}

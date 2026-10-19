import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { z } from "zod";
import { Button } from "@/ui";
import { Form, FormError, FormInput, useZodForm } from "@/ui/form";
import { AuthShell } from "@/components/auth/AuthShell";
import { authApi } from "@/lib/api";
// Direct module path: tests mock the `@/lib/api` barrel.
import { apiErrorMessage } from "@/lib/api/errorText";
import { useAppMutation } from "@/lib/query";
import { logger } from "@/services/logger";
import { useAuthStore } from "@/stores/authStore";
import { passwordHint, passwordSchema, refinePasswordMatch } from "@/utils/passwordPolicy";

/** New password + confirmation: the rule has one source (`passwordSchema`), the match is a zod refine. */
const resetPasswordSchema = (t: TFunction) =>
  z
    .object({ password: passwordSchema(t), confirmPassword: z.string() })
    .superRefine(refinePasswordMatch(t, "password", "confirmPassword"));

/**
 * Set a new password (link from the reset e-mail). While typing, only the missing rules show
 * under the password field; submit errors show under the fields (zod); a server/token error
 * stays in the form (`FormError`). Success: a separate view -> login.
 *
 * The screen is reachable while signed in (the auth layout has no guest gate). A successful
 * reset makes the API revoke every refresh token of the user, so the local session is dead:
 * a signed-in session is ended through the existing logout path, without the server revoke
 * (`skipServer`), before the success view shows (same outcome as web `useResetPassword`).
 */
export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token: string }>();
  const logout = useAuthStore((s) => s.logout);
  const [success, setSuccess] = useState(false);
  const form = useZodForm(
    useMemo(() => resetPasswordSchema(t), [t]),
    { defaultValues: { password: "", confirmPassword: "" } },
  );
  const [password, confirmPassword] = form.watch(["password", "confirmPassword"]);

  const reset = useAppMutation(
    (newPassword: string) => authApi.resetPassword(token as string, newPassword),
    {
      silentError: true,
      onError: (e) =>
        form.setError("root", { message: apiErrorMessage(e, t("auth.resetFailed"), "all") }),
    },
  );

  const submitReset = async (newPassword: string) => {
    try {
      await reset.mutateAsync(newPassword);
    } catch {
      return; // `onError` above already shows the failure in the form
    }
    // Outside the try above: the password has changed and the token is used up, so nothing
    // after this point may report a failed reset. The API just revoked every refresh token,
    // so a local session is dead: end it before the success view, without the server revoke
    // (it would just get a 401). Web clears unconditionally only because it cannot see its
    // httpOnly cookies; mobile knows its session, so a guest keeps the guest cart and the rest.
    const session = useAuthStore.getState();
    if (session.isAuthenticated || session.token) {
      try {
        await logout({ skipServer: true });
      } catch (error) {
        // Never surface cleanup as a failed reset, but keep it traceable.
        logger.captureException(error, { level: "warning", tags: { flow: "auth.resetPassword.logout" } });
      }
    }
    setSuccess(true);
  };

  // Covers the reset request and the session cleanup after it, so a second tap cannot resend
  // the used token while the logout is still running.
  const submitting = reset.isPending || form.formState.isSubmitting;

  const onSubmit = () => {
    form.clearErrors("root");
    return form.handleSubmit((values) => {
      if (!token) {
        form.setError("root", { message: t("auth.resetTokenMissing") });
        return;
      }
      return submitReset(values.password);
    })();
  };

  if (success) {
    return (
      <AuthShell title={t("auth.resetSuccessTitle")} description={t("auth.resetSuccessBody")}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          title={t("auth.loginTitle")}
          onPress={() => router.replace("/(auth)/login")}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("auth.resetTitle")}
      description={t("auth.resetSubtitle")}
      onBack={() => router.replace("/(auth)/login")}
    >
      <Form form={form}>
        <FormInput
          name="password"
          testID="reset-password-input"
          label={t("mobile.newPassword")}
          secureTextEntry
          togglePasswordVisibility
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          helperText={passwordHint(password, t)}
        />
        <FormInput
          name="confirmPassword"
          testID="reset-password-confirm-input"
          label={t("mobile.newPasswordRepeat")}
          secureTextEntry
          togglePasswordVisibility
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <FormError />
      </Form>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        title={t("mobile.resetPasswordButton")}
        onPress={onSubmit}
        isLoading={submitting}
        disabled={submitting || !password || !confirmPassword}
        testID="reset-password-submit"
      />
    </AuthShell>
  );
}

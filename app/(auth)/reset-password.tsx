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
 * it is ended through the existing logout path, local only (`skipServer`), before the success
 * view shows (same as web `useResetPassword`).
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
    // so the local session is dead: end it before the success view (local only, a server
    // call would just get a 401). Unconditional, like web: a no-op cleanup for a guest.
    try {
      await logout({ reason: "user", skipServer: true });
    } catch {
      // `logout` logs its own failed steps; never surface cleanup as a failed reset.
    }
    setSuccess(true);
  };

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
        isLoading={reset.isPending}
        disabled={reset.isPending || !password || !confirmPassword}
        testID="reset-password-submit"
      />
    </AuthShell>
  );
}

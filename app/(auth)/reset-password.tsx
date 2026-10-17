import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { z } from "zod";
import { Button } from "@/ui";
import { Form, FormError, FormInput, useZodForm } from "@/ui/form";
import { AuthShell } from "@/components/auth/AuthShell";
import { authApi } from "@/lib/api";
// Doğrudan modül yolu: testler `@/lib/api` barrel'ını mock'luyor.
import { apiErrorMessage } from "@/lib/api/errorText";
import { useAppMutation } from "@/lib/query";
import { passwordHint, passwordSchema, refinePasswordMatch } from "@/utils/passwordPolicy";

/** Yeni şifre + tekrar: kural tek kaynak (`passwordSchema`), eşleşme zod refine. */
const resetPasswordSchema = (t: TFunction) =>
  z
    .object({ password: passwordSchema(t), confirmPassword: z.string() })
    .superRefine(refinePasswordMatch(t, "password", "confirmPassword"));

/**
 * Yeni şifre belirle (e-postadaki bağlantı). Şifre alanının altında yazarken yalnız eksik
 * kurallar; gönderim hataları alanların altında (zod), sunucu/token hatası formda kalıcı
 * (`FormError`). Başarı: ayrı ekran → giriş.
 */
export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token: string }>();
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
      onSuccess: () => setSuccess(true),
      onError: (e) =>
        form.setError("root", { message: apiErrorMessage(e, t("auth.resetFailed"), "all") }),
    },
  );

  const onSubmit = () => {
    form.clearErrors("root");
    return form.handleSubmit((values) => {
      if (!token) {
        form.setError("root", { message: t("auth.resetTokenMissing") });
        return;
      }
      reset.mutate(values.password);
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

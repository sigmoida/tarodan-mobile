import { useState } from "react";
import { StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, HStack, Input, Text, theme, Icon } from "@/ui";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";
import { authApi } from "@/lib/api";
import { useTranslation } from "react-i18next";

const { colors } = theme;

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const validatePassword = () => {
    if (password.length < 8) return t("auth.pwRuleMinLength");
    if (!/[A-Z]/.test(password)) return t("auth.pwRuleUppercase");
    if (!/[a-z]/.test(password)) return t("auth.pwRuleLowercase");
    if (!/[0-9]/.test(password)) return t("auth.pwRuleNumber");
    return null;
  };

  const handleResetPassword = async () => {
    setError("");
    if (!token) {
      setError(t("auth.resetTokenMissing"));
      return;
    }
    const passwordError = validatePassword();
    if (passwordError) return setError(passwordError);
    if (password !== confirmPassword) return setError(t("auth.resetPasswordMismatch"));

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || t("auth.resetFailed"));
    } finally {
      setLoading(false);
    }
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

  const passwordsMatch = password === confirmPassword;

  return (
    <AuthShell
      title={t("auth.resetTitle")}
      description={t("auth.resetSubtitle")}
      onBack={() => router.replace("/(auth)/login")}
    >
      <Input
        label={t("mobile.newPassword")}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        togglePasswordVisibility
        autoCapitalize="none"
      />

      {/* Gereksinim paneli `auth.pwReq*` anahtarlarını kullanır — kayıt formu ve şifre değiştirme
          ekranıyla ortak (CLAUDE.md §5). */}
      <PasswordChecklist password={password} />

      <Input
        label={t("mobile.newPasswordRepeat")}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        togglePasswordVisibility
        autoCapitalize="none"
      />

      {confirmPassword ? (
        <HStack gap={2} align="center" style={styles.match}>
          <Icon
            name={passwordsMatch ? 'check-circle' : 'x-circle'}
            size={theme.iconSize.sm}
            color={passwordsMatch ? colors.success[600] : colors.danger[600]} variant="solid"
          />
          <Text variant="bodySm" tone={passwordsMatch ? "success" : "danger"}>
            {passwordsMatch ? t("common.success") : t("mobile.passwordsDontMatch")}
          </Text>
        </HStack>
      ) : null}

      {error ? (
        <Text variant="bodySm" tone="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Button
        variant="primary"
        size="lg"
        fullWidth
        title={t("mobile.resetPasswordButton")}
        onPress={handleResetPassword}
        isLoading={loading}
        disabled={loading || !password || !confirmPassword}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  match: { marginBottom: theme.spacing[2] },
  error: { marginBottom: theme.spacing[2] },
});

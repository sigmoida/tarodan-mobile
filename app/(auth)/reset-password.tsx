import { useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  Button,
  HStack,
  IconButton,
  Input,
  Screen,
  Text,
  VStack,
  theme,
} from "@/ui";
import { authApi } from "@/lib/api";
import { useTranslation } from "react-i18next";

const { colors, radius, spacing } = theme;

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
      <Screen center>
        <VStack gap={4} align="center">
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: radius.full,
              backgroundColor: colors.success[50]!,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="checkmark-circle"
              size={64}
              color={colors.success[600]!}
            />
          </View>
          <Text variant="h1" align="center">
            {t("auth.resetSuccessTitle")}
          </Text>
          <Text variant="body" tone="muted" align="center">
            {t("auth.resetSuccessBody")}
          </Text>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            title={t("auth.loginTitle")}
            onPress={() => router.replace("/(auth)/login")}
          />
        </VStack>
      </Screen>
    );
  }

  // Etiketler `auth.pwReq*`'ten — kayıt formu ve şifre değiştirme ekranı da aynı
  // anahtarları kullanıyor. Kural metnini burada ayrıca yazmak, gereksinimlerin
  // iki ekranda farklı ifade edilmesi demekti (CLAUDE.md §5).
  const passwordRequirements = [
    { id: "minLength", ok: password.length >= 8, label: t("auth.pwReqMinLength") },
    { id: "uppercase", ok: /[A-Z]/.test(password), label: t("auth.pwReqUppercase") },
    { id: "lowercase", ok: /[a-z]/.test(password), label: t("auth.pwReqLowercase") },
    { id: "number", ok: /[0-9]/.test(password), label: t("auth.pwReqNumber") },
  ];

  return (
    <Screen>
      <HStack justify="flex-start" style={{ marginBottom: spacing[2] }}>
        <IconButton
          icon="arrow-back"
          variant="plain"
          accessibilityLabel={t("common.back")}
          onPress={() => router.back()}
        />
      </HStack>

      <VStack gap={4}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: radius.full,
            backgroundColor: colors.primary[50]!,
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "center",
          }}
        >
          <Ionicons
            name="lock-closed-outline"
            size={48}
            color={colors.primary[600]!}
          />
        </View>

        <Text variant="h1" align="center">
          {t("auth.resetTitle")}
        </Text>
        <Text variant="body" tone="muted" align="center">
          {t("auth.resetSubtitle")}
        </Text>

        <Input
          label={t("mobile.newPassword")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          togglePasswordVisibility
          autoCapitalize="none"
        />

        <View
          style={{
            backgroundColor: colors.surface.alt,
            padding: spacing[4],
            borderRadius: radius.xl,
          }}
        >
          <Text
            variant="label"
            tone="muted"
            style={{ marginBottom: spacing[3] }}
          >
            {t("auth.pwReqTitle")}
          </Text>
          {passwordRequirements.map((r) => (
            <HStack
              key={r.id}
              gap={2}
              align="center"
              style={{ marginBottom: spacing[2] }}
            >
              <Ionicons
                name={r.ok ? "checkmark-circle" : "ellipse-outline"}
                size={16}
                color={r.ok ? colors.success[600]! : colors.text.subtle}
              />
              <Text variant="bodySm" tone={r.ok ? "success" : "subtle"}>
                {r.label}
              </Text>
            </HStack>
          ))}
        </View>

        <Input
          label={t("mobile.newPasswordRepeat")}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          togglePasswordVisibility
          autoCapitalize="none"
        />

        {confirmPassword ? (
          <HStack gap={2} align="center">
            <Ionicons
              name={
                password === confirmPassword
                  ? "checkmark-circle"
                  : "close-circle"
              }
              size={16}
              color={
                password === confirmPassword
                  ? colors.success[600]!
                  : colors.danger[600]!
              }
            />
            <Text
              variant="bodySm"
              tone={password === confirmPassword ? "success" : "danger"}
            >
              {password === confirmPassword
                ? t("common.success")
                : t("mobile.passwordsDontMatch")}
            </Text>
          </HStack>
        ) : null}

        {error ? (
          <Text variant="bodySm" tone="danger">
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

        <HStack
          gap={2}
          justify="center"
          align="center"
          style={{ marginTop: spacing[3] }}
        >
          <Ionicons name="arrow-back" size={16} color={colors.primary[600]!} />
          <Text
            variant="bodySm"
            tone="primary"
            weight="medium"
            onPress={() => router.replace("/(auth)/login")}
          >
            {t("common.login")}
          </Text>
        </HStack>
      </VStack>
    </Screen>
  );
}

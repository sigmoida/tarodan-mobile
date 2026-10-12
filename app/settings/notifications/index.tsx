import { View, ScrollView, TouchableOpacity } from "react-native";
import { Button, ErrorState, Spinner, Text, ScreenHeader, theme } from "@/ui";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ThemedRefreshControl } from "@/components/common";
import { useTranslation } from "react-i18next";
import { useNotificationSettings } from "./_hooks/useNotificationSettings";
import { styles } from "./_lib/styles";
import { NotificationCards } from "./_components/NotificationCards";

const { colors } = theme;

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const f = useNotificationSettings();

  if (!f.isAuthenticated) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons
          name="notifications-outline"
          size={64}
          color={colors.primary[600]!}
        />
        <Text variant="h3" style={styles.title}>
          {t("mobile.settingsNotifications")}
        </Text>
        <Text variant="body" style={styles.subtitle}>
          {t("settings.notificationsAuthGateSubtitle")}
        </Text>
        <Button
          variant="primary"
          title={t("common.login")}
          onPress={() => router.push("/(auth)/login")}
          style={{ alignSelf: "center" }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("mobile.settingsNotifications")}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
        right={
          <TouchableOpacity
            testID="notification-settings-save"
            onPress={f.handleSave}
            disabled={!f.canSave}
            accessibilityState={{ disabled: !f.canSave }}
          >
            <Text style={[styles.saveButton, !f.canSave && styles.saveButtonDisabled]}>
              {f.saveMutation.isPending ? t("collection.saving") : t("mobile.save")}
            </Text>
          </TouchableOpacity>
        }
      />

      {f.isLoading ? (
        <View style={styles.loadingContainer}>
          <Spinner size="lg" />
        </View>
      ) : f.loadFailed ? (
        <ErrorState
          message={t("settings.notificationSettingsLoadFailed")}
          onRetry={f.retryLoad}
        />
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <ThemedRefreshControl
              refreshing={f.refreshing}
              onRefresh={f.onRefresh}
            />
          }
        >
          <NotificationCards f={f} />
        </ScrollView>
      )}
    </View>
  );
}

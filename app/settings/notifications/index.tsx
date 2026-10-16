import { router } from "expo-router";
import { Button } from "@/ui";
import { PageShell } from "@/components/common/PageShell";
import { useTranslation } from "react-i18next";
import { useNotificationSettings } from "./_hooks/useNotificationSettings";
import { NotificationCards } from "./_components/NotificationCards";
import { NotificationSettingsSkeleton } from "./_components/NotificationSettingsSkeleton";

/**
 * Bildirim tercihleri — PageShell (Skeleton / hata / çekip yenileme) + SectionCard bölümleri,
 * sabit alt barda tek "Kaydet". Mantık `useNotificationSettings`'de.
 */
export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const f = useNotificationSettings();
  const title = t("mobile.settingsNotifications");
  const onBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)"));

  if (!f.isAuthenticated) {
    return (
      <PageShell
        title={title}
        onBack={onBack}
        empty
        emptyState={{
          icon: "bell",
          title,
          subtitle: t("settings.notificationsAuthGateSubtitle"),
          actionLabel: t("common.login"),
          onAction: () => router.push("/(auth)/login"),
        }}
      />
    );
  }

  return (
    <PageShell
      title={title}
      onBack={onBack}
      loading={f.isLoading}
      loadingFallback={<NotificationSettingsSkeleton />}
      error={f.loadFailed ? true : undefined}
      errorMessage={t("settings.notificationSettingsLoadFailed")}
      onRetry={f.retryLoad}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
      footer={
        <Button
          testID="notification-settings-save"
          variant="primary"
          size="lg"
          fullWidth
          title={t("mobile.save")}
          onPress={f.handleSave}
          disabled={!f.canSave}
          isLoading={f.saveMutation.isPending}
        />
      }
    >
      <NotificationCards f={f} />
    </PageShell>
  );
}

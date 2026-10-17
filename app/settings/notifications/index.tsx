import { router } from "expo-router";
import { PageShell } from "@/components/common/PageShell";
import { useTranslation } from "react-i18next";
import { useNotificationSettings } from "./_hooks/useNotificationSettings";
import { NotificationCards } from "./_components/NotificationCards";
import { NotificationSettingsSkeleton } from "./_components/NotificationSettingsSkeleton";

/**
 * Bildirim tercihleri — PageShell (Skeleton / hata / çekip yenileme) + SectionCard bölümleri.
 * Web gibi Kaydet düğmesi yok: her anahtar değiştiği anda kaydedilir (iyimser + toast).
 * Mantık `useNotificationSettings`'de.
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
    >
      <NotificationCards f={f} />
    </PageShell>
  );
}

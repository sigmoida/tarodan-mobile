import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/ui";
import { PageShell } from "@/components/common/PageShell";
import { useSupportForm } from "./_hooks/useSupportForm";
import { SupportForm } from "./_components/SupportForm";

/**
 * Yeni destek talebi — PageShell (klavye kaçınma, sabit alt bar = "Talep Oluştur") + SectionCard'lı
 * form. Alan durumu/doğrulama/gönderim `useSupportForm`'da; geri bildirim toast.
 */
export default function SupportScreen() {
  const { t } = useTranslation();
  const f = useSupportForm();

  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)");

  if (!f.isAuthenticated) {
    return (
      <PageShell
        title={t("mobile.pageSupport")}
        onBack={back}
        empty
        emptyState={{
          icon: "headset-outline",
          title: t("auth.loginRequired"),
          subtitle: t("support.new.loginRequiredSubtitle"),
          actionLabel: t("common.login"),
          onAction: () => router.push("/(auth)/login"),
        }}
      />
    );
  }

  return (
    <PageShell
      title={t("support.new.title")}
      onBack={back}
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          title={t("support.createTicket")}
          onPress={f.handleSubmit}
          isLoading={f.loading}
          disabled={f.loading || !f.category || !f.subject || !f.description}
        />
      }
    >
      <SupportForm f={f} />
    </PageShell>
  );
}

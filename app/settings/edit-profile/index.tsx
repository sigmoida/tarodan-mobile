import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/ui";
import { PageShell } from "@/components/common/PageShell";
import { useEditProfile } from "./_hooks/useEditProfile";
import { styles } from "./_lib/styles";
import {
  AccountLinks,
  AvatarSection,
  PersonalInfoCard,
  BusinessInfoCard,
} from "./_components/EditProfileSections";
import { LegalIdentityCard } from "./_components/LegalIdentityCard";

/**
 * Profili düzenle — D1b REFERANS EKRANI (form): PageShell (beyaz üst bar, klavye kaçınma,
 * sabit alt bar = tek ana aksiyon) + bölümler web'deki gibi SectionCard. Form/mutasyon
 * `useEditProfile`'da; ekran yalnız kompozisyon.
 */
export default function EditProfileScreen() {
  const { t } = useTranslation();
  const f = useEditProfile();
  const onBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)"));

  if (!f.isAuthenticated) {
    return (
      <PageShell
        title={t("mobile.settingsEditProfile")}
        onBack={onBack}
        empty
        emptyState={{
          icon: "person-outline",
          title: t("membership.loginRequiredTitle"),
          actionLabel: t("common.login"),
          onAction: () => router.push("/(auth)/login"),
        }}
      />
    );
  }

  return (
    <PageShell
      title={t("mobile.settingsEditProfile")}
      onBack={onBack}
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          title={t("product.saveChanges")}
          onPress={f.handleSubmit(f.onSubmit)}
          isLoading={f.updateMutation.isPending}
          disabled={f.updateMutation.isPending}
        />
      }
    >
      <AvatarSection f={f} />
      <PersonalInfoCard f={f} />
      <LegalIdentityCard />
      <BusinessInfoCard f={f} />
      <AccountLinks />
    </PageShell>
  );
}

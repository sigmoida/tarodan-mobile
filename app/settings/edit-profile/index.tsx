import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/ui";
import { PageShell } from "@/components/common/PageShell";
import { useEditProfile } from "./_hooks/useEditProfile";
import {
  AvatarSection,
  PersonalInfoCard,
  BusinessInfoCard,
} from "./_components/EditProfileSections";
import { LegalIdentityCard } from "./_components/LegalIdentityCard";
import { UsernameSection } from "./_sections/UsernameSection";
import { EmailSection } from "./_sections/EmailSection";

/**
 * Profili düzenle — D1b REFERANS EKRANI (form): PageShell (beyaz üst bar, klavye kaçınma,
 * sabit alt bar) + bölümler web'deki gibi SectionCard. Alt çubuk "Kaydet" YALNIZ kişisel
 * (ve işletme) bilgileri kaydeder; kullanıcı adı ve e-posta ayrı uçlarda yaşadığı için
 * kendi bölümlerinde kendi eylemleriyle yönetilir (`_sections/`). Form/mutasyon
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
          icon: "user",
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
          testID="edit-profile-save"
        />
      }
    >
      <AvatarSection f={f} />
      <PersonalInfoCard f={f} />
      <UsernameSection />
      <EmailSection />
      <LegalIdentityCard />
      <BusinessInfoCard f={f} />
    </PageShell>
  );
}

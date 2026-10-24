import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/ui";
import { PageShell } from "@/components/common/PageShell";
import { useEditProfile } from "./_hooks/useEditProfile";
import { useUploadAvatar } from "./_hooks/useUploadAvatar";
import {
  AvatarSection,
  PersonalInfoCard,
  BusinessInfoCard,
} from "./_components/EditProfileSections";
import { AccountSection } from "./_components/AccountSection";
import { LegalIdentityCard } from "./_components/LegalIdentityCard";

/**
 * Edit profile - iOS Settings layout (PageShell): photo (uploads as soon as it is picked) →
 * Account rows (username / e-mail read-only; changes happen on their own screens) →
 * Personal (+ business) info form → Identity info (read-only). The footer "Save changes"
 * button is enabled ONLY while the form is dirty; leaving while dirty asks for confirmation
 * (`useEditProfile`).
 */
export default function EditProfileScreen() {
  const { t } = useTranslation();
  const f = useEditProfile();
  const avatar = useUploadAvatar();

  if (!f.isAuthenticated) {
    return (
      <PageShell
        title={t("mobile.settingsEditProfile")}
        empty
        emptyState={{
          icon: "user",
          title: t("membership.loginRequiredTitle"),
          subtitle: t('emptyState.loginRequiredHint'),
          actionLabel: t("common.login"),
          onAction: () => router.push("/(auth)/login"),
        }}
      />
    );
  }

  return (
    <PageShell
      title={t("mobile.settingsEditProfile")}
      // Form tam profille açılır (saklı görüntüde telefon / doğum tarihi / bio yok).
      loading={f.profileLoading}
      error={f.profileError}
      onRetry={f.retryProfile}
      footer={
        // Yalnız kaydedilecek değişiklik varken (veya kayıt sürerken) görünür.
        f.isDirty || f.updateMutation.isPending ? (
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
        ) : undefined
      }
    >
      <AvatarSection avatar={avatar} />
      <AccountSection />
      <PersonalInfoCard f={f} />
      <BusinessInfoCard f={f} />
      <LegalIdentityCard />
    </PageShell>
  );
}

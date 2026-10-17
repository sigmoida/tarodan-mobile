import React from "react";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { IconButton, SectionCard, Text } from "@/ui";

import { buildAvatarUrl } from "@/lib/api";
import {
  buildProfileMenuGroups,
  selectProfileSections,
} from "@/lib/menu/profileMenu";
import { useMenuContext } from "@/lib/menu/useMenuContext";
import { MenuGroupList } from "@/components/menu/MenuGroupList";
import { useAuthStore } from "@/stores/authStore";
import { useHomeBadges } from "../_hooks/useHomeBadges";
import type { ProfileController } from "../_hooks/useProfile";
import { ProfileHeader } from "./ProfileHeader";

type SectionProps = { f: ProfileController };

// ---------------------------------------------------------------------------
// Kimlik başlığı (yatay kompakt): solda avatar, sağında ad + e-posta. Rozet YOK (üyelik / güven
// skoru / görünürlük çipi kaldırıldı; güven skoru görünürlüğü Profili Düzenle'de). "Profili
// düzenle" girişi kimlik satırının sağındaki kalem (üst barın sağında Profil'e özel ⚙️ Ayarlar).
// ---------------------------------------------------------------------------
export function ProfileCard({ f }: SectionProps) {
  const { t } = useTranslation();
  const { user } = f;
  return (
    // Kimlik bandı da menü grupları gibi beyaz `SectionCard` içinde (başlıksız).
    <SectionCard testID="profile-identity-card">
      <ProfileHeader
        layout="row"
        name={user?.displayName || "U"}
        source={
          user?.avatar && user?.id
            ? buildAvatarUrl(String(user.id), user.avatar)
            : undefined
        }
        trailing={
          // Maestro akışları `profile-edit-button`'a bağlı (giriş yapılmış mı testi) — misafirde YOK.
          <IconButton
            icon="pencil"
            variant="ghost"
            accessibilityLabel={t("profile.editProfile")}
            testID="profile-edit-button"
            onPress={() => router.push("/settings/edit-profile")}
          />
        }
      >
        <Text
          variant="h3"
          weight="bold"
          numberOfLines={1}
          testID="profile-name"
        >
          {user?.displayName || t("nav.account")}
        </Text>
        {user?.email ? (
          <Text variant="bodySm" tone="muted" numberOfLines={1}>
            {user.email}
          </Text>
        ) : null}
      </ProfileHeader>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Profil menüsü: kullanıcının işlemleri (Alışveriş · Finans · Koleksiyon · Analiz), gruplu, hep açık.
// Hesap / ödeme ayarları / üyelik / tercihler / destek / yasal ve çıkış Ayarlar ekranında
// (`/settings`, üst barın sağındaki ⚙️).
// ---------------------------------------------------------------------------
export function ProfileMenuSections() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const ctx = useMenuContext();
  const badges = useHomeBadges(isAuthenticated);
  // Dil değişince etiketler de değişsin diye liste `t`'ye bağlı kuruluyor.
  const groups = React.useMemo(
    () => selectProfileSections(buildProfileMenuGroups(t, ctx)),
    [t, ctx],
  );
  return <MenuGroupList groups={groups} badges={badges} />;
}

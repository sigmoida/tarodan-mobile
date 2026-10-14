import { View, Pressable, Image } from "react-native";
import { Badge, EmptyState, FAB, SectionCard, Text } from "@/ui";
import { router } from "expo-router";
import { resolveImageUrl } from "@/utils/imageUrl";
import { AuthGatePage } from "@/components/common/AuthGatePage";
import { PageShell } from "@/components/common/PageShell";
import { RowListSkeleton } from "@/components/common/RowListSkeleton";
import UpgradeCta from "@/components/UpgradeCta";
import { useMyCollections } from "./_collections/_hooks/useMyCollections";
import { styles } from "./_collections/_lib/styles";

/**
 * Koleksiyonlarım — PageShell + web gibi 2 sütun kart ızgarası. Sorgu ve "yeni" kapısı
 * `useMyCollections`'ta; premium notu iOS'ta kapalı (UpgradeCta).
 */
export default function CollectionsScreen() {
  const f = useMyCollections();
  const { t } = f;
  const title = t("mobile.settingsCollections");

  if (!f.isAuthenticated) {
    return <AuthGatePage title={title} icon="rectangle-stack" subtitle={t("auth.loginToContinue")} />;
  }

  return (
    <PageShell
      title={title}
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
      loading={f.isLoading}
      loadingFallback={<RowListSkeleton rows={4} />}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
      overlay={
        f.canCreateCollections ? (
          <FAB
            icon="plus"
            accessibilityLabel={t("collection.createNewCollection")}
            placement="bottomRight"
            onPress={f.handleCreateCollection}
          />
        ) : null
      }
    >
      <SectionCard title={t("mobile.guestGarageTitle")}>
        <Text variant="bodySm" tone="muted">
          {t("collection.garageDesc")}
        </Text>
      </SectionCard>

      {/* Premium Notice if not premium — başlığı ve açıklaması Premium'a özel
          olduğunu söylüyor, salt düğmeyi gizlemek yetmez; kart bütünüyle
          iOS'ta kapanır (Guideline 3.1.1/3.1.3). */}
      {!f.canCreateCollections && (
        <UpgradeCta>
          <Pressable style={styles.premiumNotice} onPress={() => router.push("/upgrade")}>
            <View style={styles.premiumNoticeText}>
              <Text variant="label">{t("membership.premiumFeatureTitle")}</Text>
              <Text variant="caption">{t("collection.premiumFeatureDesc")}</Text>
            </View>
          </Pressable>
        </UpgradeCta>
      )}

      {f.collections.length === 0 ? (
        <EmptyState
          icon="rectangle-stack"
          title={t("collection.noCollections")}
          subtitle={t("collection.emptyCreateHint")}
        />
      ) : (
        <View style={styles.collectionsGrid}>
          {f.collections.map((collection: any) => (
            <Pressable
              key={collection.id}
              style={styles.collectionCard}
              onPress={() => router.push(`/collections/${collection.id}`)}
            >
              <Image
                source={{ uri: resolveImageUrl(collection.coverImageUrl ?? collection.coverImage) }}
                style={styles.collectionImage}
              />
              <View style={styles.collectionInfo}>
                <Text variant="label" numberOfLines={1}>
                  {collection.name}
                </Text>
                <View style={styles.collectionMetaRow}>
                  <Text variant="caption">
                    {t("collection.vehicleCountSuffix", { count: collection.itemCount || 0 })}
                  </Text>
                  {!collection.isPublic && (
                    <Badge variant="outline" size="sm">
                      {t("collection.isPrivate")}
                    </Badge>
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </PageShell>
  );
}

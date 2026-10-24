import { View } from "react-native";
import { gridCellStyle, useGridColumns } from "@/ui";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { PageShell } from "@/components/common/PageShell";
import { AuthGatePage } from "@/components/common/AuthGatePage";
import { RowListSkeleton } from "@/components/common/RowListSkeleton";
import { useLikedCollections } from "./_hooks/useLikedCollections";
import { styles } from "./_lib/styles";
import { LikedCollectionCard } from "./_components/LikedCollectionCard";

/** Liked collections: PageShell (skeleton / error + retry / empty state) + a card grid (2 columns on phones, more on tablets). */
export default function LikedCollectionsScreen() {
  const { t } = useTranslation();
  const f = useLikedCollections();
  const columns = useGridColumns();

  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)");
  const title = t("mobile.settingsLikedCollections");

  if (!f.isAuthenticated) {
    return (
      <AuthGatePage
        title={title}
        onBack={back}
        emptyTitle={t("collection.authGateTitle")}
        icon="heart"
        subtitle={t("collection.likedLoginSubtitle")}
      />
    );
  }

  const isEmpty = !f.isLoading && !f.error && f.collections.length === 0;

  return (
    <PageShell
      title={title}
      onBack={back}
      // Card grid: full width on tablets (more columns), not the readable form width.
      contentWidth="full"
      loading={f.isLoading}
      loadingFallback={<RowListSkeleton rows={4} />}
      error={f.error ? true : undefined}
      errorTitle={t("common.error")}
      errorMessage={t("collection.likedLoadErrorDesc")}
      onRetry={() => f.refetch()}
      empty={isEmpty}
      emptyState={{
        icon: "rectangle-stack",
        title: t("collection.noLikedCollections"),
        subtitle: t("collection.likedEmptySubtitle"),
        actionLabel: t("collection.exploreCollections"),
        onAction: () => router.push("/collections"),
      }}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
    >
      <View style={styles.collectionsGrid}>
        {f.collections.map((collection, index) => (
          <LikedCollectionCard
            key={collection.id}
            collection={collection}
            f={f}
            style={gridCellStyle(index, columns)}
          />
        ))}
      </View>
    </PageShell>
  );
}

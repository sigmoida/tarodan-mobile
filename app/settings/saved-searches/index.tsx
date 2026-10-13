import { Alert, Button, EmptyState, Text } from "@/ui";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSavedSearches } from "./_hooks/useSavedSearches";
import UpgradeCta from "@/components/UpgradeCta";
import { AuthGatePage } from "@/components/common/AuthGatePage";
import { PageShell } from "@/components/common/PageShell";
import { RowListSkeleton } from "@/components/common/RowListSkeleton";
import { styles } from "./_lib/styles";
import { SavedSearchCard } from "./_components/SavedSearchCard";

/** Kayıtlı aramalar — PageShell (Skeleton) + web Card'ları; limit uyarısı Alert, boşken EmptyState. */
export default function SavedSearchesScreen() {
  const { t } = useTranslation();
  const f = useSavedSearches();

  if (!f.isAuthenticated) {
    return (
      <AuthGatePage
        title={t("mobile.settingsSavedSearches")}
        emptyTitle={t("savedSearch.title")}
        icon="magnifying-glass"
        subtitle={t("savedSearch.loginSubtitle")}
      />
    );
  }

  const nearLimit =
    f.maxSavedSearches !== -1 && f.searches.length >= f.maxSavedSearches - 1;

  return (
    <PageShell
      title={t("mobile.settingsSavedSearches")}
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
      right={
        <Text style={styles.headerCount}>
          {f.searches.length}/{f.maxSavedSearches === -1 ? "∞" : f.maxSavedSearches}
        </Text>
      }
      loading={f.isLoading}
      loadingFallback={<RowListSkeleton rows={4} />}
    >
      {/* Limit Info */}
      {nearLimit && (
        <Alert variant="warning">
          <Text variant="bodySm" tone="warning">
            {f.searches.length >= f.maxSavedSearches
              ? t("savedSearch.limitReached")
              : t("savedSearch.remainingSearches", { count: f.maxSavedSearches - f.searches.length })}
          </Text>
          {/* iOS'ta satın alma yok (Guideline 3.1.1); düğme yalnız Android/web'de render edilir. */}
          <UpgradeCta>
            <Button
              variant="link"
              size="sm"
              title={t("membership.premium")}
              onPress={() => router.push("/upgrade")}
            />
          </UpgradeCta>
        </Alert>
      )}

      {f.searches.length === 0 ? (
        <EmptyState
          icon="magnifying-glass"
          title={t("savedSearch.emptyTitle")}
          subtitle={t("savedSearch.emptySubtitle")}
          actionLabel={t("savedSearch.goToSearch")}
          onAction={() => router.push("/(tabs)/search")}
        />
      ) : (
        f.searches.map((search) => (
          <SavedSearchCard key={search.id} search={search} f={f} />
        ))
      )}
    </PageShell>
  );
}

import { View, ScrollView, TouchableOpacity } from "react-native";
import { Button, Spinner, Text, ScreenHeader, theme } from "@/ui";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSavedSearches } from "./_hooks/useSavedSearches";
import { styles } from "./_lib/styles";
import { SavedSearchCard } from "./_components/SavedSearchCard";

const { colors } = theme;

export default function SavedSearchesScreen() {
  const { t } = useTranslation();
  const f = useSavedSearches();

  if (!f.isAuthenticated) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons
          name="search-outline"
          size={64}
          color={colors.primary[600]!}
        />
        <Text variant="h3" style={styles.title}>
          {t("savedSearch.title")}
        </Text>
        <Text variant="body" style={styles.subtitle}>
          {t("savedSearch.loginSubtitle")}
        </Text>
        <Button
          variant="primary"
          title={t("common.login")}
          onPress={() => router.push("/(auth)/login")}
          style={{ alignSelf: "center" }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("mobile.settingsSavedSearches")}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
        right={
          <Text style={styles.headerCount}>
            {f.searches.length}/
            {f.maxSavedSearches === -1 ? "∞" : f.maxSavedSearches}
          </Text>
        }
      />

      {/* Limit Info */}
      {f.maxSavedSearches !== -1 &&
        f.searches.length >= f.maxSavedSearches - 1 && (
          <View style={styles.limitBanner}>
            <Ionicons
              name="information-circle"
              size={20}
              color={colors.warning[600]!}
            />
            <Text style={styles.limitText}>
              {f.searches.length >= f.maxSavedSearches
                ? t("savedSearch.limitReached")
                : t("savedSearch.remainingSearches", { count: f.maxSavedSearches - f.searches.length })}
            </Text>
            <TouchableOpacity onPress={() => router.push("/upgrade")}>
              <Text style={styles.upgradeLink}>{t("membership.premium")}</Text>
            </TouchableOpacity>
          </View>
        )}

      {f.isLoading ? (
        <View style={styles.loadingContainer}>
          <Spinner size="lg" />
        </View>
      ) : f.searches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="search-outline"
            size={80}
            color={colors.text.subtle}
          />
          <Text variant="h3" style={styles.emptyTitle}>
            {t("savedSearch.emptyTitle")}
          </Text>
          <Text variant="body" style={styles.emptySubtitle}>
            {t("savedSearch.emptySubtitle")}
          </Text>
          <Button
            variant="primary"
            title={t("savedSearch.goToSearch")}
            onPress={() => router.push("/(tabs)/search")}
            style={{ alignSelf: "center" }}
          />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {f.searches.map((search) => (
            <SavedSearchCard key={search.id} search={search} f={f} />
          ))}
          <View style={{ height: 50 }} />
        </ScrollView>
      )}
    </View>
  );
}

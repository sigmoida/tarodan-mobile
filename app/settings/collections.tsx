import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
} from "react-native";
import {
  FAB,
  Snackbar,
  Spinner,
  Text,
  theme,
  ScreenHeader,
} from "@/ui";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { qk } from "@/lib/query";
import { useAuthStore } from "@/stores/authStore";
import { useTranslation } from "react-i18next";
import { resolveImageUrl } from "@/utils/imageUrl";
import { styles } from './_collections/_lib/styles';

const { colors, radius } = theme;

// Mock collections for demo when API fails
export default function CollectionsScreen() {
  const { t } = useTranslation();
  const { limits, isAuthenticated } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: "" });

  const canCreateCollections = limits?.canCreateCollections || false;

  const {
    data: collectionsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: qk.collections.mine,
    queryFn: async () => {
      try {
        const response = await api.get("/collections/me");
        // API şekli: { collections, total, page, pageSize }
        return (
          response.data?.collections ??
          response.data?.data ??
          (Array.isArray(response.data) ? response.data : [])
        );
      } catch (error) {
        console.log("Koleksiyonlar yüklenemedi");
        return [];
      }
    },
    enabled: isAuthenticated,
  });

  const collections = Array.isArray(collectionsData) ? collectionsData : [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCreateCollection = () => {
    if (!canCreateCollections) {
      setSnackbar({
        visible: true,
        message: "Koleksiyon oluşturmak için Premium üyelik gerekiyor",
      });
      setTimeout(() => router.push("/upgrade"), 1500);
      return;
    }
    router.push("/collections/new");
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("mobile.settingsCollections")}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary[600]!]}
          />
        }
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="car-sport" size={32} color={colors.primary[600]!} />
          <View style={styles.infoBannerText}>
            <Text style={styles.infoBannerTitle}>Dijital Garaj</Text>
            <Text style={styles.infoBannerDesc}>
              Koleksiyonlarınızı oluşturun, düzenleyin ve dünyayla paylaşın.
            </Text>
          </View>
        </View>

        {/* Premium Notice if not premium */}
        {!canCreateCollections && (
          <TouchableOpacity
            style={styles.premiumNotice}
            onPress={() => router.push("/upgrade")}
          >
            <Ionicons name="diamond" size={24} color={colors.warning[500]!} />
            <View style={styles.premiumNoticeText}>
              <Text style={styles.premiumNoticeTitle}>Premium Özellik</Text>
              <Text style={styles.premiumNoticeDesc}>
                Koleksiyon oluşturma özelliği Premium üyelere özeldir.
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.text.muted}
            />
          </TouchableOpacity>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Spinner size="lg" />
          </View>
        ) : (
          <>
            {/* Collections Grid */}
            <View style={styles.collectionsGrid}>
              {collections.map((collection: any) => (
                <TouchableOpacity
                  key={collection.id}
                  style={styles.collectionCard}
                  onPress={() => router.push(`/collections/${collection.id}`)}
                >
                  <Image
                    source={{
                      uri: resolveImageUrl(
                        collection.coverImageUrl ?? collection.coverImage,
                      ),
                    }}
                    style={styles.collectionImage}
                  />
                  <View style={styles.collectionOverlay}>
                    {!collection.isPublic && (
                      <View style={styles.privateBadge}>
                        <Ionicons
                          name="lock-closed"
                          size={12}
                          color={colors.white}
                        />
                      </View>
                    )}
                  </View>
                  <View style={styles.collectionInfo}>
                    <Text style={styles.collectionName} numberOfLines={1}>
                      {collection.name}
                    </Text>
                    <Text style={styles.collectionMeta}>
                      {collection.itemCount || 0} araç
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Empty State */}
            {collections.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons
                  name="albums-outline"
                  size={64}
                  color={colors.text.subtle}
                />
                <Text style={styles.emptyTitle}>Henüz koleksiyon yok</Text>
                <Text style={styles.emptyDesc}>
                  İlk koleksiyonunuzu oluşturmak için + butonuna tıklayın
                </Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {canCreateCollections && (
        <FAB
          icon="add"
          accessibilityLabel="Yeni koleksiyon oluştur"
          style={styles.fab}
          onPress={handleCreateCollection}
        />
      )}

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={2000}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}


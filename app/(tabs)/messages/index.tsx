/**
 * Mesajlar sekmesi — D1b REFERANS EKRANI (sekme kökü): AppShell (başlıklı beyaz bar) +
 * liste; yükleniyor = Skeleton, boş/misafir = EmptyState.
 * Mantık `_hooks/useMessagesTab`'de; ekran yalnız kompozisyon.
 */
import { RefreshControl, View } from "react-native";
import Animated from "react-native-reanimated";
import { tabDiag } from "@/components/_tabDiag";
import { AppShell } from "@/components/shell/AppShell";
import { useTabBarInset } from "@/components/shell/tabBarLayout";
import { useTabBarScrollHandler } from "@/components/shell/TabBarCollapse";
import {
  Alert,
  EmptyState,
  SkeletonAvatar,
  SkeletonText,
  theme,
} from "@/ui";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMessagesTab } from "./_hooks/useMessagesTab";
import { styles } from "./_lib/styles";
import { ThreadRow } from "./_components/ThreadRow";

const { colors } = theme;
const SKELETON_ROWS = [0, 1, 2, 3, 4];

function MessagesTabScreen() {
  const { t } = useTranslation();
  const f = useMessagesTab();
  const tabInset = useTabBarInset();
  const tabScroll = useTabBarScrollHandler();

  if (!f.isAuthenticated) {
    return (
      <AppShell variant="title" title={t("mobile.messagesTitle")}>
        <EmptyState
          fullscreen
          icon="chat-bubble-left-right"
          title={t("mobile.messagesTitle")}
          subtitle={t("message.loginToView")}
          actionLabel={t("common.login")}
          onAction={() => router.push("/(auth)/login")}
        />
      </AppShell>
    );
  }

  // İlk yükleme bitene dek iskelet; boş ekran bir an çakmasın.
  const initialLoading = f.threads.length === 0 && (f.isLoading || !f.hasLoadedThreads);

  // Günlük mesaj hakkı uyarısı yalnız sınıra yaklaşınca çıkar; başlık üst barda.
  const header =
    f.dailyNearLimit && f.messageLimit != null && f.dailyMessageCount != null ? (
      <View style={styles.listHeader}>
        <Alert variant="warning">
          {t("message.dailyMessageCount", { count: f.dailyMessageCount, limit: f.messageLimit })}
        </Alert>
      </View>
    ) : null;

  return (
    <AppShell variant="title" title={t("mobile.messagesTitle")}>
      <Animated.FlatList
        {...tabScroll}
        scrollEventThrottle={16}
        data={initialLoading ? [] : f.threads}
        keyExtractor={(thread) => thread.id}
        ListHeaderComponent={header}
        ListEmptyComponent={
          initialLoading ? (
            <View style={styles.skeletonList} testID="messages-skeleton">
              {SKELETON_ROWS.map((i) => (
                <View key={i} style={styles.skeletonRow}>
                  <SkeletonAvatar />
                  <View style={styles.skeletonText}>
                    <SkeletonText lines={2} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="chat-bubble-left-ellipsis"
              title={t("message.noMessagesYet")}
              subtitle={t("message.startConversationShort")}
            />
          )
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: tabInset }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={f.refreshing}
            onRefresh={f.onRefresh}
            colors={[colors.primary[600]]}
            tintColor={colors.primary[600]}
          />
        }
        renderItem={({ item }) => <ThreadRow thread={item} f={f} />}
      />
    </AppShell>
  );
}

export default tabDiag("messages", MessagesTabScreen);

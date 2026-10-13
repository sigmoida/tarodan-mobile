/**
 * Mesajlar sekmesi — D1b REFERANS EKRANI (sekme kökü): AppShell (turuncu marka barı) +
 * içerikte PageHeader + arama + liste; yükleniyor = Skeleton, boş/misafir = EmptyState.
 * Mantık `_hooks/useMessagesTab`'de; ekran yalnız kompozisyon.
 */
import { FlatList, RefreshControl, View } from "react-native";
import { tabDiag } from "@/components/_tabDiag";
import { AppShell } from "@/components/shell/AppShell";
import {
  Alert,
  Badge,
  EmptyState,
  Input,
  PageHeader,
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

  if (!f.isAuthenticated) {
    return (
      <AppShell>
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

  const header = (
    <View style={styles.listHeader}>
      <PageHeader
        title={t("mobile.messagesTitle")}
        badge={f.unreadCount > 0 ? <Badge variant="danger" appearance="solid" size="sm">{f.unreadCount}</Badge> : null}
      />
      {f.dailyNearLimit && f.messageLimit != null && f.dailyMessageCount != null ? (
        <Alert variant="warning">
          {t("message.dailyMessageCount", { count: f.dailyMessageCount, limit: f.messageLimit })}
        </Alert>
      ) : null}
      <Input
        placeholder={t("mobile.searchInMessages")}
        value={f.searchQuery}
        onChangeText={f.setSearchQuery}
        leftIconName="magnifying-glass"
        containerStyle={styles.search}
      />
    </View>
  );

  return (
    <AppShell>
      <FlatList
        data={initialLoading ? [] : f.filteredThreads}
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
              title={f.searchQuery ? t("common.noResults") : t("message.noMessagesYet")}
              subtitle={
                f.searchQuery ? t("message.tryDifferentSearch") : t("message.startConversationShort")
              }
            />
          )
        }
        contentContainerStyle={styles.listContent}
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

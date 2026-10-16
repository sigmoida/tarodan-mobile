/**
 * Mesajlar — yığın ekranı (sekme köklerinin üst barındaki Mesajlar düğmesinden ve `/messages` derin
 * bağlantısından açılır): PageShell (geri oklu yüzen bar) + sohbet listesi; yükleniyor = Skeleton,
 * boş/misafir = EmptyState, çekip yenileme. Mantık `_hooks/useMessagesTab`'de; ekran yalnız kompozisyon.
 */
import { useCallback } from "react";
import { RefreshControl, View } from "react-native";
import Animated from "react-native-reanimated";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { listWindowing } from "@/lib/list/windowing";
import type { MessageThread } from "@/stores/messagesStore";
import { PageShell } from "@/components/common/PageShell";
import {
  Alert,
  EmptyState,
  SkeletonAvatar,
  SkeletonText,
  theme,
  usePageScrollHandler,
} from "@/ui";
import { useMessagesTab } from "./_hooks/useMessagesTab";
import { styles } from "./_lib/styles";
import { ThreadRow } from "./_components/ThreadRow";

const { colors } = theme;
const SKELETON_ROWS = [0, 1, 2, 3, 4];

const threadKey = (thread: MessageThread) => thread.id;

export default function MessagesScreen() {
  const { t } = useTranslation();
  const f = useMessagesTab();
  const page = usePageScrollHandler();
  const title = t("mobile.messagesTitle");
  // Kararlı renderItem (erken return'den ÖNCE — hook sırası sabit).
  const renderThread = useCallback(
    ({ item }: { item: MessageThread }) => <ThreadRow thread={item} f={f} />,
    [f],
  );

  if (!f.isAuthenticated) {
    return (
      <PageShell
        title={title}
        empty
        emptyState={{
          icon: "chat-bubble-left-right",
          title,
          subtitle: t("message.loginToView"),
          actionLabel: t("common.login"),
          onAction: () => router.push("/(auth)/login"),
        }}
      />
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
    <PageShell title={title} mode="list" scroll={page}>
      <Animated.FlatList
        {...page.listProps}
        testID="messages-list"
        data={initialLoading ? [] : f.threads}
        keyExtractor={threadKey}
        {...listWindowing}
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
        contentContainerStyle={page.contentStyle(styles.listContent)}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={f.refreshing}
            onRefresh={f.onRefresh}
            colors={[colors.primary[600]]}
            tintColor={colors.primary[600]}
            progressViewOffset={page.topInset}
          />
        }
        renderItem={renderThread}
      />
    </PageShell>
  );
}

import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import { ErrorState, SkeletonCard, pageListContentStyle, theme, usePageScrollHandler } from "@/ui";
import { PageShell } from "@/components/common/PageShell";
import { useAuthStore } from "@/stores/authStore";
import { useTimingValues } from "@/hooks/useTimingPolicy";
import { useTranslation } from "react-i18next";
import type { Offer, TabType } from "./_lib/types";
import { useOffers } from "./_hooks/useOffers";
import { useCommissionPreview } from "./_hooks/useCommissionPreview";
import { useOfferActions } from "./_hooks/useOfferActions";
import { OffersTabs } from "./_components/OffersTabs";
import { OffersEmpty } from "./_components/OffersEmpty";
import { OfferCard } from "./_components/OfferCard";
import { CounterOfferModal } from "./_modals/CounterOfferModal";
import { BuyerCounterModal } from "./_modals/BuyerCounterModal";

/**
 * Tekliflerim — İNCE ekran: PageShell (list modu) + sekmeler + OfferCard listesi. Sorgu
 * `useOffers`'ta, onaylı aksiyonlar `useOfferActions`'ta; karşı teklif modalları `overlay`'de.
 */
export default function OffersScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const tabFromUrl = (
    Array.isArray(params.tab) ? params.tab[0] : params.tab
  )?.toLowerCase();

  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const page = usePageScrollHandler();
  const [activeTab, setActiveTab] = useState<TabType>(
    tabFromUrl === "sent" ? "sent" : "received",
  );

  // Karşı teklif modallarının açık/kapalı durumu (server-state hook'larda).
  const [counterOffer, setCounterOffer] = useState<Offer | null>(null);
  const [buyerCounterOffer, setBuyerCounterOffer] = useState<Offer | null>(
    null,
  );

  useEffect(() => {
    if (tabFromUrl === "sent" || tabFromUrl === "received")
      setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const setTab = useCallback((tab: TabType) => {
    setActiveTab(tab);
    router.replace(`/offers?tab=${tab}`);
  }, []);

  const {
    data: offers = [],
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useOffers(activeTab, isAuthenticated);
  const estimatedNetByOfferId = useCommissionPreview(offers, activeTab);
  const { requestAccept, requestReject, requestCancel, pendingOfferIds } = useOfferActions();
  const timing = useTimingValues();

  // Stable renderItem (#75) — memoized OfferCard skips rows that didn't change.
  const renderOffer = useCallback(
    ({ item }: { item: Offer }) => (
      <OfferCard
        offer={item}
        tab={activeTab}
        estimatedNet={
          activeTab === "received" &&
          item.status === "pending" &&
          !item.buyerMustAccept
            ? estimatedNetByOfferId[item.id]
            : undefined
        }
        isPending={pendingOfferIds.has(item.id)}
        t={t}
        timing={timing}
        onAccept={requestAccept}
        onReject={requestReject}
        onCancel={requestCancel}
        onOpenCounter={setCounterOffer}
        onOpenBuyerCounter={setBuyerCounterOffer}
      />
    ),
    [
      activeTab,
      estimatedNetByOfferId,
      pendingOfferIds,
      t,
      timing,
      requestAccept,
      requestReject,
      requestCancel,
    ],
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)"));

  // İlk açılış: oturum çözülene dek tam ekran yükleniyor (yalnız burada spinner).
  if (authLoading) {
    return <PageShell title={t("offer.myOffersTitle")} onBack={back} loading loadingVariant="spinner" />;
  }

  if (!isAuthenticated) {
    return (
      <PageShell
        title={t("offer.myOffersTitle")}
        onBack={back}
        empty
        emptyState={{
          icon: "tag",
          title: t("offer.myOffersTitle"),
          subtitle: t("offer.authGateSubtitle"),
          actionLabel: t("common.login"),
          onAction: () => router.push("/(auth)/login"),
          secondaryLabel: t("auth.createAccount"),
          onSecondary: () => router.push("/(auth)/register"),
        }}
      />
    );
  }

  return (
    <PageShell
      title={t("offer.myOffersTitle")}
      onBack={back}
      mode="list"
      scroll={page}
      overlay={
        <>
          <CounterOfferModal offer={counterOffer} onClose={() => setCounterOffer(null)} />
          <BuyerCounterModal offer={buyerCounterOffer} onClose={() => setBuyerCounterOffer(null)} />
        </>
      }
    >
      <Animated.FlatList
        {...page.listProps}
        data={isLoading || isError ? [] : offers}
        keyExtractor={(item) => item.id}
        renderItem={renderOffer}
        // #82: virtualizasyon ayarı — uzun teklif listelerinde bellek/kaydırma.
        windowSize={7}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        removeClippedSubviews
        ListHeaderComponent={<OffersTabs activeTab={activeTab} onChange={setTab} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletons}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : isError ? (
            // Hatayı boş durumdan ayır: "Henüz teklif yok" bir yükleme hatasını maskelememeli.
            <ErrorState message={t("offer.loadOffersFailed")} onRetry={() => refetch()} />
          ) : (
            <OffersEmpty tab={activeTab} />
          )
        }
        contentContainerStyle={page.contentStyle([pageListContentStyle, styles.list])}
        refreshing={isRefetching}
        onRefresh={refetch}
      />
    </PageShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: theme.spacing[3] },
  skeletons: { gap: theme.spacing[3] },
});

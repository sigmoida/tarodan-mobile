import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import { ErrorState, pageListContentStyle, theme, useDelayedLoading, usePageScrollHandler, usePageContentStyle } from "@/ui";
import { PageShell } from "@/components/common/PageShell";
import { useAuthStore } from "@/stores/authStore";
import { useTimingValues } from "@/hooks/useTimingPolicy";
import { useRefresh } from "@/hooks/useRefresh";
import { useTranslation } from "react-i18next";
import type { Offer, TabType } from "./_lib/types";
import { useOffers } from "./_hooks/useOffers";
import { useCommissionPreview } from "./_hooks/useCommissionPreview";
import { useOfferActions } from "./_hooks/useOfferActions";
import { OffersTabs } from "./_components/OffersTabs";
import { OffersEmpty } from "./_components/OffersEmpty";
import { OfferCard } from "./_components/OfferCard";
import { OfferCardSkeleton } from "./_components/OfferCardSkeleton";
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

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);
  const page = usePageScrollHandler();
  // Large screens: edge to edge with the tablet gutter (src/ui/CLAUDE.md › Large screens).
  const listContentStyle = usePageContentStyle([pageListContentStyle, styles.list]);
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

  // Sekme değişimi YERİNDE: URL parametresi `setParams` ile güncellenir. Eskiden
  // `router.replace('/offers?tab=…')` her seçimde yığına yeni ekran koyup `slide_from_right`
  // animasyonunu oynatıyordu (yön sekme sırasından bağımsız, hep aynı kayma). Diğer ChipTabs
  // ekranları gibi liste anında değişir.
  const setTab = useCallback((tab: TabType) => {
    setActiveTab(tab);
    router.setParams({ tab });
  }, []);

  const {
    data: offers = [],
    isLoading,
    isError,
    refetch,
  } = useOffers(activeTab, isAuthenticated);
  // İlk yükleme iskeleti gecikmeli: <150 ms süren yüklemede hiç çizilmez (göz kırpma yok).
  const showSkeleton = useDelayedLoading(isLoading);
  // Gösterge yalnız kullanıcı çektiğinde (`isRefetching` sekme değişimi / invalidate'te de döner).
  const { refreshing, onRefresh } = useRefresh(refetch);
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
          isLoading || showSkeleton ? (
            showSkeleton ? (
              <View style={styles.skeletons} testID="offers-skeleton">
                <OfferCardSkeleton />
                <OfferCardSkeleton />
              </View>
            ) : null
          ) : isError ? (
            // Hatayı boş durumdan ayır: "Henüz teklif yok" bir yükleme hatasını maskelememeli.
            <ErrorState placement="list" message={t("offer.loadOffersFailed")} onRetry={() => refetch()} />
          ) : (
            <OffersEmpty tab={activeTab} />
          )
        }
        contentContainerStyle={page.contentStyle(listContentStyle)}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </PageShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: theme.spacing[3] },
  skeletons: { gap: theme.spacing[3] },
});

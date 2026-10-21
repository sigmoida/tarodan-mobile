import { useState, useEffect, useMemo, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
// listingsApi -> productsApi (parity migration); userApi.getMyProducts -> productsApi.getMyListings
import { productsApi as listingsApi, tradesApi, productsApi, type TradePaymentQuoteSide } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api/errorText';
import { qk, retryUnlessClientError, useAppMutation } from '@/lib/query';
import { unwrapEnvelope } from '@/utils/apiEnvelope';
import { useAuthStore } from '@/stores/authStore';
import { getProductEffectivePrice } from '@/utils/productPrice';
import { firstQueryParam, type Product } from '../_lib/types';
import { isPreselectableTarget, targetSellerOf, type TargetListing } from '../_lib/target';
import { isFetchedThisOpen, TRADE_PICKER_PAGE_SIZE, TRADE_PICKER_QUERY_OPTIONS } from '../../_lib/picker';
import { usePagedPicker } from '../../_hooks/usePagedPicker';
import { usePagedPicks } from '../../_hooks/usePagedPicks';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useRequireLegalIdentity } from '@/hooks/useLegalIdentity';
import { useRefetchStaleOnFocus } from '@/hooks/useRefetchStaleOnFocus';

/**
 * New-trade wizard controller: owns the 3-step state, the target query, the paged my/their
 * product pickers and their selections, the create-trade mutation, totals, and submit
 * validation. Lifted from the monolithic NewTradeScreen.
 */
export function useNewTrade() {
  const { t } = useTranslation();
  const { requireIdentity, isChecking: checkingIdentity } = useRequireLegalIdentity();
  const params = useLocalSearchParams<{
    listing?: string | string[];
    productId?: string | string[];
    targetProductId?: string | string[];
    targetSellerId?: string | string[];
  }>();
  /** Web: `?listing=`. The mobile product page sends `listing` + `productId`. */
  const listingId =
    firstQueryParam(params.listing) ||
    firstQueryParam(params.productId) ||
    firstQueryParam(params.targetProductId);
  const targetSellerIdParam = (firstQueryParam(params.targetSellerId) || '').trim();

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const refreshUserData = useAuthStore((s) => s.refreshUserData);
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1); // 1: Select my items, 2: Select their items, 3: Review
  const [cashAmount, setCashAmount] = useState('');
  const [cashDirection, setCashDirection] = useState<'offer' | 'request'>('offer'); // offer = I pay, request = they pay
  const [message, setMessage] = useState('');
  const [tradeAddressId, setTradeAddressId] = useState<string | null>(null);

  /** Same rule as web trades/new; the single source is `useFeatureAccess`. */
  const { canTrade } = useFeatureAccess();

  // The target listing. Also fetched when the seller id is a param (the product page sends
  // both): their side is paged, so the target may sit on a page that is not loaded yet, and is
  // then preselected from this row. Fresh on every open, like the pickers (web `useTradeTarget`).
  const targetQuery = useQuery<TargetListing | null>({
    queryKey: qk.trades.targetListing(listingId ?? ''),
    queryFn: async () => {
      const res = await listingsApi.getOne(listingId!);
      return res.data?.product || res.data?.data || res.data || null;
    },
    enabled: !!listingId && canTrade,
    ...TRADE_PICKER_QUERY_OPTIONS,
  });
  const targetProduct = targetQuery.data;
  // The row of this open (not an older open's cached copy): only it may preselect the target.
  const targetRowFresh = isFetchedThisOpen(targetQuery);

  const targetSellerId = targetSellerIdParam || targetSellerOf(targetProduct) || '';

  // My side: the server filters (`tradeOnly`, `tradeEligible`: not in an active trade, with free
  // stock), so every page is full and `meta.totalPages` counts only eligible listings. The only
  // client filter is the target listing (at most one row); without one, every listing shows.
  const myList = usePagedPicker<Product>({
    queryKey: qk.trades.myTradeable(user?.id, listingId),
    fetchPage: (page) =>
      productsApi.getMyListings({
        status: 'active',
        tradeEligible: true,
        tradeOnly: true,
        page,
        limit: TRADE_PICKER_PAGE_SIZE,
      }),
    enabled: isAuthenticated && canTrade && !!user?.id,
  });
  const myLoaded = useMemo(
    () => myList.rows.filter((p) => p.id !== listingId),
    [myList.rows, listingId],
  );
  const myPicks = usePagedPicks({
    loaded: myLoaded,
    complete: !myList.hasMore,
    ready: !myList.isLoading,
  });
  const selectedMyItems = myPicks.picked;

  // Their side: the seller's public listings open to trade. Newest first is a stable order
  // (the default relevance order moves with view counts between page fetches and can skip a
  // listing at a page boundary).
  const theirList = usePagedPicker<Product>({
    queryKey: qk.trades.sellerTradeable(user?.id, targetSellerId),
    fetchPage: (page) =>
      listingsApi.getAll({
        sellerId: targetSellerId,
        tradeOnly: true,
        status: 'active',
        sortBy: 'created_desc',
        page,
        limit: TRADE_PICKER_PAGE_SIZE,
      }),
    enabled: !!targetSellerId && canTrade,
  });
  const theirPicks = usePagedPicks({
    loaded: theirList.rows,
    complete: !theirList.hasMore,
    ready: !theirList.isLoading,
  });
  const selectedTheirItems = theirPicks.picked;

  // Back on the screen (e.g. from the "listing approved" notification): refetch both pickers.
  useRefetchStaleOnFocus([
    qk.trades.myTradeable(user?.id, listingId),
    qk.trades.sellerTradeable(user?.id, targetSellerId),
  ]);

  // Preselect the target listing once per target, when it first shows up, and ADD it to what
  // the user already picked. The list refetches on open, focus and foreground: the guard keeps
  // a later refetch from re-adding a target the user removed, and adding (not replacing) keeps
  // a pick made while the target was still missing from a cached list. A target on a page that
  // is not loaded (the settled list has more pages) comes from its own row: the pick is pinned at
  // the top until its page loads, refreshed from the list row once it does, and pruned if every
  // page loads without it (`usePagedPicks`). A settled, complete list without it gets no pick,
  // and neither does a cached row or list from an earlier open (the listing may be sold since):
  // both sources wait for their first successful fetch of this open.
  const preselectedFor = useRef<string | null>(null);
  const addTheirPick = theirPicks.add;
  const theirListFresh = theirList.fetchedThisOpen;
  const theirMayHoldTarget = !theirList.isLoading && theirList.hasMore && targetRowFresh;
  useEffect(() => {
    if (!listingId || preselectedFor.current === listingId || !theirListFresh) return;
    const target =
      theirList.rows.find((p) => p.id === listingId) ??
      (theirMayHoldTarget && isPreselectableTarget(targetProduct, listingId, targetSellerId)
        ? targetProduct
        : undefined);
    if (target) {
      preselectedFor.current = listingId;
      addTheirPick(target);
    }
  }, [listingId, theirListFresh, theirList.rows, theirMayHoldTarget, targetProduct, targetSellerId, addTheirPick]);

  const invalidateTradeRelatedQueries = () => {
    queryClient.invalidateQueries({ queryKey: qk.trades.all });
    queryClient.invalidateQueries({ queryKey: qk.trades.myTradeableAll });
    queryClient.invalidateQueries({ queryKey: qk.trades.sellerTradeableAll });
    queryClient.invalidateQueries({ queryKey: qk.products.all });
    queryClient.invalidateQueries({ queryKey: qk.products.detailAll });
    queryClient.invalidateQueries({ queryKey: qk.products.searchAll });
    queryClient.invalidateQueries({ queryKey: qk.products.myListingsAll });
  };

  const createTradeMutation = useAppMutation(
    async () => {
      const cashVal = parseFloat(cashAmount.replace(',', '.')) || 0;
      let finalCash: number | undefined;
      if (cashVal > 0) {
        finalCash = cashDirection === 'offer' ? cashVal : -cashVal;
      }
      return tradesApi.create({
        receiverId: targetSellerId,
        initiatorItems: selectedMyItems.map((p) => ({ productId: p.id, quantity: 1 })),
        receiverItems: selectedTheirItems.map((p) => ({ productId: p.id, quantity: 1 })),
        cashAmount: finalCash,
        message: message.trim() || undefined,
        shippingAddressId: tradeAddressId || undefined,
      });
    },
    {
      error: t('trade.sendFailed'),
      onSuccess: () => {
        invalidateTradeRelatedQueries();
        // The screen changes first, then the toast: no waiting.
        router.replace('/trades');
        toast.success(t('trade.tradeSent'));
      },
      // The toast comes from `useAppMutation`; here only refresh the permissions when the
      // membership has no trade feature.
      onError: async (error) => {
        const msg = apiErrorMessage(error, t('trade.sendFailed'));
        if (
          msg.includes('Takas özelliği') ||
          msg.includes('üyeliğinizde mevcut değil') ||
          msg.includes('takas özelliğine sahip değil')
        ) {
          await refreshUserData();
        }
      },
    },
  );

  const myTotal = selectedMyItems.reduce((sum, p) => sum + getProductEffectivePrice(p), 0);
  const theirTotal = selectedTheirItems.reduce((sum, p) => sum + getProductEffectivePrice(p), 0);
  const cashValue = parseFloat(cashAmount.replace(',', '.')) || 0;
  const cashPayer: 'initiator' | 'receiver' = cashDirection === 'offer' ? 'initiator' : 'receiver';

  /**
   * Live cost of the unsaved offer. It is priced again whenever the item selection or the
   * cash difference changes; the amounts are ESTIMATES and lock at acceptance. The server
   * silently skips an unknown or deleted productId; the client does not filter.
   */
  const previewQuery = useQuery({
    queryKey: qk.trades.previewQuote(
      selectedMyItems.map((p) => p.id),
      selectedTheirItems.map((p) => p.id),
      cashValue,
      cashPayer,
    ),
    queryFn: async () => {
      const res = await tradesApi.previewPaymentQuote({
        initiatorItems: selectedMyItems.map((p) => ({ productId: p.id, quantity: 1 })),
        receiverItems: selectedTheirItems.map((p) => ({ productId: p.id, quantity: 1 })),
        ...(cashValue > 0 ? { cashAmount: cashValue, cashPayer } : {}),
      });
      return unwrapEnvelope<{ initiator: TradePaymentQuoteSide; receiver: TradePaymentQuoteSide }>(res);
    },
    enabled: selectedMyItems.length > 0 && selectedTheirItems.length > 0,
    staleTime: 30_000,
    retry: retryUnlessClientError,
  });
  const costPreview = previewQuery.data ?? null;

  const toggleMyItem = (product: Product) => myPicks.toggle(product.id);
  const toggleTheirItem = (product: Product) => theirPicks.toggle(product.id);

  const handleSubmit = async () => {
    const cashVal = parseFloat(cashAmount.replace(',', '.')) || 0;
    if (selectedMyItems.length === 0 && cashVal <= 0) {
      toast.error(t('trade.selectAtLeastOne'));
      return;
    }
    if (selectedTheirItems.length === 0) {
      toast.error(t('trade.selectAtLeastOneWant'));
      return;
    }
    if (!tradeAddressId) {
      toast.error(t('trade.selectDeliveryAddress'));
      return;
    }
    // B-2.4: legal identity before the trade starts; if the user gives up, no offer is sent.
    if (!(await requireIdentity())) return;
    createTradeMutation.mutate();
  };

  return {
    canTrade,
    isAuthenticated,
    step,
    setStep,
    selectedMyItems,
    selectedTheirItems,
    cashAmount,
    setCashAmount,
    cashDirection,
    setCashDirection,
    message,
    setMessage,
    setTradeAddressId,
    /** My pickable listings: the loaded pages, picks that left them (more pages exist) pinned first. */
    myProducts: myPicks.rows,
    loadingMyProducts: myList.isLoading,
    myHasMore: myList.hasMore,
    myLoadingMore: myList.isLoadingMore,
    loadMoreMine: myList.loadMore,
    theirProducts: theirPicks.rows,
    loadingTheirProducts: theirList.isLoading,
    theirHasMore: theirList.hasMore,
    theirLoadingMore: theirList.isLoadingMore,
    loadMoreTheirs: theirList.loadMore,
    createTradeMutation,
    /** Submitting: the identity check or the trade request. */
    submitPending: checkingIdentity || createTradeMutation.isPending,
    myTotal,
    theirTotal,
    cashValue,
    costPreview,
    toggleMyItem,
    toggleTheirItem,
    handleSubmit,
  };
}

export type NewTradeController = ReturnType<typeof useNewTrade>;

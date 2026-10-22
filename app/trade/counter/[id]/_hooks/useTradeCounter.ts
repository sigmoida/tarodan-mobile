import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { appAlert, toast } from '@/ui';
import { tradesApi, productsApi } from '@/lib/api';
import { qk, useAppMutation } from '@/lib/query';
import { useRefresh } from '@/hooks/useRefresh';
import { useRefetchStaleOnFocus } from '@/hooks/useRefetchStaleOnFocus';
import { useAuthStore } from '@/stores/authStore';
import { useRequireLegalIdentity } from '@/hooks/useLegalIdentity';
import { getProductEffectivePrice } from '@/utils/productPrice';
import { TRADE_PICKER_PAGE_SIZE } from '../../../_lib/picker';
import { usePagedPicker } from '../../../_hooks/usePagedPicker';
import { usePagedPicks } from '../../../_hooks/usePagedPicks';
import { negotiatedAmountIssueText } from '@/utils/negotiatedAmount';
import { useCashAmount } from '../../../_hooks/useCashAmount';
import { cashInputValue, parseCashAmount, signedCashAmount, type CashDirection } from '../../../_lib/cash';
import { offerSignature, type Trade, type TradeItem } from '../_lib/types';
import { mergeTradeItems, type CounterProduct } from '../_lib/counterProducts';

/** Stable fallback: the merged picker lists memoise on the item arrays. */
const NO_ITEMS: TradeItem[] = [];

/**
 * Counter-offer controller: owns the trade query, the paged my/their pickers and their
 * selections, the initial-selection sync effect, the change-detection signature, and the
 * counter mutation. Lifted from the monolithic TradeCounterScreen.
 */
export function useTradeCounter() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { requireIdentity, isChecking: checkingIdentity } = useRequireLegalIdentity();

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/trades');
  };

  const tradeQuery = useQuery<Trade | null>({
    queryKey: qk.trades.detail(String(id ?? '')),
    queryFn: async () => {
      if (!id) return null;
      const response = await tradesApi.getOne(id);
      return response.data?.data ?? response.data ?? null;
    },
    enabled: !!id,
  });

  const trade = tradeQuery.data;

  const { cashAmount, cashRefused, cashIssue, changeCashText, resetCashAmount } = useCashAmount();
  const [cashDirection, setCashDirection] = useState<CashDirection>('offer');
  const [message, setMessage] = useState('');
  const [initializedId, setInitializedId] = useState<string | null>(null);
  const [initialSig, setInitialSig] = useState('');

  // My side: is the current user the initiator or the receiver of the trade?
  const amIInitiator = !!trade && user?.id === trade.initiatorId;
  const mySide = (amIInitiator ? trade?.initiatorItems : trade?.receiverItems) ?? NO_ITEMS;
  const theirSide = (amIInitiator ? trade?.receiverItems : trade?.initiatorItems) ?? NO_ITEMS;
  const otherPartyId = amIInitiator ? trade?.receiverId : trade?.initiatorId;

  // Both pickers page through the API ("Show more"); the server filters (`tradeOnly`), so the
  // only client work is merging in the items already in the trade (they stay pickable whatever
  // their status). Same loading rule as the web counter editor (`untilFresh`): a cached list from
  // an earlier open is not pickable until this open's fetch settles.
  // My side: counter validation accepts any own active item, so no `tradeEligible` here.
  const myList = usePagedPicker<CounterProduct>({
    queryKey: qk.trades.myTradeableForCounter(user?.id),
    fetchPage: (page) =>
      productsApi.getMyListings({
        status: 'active',
        tradeOnly: true,
        page,
        limit: TRADE_PICKER_PAGE_SIZE,
      }),
    enabled: !!user?.id,
    untilFresh: true,
  });
  // Their side: newest first is a stable order (the default relevance order moves with view
  // counts between page fetches and can skip a listing at a page boundary).
  const theirList = usePagedPicker<CounterProduct>({
    queryKey: qk.trades.sellerTradeableForCounter(user?.id, otherPartyId),
    fetchPage: (page) =>
      productsApi.getAll({
        sellerId: otherPartyId,
        status: 'active',
        tradeOnly: true,
        sortBy: 'created_desc',
        page,
        limit: TRADE_PICKER_PAGE_SIZE,
      }),
    enabled: !!otherPartyId,
    untilFresh: true,
  });

  const myLoaded = useMemo(
    // The want side of the original trade is never one of my own listings; the guard keeps the
    // exclusion of the target.
    () => mergeTradeItems(mySide, myList.rows, theirSide[0]?.productId),
    [mySide, myList.rows, theirSide],
  );
  const theirLoaded = useMemo(() => mergeTradeItems(theirSide, theirList.rows), [theirSide, theirList.rows]);

  // A pick that left a refreshed list (sold, deactivated, offered elsewhere) drops out instead
  // of being sent and rejected by the API; one that only moved onto a page not loaded yet stays,
  // pinned at the top (`usePagedPicks`).
  const myPicks = usePagedPicks({ loaded: myLoaded, complete: !myList.hasMore, ready: !myList.isLoading });
  const theirPicks = usePagedPicks({
    loaded: theirLoaded,
    complete: !theirList.hasMore,
    ready: !theirList.isLoading,
  });
  const selectedMine = myPicks.picked;
  const selectedTheirs = theirPicks.picked;
  const selectMine = myPicks.select;
  const selectTheirs = theirPicks.select;

  // Back on the screen (e.g. from a notification): refetch both pickers.
  useRefetchStaleOnFocus([
    qk.trades.myTradeableForCounter(user?.id),
    qk.trades.sellerTradeableForCounter(user?.id, otherPartyId),
  ]);

  // On the first load (and when another trade opens) copy the trade's current items into the
  // selections. The trade's items are always in the merged lists, so `select` finds them.
  useEffect(() => {
    if (!trade || initializedId === trade.id) return;
    selectMine(mySide.map((item) => item.productId));
    selectTheirs(theirSide.map((item) => item.productId));
    let initDir: CashDirection = 'offer';
    let initCash = '';
    if (trade.cashAmount) {
      initCash = cashInputValue(Math.abs(Number(trade.cashAmount)));
      // The direction comes from cashPayerId (the backend stores the cash amount as an
      // absolute value): if I am the payer it is 'offer' (I pay), otherwise 'request'
      // (the other party pays).
      initDir = trade.cashPayerId && user?.id
        ? (trade.cashPayerId === user.id ? 'offer' : 'request')
        : 'offer';
    }
    // Always, so another trade opening here starts from its own amount, with no refusal left
    // over from the previous one (and the same amount `initialSig` is built from).
    resetCashAmount(initCash);
    setCashDirection(initDir);
    setInitialSig(offerSignature(mySide, theirSide, initDir, initCash));
    setInitializedId(trade.id);
  }, [trade, initializedId, user, mySide, theirSide, selectMine, selectTheirs, resetCashAmount]);

  // A picker whose first load failed has nothing to pick from (web closes the editor with
  // `collection.productsLoadFailed`); the screen shows its error state with a retry instead.
  // A failed refetch or "Show more" keeps the loaded pages and the picks (`loadFailed` is false).
  const pickersFailed = myList.loadFailed || theirList.loadFailed;
  const retryPickers = () => {
    if (myList.loadFailed) void myList.refetch();
    if (theirList.loadFailed) void theirList.refetch();
  };

  const { refreshing, onRefresh } = useRefresh(
    tradeQuery.refetch,
    myList.refetch,
    theirList.refetch,
  );

  const counterMutation = useAppMutation(
    async () => {
      return tradesApi.counter(id!, {
        // Backend "Model B": a counter offer swaps the roles; the items I give (I am the one
        // countering) become initiatorItems and the ones I want become receiverItems.
        initiatorItems: selectedMine.map((p) => ({ productId: p.id, quantity: 1 })),
        receiverItems: selectedTheirs.map((p) => ({ productId: p.id, quantity: 1 })),
        // Left out when there is no amount (never 0 / -0), as on web.
        cashAmount: signedCashAmount(cashAmount, cashDirection),
        message: message || undefined,
      });
    },
    {
      invalidates: [qk.trades.detail(id!), qk.trades.all],
      error: t('trade.counterOfferFailed'),
      onSuccess: () => {
        // The screen changes first, then the toast: no waiting.
        router.replace(`/trade/${id}`);
        toast.success(t('trade.counterOfferSent'));
      },
    },
  );

  const myTotal = selectedMine.reduce((sum, p) => sum + getProductEffectivePrice(p), 0);
  const theirTotal = selectedTheirs.reduce((sum, p) => sum + getProductEffectivePrice(p), 0);
  const cashValue = parseCashAmount(cashAmount) ?? 0;

  const toggleMine = (p: CounterProduct) => myPicks.toggle(p.id);
  const toggleTheirs = (p: CounterProduct) => theirPicks.toggle(p.id);

  const handleSubmit = async () => {
    // Web refuses to send while the cash field holds a refused amount. Here the field keeps the
    // last sendable text instead ("1.000" stops at "1.00"), so the refusal itself blocks:
    // otherwise 1 TL would go out for one thousand. Cleared by the next accepted change. An
    // amount above the API's ceiling blocks too, until it is lowered (`cashIssue`).
    if (cashIssue) {
      toast.error(negotiatedAmountIssueText(cashIssue, t));
      return;
    }
    // The API wants at least 1 item on both sides (CounterTradeDto ArrayMinSize(1)); same rule as web.
    if (selectedMine.length === 0 || selectedTheirs.length === 0) {
      toast.error(t('trade.selectAtLeastOneOffer'));
      return;
    }
    const currentSig = offerSignature(selectedMine, selectedTheirs, cashDirection, cashAmount);
    if (currentSig === initialSig) {
      appAlert(
        t('trade.noChangesTitle'),
        t('trade.counterOfferIdentical'),
      );
      return;
    }
    // B4: a counter offer (with cash or not) is a new trade offer: same rule as starting one,
    // legal identity first. If the user gives up, no offer is sent.
    if (!(await requireIdentity())) return;
    counterMutation.mutate();
  };

  return {
    id,
    trade,
    tradeQuery,
    initializedId,
    handleBack,
    /** My pickable listings: the trade's own items first, then the loaded pages. */
    myProducts: myPicks.rows,
    theirProducts: theirPicks.rows,
    loadingMyProducts: myList.isLoading,
    loadingTheirProducts: theirList.isLoading,
    myHasMore: myList.hasMore,
    myLoadingMore: myList.isLoadingMore,
    loadMoreMine: myList.loadMore,
    theirHasMore: theirList.hasMore,
    theirLoadingMore: theirList.isLoadingMore,
    loadMoreTheirs: theirList.loadMore,
    pickersFailed,
    retryPickers,
    selectedMine,
    selectedTheirs,
    cashAmount,
    cashRefused,
    cashIssue,
    changeCashText,
    cashDirection,
    setCashDirection,
    message,
    setMessage,
    amIInitiator,
    myTotal,
    theirTotal,
    cashValue,
    toggleMine,
    toggleTheirs,
    handleSubmit,
    counterMutation,
    /** Submitting: the identity check or the counter-offer request. */
    submitPending: checkingIdentity || counterMutation.isPending,
    refreshing,
    onRefresh,
  };
}

export type TradeCounterController = ReturnType<typeof useTradeCounter>;

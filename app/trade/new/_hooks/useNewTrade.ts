import { useState, useEffect } from 'react';
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
import { isPickerLoading, TRADE_PICKER_QUERY_OPTIONS } from '../../_lib/picker';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useRequireLegalIdentity } from '@/hooks/useLegalIdentity';

/**
 * New-trade wizard controller — owns the 3-step state, the target/my/their
 * product queries, the create-trade mutation, item toggles, totals, and submit
 * validation. Lifted verbatim from the monolithic NewTradeScreen.
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
  /** Web: `?listing=` — mobil ürün sayfası `listing` + `productId` gönderir */
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
  const [selectedMyItems, setSelectedMyItems] = useState<Product[]>([]);
  const [selectedTheirItems, setSelectedTheirItems] = useState<Product[]>([]);
  const [cashAmount, setCashAmount] = useState('');
  const [cashDirection, setCashDirection] = useState<'offer' | 'request'>('offer'); // offer = I pay, request = they pay
  const [message, setMessage] = useState('');
  const [tradeAddressId, setTradeAddressId] = useState<string | null>(null);

  /** Web trades/new ile aynı kural — tek kaynak `useFeatureAccess`. */
  const { canTrade } = useFeatureAccess();

  const { data: targetProduct } = useQuery({
    queryKey: qk.trades.targetListing(listingId ?? ''),
    queryFn: async () => {
      const res = await listingsApi.getOne(listingId!);
      return res.data?.product || res.data?.data || res.data;
    },
    enabled: !!listingId && !targetSellerIdParam && canTrade,
  });

  const targetSellerId =
    targetSellerIdParam || targetProduct?.seller?.id || targetProduct?.sellerId || '';

  const myProductsQuery = useQuery({
    queryKey: qk.trades.myTradeable(user?.id, listingId),
    queryFn: async () => {
      // tradeEligible: the backend drops listings in an active trade or without free stock
      const response = await productsApi.getMyListings({ status: 'active', tradeEligible: true });
      const raw = response.data?.data || response.data?.products || response.data || [];
      const list = Array.isArray(raw) ? raw : [];
      // The target listing (if any) is never offered; without one, every eligible listing shows.
      return list.filter(
        (p: Product) => p.status === 'active' && p.isTradeEnabled !== false && p.id !== listingId,
      );
    },
    enabled: isAuthenticated && canTrade && !!user?.id,
    ...TRADE_PICKER_QUERY_OPTIONS,
  });
  const myProducts = myProductsQuery.data;
  const loadingMyProducts = isPickerLoading(myProductsQuery);

  const { data: theirProducts, isLoading: loadingTheirProducts } = useQuery({
    queryKey: qk.trades.sellerTradeable(targetSellerId),
    queryFn: async () => {
      const response = await listingsApi.getAll({
        sellerId: targetSellerId,
        tradeOnly: true,
        status: 'active',
      });
      const raw = response.data?.data || response.data?.products || response.data || [];
      const list = Array.isArray(raw) ? raw : [];
      return list.filter(
        (p: Product) => p.status === 'active' && p.isTradeEnabled !== false,
      );
    },
    enabled: !!targetSellerId && canTrade,
  });

  useEffect(() => {
    if (!listingId || !theirProducts?.length) return;
    const target = theirProducts.find((p: Product) => p.id === listingId);
    if (target) {
      setSelectedTheirItems((prev) => (prev.some((p) => p.id === listingId) ? prev : [target]));
    }
  }, [listingId, theirProducts]);

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
        // Önce ekran değişir, sonra toast — bekleme yok.
        router.replace('/trades');
        toast.success(t('trade.tradeSent'));
      },
      // Toast `useAppMutation`dan; burada yalnız "üyelikte takas yok" ise yetkileri tazele.
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
   * Kaydedilmemiş teklifin canlı maliyeti. Ürün seçimi veya nakit fark her
   * değiştiğinde yeniden fiyatlanır; tutarlar TAHMİNİDİR, kabul anında kilitlenir.
   * Bilinmeyen/silinmiş productId sunucuda sessizce atlanır — istemci elemez.
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

  const toggleMyItem = (product: Product) => {
    if (selectedMyItems.find((p) => p.id === product.id)) {
      setSelectedMyItems(selectedMyItems.filter((p) => p.id !== product.id));
    } else {
      setSelectedMyItems([...selectedMyItems, product]);
    }
  };

  const toggleTheirItem = (product: Product) => {
    if (selectedTheirItems.find((p) => p.id === product.id)) {
      setSelectedTheirItems(selectedTheirItems.filter((p) => p.id !== product.id));
    } else {
      setSelectedTheirItems([...selectedTheirItems, product]);
    }
  };

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
    // B-2.4: takas başlamadan yasal kimlik; vazgeçerse teklif gönderilmez.
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
    myProducts,
    loadingMyProducts,
    theirProducts,
    loadingTheirProducts,
    createTradeMutation,
    /** Gönderim sürüyor: kimlik kontrolü ya da takas isteği. */
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

import { logger, safeError } from '@/services/logger';
import i18n from '@/i18n/config';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Share } from 'react-native';
import { router } from 'expo-router';
import { navigateTo } from '@/lib/navigation/goTo';
import { appAlert, toast } from '@/ui';
import { useCartStore } from '@/stores/cartStore';
import { useCartSync } from '@/hooks/useCartSync';
import { getImageUrl as getImageUrlFromUtils } from '@/utils/imageUrl';
import { isOwnProduct } from '@/hooks/useFavoriteToggle';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { getUpgradeMessage } from '@/utils/membershipLimits';
import { asLabel, formatPrice } from '@/utils/format';
import { buildShareContent, productShareUrl } from '@/utils/share';
import { clampCartQuantity } from '../_lib/quantity';
import type { Product } from '../_lib/types';

function buildCartItem(product: Product, images: any[]) {
  return {
    productId: product.id,
    title: product.title,
    price: product.price,
    stock: product.availableQuantity ?? product.quantity ?? null,
    maxQuantityPerOrder: product.maxQuantityPerOrder ?? null,
    imageUrl:
      typeof images[0] === 'string' ? images[0] : images[0]?.url || getImageUrlFromUtils(product.images),
    brand: asLabel(product.brand, ''),
    scale: asLabel(product.scale, ''),
    seller: {
      id: product.seller?.id || 'unknown',
      // Modül seviyesindeki yardımcı — hook yok; global örnek kullanılır.
      displayName: product.seller?.displayName || i18n.t('product.seller'),
    },
  };
}

/** Ürün detay aksiyonları: sepet/hızlı-al/mesaj/takas/teklif/koleksiyon/paylaş/raporla
 * + toast + modal aç/kapa. Handler'lar ekrandan buraya taşındı.
 *
 * `product` null olabilir (ekran yüklenirken) — hook gövdesi onu deref etmez;
 * handler'lar yalnız ürün render edildikten sonra (non-null) tetiklenir, yine de
 * her biri guard'lı. */
export function useProductActions({
  product,
  productId,
  images,
  isOutOfStock,
  isAuthenticated,
  user,
}: {
  product: Product | null | undefined;
  productId: string;
  images: any[];
  isOutOfStock: boolean;
  isAuthenticated: boolean;
  user: { id?: string } | null | undefined;
}) {
  const { t } = useTranslation();
  const { canTrade } = useFeatureAccess();
  const { isInCart, setBuyNow } = useCartStore();
  // Sepet yazmaları üyede sunucuya da aynalanır.
  const cart = useCartSync();

  // Adet seçici (web QuantityStepper): yalnız stoğu 1'den fazla ilanlarda gösterilir.
  const [quantity, setQuantity] = useState(1);
  // Ürün yenilenir ve stok/tavan düşerse seçili adet tavana iner.
  const isOwnerProduct = !!product && isOwnProduct(product, user?.id);
  useEffect(() => {
    if (!product) return;
    setQuantity((q) => {
      const next = clampCartQuantity(q, product, isOwnerProduct);
      return next === q ? q : next;
    });
  }, [product, isOwnerProduct]);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const requireAuth = (message: string) => {
    if (isAuthenticated) return true;
    toast.error(message);
    setTimeout(() => router.push('/(auth)/login' as any), 1500);
    return false;
  };

  /**
   * Sepete ekle — misafirde de çalışır (web paritesi): yerel sepet store'una yazılır, üyede sunucuya
   * da aynalanır; misafir satırları girişte `useCartMergeOnLogin` ile sunucu sepetine bir kez taşınır.
   * Bilerek `requireAuth` YOK (teklif/takas/mesaj/koleksiyon/şikayet üye ister, sepet istemez).
   */
  const handleAddToCart = () => {
    if (!product) return;
    if (isOutOfStock) return toast.error(t('cart.outOfStock'));
    cart.add(buildCartItem(product, images) as any, clampCartQuantity(quantity, product, isOwnerProduct));
    toast.success(t('product.addedToCartExclaim'));
  };

  /**
   * "Hemen Al" (web `handleBuyNow`): ürün sepette değilse önce sepete eklenir (vazgeçilirse
   * kaybolmasın), sonra ödeme YALNIZ bu ürünle açılır (`?buyNow=1`); sepetin kalanı ödemeye girmez.
   * Misafir de gelir — checkout'un misafir + e-posta doğrulama akışı aynen geçerli.
   *
   * Ödenen adet SEPET SATIRININ adedidir (web gibi): ödeme sonrası satır (yerelde ve sunucuda
   * `productId` ile) bütünüyle düşüyor; seçicideki adet ödenseydi sepetteki fazlası sessizce
   * kaybolurdu. Ürün sepetteyken adet seçici zaten gizli (bar "Sepete Git" gösterir).
   */
  const handleBuyNow = () => {
    if (!product) return;
    if (isOutOfStock) return toast.error(t('cart.outOfStock'));
    const item = buildCartItem(product, images) as any;
    if (!isInCart(productId)) cart.add(item, clampCartQuantity(quantity, product, isOwnerProduct));
    const line = useCartStore.getState().items.find((i) => i.productId === productId);
    setBuyNow(item, line?.quantity ?? clampCartQuantity(quantity, product, isOwnerProduct));
    router.push('/checkout?buyNow=1' as any);
  };

  // Sepet bir SEKME: yığın ekranından `push` ikinci bir `(tabs)` iterdi (`navigateTo` → dismissTo).
  const handleGoToCart = () => navigateTo('/cart');

  const handleMessage = () => {
    if (!product) return;
    if (!requireAuth(t('product.signInToMessage'))) return;
    router.push(
      `/messages/new?sellerId=${product.seller?.id}&productId=${productId}&productTitle=${encodeURIComponent(product.title)}`,
    );
  };

  const handleTrade = () => {
    if (!product) return;
    if (!requireAuth(t('product.signInToTrade'))) return;
    if (!product.seller?.id) return toast.error(t('trade.sellerNotFound'));
    // Düğme herkese görünür (web ile aynı); üyeliği takasa izin vermeyene yalnız bilgi dialog'u —
    // mağaza kuralı gereği satın alma/yükseltme düğmesi YOK (`getUpgradeMessage` nötr metni verir).
    if (!canTrade) {
      const { title, message } = getUpgradeMessage(t, 'tradeFeature');
      appAlert(title, message);
      return;
    }
    router.push(`/trade/new?targetProductId=${productId}&targetSellerId=${product.seller.id}` as any);
  };

  const handleMakeOffer = () => {
    if (!product) return;
    if (!requireAuth(t('product.signInToOffer'))) return;
    if (product.seller?.id && user?.id === product.seller.id) {
      return toast.error(t('product.cannotOfferOwn'));
    }
    setOfferModalOpen(true);
  };

  const handleAddToCollection = () => {
    if (!requireAuth(t('product.signInToCollect'))) return;
    setCollectionModalOpen(true);
  };

  const handleShare = async () => {
    if (!product) return;
    try {
      const { content, options } = buildShareContent(
        t('product.shareText', {
          title: product.title,
          price: formatPrice(product.price),
        }),
        productShareUrl(product.id),
        product.title,
      );
      await Share.share(content, options);
    } catch (error) {
      logger.error('Share error', { err: safeError(error) });
    }
  };

  /** Ürün şikayeti: tek yüzey `ReportModal` (neden listesi + açıklama + gönderim orada). */
  const handleReport = () => {
    if (!isAuthenticated) return toast.error(t('product.signInToReport'));
    setReportOpen(true);
  };

  return {
    quantity,
    setQuantity,
    inCart: isInCart(productId),
    offerModalOpen,
    setOfferModalOpen,
    collectionModalOpen,
    setCollectionModalOpen,
    reportOpen,
    setReportOpen,
    handleAddToCart,
    handleGoToCart,
    handleBuyNow,
    handleMessage,
    handleTrade,
    handleMakeOffer,
    handleAddToCollection,
    handleShare,
    handleReport,
  };
}

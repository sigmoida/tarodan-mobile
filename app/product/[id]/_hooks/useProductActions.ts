import { logger, safeError } from '@/services/logger';
import i18n from '@/i18n/config';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Share } from 'react-native';
import { router } from 'expo-router';
import { toast } from '@/ui';
import { useCartStore } from '@/stores/cartStore';
import { useCartSync } from '@/hooks/useCartSync';
import { getImageUrl as getImageUrlFromUtils } from '@/utils/imageUrl';
import { asLabel, formatPrice } from '@/utils/format';
import { buildShareContent, productShareUrl } from '@/utils/share';
import { clampCartQuantity } from '../_lib/quantity';
import type { Product } from '../_lib/types';

type NotifyType = 'success' | 'error';

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
  const { isInCart, setBuyNow } = useCartStore();
  // Sepet yazmaları üyede sunucuya da aynalanır.
  const cart = useCartSync();

  // Adet seçici (web QuantityStepper): yalnız stoğu 1'den fazla ilanlarda gösterilir.
  const [quantity, setQuantity] = useState(1);
  // Ürün yenilenir ve stok/tavan düşerse seçili adet tavana iner.
  const isOwnerProduct = !!product?.seller?.id && user?.id === product.seller.id;
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

  /** Bilgi ve başarı mesajları toast (web react-hot-toast); hata da toast, onay isteyenler appAlert. */
  const notify = (message: string, type: NotifyType) =>
    type === 'success' ? toast.success(message) : toast.error(message);

  const requireAuth = (message: string) => {
    if (isAuthenticated) return true;
    notify(message, 'error');
    setTimeout(() => router.push('/(auth)/login' as any), 1500);
    return false;
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (isOutOfStock) return notify(t('cart.outOfStock'), 'error');
    cart.add(buildCartItem(product, images) as any, clampCartQuantity(quantity, product, isOwnerProduct));
    notify(t('product.addedToCartExclaim'), 'success');
  };

  /** Web gibi: sepetteyse çıkarır, değilse ekler. */
  const handleCartToggle = () => {
    if (!product) return;
    if (isInCart(productId)) {
      cart.removeByProductId(productId);
      notify(t('product.removedFromCart'), 'success');
      return;
    }
    handleAddToCart();
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (isOutOfStock) return notify(t('cart.outOfStock'), 'error');
    setBuyNow(buildCartItem(product, images) as any, clampCartQuantity(quantity, product, isOwnerProduct));
    router.push('/checkout?buyNow=1' as any);
  };

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
    if (!product.seller?.id) return notify(t('trade.sellerNotFound'), 'error');
    router.push(`/trade/new?targetProductId=${productId}&targetSellerId=${product.seller.id}` as any);
  };

  const handleMakeOffer = () => {
    if (!product) return;
    if (!requireAuth(t('product.signInToOffer'))) return;
    if (product.seller?.id && user?.id === product.seller.id) {
      return notify(t('product.cannotOfferOwn'), 'error');
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
    if (!isAuthenticated) return notify(t('product.signInToReport'), 'error');
    setReportOpen(true);
  };

  return {
    notify,
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
    handleCartToggle,
    handleBuyNow,
    handleMessage,
    handleTrade,
    handleMakeOffer,
    handleAddToCollection,
    handleShare,
    handleReport,
  };
}

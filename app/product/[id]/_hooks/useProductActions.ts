import { logger, safeError } from '@/services/logger';
import i18n from '@/i18n/config';
import type { MessageKey } from '@/i18n/lib';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Share } from 'react-native';
import { router } from 'expo-router';
import { appAlert, toast } from '@/ui';
import { userReportsApi } from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import { useCartSync } from '@/hooks/useCartSync';
import { getImageUrl as getImageUrlFromUtils } from '@/utils/imageUrl';
import { asLabel, formatPrice } from '@/utils/format';
import { buildShareContent, productShareUrl } from '@/utils/share';
import { clampCartQuantity } from '../_lib/quantity';
import type { Product } from '../_lib/types';

type NotifyType = 'success' | 'error';

/**
 * Rapor nedenleri — modül seviyesinde olduğu için `t` çağıramaz; katalog
 * ANAHTARI tutulur, çeviri hook'un içinde yapılır (durum haritalarıyla aynı
 * desen). 'Spam' her iki dilde de aynı, çevrilmiyor.
 */
const REPORT_REASONS: Array<{ key: string; labelKey: MessageKey | null; fallback?: string }> = [
  { key: 'spam', labelKey: null, fallback: 'Spam' },
  { key: 'fake_product', labelKey: 'product.reportReasonFake' },
  { key: 'scam', labelKey: 'report.reasonScam' },
  { key: 'counterfeit', labelKey: 'admin.reports.reason.counterfeit' },
  { key: 'wrong_category', labelKey: 'admin.reports.reason.wrongCategory' },
  { key: 'misleading_info', labelKey: 'admin.reports.reason.misleadingInfo' },
  { key: 'inappropriate_content', labelKey: 'report.reasonInappropriate' },
  { key: 'other', labelKey: 'product.other' },
];

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

  const handleReport = () => {
    if (!isAuthenticated) return notify(t('product.signInToReport'), 'error');
    appAlert(
      t('product.reportListingTitle'),
      t('product.reportReasonPrompt'),
      [
        ...REPORT_REASONS.map((reason) => ({
          text: reason.labelKey ? t(reason.labelKey) : reason.fallback!,
          onPress: async () => {
            try {
              await userReportsApi.create({ type: 'product', targetId: productId, reason: reason.key as any });
              notify(t('product.reportReceived'), 'success');
            } catch (error: any) {
              notify(error.response?.data?.message || t('report.submitFailed'), 'error');
            }
          },
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ],
      { cancelable: true },
    );
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

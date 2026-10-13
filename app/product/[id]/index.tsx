import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton, SkeletonText, theme } from '@/ui';
import { useLocalSearchParams, router } from 'expo-router';
import { PageShell } from '@/components/common/PageShell';
import { useRefresh } from '@/hooks/useRefresh';
import { useAuthStore } from '@/stores/authStore';
import { SignupPrompt } from '@/components/SignupPrompt';
import MakeOfferModal from '@/components/product/MakeOfferModal';
import AddToCollectionModal from '@/components/product/AddToCollectionModal';
import { resolveProductImages, isProductOutOfStock, getProductPriceInfo } from './_lib/display';
import { useProduct } from './_hooks/useProduct';
import { useProductReviews } from './_hooks/useProductReviews';
import { useProductFavorite } from './_hooks/useProductFavorite';
import { useGuestPrompt } from './_hooks/useGuestPrompt';
import { useProductActions } from './_hooks/useProductActions';
import { useProductScroll } from './_hooks/useProductScroll';
import { useSimilarProducts } from '@/hooks/useSimilarProducts';
import { SimilarProductsCard } from '@/components/product';
import { ProductTopActions } from './_components/ProductTopActions';
import { ProductTopBar } from './_components/ProductTopBar';
import { ProductScrollView } from './_components/ProductScrollView';
import { ProductGallery } from './_components/ProductGallery';
import { ProductTitleBlock } from './_components/ProductTitleBlock';
import { ProductDescription } from './_components/ProductDescription';
import { ProductBuyBar, ProductSecondaryActions } from './_components/ProductActions';
import { SellerCard } from './_components/SellerCard';
import { ProductSpecs } from './_components/ProductSpecs';
import { ProductReviewsPreview } from './_components/ProductReviewsPreview';
import { ImageViewerModal } from './_modals/ImageViewerModal';
import { useUserActionsSheet } from '@/components/UserActionsSheet';

const { spacing } = theme;

/** Web ürün detayının yüklenirken iskeleti: kare görsel + başlık/fiyat/açıklama satırları. */
function ProductSkeleton() {
  return (
    <View testID="product-skeleton">
      <Skeleton width="100%" style={styles.square} borderRadius={0} />
      <View style={styles.body}>
        <Skeleton height={spacing[8]} width="75%" />
        <Skeleton height={spacing[6]} width="50%" />
        <SkeletonText lines={4} />
      </View>
    </View>
  );
}

/**
 * Ürün detayı — web `ListingDetailClient` blokları ve sırası: galeri, başlık, fiyat bloğu, açıklama,
 * durum uyarısı, CTA'lar (Takas Teklifi / Teklif Ver / Sepete Ekle; birincil "Hemen Al" + adet seçici
 * sabit alt barda — platform kalıbı), satıcı kartı, özellik tabloları, değerlendirmeler, benzer ürünler.
 * Mantık `_hooks/`'ta; hook'lar PageShell'in yükleniyor/boş dallarından ÖNCE koşulsuz çağrılır.
 */
export default function ProductDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const productId = String(id);
  const { isAuthenticated, user } = useAuthStore();

  const { data: product, isLoading, refetch: refetchProduct } = useProduct(productId, isAuthenticated);
  const { data: reviews, refetch: refetchReviews } = useProductReviews(productId, !!id);
  const { data: similar } = useSimilarProducts(productId, !!product);
  const { refreshing, onRefresh } = useRefresh(refetchProduct, refetchReviews);
  const guest = useGuestPrompt(productId, isAuthenticated);
  const scroll = useProductScroll();

  const [currentImage, setCurrentImage] = useState(0);
  const [viewer, setViewer] = useState({ open: false, index: 0 });

  const images = product ? resolveProductImages(product) : [];
  const isOutOfStock = product ? isProductOutOfStock(product) : false;

  const actions = useProductActions({ product, productId, images, isOutOfStock, isAuthenticated, user });
  const favorite = useProductFavorite({ product, productId, isAuthenticated, notify: actions.notify });

  // Apple App Review 1.2: ilan detayından ilanı şikayet + satıcıyı engelle.
  const sellerId = product?.seller?.id ? String(product.seller.id) : '';
  const sellerName = product?.seller?.displayName || product?.seller?.companyName || t('product.seller');
  const sellerActions = useUserActionsSheet({
    userId: sellerId,
    userName: sellerName,
    showReportUser: false,
    blockLabel: t('profile.blockSeller'),
    // Bilerek `notify` GEÇİLMİYOR: engelden sonra ekran kapanıyor, mesajı taşıyan ekranla birlikte
    // yok oluyordu. appAlert kök seviyede duruyor ve gezinmeden sağ çıkıyor.
    onBlocked: () => (router.canGoBack() ? router.back() : router.replace('/(tabs)')),
    extraActions: [{ label: t('product.reportListing'), onPress: actions.handleReport }],
  });

  const isOwner = Boolean(
    product && isAuthenticated && user?.id && product.seller?.id && user.id === product.seller.id,
  );
  const reportOnly = !sellerId || isOwner;
  const price = product ? getProductPriceInfo(product) : null;
  const openReviews = () => router.push(`/product/${productId}/reviews`);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  const ready = !!product && !!price;
  return (
    <PageShell
      header={false}
      mode="list"
      padding={false}
      loading={isLoading}
      loadingFallback={<ProductSkeleton />}
      empty={!isLoading && !product}
      emptyState={{
        icon: 'cube-outline',
        title: t('product.productNotFoundTitle'),
        actionLabel: t('common.goBack'),
        onAction: goBack,
      }}
      footer={
        ready ? (
          <ProductBuyBar
            product={product}
            isOwner={isOwner}
            isOutOfStock={isOutOfStock}
            quantity={actions.quantity}
            onQuantity={actions.setQuantity}
            onBuyNow={actions.handleBuyNow}
            onEdit={() => router.push(`/listing/${product.id}/edit` as any)}
            onAddToCollection={actions.handleAddToCollection}
          />
        ) : undefined
      }
      overlay={
        <>
          <ProductTopBar scrollY={scroll.scrollY} solid={!ready} onBack={goBack}>
            {ready ? (
              <ProductTopActions
                isFavorite={favorite.isFavorite}
                favoriteLoading={favorite.favoriteLoading}
                reportOnly={reportOnly}
                onFavorite={favorite.toggle}
                onShare={actions.handleShare}
                onCart={() => router.push('/cart')}
                onMenu={reportOnly ? actions.handleReport : sellerActions.open}
              />
            ) : null}
          </ProductTopBar>
          {sellerActions.reportModal}
          {ready ? (
            <>
              <ImageViewerModal
                visible={viewer.open}
                images={images}
                initialIndex={viewer.index}
                onClose={() => setViewer((v) => ({ ...v, open: false }))}
              />
              <MakeOfferModal
                visible={actions.offerModalOpen}
                onDismiss={() => actions.setOfferModalOpen(false)}
                productId={productId}
                productTitle={product.title}
                listPrice={product.price ?? 0}
                onSuccess={() => {
                  actions.setOfferModalOpen(false);
                  actions.notify(t('product.offerSent'), 'success');
                }}
              />
              <AddToCollectionModal
                visible={actions.collectionModalOpen}
                onDismiss={() => actions.setCollectionModalOpen(false)}
                productId={productId}
                onSuccess={(collectionName: string) => {
                  actions.setCollectionModalOpen(false);
                  actions.notify(t('collection.addedToNamedCollection', { name: collectionName }), 'success');
                }}
              />
            </>
          ) : null}
          {guest.promptType && (
            <SignupPrompt visible={guest.showPrompt} onDismiss={guest.dismissPrompt} type={guest.promptType} />
          )}
        </>
      }
    >
      {ready ? (
        <ProductScrollView onScroll={scroll.onScroll} refreshing={refreshing} onRefresh={onRefresh}>
          <ProductGallery
            images={images}
            currentImage={currentImage}
            onPageChange={setCurrentImage}
            onOpenViewer={(index) => setViewer({ open: true, index })}
          />

          <View style={styles.body}>
            <ProductTitleBlock product={product} price={price} favoriteCount={favorite.favoriteCount} />
            <ProductDescription product={product} />
            <ProductSecondaryActions
              product={product}
              isOwner={isOwner}
              inCart={actions.inCart}
              onTrade={actions.handleTrade}
              onMakeOffer={actions.handleMakeOffer}
              onCartToggle={actions.handleCartToggle}
            />
            <SellerCard
              seller={product.seller}
              isOwner={isOwner}
              onPressSeller={() => router.push(`/seller/${product.seller?.id}`)}
              onMessage={actions.handleMessage}
            />
            <ProductSpecs product={product} />
            <ProductReviewsPreview reviews={reviews} onSeeAll={openReviews} />
            <SimilarProductsCard title={t('product.similarProducts')} items={similar} />
          </View>
        </ProductScrollView>
      ) : null}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing[4], gap: spacing[4] },
  square: { aspectRatio: 1, height: undefined },
});

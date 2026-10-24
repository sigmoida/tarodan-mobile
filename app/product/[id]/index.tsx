import { useTranslation } from 'react-i18next';
import { useCallback, useMemo, useState } from 'react';
import { toast } from '@/ui';
import { useLocalSearchParams, router } from 'expo-router';
import { PageShell } from '@/components/common/PageShell';
import { useTransitionReady } from '@/hooks/useTransitionReady';
import { FOCUS_LIST_STALE_MS, useRefetchStaleOnFocus } from '@/hooks/useRefetchStaleOnFocus';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { isOwnProduct } from '@/hooks/useFavoriteToggle';
import { SignupPrompt } from '@/components/SignupPrompt';
import MakeOfferModal from '@/components/product/MakeOfferModal';
import AddToCollectionModal from '@/components/product/AddToCollectionModal';
import ReportModal from '@/components/ReportModal';
import { resolveProductImages, isProductOutOfStock, getProductPriceInfo } from './_lib/display';
import { useProduct } from './_hooks/useProduct';
import { useProductReviews } from './_hooks/useProductReviews';
import { useProductFavorite } from './_hooks/useProductFavorite';
import { useGuestPrompt } from './_hooks/useGuestPrompt';
import { useProductActions } from './_hooks/useProductActions';
import { useProductScroll } from './_hooks/useProductScroll';
import { useProductDetailLayout } from './_lib/layout';
import { useSimilarProducts } from '@/hooks/useSimilarProducts';
import { ProductNotFound, productNotFoundState, SimilarProductsCard } from '@/components/product';
import { ProductTopActions } from './_components/ProductTopActions';
import { ProductTopBar } from './_components/ProductTopBar';
import { ProductScrollView } from './_components/ProductScrollView';
import { ProductGallery } from './_components/ProductGallery';
import { ProductBodyLayout } from './_components/ProductBodyLayout';
import { ProductTitleBlock } from './_components/ProductTitleBlock';
import { ProductDescription } from './_components/ProductDescription';
import { ProductBuyBar, ProductOfferTradeRow, ProductSecondaryActions } from './_components/ProductActions';
import { getOfferTradeAvailability } from './_lib/engagement';
import { listingIdFromParam } from '@/lib/product/listingParam';
import { usePriceLimits } from '@/hooks/usePriceLimits';
import { SellerCard } from './_components/SellerCard';
import { ProductSpecs } from './_components/ProductSpecs';
import { ProductReviewsPreview } from './_components/ProductReviewsPreview';
import { ProductSectionsSkeleton, ProductSkeleton } from './_components/ProductSkeletons';
import { ImageViewerModal } from './_modals/ImageViewerModal';
import { useUserActionsSheet } from '@/components/UserActionsSheet';


/**
 * Ürün detayı — web `ListingDetailClient` blokları ve sırası: galeri, başlık, fiyat bloğu, rozet satırı
 * (%İndirim · Takas), durum uyarısı, açıklama, adet seçici, satıcı kartı, özellik tabloları, değerlendirmeler, benzer ürünler.
 * Sabit alt bar (platform kalıbı): üstte ince "Takas Teklifi" · "Teklif Ver" satırı (tek giriş), altında fiyat · "Hemen Al" · "Sepete Ekle" (misafir de ekler;
 * sahipte fiyat · "Düzenle").
 * Mantık `_hooks/`'ta; hook'lar PageShell'in yükleniyor/boş dallarından ÖNCE koşulsuz çağrılır.
 * Algılanan hız: listeden gelince ilk kare önbellekteki karttan (galeri + başlık + fiyat; tam veri
 * isteyen bölümler iskelet, alt bar / aksiyonlar tam veriyle); özellikler, değerlendirmeler ve benzer
 * ürünler (sorgularıyla) itiş animasyonu bitince bağlanır (`useTransitionReady`). Ağ/5xx hatası
 * "bulunamadı" değil, hata + Tekrar Dene.
 */
function ProductDetail({ productId }: { productId: string }) {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  const productQuery = useProduct(productId, isAuthenticated, user?.id);
  const { data: product, isLoading, isError, refetch: refetchProduct } = productQuery;
  // Liste önbelleğinden gelen yer tutucu: yalnız kart alanları (başlık / fiyat / galeri / satıcı özeti).
  const full = !!product && !productQuery.isPlaceholderData;
  const fullProduct = full ? product : null;
  const sectionsReady = useTransitionReady();
  const { data: reviews } = useProductReviews(productId, sectionsReady);
  const { data: similar } = useSimilarProducts(productId, full && sectionsReady);
  // Çekip-yenile yok: ekrana dönüşte detay + yorumlar bayatsa ya da 30 sn'den eskiyse sessizce tazelenir.
  useRefetchStaleOnFocus([qk.products.detail(productId), qk.products.reviews(productId)], true, {
    maxAgeMs: FOCUS_LIST_STALE_MS,
  });
  const guest = useGuestPrompt(productId, isAuthenticated);
  const scroll = useProductScroll();

  const [currentImage, setCurrentImage] = useState(0);
  const [viewer, setViewer] = useState({ open: false, index: 0 });

  // One array per product object: the pager, the thumbnail strip and the viewer receive stable items,
  // so their memoised images skip unrelated screen re-renders (page changes, favourite, cart).
  const images = useMemo(() => (product ? resolveProductImages(product) : []), [product]);
  const openViewer = useCallback((index: number) => setViewer({ open: true, index }), []);
  const isOutOfStock = product ? isProductOutOfStock(product) : false;

  const { minPrice } = usePriceLimits();
  const actions = useProductActions({ product: fullProduct, productId, images, isOutOfStock, isAuthenticated, user });
  const favorite = useProductFavorite({ product, productId, isAuthenticated });

  // Apple App Review 1.2: ilan detayından ilanı şikayet + satıcıyı engelle.
  const sellerId = fullProduct?.seller?.id ? String(fullProduct.seller.id) : '';
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

  // Sahiplik TEK kaynaktan (kartlarla aynı kural): sellerId ?? seller.id === oturum kullanıcısı.
  const isOwner = Boolean(product && isAuthenticated && isOwnProduct(product, user?.id));
  const reportOnly = !sellerId;
  const availability = product
    ? getOfferTradeAvailability(product, { isOwner, isOutOfStock, minPrice })
    : { offer: false, trade: false, tradeBadge: false };
  const price = product ? getProductPriceInfo(product) : null;
  const openReviews = () => router.push(`/product/${productId}/reviews`);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  // `visible`: galeri + başlık + fiyat çizilebilir (yer tutucu da yeter); `ready`: tam veri — alt bar,
  // üst aksiyonlar, modaller ve tam veri isteyen bölümler.
  const visible = !!product && !!price;
  const ready = visible && full;
  // Hata sonrası "Tekrar Dene" sürerken iskelet (hata kartı basılı kalmasın).
  const retrying = !product && isError && productQuery.isFetching;
  // Phones: the offer / trade row above the buy bar; tablets: inside the buy bar row
  // (`productDetailLayout`).
  const { wideBar, offerTrade } = useProductDetailLayout();
  const offerTradeRow = (
    <ProductOfferTradeRow
      availability={availability}
      onTrade={actions.handleTrade}
      onMakeOffer={actions.handleMakeOffer}
      placement={offerTrade}
    />
  );
  return (
    <PageShell
      header={false}
      mode="list"
      padding={false}
      loading={isLoading || retrying}
      loadingFallback={<ProductSkeleton />}
      error={!product && isError && !retrying ? productQuery.error : undefined}
      onRetry={refetchProduct}
      empty={!isLoading && !isError && !product}
      emptyState={productNotFoundState(t, goBack)}
      footer={
        ready ? (
          <>
            {offerTrade === 'inline' ? null : offerTradeRow}
            <ProductBuyBar
              product={product}
              isOwner={isOwner}
              isOutOfStock={isOutOfStock}
              inCart={actions.inCart}
              onAddToCart={actions.handleAddToCart}
              onBuyNow={actions.handleBuyNow}
              onGoToCart={actions.handleGoToCart}
              onEdit={() => router.push(`/listing/${product.id}/edit` as any)}
              wide={wideBar}
              extraActions={offerTrade === 'inline' ? offerTradeRow : null}
            />
          </>
        ) : undefined
      }
      overlay={
        <>
          <ProductTopBar scrollY={scroll.scrollY} onBack={goBack}>
            {ready ? (
              <ProductTopActions
                isFavorite={favorite.isFavorite}
                favoriteLoading={favorite.favoriteLoading}
                reportOnly={reportOnly}
                isOwner={isOwner}
                onFavorite={favorite.toggle}
                onShare={actions.handleShare}
                onMenu={reportOnly ? actions.handleReport : sellerActions.open}
              />
            ) : null}
          </ProductTopBar>
          {sellerActions.sheets}
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
                  toast.success(t('product.offerSent'));
                }}
              />
              <ReportModal
                visible={actions.reportOpen}
                onDismiss={() => actions.setReportOpen(false)}
                type="product"
                targetId={productId}
                targetName={product.title}
              />
              <AddToCollectionModal
                visible={actions.collectionModalOpen}
                onDismiss={() => actions.setCollectionModalOpen(false)}
                productId={productId}
                onSuccess={(collectionName: string) => {
                  actions.setCollectionModalOpen(false);
                  toast.success(t('collection.addedToNamedCollection', { name: collectionName }));
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
      {visible ? (
        <ProductScrollView onScroll={scroll.onScroll}>
          <ProductBodyLayout
            gallery={
              <ProductGallery
                images={images}
                currentImage={currentImage}
                onPageChange={setCurrentImage}
                onOpenViewer={openViewer}
              />
            }
            head={
              <ProductTitleBlock
                product={product}
                price={price}
                favoriteCount={favorite.favoriteCount}
                tradeBadge={availability.tradeBadge}
              />
            }
            description={ready ? <ProductDescription product={product} /> : null}
            rest={
              ready ? (
                <>
                  <ProductSecondaryActions
                    product={product}
                    isOwner={isOwner}
                    inCart={actions.inCart}
                    quantity={actions.quantity}
                    onQuantity={actions.setQuantity}
                    onAddToCollection={actions.handleAddToCollection}
                  />
                  <SellerCard
                    seller={product.seller}
                    isOwner={isOwner}
                    onPressSeller={() => router.push(`/seller/${product.seller?.id}`)}
                    onMessage={actions.handleMessage}
                  />
                </>
              ) : (
                <ProductSectionsSkeleton testID="product-sections-skeleton" />
              )
            }
            specs={
              ready && sectionsReady ? (
                <ProductSpecs product={product} />
              ) : ready ? (
                <ProductSectionsSkeleton count={1} testID="product-deferred-skeleton" />
              ) : null
            }
            below={
              ready && sectionsReady ? (
                <>
                  <ProductReviewsPreview reviews={reviews} onSeeAll={openReviews} />
                  <SimilarProductsCard title={t('product.similarProducts')} items={similar} />
                </>
              ) : null
            }
          />
        </ProductScrollView>
      ) : null}
    </PageShell>
  );
}

/**
 * Route entry. The `[id]` param is a listing URL segment (`<slug>-<uuid>` from a universal link, or a
 * bare uuid from the app's own links): the uuid is taken out here, before any query or action, so the
 * API, the cache keys and the cart only ever see the uuid. No uuid -> "not found" without a request.
 */
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = listingIdFromParam(id);
  return productId ? <ProductDetail productId={productId} /> : <ProductNotFound />;
}

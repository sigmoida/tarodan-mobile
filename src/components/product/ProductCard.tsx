import React, { useContext, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent, type LayoutRectangle, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { QueryClientContext } from '@tanstack/react-query';
import { AppImage } from '@/components/AppImage';
import { GLASS_ICON_BUTTON_SIZE_SM, GlassIconButton, ProductBadge, Text, theme, Icon, iconButtonBoxSize } from '@/ui';
import { productsApi } from '@/lib/api';
import { prefetchProductDetail } from '@/lib/product/detailQuery';
import { usePressPrefetch } from '@/hooks/usePressPrefetch';
import {
  ProductPriceFields,
  getProductEffectivePrice,
  getProductOriginalPriceForDisplay,
  isProductOnSaleDisplay,
  isProductOutOfStock,
} from '@/utils/productPrice';
import { formatPrice } from '@/utils/format';
import { OutOfStockOverlay } from './OutOfStockOverlay';
import { PRODUCT_CARD_METRICS } from './productCardMetrics';
import { getProductSalePercent, isProductTradeBadgeVisible, selectProductCardBadges, type ProductCardBadge } from './productCardBadges';
import { ProductCardActionButton, useProductCardAction } from './ProductCardAction';
import type { CardActionPresentation } from './ProductCardCartButton';

const { colors, spacing, radiusRole, iconSize, containers } = theme;

/** Takas rozeti ikonu — sabit referans (kart yeniden render olunca yeni element üretilmez). */
const TRADE_ICON = <Icon name="arrows-right-left" size={iconSize.sm} color={colors.text.inverted} />;
/** The boosted badge's icon (web `RocketLaunchIcon`); a fixed element like `TRADE_ICON`. */
const BOOSTED_ICON = <Icon name="rocket-launch" size={iconSize.sm} color={colors.text.inverted} />;

export interface ProductCardProduct extends ProductPriceFields {
  id: string;
  title: string;
  images?: Array<{ id?: string; url?: string; cardUrl?: string }> | string[] | null;
  imageUrl?: string | null;
  viewCount?: number;
  likeCount?: number;
  isTradeEnabled?: boolean;
  isBoosted?: boolean;
  boostedUntil?: string | null;
  discountPercent?: number | null;
  /** Bedel kampanyası etiketleri (web `feeCampaigns`) — ilki "nadir" rozetiyle gösterilir. */
  feeCampaigns?: string[] | null;
  /** Ürün statüsü (active = stokta). active dışındaki her statü "stokta yok" sayılır. */
  status?: string | null;
  /** Müsait adet (quantity - reserved). null = sınırsız stok. <= 0 ise stokta yok. */
  availableQuantity?: number | null;
  rating?: { average: number | null; count: number } | null;
  /** Liste görünümünde iki satıra kadar gösterilir. */
  description?: string | null;
  /** Satıcı (kendi ilanında favori kalbi gösterilmez — bkz. `useProductCardFavorites`). */
  sellerId?: string | null;
  /** `displayName` names the seller on the cart line the card action adds. */
  seller?: { id?: string | null; displayName?: string | null } | null;
  /** Order cap, carried onto the cart line the card action adds. */
  maxQuantityPerOrder?: number | null;
}

export type ProductCardLayout = 'grid' | 'list';

export interface ProductCardProps {
  product: ProductCardProduct;
  layout?: ProductCardLayout;
  /**
   * İkincil bilgi: puan, beğeni ve görüntülenme (liste görünümünde açıklama da). Varsayılan açık;
   * dar raylarda `false` (başlık, fiyat ve görsel her zaman kalır).
   */
  showMeta?: boolean;
  /** Varsayılan: `/product/:id` açılır. */
  onPress?: () => void;
  /** Sıralama sinyali (tıklama kaydı). Ürün açmayan kullanımlarda (seçim listesi) `false`. */
  trackClick?: boolean;
  /**
   * Dokunuşta ürün detayını önceden çek — ekran açılırken istek yolda olur (kaydırırken çekilmez:
   * `usePressPrefetch`). Varsayılan: kart ürünü kendisi açıyorsa (`onPress` yok) açık; `onPress` ile ürünü açan
   * çağıran (anasayfa rayı) `true` verir. Görüntülenme sayılmaz (`prefetchProductDetail`).
   */
  prefetchDetail?: boolean;
  /** Seçili durum (web seçim kartı: 2px primary çerçeve + primary-50 zemin). */
  selected?: boolean;
  /** Görselin sağ üstünde (rozet/kaldır düğmesi). */
  overlay?: React.ReactNode;
  /** Görselin sol üstünde. */
  overlayStart?: React.ReactNode;
  /**
   * Kartın altında, kart dokunuşunun dışında (ör. sepete ekle düğmesi). When set, the card shows no
   * action of its own in the price row (web).
   */
  footer?: React.ReactNode;
  /**
   * The card's own action in the price row (`productCardAction`: the cart toggle for other people's
   * active, in-stock listings; nothing on the viewer's own). Default on; `false` for cards that do
   * not stand for a buyable listing (a selection list, a collection's custom item), like web's
   * non-navigating cards.
   */
  showAction?: boolean;
  /**
   * Görselin sağ üstünde cam favori kalbi; yalnız verilince çizilir (`overlay` varsa çizilmez, aynı köşe). Çağıran liste başına
   * `useProductCardFavorites()` ile alır (`{...favoriteProps(product)}`) — kimliği sabit tutun.
   */
  onToggleFavorite?: (productId: string) => void;
  /** Dolu kalp (favoride). */
  isFavorite?: boolean;
  style?: ViewStyle;
  testID?: string;
}

/** Geometri `productCardMetrics.ts`'te (iskeletle tek kaynak; ayrı dosya: kartı mock'layan testler iskeleti kırmasın). */
export { PRODUCT_CARD_METRICS };
const PM = PRODUCT_CARD_METRICS;

/** The card action's box before it is measured: the icon-only `sm` button (32pt). */
const ACTION_BOX = iconButtonBoxSize('sm');

/** Kalbin görsel köşesine uzaklığı (rozetlerle aynı iç boşluk). */
const FAVORITE_INSET = spacing[1.5];

/**
 * Grid rozet yığınının sağ boşluğu (web: `left-1.5 max-w-[calc(100%-3.25rem)]` = sağdan 46pt): sağ
 * üstteki kalbe (6 + 32pt) çarpmasın, taşan etiket ellipsis olsun.
 */
const BADGES_END_INSET = FAVORITE_INSET + GLASS_ICON_BUTTON_SIZE_SM + spacing[2];

/**
 * Görselin sağ üstündeki cam favori kalbi (32pt, dokunma alanı 44pt). Kartın Pressable'ının KARDEŞİ
 * olarak çizilir: basmak kartı açmaz. Pasif: çizgi kalp; aktif: dolu `danger-500`.
 */
function FavoriteHeart({
  productId,
  title,
  isFavorite,
  onToggle,
}: {
  productId: string;
  title: string;
  isFavorite: boolean;
  onToggle: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <GlassIconButton
      size="sm"
      icon="heart"
      iconVariant={isFavorite ? 'solid' : 'outline'}
      iconColor={isFavorite ? colors.danger[500] : undefined}
      // Etiket sabit (ürün adıyla), durum `selected` (web: sabit "Favori" + aria-pressed) — ikisi
      // birden değişirse ekran okuyucu "Favorilerden çıkar, seçili" gibi çelişik okur.
      accessibilityLabel={t('product.favoriteNamed', { title })}
      selected={isFavorite}
      testID={`product-card-favorite-${productId}`}
      onPress={() => onToggle(productId)}
    />
  );
}

/** Rozetin ekran okuyucu metni (görünen etiketle aynı i18n anahtarları). */
function badgeA11yText(b: ProductCardBadge, t: TFunction): string {
  switch (b.kind) {
    case 'sale':
      return `%${b.percent} ${t('product.discount')}`;
    case 'boosted':
      // The paid placement disclosure (web reads the hint, not the visible "Öne Çıkan").
      return t('product.boostedBadgeHint');
    case 'trade':
      return t('product.tradeShort');
    case 'campaign':
      return b.label;
  }
}

/** Bir `Text` kısa yolu: web kartındaki "text-xs text-subtle" meta metni. */
function MetaItem({ icon, color, children }: { icon: 'star' | 'heart' | 'eye'; color: string; children: React.ReactNode }) {
  return (
    <View style={styles.metaItem}>
      <Icon name={icon} variant={icon === 'eye' ? 'outline' : 'solid'} size={iconSize.sm} color={color} />
      {children}
    </View>
  );
}

function RatingMeta({ rating }: { rating?: ProductCardProduct['rating'] }) {
  if (!rating || rating.average === null || !(rating.count > 0)) return null;
  return (
    <MetaItem icon="star" color={colors.warning[400]!}>
      <Text variant="caption" weight="semibold" tone="heading">
        {rating.average.toFixed(1)}
      </Text>
      <Text variant="caption" tone="subtle">
        ({rating.count})
      </Text>
    </MetaItem>
  );
}

const MetaRow = React.memo(function MetaRow({ product, listOrder }: { product: ProductCardProduct; listOrder: boolean }) {
  const likes = (
    <MetaItem key="likes" icon="heart" color={colors.danger[500]!}>
      <Text variant="caption" tone="subtle">
        {product.likeCount ?? 0}
      </Text>
    </MetaItem>
  );
  const views = (
    <MetaItem key="views" icon="eye" color={colors.primary[500]!}>
      <Text variant="caption" tone="subtle">
        {product.viewCount ?? 0}
      </Text>
    </MetaItem>
  );
  return (
    <View style={styles.metaRow}>
      {listOrder ? (
        <>
          {views}
          {likes}
          <RatingMeta rating={product.rating} />
        </>
      ) : (
        <>
          <RatingMeta rating={product.rating} />
          {likes}
          {views}
        </>
      )}
    </View>
  );
});

/**
 * Pazaryerinin TEK ürün kartı (web `ProductCard`'ın telefon görünümü): grid ve liste. Ham ürünü
 * alır; fiyat, indirim, stok ve görseli kendisi türetir — çağıran hiçbirini önceden hesaplamaz.
 * Başlık, fiyat ve görsel her zaman çizilir; `showMeta` ikincil bilgiyi açar/kapatır.
 *
 * Favori kalbi görselin sağ üstünde (web ile birlikte eklendi; `onToggleFavorite` verilince). Web'de
 * olmayan "Sepette" rozeti ve ön sipariş/sınırlı rozeti kartta yok (ürün detayında/filtrelerde).
 */
function ProductCardBase({
  product,
  layout = 'grid',
  showMeta = true,
  onPress,
  trackClick = true,
  prefetchDetail,
  selected = false,
  overlay,
  overlayStart,
  footer,
  showAction = true,
  onToggleFavorite,
  isFavorite = false,
  style,
  testID,
}: ProductCardProps) {
  const { t } = useTranslation();
  // The card action gives way to a caller's footer (web). The viewer comes from the auth store.
  const action = useProductCardAction(product);
  const withAction = showAction && !footer && action.kind === 'add_to_cart';
  // Text or icon-only by the CARD's measured width (web container query `@card-wide`); until the
  // first layout the icon shows, which is what a phone grid keeps.
  const [cardWidth, setCardWidth] = useState(0);
  const onCardLayout =
    withAction && layout === 'grid' ? (e: LayoutChangeEvent) => setCardWidth(e.nativeEvent.layout.width) : undefined;
  const presentation: CardActionPresentation = cardWidth >= containers.cardWide ? 'text' : 'icon';
  // The action is drawn as the card Pressable's SIBLING (like the heart): pressing it never opens
  // the listing, and VoiceOver can reach it (an accessible Pressable hides its children). A spacer
  // of the action's measured size holds its place at the end of the price line, so the price row
  // wraps like web; the action sits over the spacer at the body's bottom-right corner.
  const [actionSize, setActionSize] = useState({ width: ACTION_BOX, height: ACTION_BOX });
  const onActionLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setActionSize((cur) => (cur.width === width && cur.height === height ? cur : { width, height }));
  };
  // Liste: görsel satırda dikey ortalı (web `items-center`; konum gövde yüksekliğine bağlı) — kalp
  // görselin ÖLÇÜLEN çerçevesine yerleşir ve ölçüm gelene dek çizilmez (ilk karede zıplama yok).
  const [listImageFrame, setListImageFrame] = useState<LayoutRectangle | null>(null);
  const onListImageLayout = onToggleFavorite
    ? (e: LayoutChangeEvent) => setListImageFrame(e.nativeEvent.layout)
    : undefined;
  const heart = onToggleFavorite ? (
    <FavoriteHeart productId={product.id} title={product.title} isFavorite={isFavorite} onToggle={onToggleFavorite} />
  ) : null;

  const { effective, original, onSale, salePercent, outOfStock, isTrade, badges, listBadges } = useMemo(
    () => ({
      effective: getProductEffectivePrice(product),
      original: getProductOriginalPriceForDisplay(product),
      onSale: isProductOnSaleDisplay(product) && getProductOriginalPriceForDisplay(product) > getProductEffectivePrice(product),
      salePercent: getProductSalePercent(product),
      outOfStock: isProductOutOfStock(product),
      isTrade: isProductTradeBadgeVisible(product),
      badges: selectProductCardBadges(product),
      // The list row shows the discount, boosted and trade badges (web: the grid rule, no limit).
      listBadges: selectProductCardBadges(product, Infinity).filter(
        (b) => b.kind === 'sale' || b.kind === 'boosted' || b.kind === 'trade',
      ),
    }),
    [product],
  );
  const listBoosted = listBadges.some((b) => b.kind === 'boosted');
  // Ekran okuyucu: görünen rozetler başlığa eklenir (grid: yığın; liste: indirim, öne çıkan, takas).
  const visibleBadges: ProductCardBadge[] = layout === 'list' ? listBadges : overlayStart ? [] : badges;
  const actionSpacer = withAction ? <View style={actionSize} testID="product-card-action-spacer" /> : null;
  const actionButton = withAction ? (
    <View style={layout === 'list' ? styles.listAction : styles.gridAction} onLayout={onActionLayout}>
      <ProductCardActionButton
        listing={product}
        action={action}
        // The list row mirrors web below `xs` (the price on its own full-width line): icon-only there.
        presentation={layout === 'list' ? 'icon' : presentation}
      />
    </View>
  ) : null;
  const cardLabel = [product.title, ...visibleBadges.map((b) => badgeA11yText(b, t))].join(', ');

  // Sağlayıcı yoksa (izole bileşen testleri) prefetch atlanır — `useQueryClient` gibi fırlatmaz.
  const queryClient = useContext(QueryClientContext);
  const shouldPrefetch = prefetchDetail ?? !onPress;
  // Kaydırırken değil, gerçek dokunuşta / kısa basılı tutmada çekilir (`usePressPrefetch`).
  const pressPrefetch = usePressPrefetch(
    shouldPrefetch && queryClient ? () => prefetchProductDetail(queryClient, product.id) : undefined,
  );

  const handlePress = () => {
    pressPrefetch.prefetchNow();
    // Sıralama sinyali: hata gezinmeyi engellemez (web `click` ping'i).
    if (trackClick) void productsApi.recordClick(product.id).catch(() => undefined);
    if (onPress) return onPress();
    router.push(`/product/${product.id}`);
  };

  const imageSource = product.imageUrl ?? product.images;
  const tradeIcon = TRADE_ICON;

  if (layout === 'list') {
    return (
      <View style={style}>
        <Pressable
          onPress={handlePress}
          onPressIn={pressPrefetch.onPressIn}
          onPressOut={pressPrefetch.onPressOut}
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={cardLabel}
          accessibilityState={{ selected }}
          style={({ pressed }) => [styles.listCard, selected && styles.selected, pressed && styles.pressed]}
        >
          <View style={styles.listImage} onLayout={onListImageLayout}>
            <AppImage
              source={imageSource}
              recyclingKey={product.id}
              variant="card"
              style={[styles.fill, outOfStock && styles.dimmed]}
              resizeMode="cover"
            />
            {outOfStock ? <OutOfStockOverlay label={t('product.soldOut').toUpperCase()} /> : null}
            {isTrade ? (
              <ProductBadge
                variant="trade"
                icon={tradeIcon}
                accessibilityLabel={t('product.tradeShort')}
                style={styles.listTradeBadge}
              />
            ) : null}
          </View>
          <View style={styles.listBody}>
            {listBoosted ? (
              <ProductBadge variant="boosted" icon={BOOSTED_ICON} style={styles.listBoostedBadge}>
                {t('product.boostedBadge')}
              </ProductBadge>
            ) : null}
            <Text variant="body" weight="semibold" numberOfLines={2} style={styles.listTitle}>
              {product.title}
            </Text>
            {showMeta ? <MetaRow product={product} listOrder /> : null}
            {showMeta && product.description ? (
              <Text variant="bodySm" tone="muted" numberOfLines={2} style={styles.listDescription}>
                {product.description}
              </Text>
            ) : null}
          </View>
          <View style={styles.listPrice}>
            <View style={styles.listPriceLine}>
              {onSale ? (
                <Text variant="bodySm" tone="subtle" style={styles.struck} testID="product-card-old-price">
                  {formatPrice(original)}
                </Text>
              ) : null}
              <Text variant="h3" weight="bold" tone="primary" testID="product-card-price">
                {formatPrice(effective)}
              </Text>
              {salePercent >= 1 ? <ProductBadge variant="sale">%{salePercent}</ProductBadge> : null}
            </View>
            {actionSpacer}
          </View>
        </Pressable>
        {actionButton}
        {heart && listImageFrame ? (
          <View style={[styles.favoriteBox, listHeartPosition(listImageFrame)]}>{heart}</View>
        ) : null}
        {overlay ? <View style={styles.overlayEnd}>{overlay}</View> : null}
        {footer ? <View style={styles.listFooter}>{footer}</View> : null}
      </View>
    );
  }

  return (
    <View style={[styles.gridWrap, style]} onLayout={onCardLayout}>
      <Pressable
        onPress={handlePress}
        onPressIn={pressPrefetch.onPressIn}
        onPressOut={pressPrefetch.onPressOut}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={cardLabel}
        accessibilityState={{ selected }}
        style={({ pressed }) => [styles.gridCard, selected && styles.selected, pressed && styles.pressed]}
      >
        <View style={styles.gridImage}>
          <AppImage
            source={imageSource}
            recyclingKey={product.id}
            variant="card"
            style={[styles.fill, outOfStock && styles.dimmed]}
            resizeMode="cover"
          />
          {outOfStock ? <OutOfStockOverlay label={t('product.soldOut').toUpperCase()} /> : null}
          {/* Sol üst yuva `overlayStart`'ındır: verilmişse rozet yığını çizilmez (çakışmasın). */}
          {overlayStart ? null : (
            <View style={styles.badgesStart} pointerEvents="none">
              {badges.map((b) => {
                switch (b.kind) {
                  case 'sale':
                    return (
                      <ProductBadge key="sale" variant="sale">
                        %{b.percent}
                      </ProductBadge>
                    );
                  case 'boosted':
                    return (
                      <ProductBadge key="boosted" variant="boosted" icon={BOOSTED_ICON}>
                        {t('product.boostedBadge')}
                      </ProductBadge>
                    );
                  case 'trade':
                    return (
                      <ProductBadge key="trade" variant="trade" icon={tradeIcon}>
                        {t('product.tradeShort')}
                      </ProductBadge>
                    );
                  case 'campaign':
                    return (
                      <ProductBadge key="campaign" variant="rare">
                        {b.label}
                      </ProductBadge>
                    );
                }
              })}
            </View>
          )}
        </View>
        <View style={styles.gridBody}>
          <Text variant="bodySm" weight="medium" numberOfLines={2} style={styles.gridTitle}>
            {product.title}
          </Text>
          <View style={styles.gridBottom}>
            {showMeta ? <MetaRow product={product} listOrder={false} /> : null}
            {/* Web price row: the price at the left, the action at the bottom right; the action
                wraps under the price when both do not fit. One height on every card of a row. */}
            <View style={styles.priceBlock}>
              <View style={styles.priceColumn}>
                {onSale ? (
                  <Text variant="bodySm" tone="subtle" style={styles.struck} testID="product-card-old-price">
                    {formatPrice(original)}
                  </Text>
                ) : null}
                {/* Dar ızgara hücresinde (360pt) uzun fiyat sarmaz; gerekirse hafifçe küçülür. */}
                <Text
                  variant="body"
                  weight="bold"
                  tone="primary"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  testID="product-card-price"
                >
                  {formatPrice(effective)}
                </Text>
              </View>
              {actionSpacer ? <View style={styles.actionSlot}>{actionSpacer}</View> : null}
            </View>
          </View>
        </View>
      </Pressable>
      {footer ? <View style={styles.gridFooter}>{footer}</View> : null}
      {actionButton}
      {heart && !overlay ? (
        // Sağ üst köşe tek yuva: grid'de `overlay` (kaldır düğmesi) varsa kalp çizilmez.
        // Görselle aynı kare (kenarlık içinde): kalp sağ üst köşeye oturur, kare dokunuşu geçirir.
        <View style={styles.gridImageFrame} pointerEvents="box-none">
          <View style={[styles.favoriteBox, styles.favoriteGrid]}>{heart}</View>
        </View>
      ) : null}
      {overlay ? <View style={styles.overlayEnd}>{overlay}</View> : null}
      {overlayStart ? <View style={styles.overlayStart}>{overlayStart}</View> : null}
    </View>
  );
}

/** Liste kalbinin konumu: ölçülen görsel çerçevesinin sağ üstü. */
function listHeartPosition(frame: LayoutRectangle): ViewStyle {
  return {
    left: frame.x + frame.width - GLASS_ICON_BUTTON_SIZE_SM - FAVORITE_INSET,
    top: frame.y + FAVORITE_INSET,
  };
}

export const ProductCard = React.memo(ProductCardBase);

export default ProductCard;

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
  dimmed: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  selected: { borderWidth: 2, borderColor: colors.primary[500], backgroundColor: colors.primary[50] },
  struck: { textDecorationLine: 'line-through' },

  // ===== GRID (web: rounded border bg-surface-elevated, aspect-square görsel, p-2.5 gövde) =====
  gridWrap: { flex: 1 },
  gridCard: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: PM.grid.radius,
    borderWidth: PM.borderWidth,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
  },
  gridImage: { aspectRatio: 1, backgroundColor: colors.surface.alt },
  badgesStart: {
    position: 'absolute',
    top: spacing[1.5],
    left: spacing[1.5],
    // Taşan etiket ellipsis'e düşer; sağ üstteki kalbe çarpmaz.
    right: BADGES_END_INSET,
    alignItems: 'flex-start',
    gap: spacing[1],
  },
  gridBody: { flex: 1, padding: PM.grid.bodyPadding },
  gridTitle: {
    marginBottom: PM.grid.titleGap,
    lineHeight: PM.grid.titleLineHeight,
  },
  // Meta + fiyat altta sabit: 1 ya da 2 satırlık başlıkta kartlar hizalı kalır.
  gridBottom: { marginTop: 'auto' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: spacing[3],
    rowGap: spacing[0.5],
    marginBottom: PM.grid.metaGap,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[0.5] },
  priceBlock: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    columnGap: spacing[2],
    rowGap: spacing[1.5],
    minHeight: PM.grid.priceRowMinHeight,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingTop: PM.grid.priceTopPadding,
  },
  // Natural width (so the action wraps under a long price), never wider than the row.
  priceColumn: { flexShrink: 0, maxWidth: '100%' },
  actionSlot: { marginLeft: 'auto' },
  // Over the price row's spacer: the body's bottom-right corner (inside the card border).
  gridAction: {
    position: 'absolute',
    right: PM.borderWidth + PM.grid.bodyPadding,
    bottom: PM.borderWidth + PM.grid.bodyPadding,
    zIndex: 1,
  },
  gridFooter: { paddingHorizontal: spacing[2.5], paddingBottom: spacing[2.5] },
  overlayEnd: { position: 'absolute', top: spacing[1.5], right: spacing[1.5], zIndex: 1 },
  overlayStart: { position: 'absolute', top: spacing[1.5], left: spacing[1.5], zIndex: 1 },
  // Grid görsel karesi: kart kenarlığının (1pt) içinde, kare.
  gridImageFrame: { position: 'absolute', top: 1, left: 1, right: 1, aspectRatio: 1, zIndex: 1 },
  favoriteBox: { position: 'absolute', zIndex: 1 },
  favoriteGrid: { right: FAVORITE_INSET, top: FAVORITE_INSET },

  // ===== LİSTE (web: rounded-lg border p-3 gap-3, 80pt görsel, fiyat tam genişlikte sağa yaslı) =====
  listCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: PM.list.gap,
    padding: PM.list.padding,
    borderRadius: PM.list.radius,
    borderWidth: PM.borderWidth,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
  },
  listImage: {
    width: PM.list.imageSize,
    height: PM.list.imageSize,
    overflow: 'hidden',
    borderRadius: radiusRole.card,
    backgroundColor: colors.surface.alt,
  },
  listTradeBadge: { position: 'absolute', top: spacing[1], left: spacing[1], padding: spacing[1], gap: 0 },
  listBody: { flex: 1, minWidth: 0 },
  listTitle: { lineHeight: PM.list.titleLineHeight },
  listDescription: { marginTop: spacing[2] },
  listPrice: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing[2],
  },
  listPriceLine: { flexDirection: 'row', alignItems: 'baseline', gap: spacing[2] },
  listBoostedBadge: { alignSelf: 'flex-start', marginBottom: spacing[1] },
  // Over the price line's spacer: the row's bottom-right corner (inside the card border).
  listAction: {
    position: 'absolute',
    right: PM.borderWidth + PM.list.padding,
    bottom: PM.borderWidth + PM.list.padding,
    zIndex: 1,
  },
  listFooter: { marginTop: spacing[2] },
});

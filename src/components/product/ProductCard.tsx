import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppImage } from '@/components/AppImage';
import { ProductBadge, Text, theme, Icon } from '@/ui';
import { productsApi } from '@/lib/api';
import {
  ProductPriceFields,
  getProductDiscountPercent,
  getProductEffectivePrice,
  getProductOriginalPriceForDisplay,
  isProductOnSaleDisplay,
  isProductOutOfStock,
} from '@/utils/productPrice';
import { isProductTradeOpen } from '@/utils/isProductTradeOpen';
import { formatPrice } from '@/utils/format';
import { OutOfStockOverlay } from './OutOfStockOverlay';

const { colors, spacing, typography, radiusRole, iconSize } = theme;

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
  /** Seçili durum (web seçim kartı: 2px primary çerçeve + primary-50 zemin). */
  selected?: boolean;
  /** Görselin sağ üstünde (rozet/kaldır düğmesi). */
  overlay?: React.ReactNode;
  /** Görselin sol üstünde. */
  overlayStart?: React.ReactNode;
  /** Kartın altında, kart dokunuşunun dışında (ör. sepete ekle düğmesi). */
  footer?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
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

function MetaRow({ product, listOrder }: { product: ProductCardProduct; listOrder: boolean }) {
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
}

/**
 * Pazaryerinin TEK ürün kartı (web `ProductCard`'ın telefon görünümü): grid ve liste. Ham ürünü
 * alır; fiyat, indirim, stok ve görseli kendisi türetir — çağıran hiçbirini önceden hesaplamaz.
 * Başlık, fiyat ve görsel her zaman çizilir; `showMeta` ikincil bilgiyi açar/kapatır.
 *
 * Web'de olmayan şeyler (favori kalbi, "Sepette" rozeti, ön sipariş/sınırlı rozeti) kartta yok:
 * favori ürün detayında, diğerleri ürün detayında/filtrelerde.
 */
function ProductCardBase({
  product,
  layout = 'grid',
  showMeta = true,
  onPress,
  trackClick = true,
  selected = false,
  overlay,
  overlayStart,
  footer,
  style,
  testID,
}: ProductCardProps) {
  const { t } = useTranslation();

  const { effective, original, onSale, discount, outOfStock, isTrade, sponsored, campaign } = useMemo(
    () => ({
      effective: getProductEffectivePrice(product),
      original: getProductOriginalPriceForDisplay(product),
      onSale: isProductOnSaleDisplay(product) && getProductOriginalPriceForDisplay(product) > getProductEffectivePrice(product),
      discount: product.discountPercent ?? getProductDiscountPercent(product),
      outOfStock: isProductOutOfStock(product),
      isTrade: isProductTradeOpen(product),
      sponsored: Boolean(product.isBoosted || product.boostedUntil),
      campaign: (product.feeCampaigns ?? [])[0] ?? null,
    }),
    [product],
  );

  const handlePress = () => {
    // Sıralama sinyali: hata gezinmeyi engellemez (web `click` ping'i).
    if (trackClick) void productsApi.recordClick(product.id).catch(() => {});
    if (onPress) return onPress();
    router.push(`/product/${product.id}`);
  };

  const imageSource = product.imageUrl ?? product.images;
  const tradeIcon = <Icon name="arrows-right-left" size={iconSize.sm} color={colors.text.inverted} />;

  if (layout === 'list') {
    return (
      <View style={style}>
        <Pressable
          onPress={handlePress}
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={product.title}
          accessibilityState={{ selected }}
          style={({ pressed }) => [styles.listCard, selected && styles.selected, pressed && styles.pressed]}
        >
          <View style={styles.listImage}>
            <AppImage
              source={imageSource}
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
            {onSale ? (
              <Text variant="bodySm" tone="subtle" style={styles.struck} testID="product-card-old-price">
                {formatPrice(original)}
              </Text>
            ) : null}
            <Text variant="h3" weight="bold" tone="primary" testID="product-card-price">
              {formatPrice(effective)}
            </Text>
            {onSale ? <ProductBadge variant="sale">%{discount}</ProductBadge> : null}
          </View>
        </Pressable>
        {overlay ? <View style={styles.overlayEnd}>{overlay}</View> : null}
        {footer ? <View style={styles.listFooter}>{footer}</View> : null}
      </View>
    );
  }

  return (
    <View style={[styles.gridWrap, style]}>
      <Pressable
        onPress={handlePress}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={product.title}
        accessibilityState={{ selected }}
        style={({ pressed }) => [styles.gridCard, selected && styles.selected, pressed && styles.pressed]}
      >
        <View style={styles.gridImage}>
          <AppImage
            source={imageSource}
            variant="card"
            style={[styles.fill, outOfStock && styles.dimmed]}
            resizeMode="cover"
          />
          {outOfStock ? <OutOfStockOverlay label={t('product.soldOut').toUpperCase()} /> : null}
          <View style={styles.badgesStart} pointerEvents="none">
            {sponsored ? <ProductBadge variant="sponsored">{t('product.sponsored')}</ProductBadge> : null}
            {isTrade ? (
              <ProductBadge variant="trade" icon={tradeIcon}>
                {t('product.tradeShort')}
              </ProductBadge>
            ) : null}
            {campaign ? <ProductBadge variant="rare">{campaign}</ProductBadge> : null}
          </View>
          {onSale ? (
            <View style={styles.badgeEnd} pointerEvents="none">
              <ProductBadge variant="sale">%{discount}</ProductBadge>
            </View>
          ) : null}
        </View>
        <View style={styles.gridBody}>
          <Text variant="bodySm" weight="medium" numberOfLines={2} style={styles.gridTitle}>
            {product.title}
          </Text>
          <View style={styles.gridBottom}>
            {showMeta ? <MetaRow product={product} listOrder={false} /> : null}
            <View style={styles.priceBlock}>
              {onSale ? (
                <Text variant="bodySm" tone="subtle" style={styles.struck} testID="product-card-old-price">
                  {formatPrice(original)}
                </Text>
              ) : null}
              <Text variant="body" weight="bold" tone="primary" testID="product-card-price">
                {formatPrice(effective)}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
      {footer ? <View style={styles.gridFooter}>{footer}</View> : null}
      {overlay ? <View style={styles.overlayEnd}>{overlay}</View> : null}
      {overlayStart ? <View style={styles.overlayStart}>{overlayStart}</View> : null}
    </View>
  );
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
    borderRadius: radiusRole.productCard,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
  },
  gridImage: { aspectRatio: 1, backgroundColor: colors.surface.alt },
  badgesStart: {
    position: 'absolute',
    top: spacing[1.5],
    left: spacing[1.5],
    alignItems: 'flex-start',
    gap: spacing[1],
  },
  badgeEnd: { position: 'absolute', top: spacing[1.5], right: spacing[1.5] },
  gridBody: { flex: 1, padding: spacing[2.5] },
  gridTitle: {
    marginBottom: spacing[1],
    lineHeight: typography.fontSize.sm * typography.lineHeight.tight,
  },
  // Meta + fiyat altta sabit: 1 ya da 2 satırlık başlıkta kartlar hizalı kalır.
  gridBottom: { marginTop: 'auto' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: spacing[3],
    rowGap: spacing[0.5],
    marginBottom: spacing[1.5],
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[0.5] },
  priceBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingTop: spacing[1.5],
  },
  gridFooter: { paddingHorizontal: spacing[2.5], paddingBottom: spacing[2.5] },
  overlayEnd: { position: 'absolute', top: spacing[1.5], right: spacing[1.5], zIndex: 1 },
  overlayStart: { position: 'absolute', top: spacing[1.5], left: spacing[1.5], zIndex: 1 },

  // ===== LİSTE (web: rounded-lg border p-3 gap-3, 80pt görsel, fiyat tam genişlikte sağa yaslı) =====
  listCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: radiusRole.card,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
  },
  listImage: {
    width: spacing[20],
    height: spacing[20],
    overflow: 'hidden',
    borderRadius: radiusRole.card,
    backgroundColor: colors.surface.alt,
  },
  listTradeBadge: { position: 'absolute', top: spacing[1], right: spacing[1], padding: spacing[1], gap: 0 },
  listBody: { flex: 1, minWidth: 0 },
  listTitle: { lineHeight: typography.fontSize.base * typography.lineHeight.tight },
  listDescription: { marginTop: spacing[2] },
  listPrice: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: spacing[2],
  },
  listFooter: { marginTop: spacing[2] },
});

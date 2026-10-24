import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Icon, QuantityStepper, Text, theme } from '@/ui';
import { ProductPrice } from '@/components/product';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { cartQuantityLimit } from '../_lib/quantity';
import { isPurchasable, type OfferTradeAvailability } from '../_lib/engagement';
import type { Product } from '../_lib/types';

const { spacing, iconSize, priceColor, typography } = theme;

export const quantityLimit = cartQuantityLimit;

/**
 * Satılamayan ilanda birincil düğmenin etiketi — web "Hemen Al" düğmesinin durum etiketleri:
 * satıldı / rezerve / stok bitti; diğer statülerde (pasif, onay bekliyor) pasif "Sepete Ekle".
 */
function unavailableLabel(product: Product, t: (k: any) => string): string {
  if (product.status === 'sold') return t('product.sold');
  if (product.status === 'reserved') return t('product.reserved');
  const available = product.availableQuantity ?? product.quantity;
  if (available != null && available <= 0) return t('product.stockFinished');
  return t('product.addToCart');
}

/**
 * Sabit alt bar (platform kalıbı, web `ProductInfo` birincil satırının karşılığı):
 * solda fiyat bloğu (indirimde eski fiyat üstü çizili), ortada kare "Hemen Al" (sepete ekler ve
 * yalnız bu ürünle ödemeye geçer), sağda geniş birincil "Sepete Ekle" (sepetteyse "Sepete Git").
 * Satılamayan ilanda kare düğme yok, birincil düğme pasif ve web'in durum etiketini taşır.
 * Sahipte fiyat + "Düzenle". Etiketler tek satır (Button sığmazsa küçültür); fiyat küçülür.
 * Web kartta/detayda ilan bazlı kargo bilgisi göstermediği için kargo satırı yok.
 *
 * `wide` (tablets, `productDetailLayout().wideBar`): the row is laid out for the width: the price on
 * the left, `extraActions` (the offer / trade buttons from `expanded` up) and the buy buttons on the
 * right at their natural width; no button stretches across the bar.
 */
export function ProductBuyBar({
  product,
  isOwner,
  isOutOfStock,
  inCart,
  onAddToCart,
  onBuyNow,
  onGoToCart,
  onEdit,
  wide = false,
  extraActions,
}: {
  product: Product;
  isOwner: boolean;
  isOutOfStock: boolean;
  inCart: boolean;
  onAddToCart: () => void;
  onBuyNow: () => void;
  onGoToCart: () => void;
  onEdit: () => void;
  wide?: boolean;
  extraActions?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const primaryStyle = wide ? styles.primaryWide : styles.primary;
  const price = (
    <View style={wide ? styles.priceWide : styles.price}>
      <ProductPrice
        product={{ ...product, price: product.price ?? 0 }}
        variant="h3"
        weight="bold"
        style={styles.priceText}
        testID="product-bar-price"
        singleLine
      />
    </View>
  );

  if (isOwner) {
    return (
      <View style={styles.row} testID="product-buy-bar">
        {price}
        <Button
          testID="product-detail-edit-button"
          size="lg"
          title={t('common.edit')}
          onPress={onEdit}
          style={primaryStyle}
        />
      </View>
    );
  }

  const purchasable = isPurchasable(product, isOutOfStock);
  return (
    <View style={styles.row} testID="product-buy-bar">
      {price}
      {extraActions}
      {purchasable ? (
        <Button
          testID="product-detail-buy-now-button"
          variant="outline"
          size="lg"
          onPress={onBuyNow}
          accessibilityLabel={t('product.buyNow')}
          style={styles.square}
        >
          <View style={styles.squareInner}>
            <Icon name="shopping-cart" size={iconSize.sm} color={theme.colors.text.body} />
            <Text
              variant="caption"
              weight="medium"
              tone="body"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              maxFontSizeMultiplier={typography.maxFontScale.control}
            >
              {t('product.buyNow')}
            </Text>
          </View>
        </Button>
      ) : null}
      {purchasable && inCart ? (
        <Button
          testID="product-detail-go-to-cart-button"
          size="lg"
          title={t('product.goToCart')}
          onPress={onGoToCart}
          style={primaryStyle}
        />
      ) : (
        <Button
          testID={purchasable ? 'product-detail-add-to-cart-button' : 'product-detail-out-of-stock-button'}
          size="lg"
          title={purchasable ? t('product.addToCart') : unavailableLabel(product, t as any)}
          onPress={onAddToCart}
          disabled={!purchasable}
          style={primaryStyle}
        />
      )}
    </View>
  );
}

/**
 * Teklif / takas satırı — sabit alt barın hemen ÜSTÜNDE (PageShell `footer` içinde, aynı safe-area).
 * Bu iki eylemin TEK birincil girişi (fiyatın yanındaki çipler yalnız kısayol). Görünürlük
 * `getOfferTradeAvailability`'den: sahipte ve satılamayan ilanda hiç çizilmez. İkisi de geçerliyse
 * eşit genişlikte yan yana, biri geçerliyse tam genişlik. Kompakt (`md`), etiket tek satır.
 * `inline` (tablets): the buttons keep their natural width, right-aligned (above the buy bar on
 * medium windows, inside its row from `expanded` up).
 */
export function ProductOfferTradeRow({
  availability,
  onTrade,
  onMakeOffer,
  inline = false,
}: {
  availability: OfferTradeAvailability;
  onTrade: () => void;
  onMakeOffer: () => void;
  inline?: boolean;
}) {
  const { t } = useTranslation();
  if (!availability.offer && !availability.trade) return null;
  const cell = inline ? styles.cellInline : styles.cell;
  return (
    <View style={[styles.pair, inline && styles.pairInline]} testID="product-offer-trade-row">
      {availability.trade ? (
        <Button
          testID="product-detail-trade-button"
          variant="outline"
          title={t('product.trade')}
          onPress={onTrade}
          style={cell}
        />
      ) : null}
      {availability.offer ? (
        <Button
          testID="product-detail-offer-button"
          variant="outline"
          title={t('product.makeOffer')}
          onPress={onMakeOffer}
          style={cell}
        />
      ) : null}
    </View>
  );
}

/**
 * İçerikteki eylem satırı (satıcı kartının hemen üstü): adet seçici (stok>1 ve ürün sepette
 * değilken; alt bardaki "Sepete Ekle" / "Hemen Al" bu adedi taşır). Sahipte "Koleksiyona Ekle" (izin varsa) — "Düzenle" alt barda.
 * Teklif/takas burada YOK: alt bardaki satır tek giriş.
 */
export function ProductSecondaryActions({
  product,
  isOwner,
  inCart,
  quantity,
  onQuantity,
  onAddToCollection,
}: {
  product: Product;
  isOwner: boolean;
  /** Ürün sepetteyse seçici gizli: bar "Sepete Git" gösterir, "Hemen Al" sepet satırının adedini öder. */
  inCart: boolean;
  quantity: number;
  onQuantity: (n: number) => void;
  onAddToCollection: () => void;
}) {
  const { t } = useTranslation();
  const { showCollectionEntry } = useFeatureAccess();

  if (isOwner) {
    return showCollectionEntry ? (
      <Button
        testID="product-detail-add-to-collection-button"
        variant="secondary"
        title={t('collection.addToCollection')}
        onPress={onAddToCollection}
        fullWidth
      />
    ) : null;
  }

  const max = quantityLimit(product, isOwner);
  if (max == null || inCart) return null;
  return (
    <QuantityStepper
      value={quantity}
      onChange={onQuantity}
      max={max}
      style={styles.stepper}
      decreaseLabel={t('cart.decreaseQuantity')}
      increaseLabel={t('cart.increaseQuantity')}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  // Fiyat kalan alanı alır ve gerekirse küçülür; düğmeler asla daralmaz/sarmaz.
  price: { flexShrink: 1, flexGrow: 0, minWidth: 0, marginRight: spacing[1] },
  priceText: { color: priceColor.detail },
  square: { flexShrink: 0, paddingHorizontal: spacing[2] },
  squareInner: { alignItems: 'center' },
  primary: { flexGrow: 1, flexShrink: 0, paddingHorizontal: spacing[4] },
  // Tablets: the price takes the free space, buttons keep their natural width.
  priceWide: { flexGrow: 1, flexShrink: 1, minWidth: 0, marginRight: spacing[1] },
  primaryWide: { flexShrink: 0, paddingHorizontal: spacing[8] },
  stepper: { alignSelf: 'flex-start' },
  pair: { flexDirection: 'row', gap: spacing[2] },
  cell: { flex: 1, paddingHorizontal: spacing[2] },
  cellInline: { flexShrink: 0, paddingHorizontal: spacing[4] },
  pairInline: { justifyContent: 'flex-end' },
});

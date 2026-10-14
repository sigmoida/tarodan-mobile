import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Icon, QuantityStepper, Text, theme } from '@/ui';
import { ProductPrice } from '@/components/product';
import { isProductTradeOpen } from '@/utils/isProductTradeOpen';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { cartQuantityLimit } from '../_lib/quantity';
import type { Product } from '../_lib/types';

const { spacing, iconSize, priceColor, typography } = theme;

/** Bu genişliğin altında (küçük telefonlar) ikili satır da alt alta dizilir: etiket asla sarmaz. */
const SIDE_BY_SIDE_MIN_WIDTH = 360;

export const quantityLimit = cartQuantityLimit;

/** Satılabilir mi: aktif statü + stok var (null = sınırsız) + dışarıdan "stokta yok" değil. */
export function isPurchasable(product: Product, isOutOfStock: boolean): boolean {
  const available = product.availableQuantity ?? product.quantity;
  return !isOutOfStock && product.status === 'active' && (available == null || available > 0);
}

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
}: {
  product: Product;
  isOwner: boolean;
  isOutOfStock: boolean;
  inCart: boolean;
  onAddToCart: () => void;
  onBuyNow: () => void;
  onGoToCart: () => void;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const price = (
    <View style={styles.price}>
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
      <View style={styles.row}>
        {price}
        <Button
          testID="product-detail-edit-button"
          size="lg"
          title={t('common.edit')}
          onPress={onEdit}
          style={styles.primary}
        />
      </View>
    );
  }

  const purchasable = isPurchasable(product, isOutOfStock);
  return (
    <View style={styles.row}>
      {price}
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
          style={styles.primary}
        />
      ) : (
        <Button
          testID={purchasable ? 'product-detail-add-to-cart-button' : 'product-detail-out-of-stock-button'}
          size="lg"
          title={purchasable ? t('product.addToCart') : unavailableLabel(product, t as any)}
          onPress={onAddToCart}
          disabled={!purchasable}
          style={styles.primary}
        />
      )}
    </View>
  );
}

/**
 * İçerikteki eylem satırı (satıcı kartının hemen üstü): adet seçici (stok>1) + web ikincil satırı
 * "Takas Teklifi" (takasa açıksa) · "Teklif Ver". Sepet eylemleri sabit alt barda. Sahipte yalnız
 * "Koleksiyona Ekle" (izin varsa) — "Düzenle" alt barda.
 */
export function ProductSecondaryActions({
  product,
  isOwner,
  quantity,
  onQuantity,
  onTrade,
  onMakeOffer,
  onAddToCollection,
}: {
  product: Product;
  isOwner: boolean;
  quantity: number;
  onQuantity: (n: number) => void;
  onTrade: () => void;
  onMakeOffer: () => void;
  onAddToCollection: () => void;
}) {
  const { t } = useTranslation();
  // iOS: yetkisi olmayana takas girişi gösterilmez (bkz. useFeatureAccess).
  const { showTradeEntry, showCollectionEntry } = useFeatureAccess();
  const { width } = useWindowDimensions();

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

  const active = product.status === 'active';
  const tradeOpen = isProductTradeOpen(product) && showTradeEntry;
  const max = quantityLimit(product, isOwner);
  // Web `grid-cols-2` dar telefonda sıkışır ve etiketler sarar: dar ekranda alt alta tam genişlik.
  const stacked = width < SIDE_BY_SIDE_MIN_WIDTH;
  const cell = tradeOpen && !stacked ? styles.cell : undefined;
  return (
    <View style={styles.stack}>
      {max != null ? (
        <QuantityStepper
          value={quantity}
          onChange={onQuantity}
          max={max}
          style={styles.stepper}
          decreaseLabel={t('cart.decreaseQuantity')}
          increaseLabel={t('cart.increaseQuantity')}
        />
      ) : null}
      <View style={tradeOpen && !stacked ? styles.pair : styles.stack}>
        {tradeOpen ? (
          <Button
            testID="product-detail-trade-button"
            variant="outline"
            title={t('product.trade')}
            onPress={onTrade}
            disabled={!active}
            fullWidth={!cell}
            style={cell}
          />
        ) : null}
        <Button
          testID="product-detail-offer-button"
          variant="outline"
          title={t('product.makeOffer')}
          onPress={onMakeOffer}
          disabled={!active}
          fullWidth={!cell}
          style={cell}
        />
      </View>
    </View>
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
  stack: { gap: spacing[2] },
  stepper: { alignSelf: 'flex-start' },
  pair: { flexDirection: 'row', gap: spacing[2] },
  cell: { flex: 1, alignSelf: 'stretch' },
});

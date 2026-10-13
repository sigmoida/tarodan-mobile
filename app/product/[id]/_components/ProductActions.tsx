import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, QuantityStepper, theme } from '@/ui';
import { isProductTradeOpen } from '@/utils/isProductTradeOpen';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { cartQuantityLimit } from '../_lib/quantity';
import type { Product } from '../_lib/types';

const { spacing, controlHeight } = theme;

/** Bu genişliğin altında (küçük telefonlar) ikili satır da alt alta dizilir: etiket asla sarmaz. */
const SIDE_BY_SIDE_MIN_WIDTH = 360;

export const quantityLimit = cartQuantityLimit;

/** Web "Hemen Al" düğmesinin etiketi: satıldı / rezerve / stok bitti / Hemen Al. */
function buyLabel(product: Product, hasStock: boolean, t: (k: any) => string): string {
  if (product.status === 'sold') return t('product.sold');
  if (product.status === 'reserved') return t('product.reserved');
  if (!hasStock) return t('product.stockFinished');
  return t('product.buyNow');
}

/**
 * Sabit alt bar = web `ProductInfo`'nun birincil satırı (adet seçici + "Hemen Al") platformun
 * sabit-bar kalıbına sabitlenmiş hâli. Bilerek SADE: fiyat yok (başlığın altında), ikincil/küçük
 * metin yok, düğmelerde ikon yok, etiket tek satır; adet seçici ve düğme aynı yükseklikte.
 * Sahipte "Düzenle" (+ koleksiyon izni varsa "Koleksiyona Ekle"), ikisi de lg. Etiketler web ile aynı.
 */
export function ProductBuyBar({
  product,
  isOwner,
  isOutOfStock,
  quantity,
  onQuantity,
  onBuyNow,
  onEdit,
  onAddToCollection,
}: {
  product: Product;
  isOwner: boolean;
  isOutOfStock: boolean;
  quantity: number;
  onQuantity: (n: number) => void;
  onBuyNow: () => void;
  onEdit: () => void;
  onAddToCollection: () => void;
}) {
  const { t } = useTranslation();
  const { showCollectionEntry } = useFeatureAccess();

  if (isOwner) {
    return (
      <View style={styles.stack}>
        <Button testID="product-detail-edit-button" size="lg" title={t('common.edit')} onPress={onEdit} fullWidth />
        {showCollectionEntry ? (
          <Button
            variant="secondary"
            size="lg"
            title={t('collection.addToCollection')}
            onPress={onAddToCollection}
            fullWidth
          />
        ) : null}
      </View>
    );
  }

  const max = quantityLimit(product, isOwner);
  const available = product.availableQuantity ?? product.quantity;
  const hasStock = available == null || available > 0;
  return (
    <View style={styles.row}>
      {max != null ? (
        <QuantityStepper
          value={quantity}
          onChange={onQuantity}
          max={max}
          style={styles.stretch}
          decreaseLabel={t('cart.decreaseQuantity')}
          increaseLabel={t('cart.increaseQuantity')}
        />
      ) : null}
      <Button
        testID={isOutOfStock ? 'product-detail-out-of-stock-button' : 'product-detail-buy-now-button'}
        size="lg"
        title={buyLabel(product, hasStock, t as any)}
        onPress={onBuyNow}
        disabled={isOutOfStock || product.status !== 'active' || !hasStock}
        style={styles.buy}
      />
    </View>
  );
}

/** Web ikincil satırı: "Takas Teklifi" (takasa açıksa) · "Teklif Ver" · "Sepete Ekle"/"Sepetten Çıkar". */
export function ProductSecondaryActions({
  product,
  isOwner,
  inCart,
  onTrade,
  onMakeOffer,
  onCartToggle,
}: {
  product: Product;
  isOwner: boolean;
  inCart: boolean;
  onTrade: () => void;
  onMakeOffer: () => void;
  onCartToggle: () => void;
}) {
  const { t } = useTranslation();
  // iOS: yetkisi olmayana takas girişi gösterilmez (bkz. useFeatureAccess).
  const { showTradeEntry } = useFeatureAccess();
  const { width } = useWindowDimensions();
  if (isOwner) return null;
  const active = product.status === 'active';
  const tradeOpen = isProductTradeOpen(product) && showTradeEntry;
  // Web `grid-cols-3`/`grid-cols-2` telefonda sıkışır ve etiketler sarar. Üç eylem (Takas) ya da dar
  // ekran: alt alta, tam genişlik; iki eylem geniş telefonda yan yana eşit genişlikte.
  const stacked = tradeOpen || width < SIDE_BY_SIDE_MIN_WIDTH;
  const cell = stacked ? undefined : styles.cell;
  return (
    <View style={stacked ? styles.stack : styles.pair}>
      {tradeOpen ? (
        <Button
          testID="product-detail-trade-button"
          variant="outline"
          title={t('product.trade')}
          onPress={onTrade}
          disabled={!active}
          fullWidth
        />
      ) : null}
      <Button
        testID="product-detail-offer-button"
        variant="outline"
        title={t('product.makeOffer')}
        onPress={onMakeOffer}
        disabled={!active}
        fullWidth={stacked}
        style={cell}
      />
      <Button
        testID={inCart ? 'product-detail-remove-from-cart-button' : 'product-detail-add-to-cart-button'}
        variant="outline"
        title={inCart ? t('product.removeFromCart') : t('product.addToCart')}
        onPress={onCartToggle}
        disabled={!active}
        fullWidth={stacked}
        style={cell}
        textStyle={inCart ? styles.dangerText : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', gap: spacing[3] },
  // Adet seçici (kenarlık + iç boşlukla ~50pt) ile düğme aynı yüksekliğe gerilir.
  stretch: { alignSelf: 'stretch' },
  buy: { flex: 1, alignSelf: 'stretch', height: undefined, minHeight: controlHeight.lg },
  stack: { gap: spacing[2] },
  pair: { flexDirection: 'row', gap: spacing[2] },
  cell: { flex: 1, alignSelf: 'stretch' },
  dangerText: { color: theme.colors.danger[600] },
});

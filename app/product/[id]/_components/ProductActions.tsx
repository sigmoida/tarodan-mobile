import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, QuantityStepper, theme } from '@/ui';
import { isProductTradeOpen } from '@/utils/isProductTradeOpen';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import type { Product } from '../_lib/types';

const { spacing } = theme;

/** Adet seçici yalnız satılabilir, stoğu 1'den fazla ilanda (web); tavan: müsait stok ∧ 20. */
export function quantityLimit(product: Product, isOwner: boolean): number | null {
  const available = product.availableQuantity ?? product.quantity;
  const show = !isOwner && product.status === 'active' && available != null && available > 1;
  return show ? Math.min(available as number, 20) : null;
}

/** Web "Hemen Al" düğmesinin etiketi: satıldı / rezerve / stok bitti / Hemen Al. */
function buyLabel(product: Product, hasStock: boolean, t: (k: any) => string): string {
  if (product.status === 'sold') return t('product.sold');
  if (product.status === 'reserved') return t('product.reserved');
  if (!hasStock) return t('product.stockFinished');
  return t('product.buyNow');
}

/**
 * Sabit alt bar (platform kalıbı; web'in birincil satırı): adet seçici + "Hemen Al". Sahipte
 * "Düzenle" (+ koleksiyon izni varsa "Koleksiyona Ekle"). Etiketler web ile aynı.
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
        style={styles.flex}
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
  if (isOwner) return null;
  const active = product.status === 'active';
  const tradeOpen = isProductTradeOpen(product) && showTradeEntry;
  return (
    <View style={styles.grid}>
      {tradeOpen ? (
        <Button
          testID="product-detail-trade-button"
          variant="outline"
          title={t('product.trade')}
          onPress={onTrade}
          disabled={!active}
          style={styles.cell}
        />
      ) : null}
      <Button
        testID="product-detail-offer-button"
        variant="outline"
        title={t('product.makeOffer')}
        onPress={onMakeOffer}
        disabled={!active}
        style={styles.cell}
      />
      <Button
        testID={inCart ? 'product-detail-remove-from-cart-button' : 'product-detail-add-to-cart-button'}
        variant="outline"
        title={inCart ? t('product.removeFromCart') : t('product.addToCart')}
        onPress={onCartToggle}
        disabled={!active}
        style={styles.cell}
        textStyle={inCart ? styles.dangerText : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  flex: { flex: 1 },
  stack: { gap: spacing[2] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  cell: { flexGrow: 1, flexBasis: '30%' },
  dangerText: { color: theme.colors.danger[600] },
});

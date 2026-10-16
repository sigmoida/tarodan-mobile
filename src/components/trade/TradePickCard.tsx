import React from 'react';
import { Icon, RadioIndicator, theme } from '@/ui';
import { ProductCard, type ProductCardProduct } from '@/components/product';

const { colors, iconSize, spacing } = theme;

/**
 * Takas ürün seçimi kartı — yeni takas teklifi ve karşı teklif aynı kartı kullanır: tek
 * `ProductCard` (liste düzeni, meta yok), seçim durumu kartın çerçeve/zemini + sağ üstte işaret
 * (seçili ✓, seçili değil boş radyo). Dokunuş seçimi değiştirir, ürünü açmaz; tıklama kaydı yok.
 */
export function TradePickCard({
  product,
  selected,
  onToggle,
  testID,
}: {
  product: ProductCardProduct;
  selected: boolean;
  onToggle: () => void;
  testID?: string;
}) {
  return (
    <ProductCard
      product={product}
      layout="list"
      showMeta={false}
      selected={selected}
      trackClick={false}
      onPress={onToggle}
      style={{ marginBottom: spacing[3] }}
      testID={testID}
      overlay={
        selected ? (
          <Icon name="check-circle" variant="solid" size={iconSize.lg} color={colors.primary[600]} />
        ) : (
          <RadioIndicator checked={false} size={iconSize.lg} />
        )
      }
    />
  );
}

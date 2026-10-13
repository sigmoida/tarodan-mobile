import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TopBarAction, theme } from '@/ui';
import { useShellCounts } from '@/components/shell/useShellCounts';

/**
 * Üst barın sağ aksiyonları (web ürün eylem ikonları + header sepeti): favori, paylaş, sepet
 * (sayaçlı), menü (şikayet/engelle). İkonlar başlık renginde — beyaz üst bar kuralı.
 */
export function ProductTopActions({
  isFavorite,
  favoriteLoading,
  onFavorite,
  onShare,
  onCart,
  onMenu,
}: {
  isFavorite: boolean;
  favoriteLoading: boolean;
  onFavorite: () => void;
  onShare: () => void;
  onCart: () => void;
  onMenu: () => void;
}) {
  const { t } = useTranslation();
  const { cartCount } = useShellCounts();
  return (
    <View style={styles.row}>
      <TopBarAction
        testID="product-favorite-button"
        icon={isFavorite ? 'heart' : 'heart-outline'}
        accessibilityLabel={t('product.addToFavorites')}
        onPress={onFavorite}
        disabled={favoriteLoading}
      />
      <TopBarAction icon="share-outline" accessibilityLabel={t('product.share')} onPress={onShare} />
      <TopBarAction
        icon="cart-outline"
        accessibilityLabel={t('nav.cart')}
        count={cartCount}
        onPress={onCart}
      />
      <TopBarAction
        testID="product-report-button"
        icon="ellipsis-vertical"
        accessibilityLabel={t('report.report')}
        onPress={onMenu}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[0.5] },
});

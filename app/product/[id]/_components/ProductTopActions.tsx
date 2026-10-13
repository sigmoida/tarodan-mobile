import React from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '@/ui';
import { useShellCounts } from '@/components/shell/useShellCounts';
import { FloatingIconButton } from './FloatingIconButton';

/**
 * Yüzen adaların sağ grubu (web `ProductActionIcons`: favori / paylaş / şikayet + header sepeti).
 * Soldan sağa: şikayet (satıcı varsa menü: şikayet + engelle), paylaş, favori (dolu = danger), sepet
 * (sayaçlı). İkonlar başlık renginde; dokunma alanı 44pt.
 */
export function ProductTopActions({
  isFavorite,
  favoriteLoading,
  reportOnly,
  onFavorite,
  onShare,
  onCart,
  onMenu,
}: {
  isFavorite: boolean;
  favoriteLoading: boolean;
  /** Satıcı menüsü yoksa (sahip / satıcı bilinmiyor) yalnız ilan şikayeti: web'deki bayrak ikonu. */
  reportOnly: boolean;
  onFavorite: () => void;
  onShare: () => void;
  onCart: () => void;
  onMenu: () => void;
}) {
  const { t } = useTranslation();
  const { cartCount } = useShellCounts();
  return (
    <>
      <FloatingIconButton
        testID="product-report-button"
        icon={reportOnly ? 'flag-outline' : 'ellipsis-vertical'}
        accessibilityLabel={t('report.report')}
        onPress={onMenu}
      />
      <FloatingIconButton icon="share-outline" accessibilityLabel={t('product.share')} onPress={onShare} />
      <FloatingIconButton
        testID="product-favorite-button"
        icon={isFavorite ? 'heart' : 'heart-outline'}
        iconColor={isFavorite ? theme.colors.danger[500] : undefined}
        accessibilityLabel={t('product.addToFavorites')}
        onPress={onFavorite}
        disabled={favoriteLoading}
      />
      <FloatingIconButton
        testID="product-cart-button"
        icon="cart-outline"
        accessibilityLabel={t('nav.cart')}
        count={cartCount}
        onPress={onCart}
      />
    </>
  );
}

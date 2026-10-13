import React from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '@/ui';
import { FloatingIconButton } from './FloatingIconButton';

/**
 * Yüzen adaların sağ grubu (web `ProductActionIcons`: favori / paylaş / şikayet). Soldan sağa:
 * paylaş, favori (dolu = danger), ⋮ menü en sağda (satıcı varsa şikayet + engelle; yoksa yalnız şikayet bayrağı).
 * Sepet adası YOK (sepete sekmeden / "Sepete Ekle" akışından gidilir). İkonlar başlık renginde; 44pt.
 */
export function ProductTopActions({
  isFavorite,
  favoriteLoading,
  reportOnly,
  onFavorite,
  onShare,
  onMenu,
}: {
  isFavorite: boolean;
  favoriteLoading: boolean;
  /** Satıcı menüsü yoksa (sahip / satıcı bilinmiyor) yalnız ilan şikayeti: web'deki bayrak ikonu. */
  reportOnly: boolean;
  onFavorite: () => void;
  onShare: () => void;
  onMenu: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <FloatingIconButton icon="share" accessibilityLabel={t('product.share')} onPress={onShare} />
      <FloatingIconButton
        testID="product-favorite-button"
        icon="heart"
        iconVariant={isFavorite ? 'solid' : 'outline'}
        iconColor={isFavorite ? theme.colors.danger[500] : undefined}
        accessibilityLabel={t('product.addToFavorites')}
        onPress={onFavorite}
        disabled={favoriteLoading}
      />
      <FloatingIconButton
        testID="product-report-button"
        icon={reportOnly ? 'flag' : 'ellipsis-vertical'}
        accessibilityLabel={t('report.report')}
        onPress={onMenu}
      />
    </>
  );
}

import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/ui';
import { usePopupAd } from '@/lib/ads/usePopupAd';
import { POPUP_MODAL_SIZE, popupMediaLimits } from '@/lib/ads/popupLayout';
import { hasAdImage } from '@/lib/ads/creative';
import { useSideMenu } from '@/components/shell/SideMenuContext';
import { AdCreative } from './AdCreative';

/**
 * Popup reklamı (modal, yalnız ana sayfada bağlı). Görselli reklam SADE çizilir: `@/ui` Modal
 * `variant="media"` — başlık satırı yok, görsel kartın tamamı, kapat (X) görselin sağ üstüne
 * binen cam daire. Kart görselin genişliğine oturur (`fitContent`; dikey reklamda iki yanda
 * beyaz bant yok) ve ekranın ~%80'ini / güvenli alanı aşmaz (`popupMediaLimits`).
 * Görselde tam 1 tıklanabilir bölge varsa TÜM görsel o bağlantıya gider
 * (`singleHotspotFillsImage`); birden çok bölgede bölgeler aynen çizilir.
 *
 * Metin (görselsiz) reklam mevcut yüzeyde kalır: başlık satırında X, iç boşluksuz gövde.
 * Kapatma: X, arka plan, geri tuşu (Android), reklama dokunma. Açılış/sıklık kuralları
 * (reklam başına kapatma anahtarı / eski API'de 24 saat, ziyaret, gecikme, engeller) `usePopupAd`'de.
 * Reklama dokunulunca `closeForLink`: bağlantıdan ana sekmeye dönüş yeni ziyaret sayılmaz.
 *
 * iOS ModalFreeze: reklam bağlantısına dokunulunca modal ÖNCE kapanır, bağlantı
 * kısa bir gecikmeyle sonra açılır (`AdCreative.onNavigate`). Modal açıkken
 * gezinme/uyarı ekranı dondurabilir.
 *
 * `blocked`: başka bir Modal/istem açıkken popup çıkmaz; açıkken engel gelirse kapanır. Yan menü
 * açıkken de aynı kural (iki sunum üst üste binmez).
 */
export function PopupAd({ blocked = false }: { blocked?: boolean }) {
  const { t } = useTranslation();
  const sideMenu = useSideMenu();
  const { ad, close, closeForLink } = usePopupAd(blocked || sideMenu.isOpen);
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const limits = popupMediaLimits(window, insets);
  const isMedia = !!ad && hasAdImage(ad);

  return (
    <Modal
      isOpen={!!ad}
      onClose={close}
      size={POPUP_MODAL_SIZE}
      variant={isMedia ? 'media' : 'default'}
      showCloseButton
      closeLabel={t('common.close')}
      flushBody
      fitContent={isMedia}
      accessibilityLabel={ad?.title}
    >
      {ad ? (
        <View testID="popup-ad" style={isMedia ? { maxHeight: limits.height, overflow: 'hidden' } : undefined}>
          <AdCreative ad={ad} position="popup" onNavigate={closeForLink} maxSize={limits} singleHotspotFillsImage />
        </View>
      ) : null}
    </Modal>
  );
}

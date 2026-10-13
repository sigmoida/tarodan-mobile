import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/ui';
import { usePopupAd } from '@/lib/ads/usePopupAd';
import { POPUP_MODAL_SIZE, popupMediaLimits } from '@/lib/ads/popupLayout';
import { AdCreative } from './AdCreative';

/**
 * Popup reklamı (modal), web `PopupAd` ile aynı Modal yüzeyi: `lg` boyut, beyaz kart,
 * kapat (X) BAŞLIK satırında (görselin üstüne binmez); yalnız gövdenin iç boşluğu sıfır
 * (`flushBody`, web `bodyClassName="p-0"`), reklam kartın içinde kenardan kenara.
 * Kapatma: X, arka plan, geri tuşu (Android). Açılış kuralları (24 saat sınırı, gecikme,
 * engeller) `usePopupAd`'de.
 *
 * iOS ModalFreeze: reklam bağlantısına dokunulunca modal ÖNCE kapanır, bağlantı
 * kısa bir gecikmeyle sonra açılır (`AdCreative.onNavigate`). Modal açıkken
 * gezinme/uyarı ekranı dondurabilir.
 *
 * Boyut: kart ekranın ~%80'ini ve güvenli alanı aşmaz (`popupMediaLimits`; başlık
 * satırı yüksekliği görsel kutusundan düşülür); görsel oranı korunarak o kutuya sığar.
 *
 * `blocked`: başka bir Modal/istem açıkken popup çıkmaz.
 */
export function PopupAd({ blocked = false }: { blocked?: boolean }) {
  const { t } = useTranslation();
  const { ad, close } = usePopupAd(blocked);
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const limits = popupMediaLimits(window, insets);

  return (
    <Modal
      isOpen={!!ad}
      onClose={close}
      size={POPUP_MODAL_SIZE}
      showCloseButton
      closeLabel={t('common.close')}
      flushBody
    >
      {ad ? (
        <View testID="popup-ad" style={{ maxHeight: limits.height, overflow: 'hidden' }}>
          <AdCreative ad={ad} position="popup" onNavigate={close} maxSize={limits} />
        </View>
      ) : null}
    </Modal>
  );
}

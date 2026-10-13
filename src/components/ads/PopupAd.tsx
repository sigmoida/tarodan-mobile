import React from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Modal, theme } from '@/ui';
import { usePopupAd } from '@/lib/ads/usePopupAd';
import { hasAdImage } from '@/lib/ads/creative';
import { popupMediaLimits } from '@/lib/ads/popupLayout';
import { AdCreative } from './AdCreative';

/**
 * Popup reklamı (modal, `@/ui` Modal `bare`: beyaz kart ve iç boşluk yok, web gibi kenardan kenara). Kapatma: X, arka plan, geri tuşu (Android).
 * Açılış kuralları (24 saat sınırı, gecikme, engeller) `usePopupAd`'de.
 *
 * iOS ModalFreeze: reklam bağlantısına dokunulunca modal ÖNCE kapanır, bağlantı
 * kısa bir gecikmeyle sonra açılır (`AdCreative.onNavigate`). Modal açıkken
 * gezinme/uyarı ekranı dondurabilir.
 *
 * Boyut: kart ekranın ~%80'ini ve güvenli alanı aşmaz (`popupMediaLimits`);
 * görsel oranı korunarak o kutuya sığar. Kapat (X) kartın köşesine mutlak
 * yerleşir, içerik ne kadar uzun olursa olsun görünür kalır.
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
    <Modal isOpen={!!ad} onClose={close} variant="bare">
      {ad ? (
        <View
          testID="popup-ad"
          style={{
            maxHeight: limits.height,
            overflow: 'hidden',
            // Görselli reklam kutusuna sarılır: X görselin köşesinde kalır.
            ...(hasAdImage(ad) ? { alignSelf: 'center' as const } : null),
          }}
        >
          <AdCreative ad={ad} position="popup" onNavigate={close} maxSize={limits} />
          <Pressable
            onPress={close}
            hitSlop={theme.spacing[2]}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={styles.close}
            testID="popup-ad-close"
          >
            <View style={styles.closeCircle}>
              <Ionicons name="close" size={18} color={theme.colors.white} />
            </View>
          </Pressable>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  close: { position: 'absolute', top: theme.spacing[2], right: theme.spacing[2] },
  closeCircle: {
    width: theme.spacing[8],
    height: theme.spacing[8],
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay.black50,
  },
});

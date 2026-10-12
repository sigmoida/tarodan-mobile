import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Modal, theme } from '@/ui';
import { usePopupAd } from '@/lib/ads/usePopupAd';
import { AdCreative } from './AdCreative';

/**
 * Popup reklamı (modal, `@/ui` Modal). Kapatma: X, arka plan, geri tuşu (Android).
 * Açılış kuralları (24 saat sınırı, gecikme, engeller) `usePopupAd`'de.
 *
 * iOS ModalFreeze: reklam bağlantısına dokunulunca modal ÖNCE kapanır, bağlantı
 * kısa bir gecikmeyle sonra açılır (`AdCreative.onNavigate`). Modal açıkken
 * gezinme/uyarı ekranı dondurabilir.
 *
 * `blocked`: başka bir Modal/istem açıkken popup çıkmaz.
 */
export function PopupAd({ blocked = false }: { blocked?: boolean }) {
  const { t } = useTranslation();
  const { ad, close } = usePopupAd(blocked);

  return (
    <Modal isOpen={!!ad} onClose={close}>
      {ad ? (
        <View testID="popup-ad">
          <AdCreative ad={ad} position="popup" onNavigate={close} />
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

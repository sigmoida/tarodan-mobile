import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/ui';
import { usePopupAd } from '@/lib/ads/usePopupAd';
import { AdCreative } from './AdCreative';

/**
 * Popup reklamı (modal). Kapatma: X, arka plan, geri tuşu (Android).
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
    <Modal visible={!!ad} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} testID="popup-ad-backdrop">
        {ad ? (
          // İç Pressable: karta dokunuş arka plana (kapatmaya) ulaşmasın.
          <Pressable style={styles.card} testID="popup-ad">
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
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing[4],
    backgroundColor: theme.colors.overlay.black50,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface.DEFAULT,
  },
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

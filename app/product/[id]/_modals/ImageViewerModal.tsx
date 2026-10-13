import React, { useState } from 'react';
// Tam ekran görsel ışık kutusu (web ProductLightbox): `@/ui` Modal bir diyalog kartıdır; burada çerçevesiz,
// tam ekran, şeffaf native Modal gerekir (jest + zoom jesti için GestureHandlerRootView modalın İÇİNDE).
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { Modal, ScrollView, Pressable, Dimensions, StyleSheet } from 'react-native';
import { theme } from '@/ui';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ZoomableImage from '@/components/product/ZoomableImage';

const { colors } = theme;
const { width } = Dimensions.get('window');

/** Tam ekran görsel görüntüleyici — pinch + double-tap zoom (G1). */
export function ImageViewerModal({
  visible,
  images,
  initialIndex,
  onClose,
}: {
  visible: boolean;
  images: any[];
  initialIndex: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [zoomed, setZoomed] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => setZoomed(false)}
    >
      {/* Modal Android'de yeni native pencere açtığı için root view modal içinde olmalı */}
      <GestureHandlerRootView style={styles.viewerContainer}>
        <Pressable
          style={[styles.viewerClose, { top: Math.max(insets.top, theme.spacing[3]) }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        >
          <Ionicons name="close" size={theme.iconSize.lg} color={colors.white} />
        </Pressable>
        <ScrollView
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: initialIndex * width, y: 0 }}
        >
          {images.map((img: any, index: number) => {
            const uri = typeof img === 'string' ? img : img.url;
            return <ZoomableImage key={index} uri={uri} zoomed={zoomed} onZoomChange={setZoomed} />;
          })}
        </ScrollView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  viewerContainer: { flex: 1, backgroundColor: colors.black },
  viewerClose: {
    position: 'absolute',
    right: theme.spacing[5],
    zIndex: 10,
    width: theme.minTouchTarget,
    height: theme.minTouchTarget,
    borderRadius: theme.radius.full,
    backgroundColor: colors.overlay.black50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

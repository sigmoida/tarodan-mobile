import React from 'react';
import {
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../lib/theme';
import { IconButton, iconButtonBoxSize, type IconButtonSize } from './IconButton';
import { RawText } from './Text';

/** Kart genişliği: `md` (varsayılan) 480pt, `lg` 512pt (web `max-w-lg`). */
export type ModalSize = 'md' | 'lg';

export const MODAL_MAX_WIDTH: Record<ModalSize, number> = { md: 480, lg: 512 };

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  closeOnBackdrop?: boolean;
  /** Kart genişliği (varsayılan `md`). */
  size?: ModalSize;
  /**
   * Başlık satırında kapat (X) düğmesi (web `Modal` başlığı). Varsayılan kapalı: mevcut
   * mobil modallar kendi İptal düğmelerini taşır. Düğme başlıkta kalır, gövdeye binmez.
   */
  showCloseButton?: boolean;
  /** Kapat düğmesinin erişilebilirlik etiketi (`showCloseButton` ile). */
  closeLabel?: string;
  /**
   * Gövdenin iç boşluğunu sıfırlar (web `bodyClassName="p-0"`): içerik, ör. reklam görseli,
   * karttan kenara taşar. Kart zemini, köşe yuvarlaklığı ve başlık satırı aynı kalır.
   */
  flushBody?: boolean;
  /**
   * Kart genişliği içeriğine oturur (üst sınır `size`): içerik karttan dar kalırsa iki yanda
   * boş bant bırakmaz (ör. dikey reklam görseli). İçeriğin genişliği AÇIK olmalı (sabit pt);
   * yüzdeyle genişleyen içerik karta sığmaz. Varsayılan kapalı: kart `size`'a kadar tam genişlik.
   */
  fitContent?: boolean;
}

const { colors, radius, spacing, typography } = theme;

/** Kapat düğmesinin boyutu — başlık satırı yüksekliği de bundan türer. */
const CLOSE_BUTTON_SIZE: IconButtonSize = 'sm';

/** Yalnız kapat düğmesi olan başlık satırının yüksekliği (düğme + dikey iç boşluk). */
export const MODAL_CLOSE_HEADER_HEIGHT = iconButtonBoxSize(CLOSE_BUTTON_SIZE) + 2 * spacing[2];

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  closeOnBackdrop = true,
  size = 'md',
  showCloseButton = false,
  closeLabel,
  flushBody = false,
  fitContent = false,
}) => {
  const hasHeader = !!title || showCloseButton;
  return (
    <RNModal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fill}
      >
        <Pressable
          style={styles.backdrop}
          onPress={closeOnBackdrop ? onClose : undefined}
        >
          <Pressable
            style={[
              styles.sheet,
              { maxWidth: MODAL_MAX_WIDTH[size] },
              fitContent && styles.sheetFit,
              flushBody && styles.sheetFlush,
            ]}
          >
            {hasHeader && (
              <View style={[styles.header, title ? styles.headerTitled : styles.headerCloseOnly]}>
                {title ? <RawText style={styles.title}>{title}</RawText> : <View style={styles.fill} />}
                {showCloseButton && (
                  <IconButton
                    icon="close"
                    size={CLOSE_BUTTON_SIZE}
                    accessibilityLabel={closeLabel ?? 'Close'}
                    onPress={onClose}
                    testID="modal-close"
                  />
                )}
              </View>
            )}
            <View
              style={[
                styles.body,
                hasHeader && styles.bodyAfterHeader,
                flushBody && styles.bodyFlush,
              ]}
            >
              {children}
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay.black50,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
  },
  // İçeriğe oturan kart (backdrop `alignItems: center` olduğu için ortalanır).
  sheetFit: {
    width: 'auto',
  },
  // Kenardan kenara içerik kartın yuvarlak köşelerine taşmasın.
  sheetFlush: {
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  headerTitled: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
    paddingBottom: spacing[4],
  },
  headerCloseOnly: {
    padding: spacing[2],
  },
  title: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text.heading,
  },
  body: {
    padding: spacing[6],
  },
  // Başlık satırı üst boşluğu zaten veriyor.
  bodyAfterHeader: {
    paddingTop: 0,
  },
  bodyFlush: {
    padding: 0,
  },
});

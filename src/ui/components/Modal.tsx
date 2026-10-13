import React from 'react';
import {
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../lib/theme';
import { useKeyboardOverlap } from '../lib/keyboard';
import { IconButton, iconButtonBoxSize, type IconButtonSize } from './IconButton';
import { SheetHeader } from './SheetHeader';
import { ToastLayer } from './Toast';

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
  /**
   * Alt şerit (web Dialog `footer`): üst çizgili, `px-6 py-4`, kaydırılmaz (gövde kayar). Düğmeler
   * için `ModalFooter` kullanın — sığarsa yan yana [İptal][Ana aksiyon], sığmazsa alt alta ana aksiyon
   * üstte.
   */
  footer?: React.ReactNode;
  /**
   * Gövde `ScrollView` (varsayılan; `fitContent` ile kapalı): kart pencereye (güvenli alanlar +
   * klavye) sığmazsa başlık ve alt şerit yerinde kalır, yalnız gövde kayar. Kendi `ScrollView`'ını
   * taşıyan gövdeler `false` verir (çift kaydırma olmasın) — gövde yine de kalan alana küçülür.
   */
  scrollable?: boolean;
}

const { colors, radius, spacing } = theme;

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
  footer,
  scrollable = !fitContent,
}) => {
  const hasHeader = !!title || showCloseButton;
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardOverlap();
  // Kart pencereye sığar: üstte güvenli alan, altta güvenli alan ya da klavye. iOS'ta klavyeyi
  // KeyboardAvoidingView (padding, klavye animasyonuyla) kaçar; Android kenardan kenara pencerede
  // `adjustResize` küçültmez → klavye payı burada (pencere yine de küçüldüyse o kadarı düşülür).
  const keyboardOpen = keyboard.keyboardHeight > 0;
  const paddingBottom = keyboardOpen
    ? (Platform.OS === 'ios' ? 0 : keyboard.overlap) + spacing[2]
    : insets.bottom + spacing[4];
  const body = (
    <View
      style={[
        styles.body,
        hasHeader && !title && styles.bodyAfterHeader,
        flushBody && styles.bodyFlush,
        // Kaydırmasız gövde (çağıranın kendi ScrollView'ı): küçülme zinciri burada da sürmeli, aksi
        // halde içteki ScrollView klavye açıkken alt şeridin üstüne taşar.
        !scrollable && styles.bodyShrink,
      ]}
    >
      {children}
    </View>
  );
  return (
    <RNModal
      visible={isOpen}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.fill} onLayout={keyboard.onLayout} testID="modal-root">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          enabled={Platform.OS === 'ios'}
          style={styles.fill}
        >
          <Pressable
            style={[styles.backdrop, { paddingTop: insets.top + spacing[4], paddingBottom }]}
            onPress={closeOnBackdrop ? onClose : undefined}
            testID="modal-backdrop"
          >
            <Pressable
              accessibilityViewIsModal
              style={[
                styles.sheet,
                { maxWidth: MODAL_MAX_WIDTH[size] },
                fitContent && styles.sheetFit,
                flushBody && styles.sheetFlush,
              ]}
            >
              {title ? (
                <SheetHeader
                  title={title}
                  paddingX={6}
                  onClose={showCloseButton ? onClose : undefined}
                  closeLabel={closeLabel}
                  closeTestID="modal-close"
                />
              ) : showCloseButton ? (
                <View style={[styles.header, styles.headerCloseOnly]}>
                  <View style={styles.fill} />
                  <IconButton
                    icon="x-mark"
                    size={CLOSE_BUTTON_SIZE}
                    accessibilityLabel={closeLabel ?? 'Close'}
                    onPress={onClose}
                    testID="modal-close"
                  />
                </View>
              ) : null}
              {scrollable ? (
                <ScrollView
                  style={styles.bodyScroll}
                  keyboardShouldPersistTaps="handled"
                  bounces={false}
                  testID="modal-body-scroll"
                >
                  {body}
                </ScrollView>
              ) : (
                <View style={styles.bodyShrink}>{body}</View>
              )}
              {footer ? <View style={styles.footer}>{footer}</View> : null}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
        {/* Toast bu native pencerede çizilsin (kök host modalın ALTINDA kalır). */}
        <ToastLayer />
      </View>
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
    paddingHorizontal: spacing[4],
  },
  // Kart içeriği kadar uzar; pencereye sığmazsa küçülür (yalnız gövde küçülür: başlık/alt şerit sabit).
  sheet: {
    width: '100%',
    flexShrink: 1,
    backgroundColor: colors.surface.elevated,
    borderRadius: radius.xl,
  },
  bodyScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  bodyShrink: {
    flexShrink: 1,
    minHeight: 0,
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
  headerCloseOnly: {
    padding: spacing[2],
  },
  // Web Dialog gövdesi: `px-6 py-5`.
  body: {
    padding: spacing[6],
    paddingVertical: spacing[5],
  },
  // Web Dialog alt şeridi: `border-t px-6 py-4`.
  footer: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  // Yalnız kapat düğmeli başlık satırı üst boşluğu zaten veriyor.
  bodyAfterHeader: {
    paddingTop: 0,
  },
  bodyFlush: {
    padding: 0,
  },
});

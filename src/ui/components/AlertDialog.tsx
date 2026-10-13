import React, { useEffect, useRef, useState } from 'react';
import {
  Modal as RNModal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import i18n from 'i18next';
import { theme } from '../lib/theme';
import { MODAL_CLOSE_DELAY_MS, MODAL_DISMISS_TIMEOUT_MS } from '../lib/modal-timing';

/**
 * Düğme verilmeyen uyarının varsayılan etiketi — arayüz dilinde. Eskiden sabit
 * Türkçe "Tamam" idi; İngilizce cihazda (App Review) karışık dil görünüyordu.
 * i18next henüz kurulmadıysa (çok erken ya da i18n'siz test) "OK"e düşer.
 */
function defaultOkLabel(): string {
  const label = i18n.isInitialized ? i18n.t('common.ok') : '';
  return label && label !== 'common.ok' ? label : 'OK';
}

export interface AlertDialogButton {
  text?: string;
  /**
   * Diyalog kapanış animasyonu BİTTİKTEN sonra çalışır (ModalFreeze). Kullanıcıya dönük
   * "işlem başladı" geri bildirimi için `onSelect`'i kullan.
   */
  onPress?: () => void;
  /** Düğmeye basıldığı AN (kapanışı beklemeden, senkron) çalışır: bekleme durumu / spinner için. */
  onSelect?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertDialogOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
}

interface AlertDialogRequest {
  title: string;
  message?: string;
  buttons: AlertDialogButton[];
  options?: AlertDialogOptions;
}

type Listener = (request: AlertDialogRequest) => void;

let listener: Listener | null = null;
const queue: AlertDialogRequest[] = [];

/**
 * Drop-in replacement for React Native's Alert.alert with themed UI.
 * Requires <AlertDialogHost /> to be mounted once at the app root.
 */
export function appAlert(
  title: string,
  message?: string,
  buttons?: AlertDialogButton[],
  options?: AlertDialogOptions,
): void {
  const request: AlertDialogRequest = {
    title,
    message,
    buttons: buttons?.length ? buttons : [{ text: defaultOkLabel() }],
    options,
  };
  if (listener) {
    listener(request);
  } else {
    queue.push(request);
  }
}

const { colors, radius, spacing, typography } = theme;

export const AlertDialogHost: React.FC = () => {
  const [current, setCurrent] = useState<AlertDialogRequest | null>(null);
  // Diyalog kapanıyor (RNModal `visible=false`) ama henüz tamamen kalkmadı.
  const [closing, setClosing] = useState(false);
  // Senkron okunması gereken durum ref'te: listener bir kez kurulur, state'i görmez.
  const busyRef = useRef(false); // bir diyalog gösteriliyor ya da kapanıyor
  const pendingRef = useRef<AlertDialogRequest[]>([]);
  const afterCloseRef = useRef<(() => void) | null>(null);
  const closingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listener = (request) => {
      if (busyRef.current) {
        pendingRef.current.push(request);
        return;
      }
      busyRef.current = true;
      setCurrent(request);
    };
    // Flush alerts fired before the host mounted
    while (queue.length) {
      listener(queue.shift()!);
    }
    return () => {
      listener = null;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  /**
   * Kapanış BİTTİ: sıradaki diyalog (varsa) açılır, sonra düğmenin `onPress`'i çalışır.
   * Birden çok kez çağrılabilir (iOS `onDismiss` + yedek zamanlayıcı) — yalnız ilki işler.
   * ModalFreeze: `onPress` ve sıradaki diyalog RNModal tamamen kalkmadan çalışırsa, bunların
   * açtığı yeni modal iOS'ta kapanmakta olan modalın üstüne biner ve ekran donar.
   */
  const finishClose = () => {
    if (!closingRef.current) return;
    closingRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const afterClose = afterCloseRef.current;
    afterCloseRef.current = null;
    const next = pendingRef.current.shift() ?? null;
    busyRef.current = !!next;
    setClosing(false);
    setCurrent(next);
    afterClose?.();
  };

  const close = (button?: AlertDialogButton) => {
    if (!current || closingRef.current) return; // çift basış: ikinci kapanış yok
    closingRef.current = true;
    button?.onSelect?.();
    const request = current;
    afterCloseRef.current = () => {
      if (button) button.onPress?.();
      else request.options?.onDismiss?.();
    };
    setClosing(true);
    // iOS: `onDismiss` gelince biter. Android'de olay yok -> sabit süre. iOS'ta da
    // `onDismiss` gelmezse akış askıda kalmasın diye üst sınır.
    timerRef.current = setTimeout(
      finishClose,
      Platform.OS === 'ios' ? MODAL_DISMISS_TIMEOUT_MS : MODAL_CLOSE_DELAY_MS,
    );
  };

  if (!current) return null;

  const { title, message, buttons, options } = current;
  const cancelable = options?.cancelable ?? false;
  const vertical = buttons.length > 2;

  return (
    <RNModal
      visible={!closing}
      onDismiss={finishClose}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (cancelable) close();
      }}
    >
      {/* `accessible={false}`: dokunulabilir bir View, iOS'ta TÜM alt öğelerini
          tek bir erişilebilirlik öğesine çökertir — VoiceOver diyaloğu tek blok
          okur ve düğmeleri ayrı ayrı seçemez (otomasyon da göremez). Arka plan
          ile kart yalnız "dışa dokununca kapat" için dokunulabilir; erişilebilir
          öğeler başlık, mesaj ve düğmelerin kendisidir. */}
      <Pressable
        accessible={false}
        style={styles.backdrop}
        onPress={cancelable ? () => close() : undefined}
      >
        <Pressable accessible={false} style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
          <View style={[styles.buttonRow, vertical && styles.buttonColumn]}>
            {buttons.map((button, index) => {
              const isCancel = button.style === 'cancel';
              const isDestructive = button.style === 'destructive';
              return (
                <Pressable
                  key={`${button.text ?? 'btn'}-${index}`}
                  onPress={() => close(button)}
                  style={({ pressed }) => [
                    styles.button,
                    vertical && styles.buttonFull,
                    isCancel ? styles.buttonCancel : styles.buttonSolid,
                    isDestructive && styles.buttonDestructive,
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isCancel ? styles.buttonTextCancel : styles.buttonTextSolid,
                    ]}
                  >
                    {button.text ?? defaultOkLabel()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay.black50,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing[6],
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.text.heading,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.5,
    color: colors.text.body,
    textAlign: 'center',
    marginTop: spacing[2],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[5],
  },
  buttonColumn: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
  },
  buttonFull: {
    flex: 0,
    alignSelf: 'stretch',
  },
  buttonSolid: {
    backgroundColor: colors.primary[600]!,
  },
  buttonDestructive: {
    backgroundColor: colors.danger[600]!,
  },
  buttonCancel: {
    backgroundColor: colors.gray[100],
  },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  buttonTextSolid: {
    color: colors.white,
  },
  buttonTextCancel: {
    color: colors.gray[900],
  },
});

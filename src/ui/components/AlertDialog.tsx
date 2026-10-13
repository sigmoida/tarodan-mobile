import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Modal as RNModal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import i18n from 'i18next';
import { theme } from '../lib/theme';
import {
  MODAL_CLOSE_DELAY_MS,
  MODAL_DISMISS_TIMEOUT_MS,
  MODAL_PRESENT_RETRY_MS,
  MODAL_SHIELD_MAX_MS,
} from '../lib/modal-timing';

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
  // `onPress` çalıştı, sıradaki diyalog için oturma süresi dolmadı (bkz. `finishClose`).
  const [settling, setSettling] = useState(false);
  const [shieldTimedOut, setShieldTimedOut] = useState(false);
  // iOS sunum watchdog'u: `onShow` geldi mi / kaçıncı yeniden bağlanma.
  const [presented, setPresented] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Senkron okunması gereken durum ref'te: listener bir kez kurulur, state'i görmez.
  const busyRef = useRef(false); // bir diyalog gösteriliyor, kapanıyor ya da arkasından oturuyor
  const pendingRef = useRef<AlertDialogRequest[]>([]);
  const afterCloseRef = useRef<(() => void) | null>(null);
  const closingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showRequest = (request: AlertDialogRequest) => {
    busyRef.current = true;
    setCurrent(request);
  };

  useEffect(() => {
    listener = (request) => {
      if (busyRef.current) {
        pendingRef.current.push(request);
        return;
      }
      showRequest(request);
    };
    // Flush alerts fired before the host mounted
    while (queue.length) {
      listener(queue.shift()!);
    }
    return () => {
      listener = null;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Oturma bitti (ya da hiç gerekmedi): sıradaki diyalog açılabilir. */
  const releaseBusy = () => {
    settleTimerRef.current = null;
    setSettling(false);
    const next = pendingRef.current.shift() ?? null;
    busyRef.current = !!next;
    if (next) setCurrent(next);
  };

  /**
   * Kapanış BİTTİ: önce düğmenin `onPress`'i çalışır, sıradaki diyalog (varsa) ondan SONRA
   * açılır. Birden çok kez çağrılabilir (iOS `onDismiss` + yedek zamanlayıcı) — yalnız ilki işler.
   * ModalFreeze: `onPress` RNModal tamamen kalkmadan çalışırsa, açtığı yeni modal iOS'ta
   * kapanmakta olanın üstüne biner ve ekran donar. Aynı şekilde sıradaki diyalog `onPress`'in
   * açtığı modal (ör. seçici) ile aynı tick'te sunulursa iOS ikisinden birini reddeder ve host
   * kilitlenir: `onPress` varsa sıradaki diyalog bir kapanma penceresi (`MODAL_CLOSE_DELAY_MS`)
   * daha bekler. `onPress` içinden açılan `appAlert` busy olduğu için kuyruğun SONUNA girer.
   */
  const finishClose = () => {
    if (!closingRef.current) return;
    closingRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const afterClose = afterCloseRef.current;
    afterCloseRef.current = null;
    setClosing(false);
    setCurrent(null); // busyRef true kalır: oturma bitene dek yeni diyalog sunulmaz
    try {
      afterClose?.();
    } finally {
      if (afterClose) {
        setSettling(true);
        settleTimerRef.current = setTimeout(releaseBusy, MODAL_CLOSE_DELAY_MS);
      } else {
        releaseBusy();
      }
    }
  };

  const close = (button?: AlertDialogButton) => {
    if (!current || closingRef.current) return; // çift basış: ikinci kapanış yok
    closingRef.current = true;
    const request = current;
    try {
      button?.onSelect?.();
    } finally {
      // `onSelect` fırlatsa da kapanış ve zamanlayıcı kurulur: aksi halde `closingRef` true
      // kalır, diyalog ekranda asılı durur ve host oturum boyunca kilitlenirdi. Hata yutulmaz
      // (bu bloktan sonra çağırana yeniden fırlar); yalnız host durumu korunur.
      const hasAfterClose = button ? !!button.onPress : !!request.options?.onDismiss;
      afterCloseRef.current = hasAfterClose
        ? () => {
            if (button) button.onPress?.();
            else request.options?.onDismiss?.();
          }
        : null;
      setClosing(true);
      // iOS: `onDismiss` gelince biter. Android'de olay yok -> sabit süre. iOS'ta da
      // `onDismiss` gelmezse akış askıda kalmasın diye üst sınır.
      timerRef.current = setTimeout(
        finishClose,
        Platform.OS === 'ios' ? MODAL_DISMISS_TIMEOUT_MS : MODAL_CLOSE_DELAY_MS,
      );
    }
  };

  // Yeni diyalog: sunum henüz doğrulanmadı.
  useEffect(() => {
    setPresented(false);
  }, [current]);

  /**
   * iOS watchdog'u (`FullScreenGate` kalıbı): RN modalı kök view controller'dan sunar; o anda
   * başka bir modal sunuluyor/kapanıyorsa UIKit sunumu sessizce reddeder ve RN bir daha denemez.
   * Diyalog `current` iken `onShow` gelmezse host sonsuza dek "meşgul" kalır ve oturum boyunca
   * hiçbir alert görünmezdi. `onShow` MODAL_PRESENT_RETRY_MS içinde gelmezse modal yeniden
   * bağlanıp tekrar sunulur (engelleyen modal kapanınca diyalog görünür, kuyruk akmaya devam eder).
   */
  useEffect(() => {
    if (Platform.OS !== 'ios' || !current || closing || presented) return undefined;
    const id = setTimeout(() => setAttempt((a) => a + 1), MODAL_PRESENT_RETRY_MS);
    return () => clearTimeout(id);
  }, [current, closing, presented, attempt]);

  /**
   * Kapanma penceresi (düğmeye basıldı -> onPress çalıştı -> oturma bitti): RNModal görünmez
   * ama alttaki ekran etkileşimli. Kullanıcı OK'a basıp hemen dokunur ya da Android geri
   * tuşuna basarsa ekran, ertelenmiş `onPress` (ör. `router.back()`) ile BİRLİKTE ikinci kez
   * pop edilirdi. Pencere boyunca dokunmaları görünmez bir katman, geri tuşunu `BackHandler`
   * yutar. Süre `MODAL_SHIELD_MAX_MS` ile sınırlı: zamanlayıcılara bir şey olsa bile kalkan
   * ekranı kalıcı kilitlemez.
   */
  const shieldWindow = closing || settling;
  const shielded = shieldWindow && !shieldTimedOut;
  useEffect(() => {
    setShieldTimedOut(false);
    if (!shieldWindow) return undefined;
    const id = setTimeout(() => setShieldTimedOut(true), MODAL_SHIELD_MAX_MS);
    return () => clearTimeout(id);
  }, [shieldWindow]);
  useEffect(() => {
    if (!shielded) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [shielded]);
  const shield = shielded ? (
    <View
      testID="alert-dialog-shield"
      style={styles.shield}
      pointerEvents="auto"
      accessible={false}
    />
  ) : null;

  if (!current) return shield;

  const { title, message, buttons, options } = current;
  const cancelable = options?.cancelable ?? false;
  const vertical = buttons.length > 2;

  return (
    <>
    <RNModal
      key={attempt}
      visible={!closing}
      onShow={() => setPresented(true)}
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
    {shield}
    </>
  );
};

const styles = StyleSheet.create({
  shield: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
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

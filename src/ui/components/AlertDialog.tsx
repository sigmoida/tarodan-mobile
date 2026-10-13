import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Modal as RNModal,
  Platform,
  Pressable,
  StyleSheet,
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
import { RawText } from './Text';
import { MODAL_MAX_WIDTH } from './Modal';

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

/**
 * YALNIZ TEST: modül kuyruğunu boşaltır. Sökülen host gösterdiği/bekleyen alert'leri bu kuyruğa
 * geri verir (bkz. `AlertDialogHost` cleanup); testler arasında sızmasın diye `cleanup()`'tan
 * sonra çağrılır. `@/ui`'dan export edilmez.
 */
export function resetAlertQueueForTests(): void {
  queue.length = 0;
}

const { colors, radiusRole, spacing, typography, controlHeight } = theme;

export interface AlertDialogHostProps {
  /**
   * Kapı (tam ekran zorunlu güncelleme / zorunlu adım) açıkken `true`: host BAĞLI kalır ama yeni
   * alert sunmaz, kuyrukta bekletir; açık bir alert varsa kuyruğun başına geri koyup gizler.
   * Kapı kapanınca (`false`) kuyruk sırayla akar. Eskiden kapı açıkken host sökülüyordu: kapanma
   * zamanlayıcısı temizlenir, basılan düğmenin `onPress`'i hiç çalışmaz ve ona bağlı akış
   * (ör. teklif ekranının "bekliyor" durumu) kalıcı takılırdı.
   */
  suspended?: boolean;
}

export const AlertDialogHost: React.FC<AlertDialogHostProps> = ({ suspended = false }) => {
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
  const currentRef = useRef<AlertDialogRequest | null>(null);
  const suspendedRef = useRef(suspended);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setCurrentRequest = (request: AlertDialogRequest | null) => {
    currentRef.current = request;
    setCurrent(request);
  };

  const showRequest = (request: AlertDialogRequest) => {
    busyRef.current = true;
    setCurrentRequest(request);
  };

  useEffect(() => {
    listener = (request) => {
      if (busyRef.current || suspendedRef.current) {
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
      timerRef.current = null;
      settleTimerRef.current = null;
      // Sökülürken hiçbir alert kaybolmasın: gösterilen (kapanmıyorsa) ve bekleyenler modül
      // kuyruğuna sırayla geri döner, bir sonraki host'ta akar.
      const restore = [
        ...(currentRef.current && !closingRef.current ? [currentRef.current] : []),
        ...pendingRef.current,
      ];
      pendingRef.current = [];
      queue.unshift(...restore);
      currentRef.current = null;
      busyRef.current = false;
      // Düğmeye basılmış, kapanış bekliyordu: zamanlayıcı da gittiğine göre `onPress`'i
      // kaybetmeyiz, hemen çalıştırırız (alert'leri kuyruğun sonuna girer: listener null).
      if (closingRef.current) {
        closingRef.current = false;
        const afterClose = afterCloseRef.current;
        afterCloseRef.current = null;
        afterClose?.();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kapı açılırken/kapanırken: bkz. `AlertDialogHostProps.suspended`.
  useEffect(() => {
    suspendedRef.current = suspended;
    if (suspended) {
      // Açık (kapanmayan) alert'i kuyruğun BAŞINA geri koy ve gizle; kapı kapanınca yeniden çıkar.
      if (currentRef.current && !closingRef.current) {
        pendingRef.current.unshift(currentRef.current);
        busyRef.current = false;
        setCurrentRequest(null);
      }
    } else if (!busyRef.current && pendingRef.current.length) {
      showRequest(pendingRef.current.shift()!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suspended]);

  /** Oturma bitti (ya da hiç gerekmedi): sıradaki diyalog açılabilir. */
  const releaseBusy = () => {
    settleTimerRef.current = null;
    setSettling(false);
    const next = suspendedRef.current ? null : (pendingRef.current.shift() ?? null);
    busyRef.current = !!next;
    if (next) setCurrentRequest(next);
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
    setCurrentRequest(null); // busyRef true kalır: oturma bitene dek yeni diyalog sunulmaz
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
  // Web ConfirmDialog'un telefon görünümü: düğmeler tam genişlik, alt alta; `cancel` stilli düğme
  // HER ZAMAN en altta (onay üstte, iptal altta). Diğerlerinin sırası çağıranın verdiği gibi
  // KORUNUR (ters çevirme yok) — [Profil, Şikayet, Engelle, İptal] menüsü aynı sırada kalır.
  const indexed = buttons.map((button, index) => ({ button, index }));
  const ordered = [
    ...indexed.filter(({ button }) => button.style !== 'cancel'),
    ...indexed.filter(({ button }) => button.style === 'cancel'),
  ];

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
          <View style={styles.header}>
            <RawText style={styles.title} accessibilityRole="header">
              {title}
            </RawText>
          </View>
          {!!message && (
            <View style={styles.body}>
              <RawText style={styles.message}>{message}</RawText>
            </View>
          )}
          <View style={styles.footer}>
            {ordered.map(({ button, index }) => {
              const isCancel = button.style === 'cancel';
              const isDestructive = button.style === 'destructive';
              return (
                <Pressable
                  key={`${button.text ?? 'btn'}-${index}`}
                  onPress={() => close(button)}
                  style={({ pressed }) => [
                    styles.button,
                    isCancel ? styles.buttonCancel : styles.buttonSolid,
                    isDestructive && styles.buttonDestructive,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                >
                  <RawText
                    style={[
                      styles.buttonText,
                      isCancel ? styles.buttonTextCancel : styles.buttonTextSolid,
                    ]}
                  >
                    {button.text ?? defaultOkLabel()}
                  </RawText>
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
  // Web Dialog kartı: rounded-xl, surface-elevated; başlık / gövde / alt şerit çizgilerle ayrılır.
  card: {
    width: '100%',
    maxWidth: MODAL_MAX_WIDTH.md,
    backgroundColor: colors.surface.elevated,
    borderRadius: radiusRole.modal,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  title: {
    fontSize: typography.fontSize.lg,
    lineHeight: typography.fontSize.lg * 1.25,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.heading,
  },
  body: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[5],
  },
  message: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.5,
    color: colors.text.body,
  },
  footer: {
    gap: spacing[2],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  // Web Button md: h-10, rounded-lg, text-sm/500.
  button: {
    alignSelf: 'stretch',
    height: controlHeight.md,
    borderRadius: radiusRole.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  buttonSolid: {
    backgroundColor: colors.primary[600],
  },
  buttonDestructive: {
    backgroundColor: colors.danger[600],
  },
  // Web ModalFooter: İptal = outline.
  buttonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  pressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  buttonTextSolid: {
    color: colors.text.inverted,
  },
  buttonTextCancel: {
    color: colors.text.body,
  },
});

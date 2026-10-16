import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from 'i18next';
import { theme } from '../lib/theme';
import {
  MODAL_CLOSE_DELAY_MS,
  MODAL_DISMISS_TIMEOUT_MS,
  MODAL_PRESENT_RETRY_MS,
  MODAL_SHIELD_MAX_MS,
} from '../lib/modal-timing';
import { Button, type ButtonVariant } from './Button';
import { ButtonRow } from './ButtonRow';
import { Text } from './Text';
import { ToastLayer } from './Toast';

/**
 * Düğme verilmeyen uyarının varsayılan etiketi — arayüz dilinde. Eskiden sabit
 * Türkçe "Tamam" idi; İngilizce cihazda (App Review) karışık dil görünüyordu.
 * i18next henüz kurulmadıysa (çok erken ya da i18n'siz test) "OK"e düşer.
 */
function defaultOkLabel(): string {
  return translate('common.ok', 'OK');
}

/** Arayüz dilinde etiket; i18next kurulmadıysa / anahtar yoksa `fallback`. */
function translate(key: 'common.ok' | 'common.cancel' | 'common.confirm', fallback: string): string {
  const label: string = i18n.isInitialized ? i18n.t(key) : '';
  return label && label !== key ? label : fallback;
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
  /**
   * Android geri tuşu ve arka plana dokunma diyaloğu kapatır mı. Varsayılan: `cancel` stilli düğme
   * varsa ya da tek düğmeliyse `true` (Material: geri = iptal), aksi halde `false`. Kapatma, `cancel`
   * düğmesine (yoksa tek düğmeye) basmakla aynıdır — `onPress`'i kapanış bitince çalışır — ve
   * ardından `onDismiss` çağrılır. Kullanıcının mutlaka okuması gereken tek düğmeli uyarılar
   * (ödeme belirsizliği vb.) açıkça `cancelable: false` verir.
   */
  cancelable?: boolean;
  onDismiss?: () => void;
  /**
   * Tekilleştirme / programatik kapatma anahtarı. Aynı anahtarlı bir alert zaten gösteriliyor ya da
   * kuyruktaysa yenisi eklenmez; `dismissAlert(key)` onu (kuyrukta ya da ekranda) düğmesiz kapatır.
   * Durum alert'leri için (ör. "internet yok": bağlantı dönünce kendiliğinden kalkar).
   */
  key?: string;
}

interface AlertDialogRequest {
  title: string;
  message?: string;
  buttons: AlertDialogButton[];
  options?: AlertDialogOptions;
}

type Listener = (request: AlertDialogRequest) => void;

let listener: Listener | null = null;
let dismisser: ((key: string) => void) | null = null;
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
  // Anahtarlı alert tekilleştirilir: host'a girmemiş kuyrukta aynı anahtar varsa yenisi atılır
  // (host'un kendi bekleyen/gösterilen alert'ini `listener` içinde kontrol eder).
  if (options?.key && queue.some((r) => r.options?.key === options.key)) return;
  if (listener) {
    listener(request);
  } else {
    queue.push(request);
  }
}

/**
 * `options.key`'li alert'i düğmesiz kapatır: kuyruktaysa çıkarır, ekrandaysa kapanış animasyonuyla
 * kaldırır (düğmelerin `onPress`'i ÇALIŞMAZ). Anahtar yoksa no-op.
 */
export function dismissAlert(key: string): void {
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i]!.options?.key === key) queue.splice(i, 1);
  }
  dismisser?.(key);
}

/**
 * YALNIZ TEST: modül kuyruğunu boşaltır. Sökülen host gösterdiği/bekleyen alert'leri bu kuyruğa
 * geri verir (bkz. `AlertDialogHost` cleanup); testler arasında sızmasın diye `cleanup()`'tan
 * sonra çağrılır. `@/ui`'dan export edilmez.
 */
export function resetAlertQueueForTests(): void {
  queue.length = 0;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Onay düğmesi (varsayılan "Onayla"). */
  confirmLabel?: string;
  /** İptal düğmesi (varsayılan "İptal"). */
  cancelLabel?: string;
  /** Yıkıcı işlem (sil, iptal et…) → onay düğmesi danger. */
  destructive?: boolean;
}

type AlertFn = (
  title: string,
  message?: string,
  buttons?: AlertDialogButton[],
  options?: AlertDialogOptions,
) => void;

/**
 * `confirm`'ün uygulaması; diyaloğu açan fonksiyon parametre — testlerde global `appAlert` mock'u
 * üstünden çalışsın diye (`jest.setup.ts`). Uygulama kodu `confirm`'ü kullanır.
 */
export function confirmWith(
  alert: AlertFn,
  { title, message, confirmLabel, cancelLabel, destructive = false }: ConfirmOptions,
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    alert(
      title,
      message,
      [
        {
          text: cancelLabel ?? translate('common.cancel', 'Cancel'),
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: confirmLabel ?? translate('common.confirm', 'Confirm'),
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/**
 * Onay diyaloğu — web `ConfirmProvider`'ın `confirm()`'ü ile aynı imza:
 * `if (!(await confirm({ title, message, destructive: true }))) return;`
 *
 * `appAlert` üstünde; söz diyalog TAMAMEN kapandıktan SONRA çözülür (ModalFreeze sözleşmesi), yani
 * `await`'ten sonra açılan modal / galeri / toast / navigasyon iOS'ta güvenlidir. İptal, geri tuşu ve
 * arka plan dokunuşu `false` döner. Web'deki "diyalog açık kalıp async `onConfirm` bekle" kalıbı
 * bilerek YOK (iOS donması): onaydan sonra işlemi çağıran yürütür, sonucu toast'la bildirir.
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return confirmWith(appAlert, options);
}

/**
 * Düğme düzeni. Alt alta düzende `cancel` stilli düğme HER ZAMAN en altta; diğerleri çağıranın
 * verdiği sırada (ters çevirme yok). İki düğme etiketleri eşit paya sığıyorsa yan yana: iptal SOLDA
 * (web ModalFooter `sm:flex-row`, iOS/Material diyalog düzeni) — sığmazsa `ButtonRow
 * stackOrder="reverse"` alt alta çevirir (onay üstte, iptal altta). 3+ düğme hep alt alta.
 */
export function alertButtonLayout(buttons: AlertDialogButton[]): {
  ordered: { button: AlertDialogButton; index: number }[];
  layout: 'auto' | 'stack';
  stackOrder: 'same' | 'reverse';
} {
  const indexed = buttons.map((button, index) => ({ button, index }));
  const cancel = indexed.filter(({ button }) => button.style === 'cancel');
  const others = indexed.filter(({ button }) => button.style !== 'cancel');
  if (buttons.length === 2 && cancel.length === 1) {
    return { ordered: [...cancel, ...others], layout: 'auto', stackOrder: 'reverse' };
  }
  return {
    ordered: [...others, ...cancel],
    layout: buttons.length === 2 ? 'auto' : 'stack',
    stackOrder: 'same',
  };
}

function buttonVariant(button: AlertDialogButton): ButtonVariant {
  if (button.style === 'cancel') return 'outline';
  if (button.style === 'destructive') return 'danger';
  return 'primary';
}

/** Arka plan / geri tuşu ile kapatma hangi düğmeye basmak sayılır (bkz. `cancelable`). */
function dismissButton(buttons: AlertDialogButton[]): AlertDialogButton | undefined {
  return buttons.find((b) => b.style === 'cancel') ?? (buttons.length === 1 ? buttons[0] : undefined);
}

/** `cancelable` verilmediyse: iptal düğmesi varsa ya da tek düğmeliyse kapatılabilir. */
export function isAlertCancelable(buttons: AlertDialogButton[], options?: AlertDialogOptions): boolean {
  return options?.cancelable ?? (buttons.length === 1 || buttons.some((b) => b.style === 'cancel'));
}

const { colors, radiusRole, spacing } = theme;

/** Kart genişliği: telefon diyaloğu — min(340, ekran - 48). */
export const ALERT_MAX_WIDTH = 340;

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

  // En güncel `close` (kapanış `current` state'ini okur; `dismisser` bir kez kurulur).
  const closeRef = useRef<((button?: AlertDialogButton, dismissed?: boolean) => void) | null>(null);

  useEffect(() => {
    listener = (request) => {
      const key = request.options?.key;
      if (
        key &&
        ((currentRef.current?.options?.key === key && !closingRef.current) ||
          pendingRef.current.some((r) => r.options?.key === key))
      ) {
        return; // aynı anahtarlı alert zaten gösteriliyor / sırada
      }
      if (busyRef.current || suspendedRef.current) {
        pendingRef.current.push(request);
        return;
      }
      showRequest(request);
    };
    const ownDismisser = (key: string) => {
      pendingRef.current = pendingRef.current.filter((r) => r.options?.key !== key);
      if (currentRef.current?.options?.key === key && !closingRef.current) {
        closeRef.current?.(undefined, false);
      }
    };
    dismisser = ownDismisser;
    // Flush alerts fired before the host mounted
    while (queue.length) {
      listener(queue.shift()!);
    }
    return () => {
      listener = null;
      if (dismisser === ownDismisser) dismisser = null;
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

  /**
   * `dismissed`: düğmeye değil arka plana / geri tuşuna basıldı (`cancelable`). Kapatma, `cancel`
   * düğmesine (yoksa tek düğmeye) basmak sayılır; ardından `options.onDismiss` de çalışır.
   */
  const close = (button?: AlertDialogButton, dismissed = false) => {
    if (!current || closingRef.current) return; // çift basış: ikinci kapanış yok
    closingRef.current = true;
    const request = current;
    try {
      button?.onSelect?.();
    } finally {
      // `onSelect` fırlatsa da kapanış ve zamanlayıcı kurulur: aksi halde `closingRef` true
      // kalır, diyalog ekranda asılı durur ve host oturum boyunca kilitlenirdi. Hata yutulmaz
      // (bu bloktan sonra çağırana yeniden fırlar); yalnız host durumu korunur.
      const onDismiss = dismissed ? request.options?.onDismiss : undefined;
      const hasAfterClose = !!button?.onPress || !!onDismiss;
      afterCloseRef.current = hasAfterClose
        ? () => {
            try {
              button?.onPress?.();
            } finally {
              onDismiss?.();
            }
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

  closeRef.current = close;

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

  return (
    <>
      <AlertDialogView
        request={current}
        visible={!closing}
        attempt={attempt}
        onShow={() => setPresented(true)}
        onDismissed={finishClose}
        onClose={close}
      />
      {shield}
    </>
  );
};

/** Diyalog görünümü — host'un kuyruk / kalkan / donma korumasından ayrı; yalnız çizim + düğme düzeni. */
const AlertDialogView: React.FC<{
  request: AlertDialogRequest;
  visible: boolean;
  attempt: number;
  onShow: () => void;
  onDismissed: () => void;
  onClose: (button?: AlertDialogButton, dismissed?: boolean) => void;
}> = ({ request, visible, attempt, onShow, onDismissed, onClose }) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { title, message, buttons, options } = request;
  const cancelable = isAlertCancelable(buttons, options);
  const dismiss = () => onClose(dismissButton(buttons), true);
  const { ordered, layout, stackOrder } = alertButtonLayout(buttons);
  const cardWidth = Math.min(ALERT_MAX_WIDTH, width - spacing[12]);

  return (
    <RNModal
      key={attempt}
      visible={visible}
      onShow={onShow}
      onDismiss={onDismissed}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {
        if (cancelable) dismiss();
      }}
    >
      {/* `accessible={false}`: dokunulabilir bir View, iOS'ta TÜM alt öğelerini
          tek bir erişilebilirlik öğesine çökertir — VoiceOver diyaloğu tek blok
          okur ve düğmeleri ayrı ayrı seçemez (otomasyon da göremez). Arka plan
          ile kart yalnız "dışa dokununca kapat" için dokunulabilir; erişilebilir
          öğeler başlık, mesaj ve düğmelerin kendisidir. */}
      <Pressable
        accessible={false}
        style={[
          styles.backdrop,
          { paddingTop: insets.top + spacing[6], paddingBottom: insets.bottom + spacing[6] },
        ]}
        onPress={cancelable ? dismiss : undefined}
        testID="alert-dialog-backdrop"
      >
        <Pressable
          accessible={false}
          accessibilityViewIsModal
          style={[styles.card, { width: cardWidth }]}
          testID="alert-dialog"
        >
          <Text variant="h3" weight="bold" align="center" accessibilityRole="header">
            {title}
          </Text>
          {!!message && (
            <ScrollView style={styles.body} bounces={false} testID="alert-dialog-body">
              <Text variant="bodySm" tone="muted" align="center">
                {message}
              </Text>
            </ScrollView>
          )}
          <ButtonRow
            layout={layout}
            stackOrder={stackOrder}
            style={styles.footer}
            testID="alert-dialog-buttons"
          >
            {ordered.map(({ button, index }) => (
              <Button
                key={`${button.text ?? 'btn'}-${index}`}
                variant={buttonVariant(button)}
                title={button.text ?? defaultOkLabel()}
                onPress={() => onClose(button)}
                fullWidth
              />
            ))}
          </ButtonRow>
        </Pressable>
      </Pressable>
      {/* Toast bu native pencerede çizilsin (kök host diyaloğun ALTINDA kalır). */}
      <ToastLayer />
    </RNModal>
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
    paddingHorizontal: spacing[6],
  },
  // Telefon diyaloğu: ortalı başlık + mesaj, altta düğmeler. Uzun mesajda yalnız gövde kayar (kart
  // pencereye sığana dek küçülür). iOS gölge, Android elevation (`shadow.elevated` ikisini de verir).
  card: {
    flexShrink: 1,
    backgroundColor: colors.surface.elevated,
    borderRadius: radiusRole.modal,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[5],
    ...theme.shadow.elevated,
  },
  body: {
    flexGrow: 0,
    flexShrink: 1,
    marginTop: spacing[2],
  },
  footer: {
    marginTop: spacing[5],
  },
});
